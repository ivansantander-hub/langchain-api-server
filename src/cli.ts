import { config } from 'dotenv';
import { startCLI } from './lib/chat.js';

// Load environment variables
config();

// Check if OpenAI API key is set
if (!process.env.OPENAI_API_KEY) {
  console.error('Error: OPENAI_API_KEY is not set in .env');
  process.exit(1);
}

async function main() {
  try {
    // Start CLI interface
    await startCLI();
  } catch (error) {
    console.error('Error starting CLI interface:', error);
  }
}

main(); 