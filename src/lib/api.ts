import express from 'express';
import cors from 'cors';
import { ChatOpenAI } from '@langchain/openai';
import { VectorStoreManager } from './vectorstore.js';
import { createChatChain } from './model.js';
import { saveUploadedDocument, loadSingleDocument, splitDocuments } from './document.js';

interface AddDocumentRequest {
  filename: string;
  content: string;
}

interface ChatRequest {
  question: string;
  vectorStore?: string;
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
  app.use(express.json({ limit: '10mb' }));

  // Home route
  app.get('/', (req, res) => {
    res.json({ 
      message: 'LangChain Document Chat API', 
      endpoints: {
        '/api/chat': 'POST - Send a question to get an answer from the documents',
        '/api/vector-stores': 'GET - List all available vector stores',
        '/api/add-document': 'POST - Upload and add a document to vector stores'
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

  // Endpoint to add a document to vector stores
  app.post('/api/add-document', async (req: any, res: any) => {
    try {
      const { filename, content } = req.body as AddDocumentRequest;
      
      if (!filename || !content) {
        return res.status(400).json({ error: 'filename and content are required' });
      }

      console.log(`Received document upload request: ${filename}`);
      
      // Save the document to the docs directory
      const savedFilename = await saveUploadedDocument(content, filename);
      
      // Load and process the document
      const docLoaded = await loadSingleDocument(savedFilename);
      const docChunks = await splitDocuments(docLoaded);
      
      // Add to vector stores (individual and combined)
      await vectorStoreManager.addDocumentToVectorStores(savedFilename, docChunks);
      
      res.json({ 
        message: `Document ${savedFilename} successfully added to vector stores`,
        vectorStores: [
          savedFilename.replace(/\.[^/.]+$/, ""), // Individual store
          'combined' // Combined store
        ]
      });
    } catch (error) {
      console.error('Error processing document upload:', error);
      res.status(500).json({ error: 'Failed to process document upload' });
    }
  });

  // Chat endpoint with optional vector store selection
  app.post('/api/chat', async (req: any, res: any) => {
    try {
      const { question, vectorStore } = req.body as ChatRequest;
      
      if (!question) {
        res.status(400).json({ error: 'Question is required' });
        return;
      }

      // Validate if provided vectorStore exists
      if (vectorStore && !vectorStoreManager.storeExists(vectorStore)) {
        return res.status(404).json({ 
          error: `Vector store "${vectorStore}" not found`,
          available: vectorStoreManager.getAvailableStores()
        });
      }

      console.log(`Received question: ${question}`);
      
      // Process the message using our chat manager
      const selectedStore = vectorStore || 'combined';
      console.log(`Using vector store: ${selectedStore}`);
      
      const response = await chatManager.processMessage(question, selectedStore);
      
      res.json({
        answer: response.text,
        sources: response.sourceDocuments ? 
          response.sourceDocuments.map((doc: any) => ({
            content: doc.pageContent,
            metadata: doc.metadata
          })) : [],
        vectorStore: selectedStore
      });
      
      console.log('Response: ', response.text);
      console.log('==============================================');
    } catch (error) {
      console.error('Error processing the query in api.ts:', error);
      res.status(500).json({ 
        error: 'Failed to process your question',
        message: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  });

  // Function to start the server
  const startServer = () => {
    return new Promise<void>((resolve) => {
      app.listen(PORT, () => {
        console.log(`\nAPI server running at http://localhost:${PORT}`);
        console.log('You can send questions to /api/chat endpoint');
        console.log('To specify a vector store, include "vectorStore" in your request');
        console.log('You can add documents using the /api/add-document endpoint');
        resolve();
      });
    });
  };

  return {
    startServer
  };
} 