import { loadDocuments, splitDocuments, loadSingleDocument, listAvailableDocuments } from './document.js';
import { createEmbeddings, VectorStoreManager } from './vectorstore.js';
import { createLanguageModel, createChatChain } from './model.js';
import { startChatInterface } from './interface.js';
import { createApiServer } from './api.js';

// Main initialization function for the chat system with multiple vector stores
export async function initializeChat() {
  console.log('Initializing chat application with documents...');
  
  // Load and process all documents for combined vector store
  const docs = await loadDocuments();
  const splitDocs = await splitDocuments(docs);
  
  // Create embeddings and vector store manager
  const embeddings = createEmbeddings();
  const vectorStoreManager = new VectorStoreManager(embeddings);
  
  // Create combined vector store with all documents
  console.log('Setting up combined vector store...');
  await vectorStoreManager.loadOrCreateVectorStore('combined', splitDocs);
  
  // Process each document individually and create separate vector stores
  console.log('Processing individual documents...');
  const documentNames = listAvailableDocuments();
  
  for (const docName of documentNames) {
    // Get the store name from the document name (without extension)
    const storeName = docName.replace(/\.[^/.]+$/, "");
    console.log(`Processing document for individual vectorization: ${docName}`);
    
    try {
      const singleDoc = await loadSingleDocument(docName);
      const splitSingleDoc = await splitDocuments(singleDoc);
      await vectorStoreManager.loadOrCreateVectorStore(storeName, splitSingleDoc);
      console.log(`Created vector store for document: ${storeName}`);
    } catch (error) {
      console.error(`Error processing document ${docName}:`, error);
    }
  }
  
  // Use the combined store by default
  const defaultRetriever = vectorStoreManager.getRetriever('combined');
  
  // Initialize model and chain with the default retriever
  const model = createLanguageModel();
  const defaultChain = createChatChain(model, defaultRetriever);
  
  return { 
    chain: defaultChain,
    model,
    vectorStoreManager
  };
}

// Initialize CLI chat interface with vector store selection
export async function startCLI() {
  const { chain, model, vectorStoreManager } = await initializeChat();
  startChatInterface(chain, model, vectorStoreManager);
}

// Re-export the interfaces
export { startChatInterface, createApiServer }; 