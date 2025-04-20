import express, { Request, Response } from 'express';
import cors from 'cors';
import { RetrievalQAChain } from 'langchain/chains';

// Create Express app
export function createApiServer(chain: RetrievalQAChain) {
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
        '/api/chat': 'POST - Send a question to get an answer from the documents'
      }
    });
  });

  // Chat endpoint
  app.post('/api/chat', async (req: Request, res: Response) => {
    try {
      const { question } = req.body;
      
      if (!question) {
        res.status(400).json({ error: 'Question is required' });
        return;
      }

      console.log(`Received question: ${question}`);
      console.log('Searching for answer...');
      
      const response = await chain.call({ query: question });
      
      res.json({
        answer: response.text,
        sources: response.sourceDocuments ? 
          response.sourceDocuments.map((doc: any) => ({
            content: doc.pageContent,
            metadata: doc.metadata
          })) : []
      });
    } catch (error) {
      console.error('Error processing the query:', error);
      res.status(500).json({ error: 'Failed to process your question' });
    }
  });

  // Function to start the server
  const startServer = () => {
    return new Promise<void>((resolve) => {
      app.listen(PORT, () => {
        console.log(`\nAPI server running at http://localhost:${PORT}`);
        console.log('You can send questions to /api/chat endpoint');
        resolve();
      });
    });
  };

  return {
    startServer
  };
} 