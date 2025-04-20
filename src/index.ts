import { config } from 'dotenv';
import { initializeChat, createApiServer } from './lib/chat.js';

// Load environment variables
config();

// Check if OpenAI API key is set
if (!process.env.OPENAI_API_KEY) {
  console.error('Error: OPENAI_API_KEY is not set in .env');
  process.exit(1);
}

async function main() {
  try {
    // Initialize chat system
    const { chain } = await initializeChat();
    
    // Initialize and start API server
    const apiServer = createApiServer(chain);
    await apiServer.startServer();
  } catch (error) {
    console.error('Error in the application:', error);
  }
}

main(); 