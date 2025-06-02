import express, { Request, Response, RequestHandler } from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { VectorStoreManager, EnhancedVectorStoreManager, createBalancedEmbeddings } from './vectorstore.js';
import { availableModels, defaultModelConfig, ModelConfig } from './model.js';
import { saveUploadedDocument, loadSingleDocument, splitDocuments, UserFileManager, loadUserDocument, splitDocumentsAdvanced } from './document.js';
import OpenAI from 'openai';
import { ChatHistoryManager } from './chatHistory.js';
import { specs, swaggerUi } from './swagger.js';

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
  // Initialize enhanced components
  const embeddings = createBalancedEmbeddings();
  const enhancedVectorManager = new EnhancedVectorStoreManager(embeddings);
  const userFileManager = new UserFileManager();
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

  // Swagger configuration
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, {
    explorer: true,
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'LangChain Chat API Documentation'
  }));

  // API Routes

  // Home route - serve the web client
  app.get('/', (_: Request, res: Response) => {
    res.sendFile(path.join(publicPath, 'index.html'));
  });

  /**
   * @swagger
   * /api/health:
   *   get:
   *     summary: Server health check
   *     description: Endpoint to verify server health status and get system information
   *     tags: [Health]
   *     responses:
   *       200:
   *         description: Server running correctly
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 status:
   *                   type: string
   *                 timestamp:
   *                   type: string
   *                 uptime:
   *                   type: number
   *                 memory:
   *                   type: object
   *                 version:
   *                   type: string
   *                 vectorStores:
   *                   type: number
   */
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

  /**
   * @swagger
   * /api:
   *   get:
   *     summary: API information
   *     description: Get general information about the API and its available endpoints
   *     tags: [Health]
   *     responses:
   *       200:
   *         description: API information
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                 documentation:
   *                   type: string
   *                 endpoints:
   *                   type: object
   */
  // API Info route
  app.get('/api', (_: Request, res: Response) => {
    res.json({ 
      message: 'LangChain Document Chat API',
      documentation: '/api-docs - Complete Swagger documentation',
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

  /**
   * @swagger
   * /api/vector-stores:
   *   get:
   *     summary: Get available vector stores
   *     description: List all available vector stores in the system
   *     tags: [Vector Stores]
   *     responses:
   *       200:
   *         description: List of vector stores
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 stores:
   *                   type: array
   *                   items:
   *                     type: string
   *                 default:
   *                   type: string
   */
  // Endpoint to list all available vector stores
  app.get('/api/vector-stores', (_: Request, res: Response) => {
    const stores = vectorStoreManager.getAvailableStores();
    res.json({
      stores,
      default: 'combined'
    });
  });

  // Endpoint to list user files
  app.get('/api/users/:userId/files', (req: Request, res: Response) => {
    const { userId } = req.params;
    const files = userFileManager.listUserFiles(userId);
    
    const filesWithStats = files.map(filename => {
      const stats = userFileManager.getFileStats(userId, filename);
      const isVectorized = enhancedVectorManager.userVectorStoreExists(userId, filename);
      
      return {
        filename,
        size: stats?.size || 0,
        created: stats?.created || new Date(),
        modified: stats?.modified || new Date(),
        vectorized: isVectorized,
        ready_for_chat: isVectorized
      };
    });
    
    res.json({ 
      userId,
      files: filesWithStats,
      total: files.length
    });
  });

  // Endpoint to list user vector stores
  app.get('/api/users/:userId/vector-stores', (req: Request, res: Response) => {
    const { userId } = req.params;
    const vectorStores = enhancedVectorManager.listUserVectorStores(userId);
    
    res.json({ 
      userId, 
      vectorStores,
      total: vectorStores.length
    });
  });

  /**
   * @swagger
   * /api/models:
   *   get:
   *     summary: Get available models (cached)
   *     description: List available OpenAI models from local cache
   *     tags: [Models]
   *     responses:
   *       200:
   *         description: List of available models
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 models:
   *                   type: array
   *                   items:
   *                     type: string
   *                 default:
   *                   type: string
   */
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

  /**
   * @swagger
   * /api/upload-file:
   *   post:
   *     summary: Upload text file for user
   *     description: Upload a text file to user's directory (txt files only)
   *     tags: [Documents]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - userId
   *               - filename
   *               - content
   *             properties:
   *               userId:
   *                 type: string
   *                 description: User ID to organize files
   *               filename:
   *                 type: string
   *                 description: Name of the text file (will add .txt if missing)
   *               content:
   *                 type: string
   *                 description: Text content of the file
   *           examples:
   *             text_document:
   *               summary: User text document
   *               value:
   *                 userId: "user123"
   *                 filename: "my-notes"
   *                 content: "This is my note content with important information..."
   *     responses:
   *       200:
   *         description: File uploaded successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                 userId:
   *                   type: string
   *                 filename:
   *                   type: string
   *                 size:
   *                   type: number
   *                 ready_for_vectorization:
   *                   type: boolean
   *       400:
   *         description: Invalid input data
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 error:
   *                   type: string
   *       413:
   *         description: File too large
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 error:
   *                   type: string
   *       500:
   *         description: Error uploading file
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 error:
   *                   type: string
   *                 details:
   *                   type: string
   */
  // New endpoint to upload files only (no vectorization)
  app.post('/api/upload-file', (async (req: Request, res: Response) => {
    try {
      const { userId, filename, content } = req.body;
      
      if (!userId || !filename || !content) {
        return res.status(400).json({ error: 'userId, filename and content are required' });
      }

      // Validate content size (10MB limit for text)
      if (content.length > 10000000) {
        return res.status(413).json({ error: 'File too large. Maximum size is 10MB for text files.' });
      }

      console.log(`Uploading file for user ${userId}: ${filename}`);
      
      const savedFilename = await userFileManager.saveUserFile(userId, filename, content);
      const fileStats = userFileManager.getFileStats(userId, savedFilename);
      
      console.log(`File uploaded successfully: ${userId}/${savedFilename}`);
      
      res.json({ 
        message: `File ${savedFilename} uploaded successfully for user ${userId}`,
        userId,
        filename: savedFilename,
        size: fileStats?.size || 0,
        ready_for_vectorization: true
      });
    } catch (error) {
      console.error('Error uploading file:', error);
      
      res.status(500).json({ 
        error: 'Failed to upload file',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }) as express.RequestHandler);

  /**
   * @swagger
   * /api/load-vector:
   *   post:
   *     summary: Vectorize uploaded text file
   *     description: Process an uploaded text file and create vector embeddings for search
   *     tags: [Vector Stores]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - userId
   *               - filename
   *             properties:
   *               userId:
   *                 type: string
   *                 description: User ID who owns the file
   *               filename:
   *                 type: string
   *                 description: Name of the uploaded file to vectorize
   *           examples:
   *             vectorize_file:
   *               summary: Vectorize user file
   *               value:
   *                 userId: "user123"
   *                 filename: "my-notes.txt"
   *     responses:
   *       200:
   *         description: File vectorized successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                 userId:
   *                   type: string
   *                 filename:
   *                   type: string
   *                 chunks:
   *                   type: number
   *                 vectorStoreId:
   *                   type: string
   *                 ready_for_chat:
   *                   type: boolean
   *       400:
   *         description: Invalid input or file not found
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 error:
   *                   type: string
   *       500:
   *         description: Error during vectorization
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 error:
   *                   type: string
   *                 details:
   *                   type: string
   */
  // New endpoint to vectorize uploaded files
  app.post('/api/load-vector', (async (req: Request, res: Response) => {
    try {
      const { userId, filename } = req.body;
      
      if (!userId || !filename) {
        return res.status(400).json({ error: 'userId and filename are required' });
      }

      // Check if file exists
      if (!userFileManager.userFileExists(userId, filename)) {
        return res.status(400).json({ error: `File ${filename} not found for user ${userId}. Upload it first using /api/upload-file` });
      }

      console.log(`Starting vectorization for user ${userId}, file: ${filename}`);
      
      // Load the user document
      const documents = await loadUserDocument(userId, filename);
      console.log(`Loaded ${documents.length} document sections`);
      
      // Split documents with advanced chunking
      const chunks = await splitDocumentsAdvanced(documents);
      console.log(`Created ${chunks.length} high-quality chunks`);
      
      if (chunks.length === 0) {
        throw new Error('No valid chunks could be created from the document');
      }
      
      // Create user vector store
      const vectorStore = await enhancedVectorManager.createUserVectorStore(userId, filename, chunks);
      const vectorStoreId = `${userId}_${filename.replace(/\.[^/.]+$/, "")}`;
      
      console.log(`Vector store created successfully: ${vectorStoreId}`);
      
      res.json({ 
        message: `File ${filename} vectorized successfully for user ${userId}`,
        userId,
        filename,
        chunks: chunks.length,
        vectorStoreId,
        ready_for_chat: true
      });
    } catch (error) {
      console.error('Error during vectorization:', error);
      
      res.status(500).json({ 
        error: 'Failed to vectorize file',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }) as express.RequestHandler);

  /**
   * @swagger
   * /api/chat:
   *   post:
   *     summary: Send message to chat
   *     description: Process a question and return a response based on indexed documents
   *     tags: [Chat]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - question
   *             properties:
   *               question:
   *                 type: string
   *                 description: The question to ask
   *               vectorStore:
   *                 type: string
   *                 description: Specific vector store to use
   *               userId:
   *                 type: string
   *                 description: User ID for chat context
   *               chatId:
   *                 type: string
   *                 description: Chat ID for conversation context
   *               modelConfig:
   *                 type: object
   *                 description: Model configuration options
   *           examples:
   *             simple:
   *               summary: Simple question
   *               value:
   *                 question: "What is LangChain?"
   *             with_vector_store:
   *               summary: With specific vector store
   *               value:
   *                 question: "What are the product benefits?"
   *                 vectorStore: "product_manual"
   *                 userId: "user123"
   *                 chatId: "session1"
   *     responses:
   *       200:
   *         description: Response generated successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 answer:
   *                   type: string
   *                   description: Response generated by the model
   *                 sources:
   *                   type: array
   *                   items:
   *                     type: object
   *                     properties:
   *                       content:
   *                         type: string
   *                       metadata:
   *                         type: object
   *                   description: Source documents used
   *                 vectorStore:
   *                   type: string
   *                   description: Vector store used
   *                 userId:
   *                   type: string
   *                   description: User ID
   *                 chatId:
   *                   type: string
   *                   description: Chat ID
   *       400:
   *         description: Question required
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 error:
   *                   type: string
   *       404:
   *         description: Vector store not found
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 error:
   *                   type: string
   *                 available:
   *                   type: array
   *                   items:
   *                     type: string
   *                 message:
   *                   type: string
   *       500:
   *         description: Internal server error
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 error:
   *                   type: string
   *                 message:
   *                   type: string
   */
  // Enhanced chat endpoint with user vector store support
  app.post('/api/chat', (async (req: Request, res: Response) => {
    try {
      const { question, vectorStore, userId, chatId, modelConfig, filename } = req.body;
      
      if (!question) {
        res.status(400).json({ error: 'Question is required' });
        return;
      }

      // Use default user and chat IDs if not provided
      const userIdToUse = userId || 'default';
      const chatIdToUse = chatId || 'default';

      let selectedStore = vectorStore || 'combined';
      let usingUserStore = false;

      // Check if user wants to use their own vectorized file
      if (userId && filename) {
        // Try to use user's vector store for specific file
        const userVectorStore = await enhancedVectorManager.getUserVectorStore(userId, filename);
        if (userVectorStore) {
          selectedStore = `${userId}_${filename.replace(/\.[^/.]+$/, "")}`;
          usingUserStore = true;
          console.log(`Using user vector store: ${selectedStore}`);
        } else {
          return res.status(404).json({ 
            error: `Vector store for file "${filename}" not found for user "${userId}". Vectorize the file first using /api/load-vector`,
            suggestion: 'Use /api/load-vector to vectorize your uploaded file first'
          });
        }
      } else if (vectorStore) {
        // Validate if provided vectorStore exists (legacy stores)
        if (!vectorStoreManager.storeExists(vectorStore)) {
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
      }

      console.log(`Received question from User ${userIdToUse}, Chat ${chatIdToUse}, Store ${selectedStore}: ${question}`);
      
      let response;
      
      if (usingUserStore) {
        // Use enhanced vector manager for user stores
        const userVectorStore = await enhancedVectorManager.getUserVectorStore(userId!, filename!);
        if (!userVectorStore) {
          throw new Error('User vector store became unavailable');
        }
        
        const retriever = enhancedVectorManager.getAdvancedRetriever(selectedStore, {
          k: 8,
          searchType: 'advanced',
          searchKwargs: { threshold: 0.6 }
        });
        
        const relevantDocs = await retriever.getRelevantDocuments(question);
        
        // For now, we'll use a simple response format
        // In a real implementation, you'd integrate this with your chat manager
        response = {
          text: `Based on your document "${filename}", I found ${relevantDocs.length} relevant sections. Here's what I can tell you: ${relevantDocs.length > 0 ? relevantDocs[0].pageContent.substring(0, 200) + '...' : 'No relevant information found.'}`,
          sourceDocuments: relevantDocs
        };
      } else {
        // Use legacy chat manager for system stores
        response = await chatManager.processMessage(
          question, 
          userIdToUse, 
          chatIdToUse, 
          selectedStore,
          modelConfig
        );
      }
      
      res.json({
        answer: response.text,
        sources: response.sourceDocuments ? 
          response.sourceDocuments.map((doc: Document) => ({
            content: doc.pageContent,
            metadata: doc.metadata
          })) : [],
        vectorStore: selectedStore,
        userId: userIdToUse,
        chatId: chatIdToUse,
        usingUserStore,
        filename: filename || null
      });
      
      console.log(`Response to User ${userIdToUse}, Chat ${chatIdToUse}, Store ${selectedStore}: ${response.text.substring(0, 100)}...`);
      console.log('==============================================');
      
    } catch (error) {
      console.error('Error processing the query in api.ts:', error);
      res.status(500).json({ 
        error: 'Failed to process your question',
        message: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  }) as express.RequestHandler);

  /**
   * @swagger
   * /api/users:
   *   get:
   *     summary: List all users
   *     description: Get a list of all users who have chat history
   *     tags: [Users]
   *     responses:
   *       200:
   *         description: List of users
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 users:
   *                   type: array
   *                   items:
   *                     type: string
   */
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

  /**
   * @swagger
   * /api/users/{userId}/vector-stores/{vectorName}/chats/{chatId}:
   *   delete:
   *     summary: Clear chat history
   *     description: Delete chat history for a specific user, vector store, and chat
   *     tags: [Users]
   *     parameters:
   *       - in: path
   *         name: userId
   *         required: true
   *         schema:
   *           type: string
   *         description: User ID
   *       - in: path
   *         name: vectorName
   *         required: true
   *         schema:
   *           type: string
   *         description: Vector store name
   *       - in: path
   *         name: chatId
   *         required: true
   *         schema:
   *           type: string
   *         description: Chat ID
   *     responses:
   *       200:
   *         description: History deleted successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                 userId:
   *                   type: string
   *                 vectorName:
   *                   type: string
   *                 chatId:
   *                   type: string
   */
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

  /**
   * @swagger
   * /api/users/{userId}/vector-stores/{vectorName}/chats/{chatId}/messages:
   *   get:
   *     summary: Get chat history
   *     description: Get chat history for a specific user, vector store, and chat
   *     tags: [Users]
   *     parameters:
   *       - in: path
   *         name: userId
   *         required: true
   *         schema:
   *           type: string
   *         description: User ID
   *       - in: path
   *         name: vectorName
   *         required: true
   *         schema:
   *           type: string
   *         description: Vector store name
   *       - in: path
   *         name: chatId
   *         required: true
   *         schema:
   *           type: string
   *         description: Chat ID
   *     responses:
   *       200:
   *         description: Chat history
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 userId:
   *                   type: string
   *                 vectorName:
   *                   type: string
   *                 chatId:
   *                   type: string
   *                 messages:
   *                   type: array
   *                   items:
   *                     type: object
   *                     properties:
   *                       id:
   *                         type: number
   *                       question:
   *                         type: string
   *                       answer:
   *                         type: string
   *                       timestamp:
   *                         type: string
   */

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