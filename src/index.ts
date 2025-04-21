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
    // Initialize chat system with multiple vector stores
    const chatManager = await initializeChat();
    
    // Initialize and start API server with vector store manager
    const apiServer = createApiServer(
      chatManager, 
      chatManager.model, 
      chatManager.vectorStoreManager
    );
    await apiServer.startServer();
    
    // Log available vector stores
    const stores = chatManager.vectorStoreManager.getAvailableStores();
    console.log('\nAvailable vector stores:');
    stores.forEach(store => console.log(` - ${store}`));
    console.log('\nSend requests with {"question": "your question", "vectorStore": "store_name"}');
    console.log('Or omit vectorStore to use the combined store with all documents.\n');
    
  } catch (error) {
    console.error('Error in the application:', error);
  }
}

main(); 