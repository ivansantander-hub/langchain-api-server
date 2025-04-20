import express, { Request, Response } from 'express';
import cors from 'cors';
import { RetrievalQAChain } from 'langchain/chains';
import { ChatOpenAI } from '@langchain/openai';
import { VectorStoreManager } from './vectorstore.js';
import { createChatChain } from './model.js';

// Create Express app with support for multiple vector stores
export function createApiServer(
  defaultChain: RetrievalQAChain, 
  model: ChatOpenAI,
  vectorStoreManager: VectorStoreManager
) {
  const app = express();
  const PORT = process.env.PORT || 3000;

  // Middleware
  app.use(cors());
  app.use(express.json());

  // Home route
  app.get('/', (req: Request, res: Response) => {
    res.json({ 
      message: 'LangChain Document Chat API', 
      endpoints: {
        '/api/chat': 'POST - Send a question to get an answer from the documents',
        '/api/vector-stores': 'GET - List all available vector stores'
      }
    });
  });

  // Endpoint to list all available vector stores
  app.get('/api/vector-stores', (req: Request, res: Response) => {
    const stores = vectorStoreManager.getAvailableStores();
    res.json({
      stores,
      default: 'combined'
    });
  });

  // Chat endpoint with optional vector store selection
  app.post('/api/chat', async (req: Request, res: Response) => {
    try {
      const { question, vectorStore } = req.body;
      console.log('🚀 ~ app.post ~ question:', question)
      console.log('🚀 ~ app.post ~ vectorStore:', vectorStore)
      
      if (!question) {
        res.status(400).json({ error: 'Question is required' });
        return;
      }

      console.log(`Received question: ${question}`);
      
      let chain = defaultChain;
      
      // Use specified vector store if provided
      if (vectorStore && vectorStore !== 'combined') {
        console.log(`Using vector store: ${vectorStore}`);
        
        // Check if the requested store exists
        if (!vectorStoreManager.storeExists(vectorStore)) {
          res.status(404).json({ 
            error: `Vector store "${vectorStore}" not found`,
            available: vectorStoreManager.getAvailableStores()
          });
          return;
        }
        
        // Create a new chain with the specified vector store
        try {
          const specificRetriever = vectorStoreManager.getRetriever(vectorStore);
          chain = createChatChain(model, specificRetriever);
        } catch (error) {
          console.error(`Error creating chain for ${vectorStore}:`, error);
          res.status(500).json({ error: `Failed to use vector store "${vectorStore}"` });
          return;
        }
      } else {
        console.log('Using default combined vector store');
      }
      
      console.log('Searching for answer...');
      const response = await chain.call({ query: question });
      console.log('🚀 ~ app.post ~ response:', response)
      
      res.json({
        answer: response.text,
        sources: response.sourceDocuments ? 
          response.sourceDocuments.map((doc: any) => ({
            content: doc.pageContent,
            metadata: doc.metadata
          })) : [],
        vectorStore: vectorStore || 'combined'
      });
    } catch (error) {
      console.error('Error processing the query in api.ts:', error);
      res.status(500).json({ error: 'Failed to process your question' });
    }
  });

  // Function to start the server
  const startServer = () => {
    return new Promise<void>((resolve) => {
      app.listen(PORT, () => {
        console.log(`\nAPI server running at http://localhost:${PORT}`);
        console.log('You can send questions to /api/chat endpoint');
        console.log('To specify a vector store, include "vectorStore" in your request');
        resolve();
      });
    });
  };

  return {
    startServer
  };
} 