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
  searchType: 'similarity' | 'mmr' | 'advanced';
  searchKwargs?: {
    fetchK?: number;
    lambda?: number;
    threshold?: number;
  };
}

// Enhanced embedding configuration
export function createEmbeddings() {
  console.log('Creating high-quality embeddings with OpenAI text-embedding-3-large...');
  return new OpenAIEmbeddings({
    modelName: "text-embedding-3-large",
    dimensions: 3072, // Full dimensions for maximum quality
    stripNewLines: true,
    batchSize: 100, // Reduced batch size for better reliability
    maxRetries: 3
  });
}

// Balanced embedding configuration for production use
export function createBalancedEmbeddings() {
  console.log('Creating balanced embeddings with OpenAI text-embedding-3-small...');
  return new OpenAIEmbeddings({
    modelName: "text-embedding-3-small",
    dimensions: 1536,
    stripNewLines: true,
    batchSize: 200,
    maxRetries: 3
  });
}

// Fast embedding configuration for development
export function createFastEmbeddings() {
  console.log('Creating fast embeddings with OpenAI ada-002...');
  return new OpenAIEmbeddings({
    modelName: "text-embedding-ada-002",
    stripNewLines: true,
    batchSize: 512,
    maxRetries: 2
  });
}

// Enhanced Vector Store Manager with user-specific stores
export class EnhancedVectorStoreManager {
  private embeddings: OpenAIEmbeddings;
  private vectorStores: Map<string, HNSWLib> = new Map();
  private baseDir: string = './vectorstores';
  private userStoresDir: string = './user-vectorstores';
  private storeMetadata: Map<string, { created: Date; documentCount: number; lastUpdated: Date }> = new Map();
  
