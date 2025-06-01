import express, { Request, Response, RequestHandler } from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { VectorStoreManager } from './vectorstore.js';
import { availableModels, defaultModelConfig, ModelConfig } from './model.js';
import { saveUploadedDocument, loadSingleDocument, splitDocuments } from './document.js';
import OpenAI from 'openai';
import { ChatHistoryManager } from './chatHistory.js';

// Get __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export interface Document {
  pageContent: string;
  metadata: Record<string, string>;
}

export interface ChatManager {
  processMessage: (question: string, userId: string, chatId: string, vectorStore: string, modelConfig?: ModelConfig) => Promise<{ text: string; sourceDocuments: Document[] }>;
  getUsers: () => string[];
  getUserVectorStores: (userId: string) => string[];
  getUserVectorChats: (userId: string, vectorName: string) => string[];
  clearChatHistory: (userId: string, vectorName: string, chatId: string) => void;
  chatHistoryManager: ChatHistoryManager;
}

// Create Express app with support for multiple vector stores
export function createApiServer(
  chatManager: ChatManager,
  vectorStoreManager: VectorStoreManager
) {
  const app = express();
  const PORT = process.env.PORT || 3000;

  // Middleware
  app.use(cors());
  app.use(express.json({ limit: '50mb' }));
  
  // Add timeout middleware for file uploads
  app.use('/api/add-document', (req, res, next) => {
    req.setTimeout(300000); // 5 minutes timeout for uploads
    res.setTimeout(300000);
    next();
  });

  // Serve static files from the frontend directory
  const publicPath = path.join(__dirname, '../../frontend');
  app.use(express.static(publicPath));

  // API Routes

  // Home route - serve the web client
  app.get('/', (_: Request, res: Response) => {
    res.sendFile(path.join(publicPath, 'index.html'));
  });

  // Health check endpoint for Railway and other deployment platforms
  app.get('/api/health', (_: Request, res: Response) => {
    res.status(200).json({ 
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: process.version,
      vectorStores: vectorStoreManager.getAvailableStores().length
    });
  });

  // API Info route
  app.get('/api', (_: Request, res: Response) => {
    res.json({ 
      message: 'LangChain Document Chat API', 
      endpoints: {
        '/api/health': 'GET - Health check for deployment platforms',
        '/api/chat': 'POST - Send a question to get an answer from the documents',
        '/api/vector-stores': 'GET - List all available vector stores',
        '/api/models': 'GET - List available OpenAI models (cached)',
        '/api/models/openai': 'GET - Get live models from OpenAI API',
        '/api/config/model': 'GET - Get default model configuration',
        '/api/add-document': 'POST - Upload and add a document to vector stores',
        '/api/users': 'GET - List all users with chat history',
        '/api/users/:userId/vector-stores': 'GET - List all vector stores with chat history for a user',
        '/api/users/:userId/vector-stores/:vectorName/chats': 'GET - List all chats for a specific user and vector store',
        '/api/users/:userId/vector-stores/:vectorName/chats/:chatId': 'DELETE - Clear chat history for a specific context',
        '/api/users/:userId/vector-stores/:vectorName/chats/:chatId/messages': 'GET - Get complete chat history messages for a specific context',
        '/api/debug/vector-stores': 'GET - Debug information about vector stores'
      }
    });
  });

  // Endpoint to list all available vector stores
  app.get('/api/vector-stores', (_: Request, res: Response) => {
    const stores = vectorStoreManager.getAvailableStores();
    res.json({
      stores,
      default: 'combined'
    });
  });

  // Endpoint to get available OpenAI models
  app.get('/api/models', (_: Request, res: Response) => {
    res.json({
      models: availableModels,
      default: defaultModelConfig.modelName
    });
  });

  // Endpoint to get available models from OpenAI API
  app.get('/api/models/openai', async (_: Request, res: Response) => {
    try {
      const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
      
      const models = await openai.models.list();
      
      // Filter for chat/completion models
      const chatModels = models.data
        .filter(model => 
          model.id.includes('gpt') && 
          !model.id.includes('instruct') &&
          !model.id.includes('embedding')
        )
        .map(model => ({
          id: model.id,
          name: model.id,
          description: `OpenAI model: ${model.id}`,
          created: model.created
        }))
        .sort((a, b) => b.created - a.created);

      res.json({
        models: chatModels,
        cached: availableModels,
        total: chatModels.length
      });
    } catch (error) {
      console.error('Error fetching OpenAI models:', error);
      // Fallback to cached models
      res.json({
        models: availableModels,
        cached: availableModels,
        error: 'Failed to fetch live models from OpenAI',
        total: availableModels.length
      });
    }
  });

  // Endpoint to get default model configuration
  app.get('/api/config/model', (_: Request, res: Response) => {
    res.json({
      config: defaultModelConfig,
      availableModels: availableModels
    });
  });

  // Debug endpoint to check vector store status
  app.get('/api/debug/vector-stores', (_: Request, res: Response) => {
    const stores = vectorStoreManager.getAvailableStores();
    const storeStatus = stores.map(store => ({
      name: store,
      exists: vectorStoreManager.storeExists(store),
      loaded: vectorStoreManager.isStoreLoaded(store)
    }));
    
    res.json({
      baseDirectory: './vectorstores',
      totalStores: stores.length,
      stores: storeStatus,
      combinedExists: vectorStoreManager.storeExists('combined'),
      message: stores.length === 0 ? 'No vector stores found. Upload documents to create them.' : 'Vector stores available'
    });
  });

  // Endpoint to add a document to vector stores
  app.post('/api/add-document', (async (req: Request, res: Response) => {
    let savedFilename: string | null = null;
    
    try {
      const { filename, content } = req.body;
      
      if (!filename || !content) {
        return res.status(400).json({ error: 'filename and content are required' });
      }

      console.log(`Received document upload request: ${filename}`);
      console.log(`Content type: ${filename.toLowerCase().endsWith('.pdf') ? 'PDF (base64)' : 'Text'}`);
      
      // Validate file size (prevent memory issues)
      if (content.length > 50000000) { // 50MB limit for base64 content
        return res.status(413).json({ error: 'File too large. Maximum size is 50MB.' });
      }
      
      // Handle PDF files differently
      if (filename.toLowerCase().endsWith('.pdf')) {
        console.log('Processing PDF file...');
        
        // For PDF files, content is base64 encoded, we need to save it as binary
        const fs = require('fs');
        const path = require('path');
        
        // Ensure docs directory exists
        if (!fs.existsSync('./docs')) {
          fs.mkdirSync('./docs', { recursive: true });
        }
        
        savedFilename = filename;
        const filepath = path.join('./docs', savedFilename);
        
        // Decode base64 and save as binary PDF
        const binaryContent = Buffer.from(content, 'base64');
        fs.writeFileSync(filepath, binaryContent);
        console.log(`PDF saved to: ${filepath} (${binaryContent.length} bytes)`);
        
      } else {
        // For text files, save as before
        savedFilename = await saveUploadedDocument(content, filename);
        console.log(`Text document saved: ${savedFilename}`);
      }
      
      // Load and process the document
      console.log('Loading document...');
      if (!savedFilename) {
        throw new Error('Failed to save document');
      }
      const docLoaded = await loadSingleDocument(savedFilename);
      console.log(`Document loaded with ${docLoaded.length} pages/sections`);
      
      // Verify we have content
      if (docLoaded.length === 0) {
        throw new Error('No content could be extracted from the document');
      }
      
      // Check content quality
      const totalContent = docLoaded.map(doc => doc.pageContent).join(' ').trim();
      if (totalContent.length < 10) {
        console.warn('Warning: Very little content extracted from document');
      }
      
      console.log(`Extracted content preview: ${totalContent.substring(0, 200)}...`);
      
      console.log('Splitting document...');
      const docChunks = await splitDocuments(docLoaded);
      console.log(`Document split into ${docChunks.length} chunks`);
      
      // Add to vector stores (individual and combined)
      console.log('Adding to vector stores...');
      await vectorStoreManager.addDocumentToVectorStores(savedFilename, docChunks);
      
      console.log(`Document ${savedFilename} processing completed successfully`);
      
      res.json({ 
        message: `Document ${savedFilename} successfully added to vector stores`,
        chunks: docChunks.length,
        pages: docLoaded.length,
        contentPreview: totalContent.substring(0, 150) + (totalContent.length > 150 ? '...' : ''),
        vectorStores: [
          savedFilename.replace(/\.[^/.]+$/, ""), // Individual store
          'combined' // Combined store
        ]
      });
    } catch (error) {
      console.error('Error processing document upload:', error);
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack available');
      
      // Attempt to clean up partially saved file if error occurred after saving
      if (savedFilename) {
        try {
          const fs = require('fs');
          const path = require('path');
          const filepath = path.join('./docs', savedFilename);
          if (fs.existsSync(filepath)) {
            console.log(`Cleaning up partially processed file: ${savedFilename}`);
            // Don't delete - keep the file for manual retry
          }
        } catch (cleanupError) {
          console.error('Error during cleanup:', cleanupError);
        }
      }
      
      res.status(500).json({ 
        error: 'Failed to process document upload',
        details: error instanceof Error ? error.message : 'Unknown error',
        filename: savedFilename
      });
    }
  }) as express.RequestHandler);

  // Chat endpoint with vector store selection and user/chat context
  app.post('/api/chat', (async (req: Request, res: Response) => {
    try {
      const { question, vectorStore, userId, chatId, modelConfig } = req.body;
      
      if (!question) {
        res.status(400).json({ error: 'Question is required' });
        return;
      }

      // Validate if provided vectorStore exists
      if (vectorStore && !vectorStoreManager.storeExists(vectorStore)) {
        const availableStores = vectorStoreManager.getAvailableStores();
        console.log(`Vector store "${vectorStore}" not found. Available stores:`, availableStores);
        return res.status(404).json({ 
          error: `Vector store "${vectorStore}" not found`,
          available: availableStores,
          message: availableStores.length > 0 ? 
            `Available stores: ${availableStores.join(', ')}` : 
            'No vector stores available. Upload documents to create them.'
        });
      }

      // Use default user and chat IDs if not provided
      const userIdToUse = userId || 'default';
      const chatIdToUse = chatId || 'default';
      const selectedStore = vectorStore || 'combined';

      console.log(`Received question from User ${userIdToUse}, Chat ${chatIdToUse}, Store ${selectedStore}: ${question}`);
      
      console.log(`Using vector store: ${selectedStore}`);
      
      const response = await chatManager.processMessage(
        question, 
        userIdToUse, 
        chatIdToUse, 
        selectedStore,
        modelConfig
      );
      
      res.json({
        answer: response.text,
        sources: response.sourceDocuments ? 
          response.sourceDocuments.map((doc: Document) => ({
            content: doc.pageContent,
            metadata: doc.metadata
          })) : [],
        vectorStore: selectedStore,
        userId: userIdToUse,
        chatId: chatIdToUse
      });
      
      console.log(`Response to User ${userIdToUse}, Chat ${chatIdToUse}, Store ${selectedStore}: ${response.text}`);
      console.log('==============================================');
      
    } catch (error) {
      console.error('Error processing the query in api.ts:', error);
      res.status(500).json({ 
        error: 'Failed to process your question',
        message: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  }) as express.RequestHandler);

  // Endpoint to list all users
  app.get('/api/users', (_: Request, res: Response) => {
    const users = chatManager.getUsers();
    res.json({ users });
  });

  // Endpoint to list all vector stores for a user
  app.get('/api/users/:userId/vector-stores', (req: Request, res: Response) => {
    const { userId } = req.params;
    const vectorStores = chatManager.getUserVectorStores(userId);
    res.json({ userId, vectorStores });
  });

  // Endpoint to list all chats for a user and vector store
  app.get('/api/users/:userId/vector-stores/:vectorName/chats', (req: Request, res: Response) => {
    const { userId, vectorName } = req.params;
    const chats = chatManager.getUserVectorChats(userId, vectorName);
    res.json({ userId, vectorName, chats });
  });

  // Endpoint to clear chat history
  app.delete('/api/users/:userId/vector-stores/:vectorName/chats/:chatId', (req: Request, res: Response) => {
    const { userId, vectorName, chatId } = req.params;
    chatManager.clearChatHistory(userId, vectorName, chatId);
    res.json({ 
      message: 'Chat history cleared successfully',
      userId,
      vectorName,
      chatId
    });
  });

  // Endpoint to get complete chat history messages
  app.get('/api/users/:userId/vector-stores/:vectorName/chats/:chatId/messages', (req: Request, res: Response) => {
    const { userId, vectorName, chatId } = req.params;
    const chatHistory = chatManager.chatHistoryManager.getChatHistory(userId, vectorName, chatId);
    
    res.json({
      userId,
      vectorName,
      chatId,
      messages: chatHistory.map((exchange: [string, string], index: number) => ({
        id: index,
        question: exchange[0],
        answer: exchange[1],
        timestamp: new Date().toISOString()
      }))
    });
  });

  // Global error handlers to prevent server crashes
  process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    console.error('Stack:', error.stack);
  });

  process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  });

  // Function to start the server
  const startServer = () => {
    return new Promise<void>((resolve) => {
      const server = app.listen(PORT, () => {
        console.log(`\nAPI server running at http://localhost:${PORT}`);
        console.log('You can send questions to /api/chat endpoint');
        console.log('To specify a vector store, include "vectorStore" in your request');
        console.log('To maintain separate chat contexts, include "userId" and "chatId" in your request');
        console.log('Each combination of userId, vectorStore, and chatId maintains a separate chat history');
        console.log('You can add documents using the /api/add-document endpoint');
        resolve();
      });

      // Set server timeout to handle large file uploads
      server.timeout = 300000; // 5 minutes
      server.keepAliveTimeout = 120000; // 2 minutes
    });
  };

  return {
    startServer
  };
} 