import * as readline from 'readline';
import { ChatOpenAI } from '@langchain/openai';
import { VectorStoreManager } from './vectorstore.js';
import { createChatChain } from './model.js';

// Chat interface with vector store selection and user/chat context
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
  
  // Display available contexts
  const users = chatManager.getUsers();
  if (users.length > 0) {
    console.log('\nExisting users with chat history:');
    users.forEach((userId: string) => {
      const vectorStores = chatManager.getUserVectorStores(userId);
      console.log(` - User ${userId}:`);
      vectorStores.forEach((vectorName: string) => {
        const chats = chatManager.getUserVectorChats(userId, vectorName);
        console.log(`   - Vector Store ${vectorName}: ${chats.length} chat(s)`);
        if (chats.length > 0) {
          chats.forEach((chat: string) => console.log(`     - ${chat}`));
        }
      });
    });
  }
  
  console.log('\nCLI Commands:');
  console.log(' - use <store_name> - Switch to a different vector store');
  console.log(' - list stores - Show available vector stores');
  console.log(' - user <userId> - Set current user ID');
  console.log(' - chat <chatId> - Set current chat ID');
  console.log(' - clear history - Clear history for current user/vector store/chat');
  console.log(' - exit - Quit the chat');
  console.log('\nType your questions to interact with the system.\n');
  
  // Current context
  let currentStore = 'combined';
  let currentUserId = 'cli-user';
  let currentChatId = 'default';
  
  console.log(`Current context: User=${currentUserId}, Chat=${currentChatId}, Store=${currentStore}`);
  
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
      
      // Command to set user ID
      if (input.toLowerCase().startsWith('user ')) {
        currentUserId = input.substring(5).trim();
        console.log(`Set current user to: ${currentUserId}`);
        
        // Show existing vector stores for this user
        const vectorStores = chatManager.getUserVectorStores(currentUserId);
        if (vectorStores.length > 0) {
          console.log(`Existing vector stores for user ${currentUserId}:`);
          vectorStores.forEach((vectorName: string) => {
            const chats = chatManager.getUserVectorChats(currentUserId, vectorName);
            console.log(` - Vector Store ${vectorName}: ${chats.length} chat(s)`);
          });
        } else {
          console.log(`No existing chat history for user ${currentUserId}.`);
        }
        
        promptUser();
        return;
      }
      
      // Command to set chat ID
      if (input.toLowerCase().startsWith('chat ')) {
        currentChatId = input.substring(5).trim();
        console.log(`Set current chat to: ${currentChatId}`);
        promptUser();
        return;
      }
      
      // Command to clear chat history
      if (input.toLowerCase() === 'clear history') {
        chatManager.clearChatHistory(currentUserId, currentStore, currentChatId);
        console.log(`Cleared chat history for User=${currentUserId}, Vector Store=${currentStore}, Chat=${currentChatId}`);
        promptUser();
        return;
      }
      
      // Process message with the chat manager
      try {
        console.log(`\nUsing context: User=${currentUserId}, Chat=${currentChatId}, Store=${currentStore}`);
        console.log(`Thinking...`);
        
        const response = await chatManager.processMessage(
          input, 
          currentUserId, 
          currentChatId, 
          currentStore
        );
        
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