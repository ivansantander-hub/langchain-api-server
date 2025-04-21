import { loadDocuments, splitDocuments, loadSingleDocument, listAvailableDocuments } from './document.js';
import { createEmbeddings, VectorStoreManager } from './vectorstore.js';
import { createLanguageModel, createChatChain, formatChatHistory } from './model.js';
import { startChatInterface } from './interface.js';
import { createApiServer } from './api.js';
import { HumanMessage, AIMessage } from '@langchain/core/messages';
import { ChatHistoryManager } from './chatHistory.js';

// Main initialization function for the chat system with multiple vector stores
export async function initializeChat() {
  console.log('Initializing chat application with documents...');
  
  // Create embeddings and vector store manager
  const embeddings = createEmbeddings();
  const vectorStoreManager = new VectorStoreManager(embeddings);
  
  // Create chat history manager
  const chatHistoryManager = new ChatHistoryManager();
  
  // Check if combined store exists first before loading all documents
  let combinedStoreExists = vectorStoreManager.storeExists('combined');
  
  // Get available documents
  const documentNames = listAvailableDocuments();
  console.log(`Found ${documentNames.length} documents in docs directory`);
  
  // Create or load combined vector store
  if (!combinedStoreExists) {
    // If combined store doesn't exist, create it with all documents
    console.log('Creating combined vector store from all documents...');
    const docs = await loadDocuments();
    const splitDocs = await splitDocuments(docs);
    await vectorStoreManager.loadOrCreateVectorStore('combined', splitDocs);
  } else {
    // Load existing combined store
    console.log('Loading existing combined vector store...');
    await vectorStoreManager.loadOrCreateVectorStore('combined');
  }
  
  // Get existing vector stores (other than combined)
  const existingStores = new Set(
    vectorStoreManager.getAvailableStores().filter(store => store !== 'combined')
  );
  
  // Process each document
  console.log('Processing individual documents...');
  
  for (const docName of documentNames) {
    // Get the store name from the document name (without extension)
    const storeName = docName.replace(/\.[^/.]+$/, "");
    
    // Check if this document already has an individual vector store
    const isNewDocument = !existingStores.has(storeName);
    
    if (isNewDocument) {
      console.log(`New document detected: ${docName}, creating vector store...`);
      try {
        // Load and process the document
        const singleDoc = await loadSingleDocument(docName);
        const splitSingleDoc = await splitDocuments(singleDoc);
        
        // Add to both individual and combined stores
        await vectorStoreManager.addDocumentToVectorStores(docName, splitSingleDoc);
        console.log(`Added new document ${docName} to vector stores`);
      } catch (error) {
        console.error(`Error processing new document ${docName}:`, error);
      }
    } else {
      console.log(`Processing existing document: ${docName}`);
      try {
        // Just load the individual vector store
        await vectorStoreManager.loadOrCreateVectorStore(storeName);
      } catch (error) {
        console.error(`Error loading vector store for ${docName}:`, error);
      }
    }
  }
  
  // Use the combined store by default
  const defaultRetriever = vectorStoreManager.getRetriever('combined');
  
  // Initialize model and chain with the default retriever
  const model = createLanguageModel();
  const defaultChain = createChatChain(model, defaultRetriever);
  
  // Create a manager function to handle chat state
  const chatManager = {
    chain: defaultChain,
    model,
    vectorStoreManager,
    chatHistoryManager,
    
    // Process a message in a specific context
    async processMessage(message: string, userId: string = 'default', chatId: string = 'default', storeName: string = 'combined') {
      try {
        // Get appropriate retriever if specified
        let chain = this.chain;
        if (storeName !== 'combined') {
          const retriever = this.vectorStoreManager.getRetriever(storeName);
          chain = createChatChain(this.model, retriever);
        }
        
        // Get chat history for this user, vector store, and chat
        const history = this.chatHistoryManager.getChatHistory(userId, storeName, chatId);
        
        // Process the message with appropriate chat history
        const formattedHistory = formatChatHistory(history);
        const response = await chain.invoke({
          input: message,
          chat_history: formattedHistory,
        });
        
        // Convert response to string if needed
        const responseText = typeof response.content === 'string' 
          ? response.content 
          : JSON.stringify(response.content);
        
        // Update chat history
        this.chatHistoryManager.addExchange(userId, storeName, chatId, message, responseText);
        
        // Return the response in expected format
        return {
          text: responseText,
          sourceDocuments: [], // No source documents in the new implementation
        };
      } catch (error) {
        console.error("Error in processMessage:", error);
        return {
          text: "Lo siento, ocurrió un error al procesar tu pregunta. Por favor intenta de nuevo.",
          sourceDocuments: [],
        };
      }
    },
    
    // Get all vector stores for a user
    getUserVectorStores(userId: string): string[] {
      return this.chatHistoryManager.getUserVectorStores(userId);
    },
    
    // Get all chats for a user and vector store
    getUserVectorChats(userId: string, vectorName: string): string[] {
      return this.chatHistoryManager.getUserVectorChats(userId, vectorName);
    },
    
    // Get all users
    getUsers(): string[] {
      return this.chatHistoryManager.getUserIds();
    },
    
    // Clear chat history for a user, vector store, and chat
    clearChatHistory(userId: string, vectorName: string, chatId: string): void {
      this.chatHistoryManager.clearChatHistory(userId, vectorName, chatId);
    }
  };
  
  return chatManager;
}

// Initialize CLI chat interface with vector store selection
export async function startCLI() {
  const chatManager = await initializeChat();
  startChatInterface(chatManager.chain, chatManager.model, chatManager.vectorStoreManager, chatManager);
}

// Re-export the interfaces
export { startChatInterface, createApiServer }; 