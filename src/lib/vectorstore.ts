import { OpenAIEmbeddings } from '@langchain/openai';
import { HNSWLib } from '@langchain/community/vectorstores/hnswlib';
import { Document } from "langchain/document";
import { VectorStoreRetriever } from '@langchain/core/vectorstores';
import * as fs from 'fs';
import * as path from 'path';

// Interface for search results with scores
export interface SearchResult {
  doc: Document;
  score: number;
}

// Interface for retriever configuration
export interface RetrieverConfig {
  k: number;
  searchType: 'similarity' | 'mmr';
  searchKwargs?: {
    fetchK?: number;
    lambda?: number;
  };
}

// Create embeddings
export function createEmbeddings() {
  console.log('Creating embeddings with OpenAI...');
  return new OpenAIEmbeddings({
    modelName: "text-embedding-3-large",
    dimensions: 3072,
    stripNewLines: true,
    batchSize: 512
  });
}

// Alternative embedding configuration for faster but still good performance
export function createFastEmbeddings() {
  console.log('Creating fast embeddings with OpenAI...');
  return new OpenAIEmbeddings({
    modelName: "text-embedding-3-small",
    dimensions: 1536,
    stripNewLines: true,
    batchSize: 1024
  });
}

// Class to manage multiple vector stores
export class VectorStoreManager {
  private embeddings: OpenAIEmbeddings;
  private vectorStores: Map<string, HNSWLib> = new Map();
  private baseDir: string = './vectorstores';
  
  constructor(embeddings: OpenAIEmbeddings) {
    this.embeddings = embeddings;
    // Ensure the base directory exists
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
  }
  
  // Load or create a vector store with a specific name
  async loadOrCreateVectorStore(name: string, docs?: Document[]): Promise<HNSWLib> {
    const storePath = path.join(this.baseDir, name);
    
    // Check if the store already exists
    if (this.vectorStores.has(name)) {
      return this.vectorStores.get(name)!;
    }
    
    try {
      // Try to load existing vector store
      console.log(`Trying to load existing vector store: ${name}...`);
      const store = await HNSWLib.load(storePath, this.embeddings);
      this.vectorStores.set(name, store);
      return store;
    } catch (error) {
      // For 'combined' store, create an empty one if no documents provided
      if (name === 'combined' && !docs) {
        console.log(`Creating empty combined vector store...`);
        // Create a dummy document to initialize the vector store
        const dummyDoc = new Document({
          pageContent: "This is a placeholder document. Upload documents to start chatting.",
          metadata: { source: "system", type: "placeholder" }
        });
        const store = await HNSWLib.fromDocuments([dummyDoc], this.embeddings);
        await store.save(storePath);
        this.vectorStores.set(name, store);
        return store;
      }
      
      // If loading fails or no documents provided, throw error
      if (!docs) {
        throw new Error(`Vector store ${name} does not exist and no documents provided to create it.`);
      }
      
      // Create a new vector store
      console.log(`Creating new vector store: ${name}...`);
      const store = await HNSWLib.fromDocuments(docs, this.embeddings);
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
  
  // Get a retriever for a specific vector store with improved search parameters
  getRetriever(storeName: string, k: number = 10, searchType: 'similarity' | 'mmr' = 'mmr'): VectorStoreRetriever<HNSWLib> {
    if (!this.vectorStores.has(storeName)) {
      throw new Error(`Vector store ${storeName} not found. Load it first.`);
    }
    
    const store = this.vectorStores.get(storeName)!;
    
    if (searchType === 'mmr') {
      return store.asRetriever({
        k: Math.min(k, 20),
        searchType: 'mmr',
        searchKwargs: {
          fetchK: k * 3,
          lambda: 0.25,
        },
      });
    } else {
      return store.asRetriever({
        k: Math.min(k, 20),
        searchType: 'similarity',
      });
    }
  }
  
  // Advanced retriever with multiple search strategies and reranking
  getAdvancedRetriever(storeName: string, k: number = 8): { getRelevantDocuments: (query: string) => Promise<Document[]> } {
    if (!this.vectorStores.has(storeName)) {
      throw new Error(`Vector store ${storeName} not found. Load it first.`);
    }

    const store = this.vectorStores.get(storeName)!;
    
    // Return a custom retriever that combines multiple strategies
    return {
      getRelevantDocuments: async (query: string): Promise<Document[]> => {
        try {
          // 1. Get similarity-based results with scores
          const similarityResults = await store.similaritySearchWithScore(query, k * 2);

          // 2. Filter results by score threshold and deduplicate
          const filteredResults: SearchResult[] = similarityResults
            .filter(([doc, score]: [Document, number]) => score >= 0.6)
            .map(([doc, score]: [Document, number]): SearchResult => ({ doc, score }))
            .sort((a: SearchResult, b: SearchResult) => b.score - a.score)
            .slice(0, k);

          console.log(`Advanced retriever: Found ${filteredResults.length} relevant documents (score >= 0.6) for query: "${query.substring(0, 50)}..."`);
          
          return filteredResults.map((result: SearchResult) => result.doc);
        } catch (error) {
          console.error('Error in advanced retriever:', error);
          // Fallback to basic similarity search
          return await store.similaritySearch(query, k);
        }
      }
    };
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
  
  // Check if a store is loaded in memory
  isStoreLoaded(name: string): boolean {
    return this.vectorStores.has(name);
  }
}

// Legacy function for backward compatibility
export async function loadVectorStore(
  splitDocs: Document[], 
  embeddings: OpenAIEmbeddings
): Promise<HNSWLib> {
  try {
    console.log('Trying to load existing vector store...');
    return await HNSWLib.load('./vectorstore', embeddings);
  } catch {
    console.log('No existing vector store found, creating a new one...');
    // If it doesn't exist, create a new one
    const vectorStore = await HNSWLib.fromDocuments(splitDocs, embeddings);
    await vectorStore.save('./vectorstore');
    console.log('Vector store saved in ./vectorstore');
    return vectorStore;
  }
}

// Legacy function for backward compatibility
export function createRetriever(vectorStore: HNSWLib): VectorStoreRetriever<HNSWLib> {
  return vectorStore.asRetriever({
    k: 5,
    searchType: 'similarity',
  });
} 