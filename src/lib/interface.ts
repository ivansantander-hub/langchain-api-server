import { createInterface } from 'readline';
import { RetrievalQAChain } from 'langchain/chains';
import { ChatOpenAI } from '@langchain/openai';
import { VectorStoreManager } from './vectorstore.js';
import { createChatChain } from './model.js';

// Setup chat interface with vector store selection
export function startChatInterface(
  defaultChain: RetrievalQAChain, 
  model: ChatOpenAI,
  vectorStoreManager: VectorStoreManager
) {
  // Setup readline interface for user input
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  
  // Get available vector stores
  const vectorStores = vectorStoreManager.getAvailableStores();
  
  console.log('\nSystem ready to answer questions!');
  console.log('You can ask about the content of the documents in the docs/.');
  console.log('\nAvailable vector stores:');
  vectorStores.forEach(store => console.log(` - ${store}`));
  console.log('\nTo select a specific vector store, type "@store_name" before your question.');
  console.log('Example: "@document1 What does this document say about X?"');
  console.log('If no store is specified, the combined store with all documents will be used.');
  
  // Current chain to use
  let currentChain = defaultChain;
  let currentStore = 'combined';
  
  // Function to handle chat interaction
  const chat = () => {
    rl.question('\nWhat would you like to ask about the documents? (Type "exit" to quit)\n> ', async (input) => {
      if (input.toLowerCase() === 'exit') {
        console.log('Goodbye!');
        rl.close();
        return;
      }
      
      let question = input;
      let vectorStore = currentStore;
      
      // Check if user specified a vector store
      if (input.startsWith('@')) {
        const parts = input.split(' ');
        const storeSelector = parts[0].substring(1); // Remove @ symbol
        
        if (vectorStoreManager.storeExists(storeSelector)) {
          vectorStore = storeSelector;
          question = parts.slice(1).join(' ');
          console.log(`Using vector store: ${vectorStore}`);
          
          // Create a new chain with the specified vector store
          try {
            const specificRetriever = vectorStoreManager.getRetriever(vectorStore);
            currentChain = createChatChain(model, specificRetriever);
            currentStore = vectorStore;
          } catch (error) {
            console.error(`Error creating chain for ${vectorStore}:`, error);
            console.log('Falling back to default combined store.');
            vectorStore = 'combined';
            currentChain = defaultChain;
            currentStore = 'combined';
          }
        } else {
          console.log(`Vector store "${storeSelector}" not found, using ${currentStore}.`);
          
          // Keep @ symbol as part of the question if store doesn't exist
          question = input;
        }
      }
      
      if (!question.trim()) {
        console.log('Please enter a question.');
        chat();
        return;
      }
      
      try {
        console.log('Searching for answer...');
        const response = await currentChain._call({ query: question });
        
        console.log('\n--- Response ---');
        console.log(response.text);
        console.log(`\nUsing vector store: ${currentStore}`);
        
        chat();
      } catch (error) {
        console.error('Error processing the query: in interface.ts', error);
        chat();
      }
    });
  };
  
  chat();
} 