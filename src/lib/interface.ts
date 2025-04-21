import * as readline from 'readline';
import { ChatOpenAI } from '@langchain/openai';
import { VectorStoreManager } from './vectorstore.js';
import { createChatChain } from './model.js';

// Chat interface with vector store selection
export function startChatInterface(
  defaultChain: any, 
  model: ChatOpenAI, 
  vectorStoreManager: VectorStoreManager,
  chatManager: any
) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  // Display available vector stores
  const stores = vectorStoreManager.getAvailableStores();
  console.log('\nAvailable vector stores:');
  stores.forEach(store => console.log(` - ${store}`));
  console.log('\nYou can select a vector store by typing "use <store_name>"');
  console.log('Type "exit" to quit the chat.\n');
  
  // Current vector store
  let currentStore = 'combined';
  
  const promptUser = () => {
    rl.question('\nYou: ', async (input) => {
      // Check for commands
      if (input.toLowerCase() === 'exit') {
        console.log('Goodbye!');
        rl.close();
        return;
      }
      
      // Command to change vector store
      if (input.toLowerCase().startsWith('use ')) {
        const storeName = input.substring(4).trim();
        if (vectorStoreManager.storeExists(storeName)) {
          currentStore = storeName;
          console.log(`Now using vector store: ${currentStore}`);
        } else {
          console.log(`Vector store "${storeName}" not found. Available stores:`);
          vectorStoreManager.getAvailableStores().forEach(store => console.log(` - ${store}`));
        }
        promptUser();
        return;
      }
      
      // Command to list available stores
      if (input.toLowerCase() === 'list stores') {
        console.log('Available vector stores:');
        vectorStoreManager.getAvailableStores().forEach(store => console.log(` - ${store}`));
        promptUser();
        return;
      }
      
      // Process message with the chat manager
      try {
        console.log(`\nUsing vector store: ${currentStore}`);
        console.log(`Thinking...`);
        
        const response = await chatManager.processMessage(input, currentStore);
        
        console.log(`\nAI: ${response.text}`);
        
        // Display source documents if available
        if (response.sourceDocuments && response.sourceDocuments.length > 0) {
          console.log('\nSources:');
          response.sourceDocuments.slice(0, 3).forEach((doc: any, i: number) => {
            console.log(`\nSource ${i + 1}:`);
            console.log(`${doc.pageContent.substring(0, 150)}...`);
            if (doc.metadata && doc.metadata.source) {
              console.log(`Source: ${doc.metadata.source}`);
            }
          });
        }
      } catch (error) {
        console.error('Error processing your question:', error);
      }
      
      promptUser();
    });
  };
  
  console.log('Welcome to the Document Chat CLI! Ask a question about your documents.');
  promptUser();
} 