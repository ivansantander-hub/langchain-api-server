import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { ChatOpenAI } from '@langchain/openai';
import { VectorStoreManager } from './vectorstore.js';
import { createChatChain } from './model.js';
import { saveUploadedDocument, loadSingleDocument, splitDocuments } from './document.js';

// Get __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface AddDocumentRequest {
  filename: string;
  content: string;
}

interface ChatRequest {
  question: string;
  vectorStore?: string;
  userId?: string;
  chatId?: string;
}

// Create Express app with support for multiple vector stores
export function createApiServer(
  chatManager: any,
  model: ChatOpenAI,
  vectorStoreManager: VectorStoreManager
) {
  const app = express();
  const PORT = process.env.PORT || 3000;

  // Middleware
  app.use(cors());
  app.use(express.json({ limit: '50mb' })); // Increase limit for large files
  
  // Add timeout middleware for file uploads
  app.use('/api/add-document', (req, res, next) => {
    req.setTimeout(300000); // 5 minutes timeout for uploads
    res.setTimeout(300000);
    next();
  });

  // Serve static files from the frontend directory
  const publicPath = path.join(__dirname, '../../frontend');
  app.use(express.static(publicPath));

  // API Routes prefix
  app.use('/api', express.Router());

  // Home route - serve the web client
  app.get('/', (req, res) => {
    res.sendFile(path.join(publicPath, 'index.html'));
  });

  // Health check endpoint for Railway and other deployment platforms
  app.get('/api/health', (req, res) => {
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
  app.get('/api', (req, res) => {
    res.json({ 
      message: 'LangChain Document Chat API', 
      endpoints: {
        '/api/health': 'GET - Health check for deployment platforms',
        '/api/chat': 'POST - Send a question to get an answer from the documents',
        '/api/vector-stores': 'GET - List all available vector stores',
        '/api/add-document': 'POST - Upload and add a document to vector stores',
        '/api/users': 'GET - List all users with chat history',
        '/api/users/:userId/vector-stores': 'GET - List all vector stores with chat history for a user',
        '/api/users/:userId/vector-stores/:vectorName/chats': 'GET - List all chats for a specific user and vector store',
        '/api/users/:userId/vector-stores/:vectorName/chats/:chatId': 'DELETE - Clear chat history for a specific context',
        '/api/users/:userId/vector-stores/:vectorName/chats/:chatId/messages': 'GET - Get complete chat history messages for a specific context'
      }
    });
  });

  // Endpoint to list all available vector stores
  app.get('/api/vector-stores', (req, res) => {
    const stores = vectorStoreManager.getAvailableStores();
    res.json({
      stores,
      default: 'combined'
    });
  });

  // Debug endpoint to check vector store status
  app.get('/api/debug/vector-stores', (req, res) => {
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
  app.post('/api/add-document', async (req: any, res: any) => {
    let savedFilename: string | null = null;
    
    try {
      const { filename, content } = req.body as AddDocumentRequest;
      
      if (!filename || !content) {
        return res.status(400).json({ error: 'filename and content are required' });
      }

      console.log(`Received document upload request: ${filename}`);
      console.log(`Content size: ${content.length} characters`);
      
      // Validate file size (prevent memory issues)
      if (content.length > 10000000) { // 10MB text limit
        return res.status(413).json({ error: 'File too large. Maximum size is 10MB.' });
      }
      
      // Save the document to the docs directory
      savedFilename = await saveUploadedDocument(content, filename);
      console.log(`Document saved successfully: ${savedFilename}`);
      
      // Load and process the document
      console.log('Loading document...');
      const docLoaded = await loadSingleDocument(savedFilename);
      
      console.log('Splitting document...');
      const docChunks = await splitDocuments(docLoaded);
      
      // Add to vector stores (individual and combined)
      console.log('Adding to vector stores...');
      await vectorStoreManager.addDocumentToVectorStores(savedFilename, docChunks);
      
      console.log(`Document ${savedFilename} processing completed successfully`);
      
      res.json({ 
        message: `Document ${savedFilename} successfully added to vector stores`,
        chunks: docChunks.length,
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
  });

  // Chat endpoint with vector store selection and user/chat context
  app.post('/api/chat', async (req: any, res: any) => {
    try {
      const { question, vectorStore, userId, chatId } = req.body as ChatRequest;
      
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
      
      // Process the message using our chat manager with context
      console.log(`Using vector store: ${selectedStore}`);
      
      const response = await chatManager.processMessage(
        question, 
        userIdToUse, 
        chatIdToUse, 
        selectedStore
      );
      
      res.json({
        answer: response.text,
        sources: response.sourceDocuments ? 
          response.sourceDocuments.map((doc: any) => ({
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
  });

  // Endpoint to list all users
  app.get('/api/users', (req, res) => {
    const users = chatManager.getUsers();
    res.json({ users });
  });

  // Endpoint to list all vector stores for a user
  app.get('/api/users/:userId/vector-stores', (req, res) => {
    const { userId } = req.params;
    const vectorStores = chatManager.getUserVectorStores(userId);
    res.json({ userId, vectorStores });
  });

  // Endpoint to list all chats for a user and vector store
  app.get('/api/users/:userId/vector-stores/:vectorName/chats', (req, res) => {
    const { userId, vectorName } = req.params;
    const chats = chatManager.getUserVectorChats(userId, vectorName);
    res.json({ userId, vectorName, chats });
  });

  // Endpoint to clear chat history
  app.delete('/api/users/:userId/vector-stores/:vectorName/chats/:chatId', (req, res) => {
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
  app.get('/api/users/:userId/vector-stores/:vectorName/chats/:chatId/messages', (req, res) => {
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
        timestamp: new Date().toISOString() // Note: actual timestamps are not stored in the current implementation
      }))
    });
  });

  // Global error handlers to prevent server crashes
  process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    console.error('Stack:', error.stack);
    // Don't exit the process, just log the error
  });

  process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    // Don't exit the process, just log the error
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