  constructor(embeddings: OpenAIEmbeddings) {
    this.embeddings = embeddings;
    // Ensure directories exist
    [this.baseDir, this.userStoresDir].forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  // Create vector store for user document
  async createUserVectorStore(userId: string, filename: string, documentChunks: Document[]): Promise<HNSWLib> {
    const userDir = path.join(this.userStoresDir, userId);
    if (!fs.existsSync(userDir)) {
      fs.mkdirSync(userDir, { recursive: true });
    }

    const storeName = `${userId}_${filename.replace(/\.[^/.]+$/, "")}`;
    const storePath = path.join(userDir, filename.replace(/\.[^/.]+$/, ""));
    
    console.log(`Creating user vector store: ${storeName} with ${documentChunks.length} chunks`);

    try {
      // Validate chunks before creating store
      const validChunks = this.validateAndCleanChunks(documentChunks);
      
      if (validChunks.length === 0) {
        throw new Error('No valid chunks found after processing');
      }

      // Create embeddings in batches for better reliability
      const store = await this.createStoreWithBatching(validChunks);
      
      // Save the store
      await store.save(storePath);
      
      // Cache the store
      this.vectorStores.set(storeName, store);
      
      // Update metadata
      this.storeMetadata.set(storeName, {
        created: new Date(),
        documentCount: validChunks.length,
        lastUpdated: new Date()
      });

      console.log(`User vector store ${storeName} created successfully with ${validChunks.length} chunks`);
      return store;
      
    } catch (error) {
      console.error(`Failed to create user vector store ${storeName}:`, error);
      throw new Error(`Vector store creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Create embeddings in batches for better reliability
  private async createStoreWithBatching(chunks: Document[]): Promise<HNSWLib> {
    const batchSize = 50; // Process in smaller batches
    let store: HNSWLib | null = null;

    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize);
      console.log(`Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(chunks.length / batchSize)} (${batch.length} chunks)`);
      
      try {
        if (store === null) {
          // Create initial store with first batch
          store = await HNSWLib.fromDocuments(batch, this.embeddings);
        } else {
          // Add subsequent batches
          await store.addDocuments(batch);
        }
        
        // Small delay between batches to avoid rate limiting
        if (i + batchSize < chunks.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
      } catch (error) {
        console.error(`Error processing batch ${Math.floor(i / batchSize) + 1}:`, error);
        throw error;
      }
    }

    if (store === null) {
      throw new Error('Failed to create vector store');
    }

    return store;
  }

  // Validate and clean document chunks
  private validateAndCleanChunks(chunks: Document[]): Document[] {
    return chunks
      .filter(chunk => {
        const content = chunk.pageContent?.trim();
        return content && content.length >= 20 && content.length <= 8000;
      })
      .map(chunk => {
        // Clean and enhance the content
        const cleanContent = chunk.pageContent
          .replace(/\s+/g, ' ')
          .replace(/[^\x20-\x7E\u00A0-\uFFFF]/g, '') // Remove control characters
          .trim();

        return new Document({
          pageContent: cleanContent,
          metadata: {
            ...chunk.metadata,
            contentLength: cleanContent.length,
            wordCount: cleanContent.split(/\s+/).length,
            validated: true,
            cleanedAt: new Date().toISOString()
          }
        });
      });
  }

  // Get user vector store
  async getUserVectorStore(userId: string, filename: string): Promise<HNSWLib | null> {
    const storeName = `${userId}_${filename.replace(/\.[^/.]+$/, "")}`;
    
    // Check if already loaded
    if (this.vectorStores.has(storeName)) {
      return this.vectorStores.get(storeName)!;
    }

    // Try to load from disk
    const userDir = path.join(this.userStoresDir, userId);
    const storePath = path.join(userDir, filename.replace(/\.[^/.]+$/, ""));
    
    if (!fs.existsSync(storePath)) {
      return null;
    }

    try {
      console.log(`Loading user vector store: ${storeName}`);
      const store = await HNSWLib.load(storePath, this.embeddings);
      this.vectorStores.set(storeName, store);
      return store;
    } catch (error) {
      console.error(`Failed to load user vector store ${storeName}:`, error);
      return null;
    }
  }

  // List user vector stores
  listUserVectorStores(userId: string): string[] {
    const userDir = path.join(this.userStoresDir, userId);
    if (!fs.existsSync(userDir)) {
      return [];
    }

    return fs.readdirSync(userDir)
      .filter(item => {
        const itemPath = path.join(userDir, item);
        return fs.statSync(itemPath).isDirectory();
      });
  }

  // Advanced retriever with multiple strategies
  getAdvancedRetriever(storeName: string, config: RetrieverConfig = { k: 8, searchType: 'advanced' }) {
    const store = this.vectorStores.get(storeName);
    if (!store) {
      throw new Error(`Vector store ${storeName} not found. Load it first.`);
    }

    return {
      getRelevantDocuments: async (query: string): Promise<Document[]> => {
        try {
          console.log(`Searching in store ${storeName} for: "${query.substring(0, 50)}..."`);
          
          if (config.searchType === 'advanced') {
            return await this.performAdvancedSearch(store, query, config);
          } else if (config.searchType === 'mmr') {
            return await this.performMMRSearch(store, query, config);
          } else {
            return await this.performSimilaritySearch(store, query, config);
          }
        } catch (error) {
          console.error('Error in advanced retriever:', error);
          // Fallback to basic similarity search
          return await store.similaritySearch(query, Math.min(config.k, 10));
        }
      }
    };
  }

  // Perform advanced search with multiple strategies and reranking
  private async performAdvancedSearch(store: HNSWLib, query: string, config: RetrieverConfig): Promise<Document[]> {
    const k = config.k || 8;
    const threshold = config.searchKwargs?.threshold || 0.6;
    
    // 1. Get similarity results with scores
    const similarityResults = await store.similaritySearchWithScore(query, k * 3);
    
    // 2. Filter by threshold and deduplicate
    const filteredResults = similarityResults
      .filter(([doc, score]) => score >= threshold)
      .map(([doc, score]) => ({ doc, score }));

    // 3. Rerank based on content quality and relevance
    const rerankedResults = this.rerankResults(filteredResults, query);
    
    // 4. Return top k results
    const finalResults = rerankedResults.slice(0, k).map(result => result.doc);
    
    console.log(`Advanced search found ${finalResults.length} relevant documents (threshold: ${threshold})`);
    return finalResults;
  }

  // Perform MMR search
  private async performMMRSearch(store: HNSWLib, query: string, config: RetrieverConfig): Promise<Document[]> {
    const retriever = store.asRetriever({
      k: config.k,
      searchType: 'mmr',
      searchKwargs: {
        fetchK: (config.k || 8) * 3,
        lambda: config.searchKwargs?.lambda || 0.25,
      },
    });
    
    return await retriever.getRelevantDocuments(query);
  }

  // Perform similarity search
  private async performSimilaritySearch(store: HNSWLib, query: string, config: RetrieverConfig): Promise<Document[]> {
    return await store.similaritySearch(query, config.k || 8);
  }

  // Rerank results based on content quality and query relevance
  private rerankResults(results: SearchResult[], query: string): SearchResult[] {
    const queryLower = query.toLowerCase();
    const queryWords = queryLower.split(/\s+/).filter(word => word.length > 2);
    
    return results
      .map(result => {
        const content = result.doc.pageContent.toLowerCase();
        let relevanceBoost = 0;
        
        // Boost for exact phrase matches
        if (content.includes(queryLower)) {
          relevanceBoost += 0.2;
        }
        
        // Boost for multiple query word matches
        const matchingWords = queryWords.filter(word => content.includes(word));
        relevanceBoost += (matchingWords.length / queryWords.length) * 0.1;
        
        // Boost for content quality
        const metadata = result.doc.metadata;
        if (metadata.quality === 'high') {
          relevanceBoost += 0.05;
        }
        
        // Boost for complete thoughts
        if (metadata.sentenceCount && metadata.sentenceCount > 1) {
          relevanceBoost += 0.03;
        }
        
        return {
          ...result,
          score: result.score + relevanceBoost
        };
      })
      .sort((a, b) => b.score - a.score);
  }

  // Check if user vector store exists
  userVectorStoreExists(userId: string, filename: string): boolean {
    const storeName = `${userId}_${filename.replace(/\.[^/.]+$/, "")}`;
    
    if (this.vectorStores.has(storeName)) {
      return true;
    }
    
    const userDir = path.join(this.userStoresDir, userId);
    const storePath = path.join(userDir, filename.replace(/\.[^/.]+$/, ""));
    return fs.existsSync(storePath);
  }

  // Get vector store metadata
  getStoreMetadata(storeName: string) {
    return this.storeMetadata.get(storeName);
  }

  // Clean up unused stores from memory
  cleanupMemory(): void {
    console.log(`Cleaning up ${this.vectorStores.size} stores from memory`);
    this.vectorStores.clear();
  }
}

// Legacy VectorStoreManager class for backward compatibility
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