import { config } from 'dotenv';
import { initializeChat, startChatInterface } from './lib/chat.js';

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
    
    // Start chat interface
    startChatInterface(chain);
  } catch (error) {
    console.error('Error in the application:', error);
  }
}

main(); 