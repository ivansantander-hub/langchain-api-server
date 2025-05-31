import { OpenAIEmbeddings } from '@langchain/openai';
import { FaissStore } from '@langchain/community/vectorstores/faiss';
import { Document } from "langchain/document";
import * as fs from 'fs';
import * as path from 'path';

// Create embeddings
export function createEmbeddings() {
  console.log('Creating embeddings with OpenAI...');
  return new OpenAIEmbeddings({
    modelName: "text-embedding-3-small",
    dimensions: 1536
  });
}

// Class to manage multiple vector stores
export class VectorStoreManager {
  private embeddings: OpenAIEmbeddings;
  private vectorStores: Map<string, FaissStore> = new Map();
  private baseDir: string = './vectorstores';
  
  constructor(embeddings: OpenAIEmbeddings) {
    this.embeddings = embeddings;
    // Ensure the base directory exists
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
  }
  
  // Load or create a vector store with a specific name
  async loadOrCreateVectorStore(name: string, docs?: Document[]): Promise<FaissStore> {
    const storePath = path.join(this.baseDir, name);
    
    // Check if the store already exists
    if (this.vectorStores.has(name)) {
      return this.vectorStores.get(name)!;
    }
    
    try {
      // Try to load existing vector store
      console.log(`Trying to load existing vector store: ${name}...`);
      const store = await FaissStore.load(storePath, this.embeddings);
      this.vectorStores.set(name, store);
      return store;
    } catch (error) {
      // If loading fails or no documents provided, throw error
      if (!docs) {
        throw new Error(`Vector store ${name} does not exist and no documents provided to create it.`);
      }
      
      // Create a new vector store
      console.log(`Creating new vector store: ${name}...`);
      const store = await FaissStore.fromDocuments(docs, this.embeddings);
      await store.save(storePath);
      this.vectorStores.set(name, store);
      return store;
    }
  }
  
  // Add a document to both individual and combined vector stores
  async addDocumentToVectorStores(documentName: string, documentChunks: Document[]): Promise<void> {
    // Get store name from document name (without extension)
    const storeName = documentName.replace(/\.[^/.]+$/, "");
    
    console.log(`Adding document ${documentName} to vector stores...`);
    console.log(`Document chunks: ${documentChunks.length}`);
    
    let individualStoreSuccess = false;
    let combinedStoreSuccess = false;
    
    try {
      // 1. Add to individual vector store
      console.log(`Adding to individual store: ${storeName}`);
      try {
        const individualStore = await this.loadOrCreateVectorStore(storeName, documentChunks);
        // If the store already existed, add the new chunks
        if (this.storeExists(storeName) && individualStore !== null) {
          console.log(`Store ${storeName} already exists, adding new documents...`);
          await individualStore.addDocuments(documentChunks);
          await individualStore.save(path.join(this.baseDir, storeName));
        }
        individualStoreSuccess = true;
        console.log(`Successfully added to individual store: ${storeName}`);
      } catch (individualError) {
        console.error(`Error adding to individual store ${storeName}:`, individualError);
        // Continue with combined store even if individual fails
      }
      
      // 2. Add to combined vector store
      console.log('Adding to combined store');
      try {
        const combinedStore = await this.loadOrCreateVectorStore('combined');
        if (combinedStore !== null) {
          await combinedStore.addDocuments(documentChunks);
          await combinedStore.save(path.join(this.baseDir, 'combined'));
          combinedStoreSuccess = true;
          console.log('Successfully added to combined store');
        }
      } catch (combinedError) {
        console.error('Error adding to combined store:', combinedError);
                 // If neither store succeeded, throw error
         if (!individualStoreSuccess) {
           throw new Error(`Failed to add document to both individual and combined stores. Combined: ${combinedError instanceof Error ? combinedError.message : 'Unknown error'}`);
         }
      }
      
      if (individualStoreSuccess || combinedStoreSuccess) {
        console.log(`Document ${documentName} successfully added to ${individualStoreSuccess ? 'individual' : ''}${individualStoreSuccess && combinedStoreSuccess ? ' and ' : ''}${combinedStoreSuccess ? 'combined' : ''} store(s)`);
      } else {
        throw new Error('Failed to add document to any vector store');
      }
    } catch (error) {
      console.error(`Error adding document ${documentName} to vector stores:`, error);
      console.error('Error details:', error instanceof Error ? error.stack : 'No stack available');
      throw error;
    }
  }
  
  // Get a retriever for a specific vector store
  getRetriever(storeName: string, k: number = 5) {
    if (!this.vectorStores.has(storeName)) {
      throw new Error(`Vector store ${storeName} not found. Load it first.`);
    }
    
    return this.vectorStores.get(storeName)!.asRetriever({
      k,
      searchType: 'similarity',
    });
  }
  
  // Get the names of all available vector stores
  getAvailableStores(): string[] {
    if (!fs.existsSync(this.baseDir)) {
      return [];
    }
    
    return fs.readdirSync(this.baseDir)
      .filter(file => fs.statSync(path.join(this.baseDir, file)).isDirectory());
  }
  
  // Check if a store exists
  storeExists(name: string): boolean {
    return this.vectorStores.has(name) || 
           (fs.existsSync(path.join(this.baseDir, name)) && 
            fs.statSync(path.join(this.baseDir, name)).isDirectory());
  }
}

// Legacy function for backward compatibility
export async function loadVectorStore(
  splitDocs: Document[], 
  embeddings: OpenAIEmbeddings
): Promise<FaissStore> {
  try {
    console.log('Trying to load existing vector store...');
    return await FaissStore.load('./vectorstore', embeddings);
  } catch {
    console.log('No existing vector store found, creating a new one...');
    // If it doesn't exist, create a new one
    const vectorStore = await FaissStore.fromDocuments(splitDocs, embeddings);
    await vectorStore.save('./vectorstore');
    console.log('Vector store saved in ./vectorstore');
    return vectorStore;
  }
}

// Legacy function for backward compatibility
export function createRetriever(vectorStore: FaissStore) {
  return vectorStore.asRetriever({
    k: 5,
    searchType: 'similarity',
  });
} 