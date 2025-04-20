import { loadDocuments, splitDocuments, loadSingleDocument, listAvailableDocuments } from './document.js';
import { createEmbeddings, VectorStoreManager } from './vectorstore.js';
import { createLanguageModel, createChatChain } from './model.js';
import { startChatInterface } from './interface.js';
import { createApiServer } from './api.js';

// Main initialization function for the chat system with multiple vector stores
export async function initializeChat() {
  console.log('Initializing chat application with documents...');
  
  // Create embeddings and vector store manager
  const embeddings = createEmbeddings();
  const vectorStoreManager = new VectorStoreManager(embeddings);
  
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