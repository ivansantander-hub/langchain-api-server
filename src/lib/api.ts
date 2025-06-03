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
   *     summary: Health check
   *     description: Server health status
   *     tags: [System]
   *     responses:
   *       200:
   *         description: Server is healthy
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 status:
   *                   type: string
   *                   example: "healthy"
   *                 timestamp:
   *                   type: string
   *                 uptime:
   *                   type: number
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
   *     description: Available endpoints overview
   *     tags: [System]
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
   *     summary: List vector stores
   *     description: Get all available vector stores
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
   *                   example: "combined"
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
   *     summary: List available models
   *     description: Get cached OpenAI models
   *     tags: [Models]
   *     responses:
   *       200:
   *         description: Available models
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
   *     summary: Upload text file
   *     description: Upload a text file for a user
   *     tags: [Files]
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
   *                 example: "user123"
   *               filename:
   *                 type: string
   *                 example: "my-document.txt"
   *               content:
   *                 type: string
   *                 example: "Document content here..."
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
   *         description: Invalid input
   *       413:
   *         description: File too large
   *       500:
   *         description: Server error
   */
  // New endpoint to upload and vectorize files in one step
  app.post('/api/upload-and-vectorize', (async (req: Request, res: Response) => {
    try {
      const { userId, filename, content } = req.body;
      
      if (!userId || !filename || !content) {
        return res.status(400).json({ error: 'userId, filename and content are required' });
      }

      // Validate content size (10MB limit for text)
      if (content.length > 10000000) {
        return res.status(413).json({ error: 'File too large. Maximum size is 10MB for text files.' });
      }

      console.log(`Uploading and vectorizing file for user ${userId}: ${filename}`);
      
      // Step 1: Save the file
      const savedFilename = await userFileManager.saveUserFile(userId, filename, content);
      const fileStats = userFileManager.getFileStats(userId, savedFilename);
      
      console.log(`File uploaded successfully: ${userId}/${savedFilename}`);
      
      // Step 2: Vectorize the file
      console.log(`Starting vectorization for user ${userId}, file: ${savedFilename}`);
      
      // Load the user document
      const documents = await loadUserDocument(userId, savedFilename);
      console.log(`Loaded ${documents.length} document sections`);
      
      // Split documents with advanced chunking
      const chunks = await splitDocumentsAdvanced(documents);
      console.log(`Created ${chunks.length} high-quality chunks`);
      
      if (chunks.length === 0) {
        throw new Error('No valid chunks could be created from the document');
      }
      
      // Create user vector store
      const vectorStore = await enhancedVectorManager.createUserVectorStore(userId, savedFilename, chunks);
      const vectorStoreId = `${userId}_${savedFilename.replace(/\.[^/.]+$/, "")}`;
      
      console.log(`Vector store created successfully: ${vectorStoreId}`);
      
      res.json({ 
        message: `File ${savedFilename} uploaded and vectorized successfully for user ${userId}`,
        userId,
        filename: savedFilename,
        size: fileStats?.size || 0,
        chunks: chunks.length,
        vectorStoreId,
        ready_for_chat: true
      });
    } catch (error) {
      console.error('Error during upload and vectorization:', error);
      
      res.status(500).json({ 
        error: 'Failed to upload and vectorize file',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }) as express.RequestHandler);

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
   * /api/upload-and-vectorize:
   *   post:
   *     summary: Upload and vectorize file in one step
   *     description: Upload a text file and automatically create vector embeddings
   *     tags: [Files]
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
   *                 example: "user123"
   *               filename:
   *                 type: string
   *                 example: "my-document.txt"
   *               content:
   *                 type: string
   *                 example: "Document content here..."
   *     responses:
   *       200:
   *         description: File uploaded and vectorized successfully
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
   *                 chunks:
   *                   type: number
   *                 vectorStoreId:
   *                   type: string
   *                 ready_for_chat:
   *                   type: boolean
   *       400:
   *         description: Invalid input
   *       413:
   *         description: File too large
   *       500:
   *         description: Server error
   *
   * @swagger
   * /api/load-vector:
   *   post:
   *     summary: Vectorize file
   *     description: Create vector embeddings from uploaded file
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
   *                 example: "user123"
   *               filename:
   *                 type: string
   *                 example: "my-document.txt"
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
   *       500:
   *         description: Vectorization failed
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
   *     summary: Chat with documents
   *     description: Ask questions about uploaded documents
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
   *                 example: "What is this document about?"
   *               vectorStore:
   *                 type: string
   *                 example: "combined"
   *               userId:
   *                 type: string
   *                 example: "user123"
   *               chatId:
   *                 type: string
   *                 example: "session1"
   *               filename:
   *                 type: string
   *                 example: "my-document.txt"
   *               modelConfig:
   *                 type: object
   *     responses:
   *       200:
   *         description: Chat response
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 answer:
   *                   type: string
   *                 sources:
   *                   type: array
   *                   items:
   *                     type: object
   *                     properties:
   *                       content:
   *                         type: string
   *                       metadata:
   *                         type: object
   *                 vectorStore:
   *                   type: string
   *                 userId:
   *                   type: string
   *                 chatId:
   *                   type: string
   *       400:
   *         description: Question required
   *       404:
   *         description: Vector store not found
   *       500:
   *         description: Processing failed
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
        // First, check if this is a user vector store for the provided userId
        if (userId) {
          const userVectorStores = enhancedVectorManager.listUserVectorStores(userId);
          const userVectorStoreExists = userVectorStores.includes(vectorStore);
          
          if (userVectorStoreExists) {
            // For user vector stores, we need to use the full name with userId prefix
            selectedStore = `${userId}_${vectorStore}`;
            usingUserStore = true;
            console.log(`Using user vector store: ${selectedStore} for user: ${userId}`);
          } else {
            // Check if vectorStore has user format (userId_documentName)
            const userStoreMatch = vectorStore.match(/^([^_]+)_(.+)$/);
            if (userStoreMatch) {
              const [, vectorUserId, documentName] = userStoreMatch;
              console.log(`Detected user vector store format: userId=${vectorUserId}, documentName=${documentName}`);
              
              // Check if this user vector store exists
              const userVectorStoresForDetectedUser = enhancedVectorManager.listUserVectorStores(vectorUserId);
              const userVectorStoreExistsForDetectedUser = userVectorStoresForDetectedUser.includes(vectorStore);
              
              if (userVectorStoreExistsForDetectedUser) {
                selectedStore = vectorStore;
                usingUserStore = true;
                console.log(`Using user vector store: ${selectedStore} for detected user: ${vectorUserId}`);
              } else {
                console.log(`User vector store "${vectorStore}" not found. Available user stores for ${vectorUserId}:`, userVectorStoresForDetectedUser);
                return res.status(404).json({ 
                  error: `Vector store "${vectorStore}" not found for user "${vectorUserId}". Vectorize the file first using /api/load-vector`,
                  available: userVectorStoresForDetectedUser,
                  suggestion: 'Use /api/load-vector to vectorize your uploaded file first'
                });
              }
            } else {
              // Not a user store for this user, check legacy stores
              if (!vectorStoreManager.storeExists(vectorStore)) {
                const availableStores = vectorStoreManager.getAvailableStores();
                console.log(`Vector store "${vectorStore}" not found. Available legacy stores:`, availableStores);
                console.log(`Available user stores for ${userId}:`, userVectorStores);
                return res.status(404).json({ 
                  error: `Vector store "${vectorStore}" not found`,
                  available: availableStores,
                  userStores: userVectorStores,
                  message: availableStores.length > 0 ? 
                    `Available stores: ${availableStores.join(', ')}` : 
                    'No vector stores available. Upload documents to create them.'
                });
              }
            }
          }
        } else {
          // No userId provided, check legacy stores only
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
      }

      console.log(`Received question from User ${userIdToUse}, Chat ${chatIdToUse}, Store ${selectedStore}: ${question}`);
      
      let response;
      
      if (usingUserStore) {
        // Use enhanced vector manager for user stores with proper AI chat
        let actualUserId = userId;
        let actualFilename = filename;
        
        // If we detected from vectorStore format, extract userId and filename
        if (!actualUserId || !actualFilename) {
          const userStoreMatch = selectedStore.match(/^([^_]+)_(.+)$/);
          if (userStoreMatch) {
            const [, vectorUserId, documentName] = userStoreMatch;
            actualUserId = actualUserId || vectorUserId;
            
            // Use document name with potential extensions for filename
            actualFilename = actualFilename || documentName + '.txt'; // fallback with .txt extension
          }
        }
        
        console.log(`Using user vector store with userId: ${actualUserId}, filename: ${actualFilename}`);
        
        // Get relevant documents first
        const retriever = enhancedVectorManager.getAdvancedRetriever(selectedStore, {
          k: 12,
          searchType: 'advanced',
          searchKwargs: { threshold: 0.5 }
        });
        
        const relevantDocs = await retriever.getRelevantDocuments(question);
        console.log(`Found ${relevantDocs.length} relevant documents for question: "${question}"`);
        
        if (relevantDocs.length === 0) {
          // If no relevant docs found, provide a helpful response
          response = {
            text: `No encontré información específica sobre "${question}" en el documento "${actualFilename}". El documento parece contener otro tipo de información. ¿Podrías reformular tu pregunta o preguntarme sobre el contenido general del documento?`,
            sourceDocuments: []
          };
        } else {
          // Use the chat manager's model and approach but with user store retriever
          const { createLanguageModel, createChatChain, formatChatHistory } = await import('./model.js');
          
          // Create a custom model config that preserves user settings but overrides system prompt for documents
          const documentModelConfig = {
            ...modelConfig, // Preserve user's temperature, maxTokens, etc.
            // Don't use the user's system prompt for document chat - we need our specialized one
          };
          
          const model = createLanguageModel(documentModelConfig);
          
          // Escape document content to prevent template parsing issues
          const escapeTemplateChars = (text: string) => {
            return text.replace(/\{/g, '{{').replace(/\}/g, '}}');
          };
          
          // Create a more effective system prompt that emphasizes document usage
          const documentContext = relevantDocs.map((doc, index) => 
            `Documento ${index + 1}:\n${escapeTemplateChars(doc.pageContent)}\n`
          ).join('\n---\n');
          
          // Create a specialized prompt that combines user preferences with document handling
          let effectivePrompt = `Eres un asistente de IA experto en análisis de documentos.

TIENES ACCESO COMPLETO al documento "${escapeTemplateChars(actualFilename)}" del usuario y DEBES usar esta información para responder.

CONTEXTO DEL DOCUMENTO:
${documentContext}

INSTRUCCIONES IMPORTANTES:
1. SIEMPRE utiliza la información del documento para responder
2. Sé específico y cita partes relevantes del documento
3. Si la pregunta está relacionada con el contenido del documento, responde basándote EN ESA INFORMACIÓN
4. Proporciona respuestas detalladas y útiles basadas en el contenido disponible
5. Si necesitas aclaración, pregunta específicamente sobre qué parte del documento necesita más información`;

          // If user has a custom system prompt, append it as additional context but keep document priority
          if (modelConfig?.systemPrompt && modelConfig.systemPrompt.trim()) {
            effectivePrompt += `\n\nINSTRUCCIONES ADICIONALES DEL USUARIO:
${escapeTemplateChars(modelConfig.systemPrompt)}

IMPORTANTE: Las instrucciones anteriores sobre usar el documento y contexto siempre tienen prioridad. Usa estas instrucciones adicionales solo como contexto complementario.`;
          }

          effectivePrompt += `\n\nResponde en español de manera clara y profesional.`;
          
          // Create a custom retriever that returns the relevant docs we already found
          const customRetriever = {
            getRelevantDocuments: async () => relevantDocs
          };
          
          const chain = createChatChain(model, customRetriever, effectivePrompt);
          
          // Get chat history for this user and store (legacy format for model processing)
          const history = chatManager.chatHistoryManager.getChatHistoryLegacy(userIdToUse, selectedStore, chatIdToUse);
          // Escape template characters in chat history
          const escapedHistory: [string, string][] = history.map(([question, answer]) => [
            escapeTemplateChars(question),
            escapeTemplateChars(answer)
          ]);
          const formattedHistory = formatChatHistory(escapedHistory);
          
          // Generate AI response
          const aiResponse = await chain.invoke({
            input: escapeTemplateChars(question),
            chat_history: formattedHistory,
          });
          
          const responseText = typeof aiResponse.content === 'string' 
            ? aiResponse.content 
            : typeof aiResponse === 'string' 
            ? aiResponse
            : JSON.stringify(aiResponse.content || aiResponse);
          
          // Update chat history
          chatManager.chatHistoryManager.addExchange(userIdToUse, selectedStore, chatIdToUse, question, responseText);
          
          response = {
            text: responseText,
            sourceDocuments: relevantDocs
          };
        }
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
   *     summary: List users
   *     description: Get all users with chat history
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

  // Endpoint to list all chats for a user (across all vector stores)
  app.get('/api/users/:userId/chats', ((req: Request, res: Response) => {
    const { userId } = req.params;
    
    try {
      // Get chats with metadata
      const chatsWithMetadata = chatManager.chatHistoryManager.getUserChatsWithMetadata(userId);
      
      // Transform to expected format for frontend
      const chats = chatsWithMetadata.map(metadata => metadata.chatId);
      
      res.json({ 
        userId, 
        chats,
        metadata: chatsWithMetadata // Include metadata for frontend use
      });
    } catch (error) {
      console.error('Error getting user chats:', error);
      res.status(500).json({ 
        error: 'Failed to get user chats',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }) as RequestHandler);

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
   *     description: Delete chat history for specific context
   *     tags: [Users]
   *     parameters:
   *       - in: path
   *         name: userId
   *         required: true
   *         schema:
   *           type: string
   *         example: "user123"
   *       - in: path
   *         name: vectorName
   *         required: true
   *         schema:
   *           type: string
   *         example: "combined"
   *       - in: path
   *         name: chatId
   *         required: true
   *         schema:
   *           type: string
   *         example: "session1"
   *     responses:
   *       200:
   *         description: History cleared successfully
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
  // Endpoint to clear chat history for a specific vector store
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

  // Endpoint to create a new chat for a user
  app.post('/api/users/:userId/chats', ((req: Request, res: Response) => {
    const { userId } = req.params;
    const { name } = req.body;
    
    // Generate unique chat ID
    const chatId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const chatName = name || `Chat ${new Date().toLocaleDateString('es-ES')}`;
    
    // Create initial empty message to establish the chat
    chatManager.chatHistoryManager.addExchange(userId, 'combined', chatId, 'Hola', 'Hola! ¿En qué puedo ayudarte?');
    
    res.json({ 
      message: 'Chat created successfully',
      userId,
      chatId,
      chat: {
        id: chatId,
        name: chatName,
        created: new Date().toISOString(),
        lastMessage: 'Hola! ¿En qué puedo ayudarte?'
      }
    });
  }) as express.RequestHandler);

  // Endpoint to rename a chat
  app.put('/api/users/:userId/chats/:chatId', ((req: Request, res: Response) => {
    const { userId, chatId } = req.params;
    const { name } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Chat name is required' });
    }
    
    try {
      // Use the new rename functionality from ChatHistoryManager
      chatManager.chatHistoryManager.renameChatTitle(userId, chatId, name.trim());
      
      res.json({ 
        message: 'Chat renamed successfully',
        userId,
        chatId,
        newName: name.trim()
      });
    } catch (error) {
      console.error('Error renaming chat:', error);
      res.status(500).json({ 
        error: 'Failed to rename chat',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }) as express.RequestHandler);

  // Endpoint to delete entire chat (all vector stores)
  app.delete('/api/users/:userId/chats/:chatId', (req: Request, res: Response) => {
    const { userId, chatId } = req.params;
    chatManager.chatHistoryManager.deleteChatCompletely(userId, chatId);
    res.json({ 
      message: 'Chat deleted completely',
      userId,
      chatId
    });
  });

  /**
   * @swagger
   * /api/users/{userId}/vector-stores/{vectorName}/chats/{chatId}/messages:
   *   get:
   *     summary: Get chat history
   *     description: Retrieve chat messages for specific context
   *     tags: [Users]
   *     parameters:
   *       - in: path
   *         name: userId
   *         required: true
   *         schema:
   *           type: string
   *         example: "user123"
   *       - in: path
   *         name: vectorName
   *         required: true
   *         schema:
   *           type: string
   *         example: "combined"
   *       - in: path
   *         name: chatId
   *         required: true
   *         schema:
   *           type: string
   *         example: "session1"
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
      messages: chatHistory // Now directly return MessageExchange[] with real timestamps
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