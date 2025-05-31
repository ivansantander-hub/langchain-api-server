import { loadDocuments, splitDocuments, loadSingleDocument, listAvailableDocuments } from './document.js';
import { createEmbeddings, VectorStoreManager } from './vectorstore.js';
import { createLanguageModel, createChatChain, formatChatHistory, ModelConfig, defaultModelConfig } from './model.js';
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
  if (!combinedStoreExists && documentNames.length > 0) {
    // If combined store doesn't exist, create it with all documents
    console.log('Creating combined vector store from all documents...');
    const docs = await loadDocuments();
    const splitDocs = await splitDocuments(docs);
    await vectorStoreManager.loadOrCreateVectorStore('combined', splitDocs);
  } else if (combinedStoreExists) {
    // Load existing combined store only if it exists
    console.log('Loading existing combined vector store...');
    await vectorStoreManager.loadOrCreateVectorStore('combined');
  } else {
    // Create empty combined store if no documents available
    console.log('No documents available, creating empty combined vector store...');
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
  
  // Initialize model first
  const model = createLanguageModel();
  
  // Try to get combined store retriever, fallback to null if doesn't exist
  let defaultRetriever = null;
  let defaultChain = null;
  
  try {
    // Since we now always create the combined store, we should always have it
    defaultRetriever = vectorStoreManager.getRetriever('combined');
    defaultChain = createChatChain(model, defaultRetriever);
    console.log('Default chain created with combined vector store');
  } catch (error) {
    console.error('Error creating default chain with combined store:', error);
    // This shouldn't happen anymore since we always create combined store
  }
  
  // Create a manager function to handle chat state
  const chatManager = {
    chain: defaultChain,
    model,
    vectorStoreManager,
    chatHistoryManager,
    
    // Process a message in a specific context
    async processMessage(message: string, userId: string = 'default', chatId: string = 'default', storeName: string = 'combined', modelConfig?: ModelConfig) {
      try {
        // Get appropriate retriever if specified
        let chain = this.chain;
        let model = this.model;
        
        // If model configuration is provided, create a new model instance
        if (modelConfig) {
          model = createLanguageModel(modelConfig);
        }
        
        if (storeName !== 'combined') {
          const retriever = this.vectorStoreManager.getRetriever(storeName);
          chain = createChatChain(model, retriever, modelConfig?.systemPrompt);
        } else if (!chain || modelConfig) {
          // If no default chain and requesting combined, or if custom config provided
          if (this.vectorStoreManager.storeExists('combined')) {
            const retriever = this.vectorStoreManager.getRetriever('combined');
            chain = createChatChain(model, retriever, modelConfig?.systemPrompt);
            // Only update default chain if no custom config
            if (!modelConfig) {
              this.chain = chain;
            }
          } else {
            // Create combined store on demand if it doesn't exist
            console.log('Creating combined store on demand...');
            await this.vectorStoreManager.loadOrCreateVectorStore('combined');
            const retriever = this.vectorStoreManager.getRetriever('combined');
            chain = createChatChain(model, retriever, modelConfig?.systemPrompt);
            // Only update default chain if no custom config
            if (!modelConfig) {
              this.chain = chain;
            }
          }
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