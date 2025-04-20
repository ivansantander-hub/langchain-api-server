import { loadDocuments, splitDocuments } from './document.js';
import { createEmbeddings, loadVectorStore, createRetriever } from './vectorstore.js';
import { createLanguageModel, createChatChain } from './model.js';
import { startChatInterface } from './interface.js';
import { createApiServer } from './api.js';

// Main initialization function for the chat system
export async function initializeChat() {
  console.log('Initializing chat application with documents...');
  
  // Load and process documents
  const docs = await loadDocuments();
  const splitDocs = await splitDocuments(docs);
  const embeddings = createEmbeddings();
  
  // Setup vector store and retriever
  console.log('Setting up vector store...');
  const vectorStore = await loadVectorStore(splitDocs, embeddings);
  const retriever = createRetriever(vectorStore);
  
  // Initialize model and chain
  const model = createLanguageModel();
  const chain = createChatChain(model, retriever);
  
  return { chain };
}

// Re-export the startChatInterface function for convenience
export { startChatInterface };

// Re-export the createApiServer function for API mode
export { createApiServer }; 