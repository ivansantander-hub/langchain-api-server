import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import * as fs from 'fs';
import { Document } from "langchain/document";
import { createEmbeddings, createFastEmbeddings, VectorStoreManager } from '../../lib/vectorstore.js';

// Mock dependencies
jest.mock('@langchain/openai');
jest.mock('@langchain/community/vectorstores/hnswlib');
jest.mock('fs');
jest.mock('path');

const mockFs = fs as jest.Mocked<typeof fs>;

describe('vectorstore.ts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.OPENAI_API_KEY = 'test-api-key';
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('createEmbeddings', () => {
    it('should create embeddings with text-embedding-3-large model', () => {
      const embeddings = createEmbeddings();
      
      expect(embeddings).toBeDefined();
      // Mock would verify constructor was called with correct parameters
    });

    it('should use correct configuration for high-quality embeddings', () => {
      const { OpenAIEmbeddings } = require('@langchain/openai');
      
      createEmbeddings();
      
      expect(OpenAIEmbeddings).toHaveBeenCalledWith({
        modelName: "text-embedding-3-large",
        dimensions: 3072,
        stripNewLines: true,
        batchSize: 512
      });
    });
  });

  describe('createFastEmbeddings', () => {
    it('should create fast embeddings with text-embedding-3-small model', () => {
      const embeddings = createFastEmbeddings();
      
      expect(embeddings).toBeDefined();
    });

    it('should use correct configuration for fast embeddings', () => {
      const { OpenAIEmbeddings } = require('@langchain/openai');
      
      createFastEmbeddings();
      
      expect(OpenAIEmbeddings).toHaveBeenCalledWith({
        modelName: "text-embedding-3-small",
        dimensions: 1536,
        stripNewLines: true,
        batchSize: 1024
      });
    });
  });

  describe('VectorStoreManager', () => {
    let mockEmbeddings: any;
    let vectorStoreManager: VectorStoreManager;

    beforeEach(() => {
      mockEmbeddings = {
        embedQuery: jest.fn().mockImplementation(() => Promise.resolve([0.1, 0.2, 0.3])),
        embedDocuments: jest.fn().mockImplementation(() => Promise.resolve([[0.1, 0.2, 0.3]]))
      };
      
      mockFs.existsSync.mockReturnValue(true);
      mockFs.mkdirSync.mockReturnValue(undefined);
      
      vectorStoreManager = new VectorStoreManager(mockEmbeddings);
    });

    describe('constructor', () => {
      it('should initialize with embeddings and create base directory', () => {
        expect(mockFs.existsSync).toHaveBeenCalledWith('./vectorstores');
      });

      it('should create base directory if it does not exist', () => {
        mockFs.existsSync.mockReturnValue(false);
        
        new VectorStoreManager(mockEmbeddings);
        
        expect(mockFs.mkdirSync).toHaveBeenCalledWith('./vectorstores', { recursive: true });
      });
    });

    describe('getAvailableStores', () => {
      it('should return empty array if base directory does not exist', () => {
        mockFs.existsSync.mockReturnValue(false);
        
        const stores = vectorStoreManager.getAvailableStores();
        
        expect(stores).toEqual([]);
      });

      it('should return filtered directory list', () => {
        mockFs.existsSync.mockReturnValue(true);
        mockFs.readdirSync.mockReturnValue(['store1', 'store2', 'file.txt'] as any);
        
        // Mock path.join to return predictable paths
        const mockPath = require('path');
        mockPath.join.mockImplementation((...args: string[]) => args.join('/'));
        
        mockFs.statSync.mockImplementation((pathStr: any) => {
          const pathString = String(pathStr);
          // Return isDirectory true for directories, false for files
          const isDir = pathString.endsWith('/store1') || pathString.endsWith('/store2') || 
                       pathString.includes('store1') || pathString.includes('store2');
          return {
            isDirectory: () => isDir
          } as any;
        });
        
        const stores = vectorStoreManager.getAvailableStores();
        
        expect(stores).toEqual(['store1', 'store2']);
      });
    });

    describe('storeExists', () => {
      it('should return true if store is loaded in memory', () => {
        // Access private property for testing
        (vectorStoreManager as any).vectorStores.set('test-store', {});
        
        const exists = vectorStoreManager.storeExists('test-store');
        
        expect(exists).toBe(true);
      });

      it('should check filesystem if store is not in memory', () => {
        mockFs.existsSync.mockReturnValue(true);
        mockFs.statSync.mockReturnValue({ isDirectory: () => true } as any);
        
        const exists = vectorStoreManager.storeExists('test-store');
        
        expect(exists).toBe(true);
      });
    });

    describe('isStoreLoaded', () => {
      it('should return true if store is loaded in memory', () => {
        (vectorStoreManager as any).vectorStores.set('test-store', {});
        
        const loaded = vectorStoreManager.isStoreLoaded('test-store');
        
        expect(loaded).toBe(true);
      });

      it('should return false if store is not loaded in memory', () => {
        const loaded = vectorStoreManager.isStoreLoaded('test-store');
        
        expect(loaded).toBe(false);
      });
    });

    describe('getRetriever', () => {
      it('should throw error if store is not found', () => {
        expect(() => {
          vectorStoreManager.getRetriever('non-existent-store');
        }).toThrow('Vector store non-existent-store not found. Load it first.');
      });

      it('should return MMR retriever by default', () => {
        const mockStore = {
          asRetriever: jest.fn().mockReturnValue({ type: 'mmr-retriever' })
        };
        (vectorStoreManager as any).vectorStores.set('test-store', mockStore);
        
        const retriever = vectorStoreManager.getRetriever('test-store');
        
        expect(mockStore.asRetriever).toHaveBeenCalledWith({
          k: 10,
          searchType: 'mmr',
          searchKwargs: {
            fetchK: 30,
            lambda: 0.25,
          },
        });
      });

      it('should return similarity retriever when specified', () => {
        const mockStore = {
          asRetriever: jest.fn().mockReturnValue({ type: 'similarity-retriever' })
        };
        (vectorStoreManager as any).vectorStores.set('test-store', mockStore);
        
        const retriever = vectorStoreManager.getRetriever('test-store', 5, 'similarity');
        
        expect(mockStore.asRetriever).toHaveBeenCalledWith({
          k: 5,
          searchType: 'similarity',
        });
      });

      it('should limit k to maximum of 20', () => {
        const mockStore = {
          asRetriever: jest.fn().mockReturnValue({ type: 'retriever' })
        };
        (vectorStoreManager as any).vectorStores.set('test-store', mockStore);
        
        vectorStoreManager.getRetriever('test-store', 50);
        
        expect(mockStore.asRetriever).toHaveBeenCalledWith(
          expect.objectContaining({ k: 20 })
        );
      });
    });

    describe('getAdvancedRetriever', () => {
      it('should throw error if store is not found', () => {
        expect(() => {
          vectorStoreManager.getAdvancedRetriever('non-existent-store');
        }).toThrow('Vector store non-existent-store not found. Load it first.');
      });

      it('should return advanced retriever with combined search strategies', () => {
        const mockStore = {
          similaritySearchWithScore: jest.fn().mockImplementation(() => Promise.resolve([
            [new Document({ pageContent: 'test content 1' }), 0.8],
            [new Document({ pageContent: 'test content 2' }), 0.7],
            [new Document({ pageContent: 'test content 3' }), 0.5], // Below threshold
          ])),
          similaritySearch: jest.fn().mockImplementation(() => Promise.resolve([
            new Document({ pageContent: 'fallback content' })
          ]))
        };
        (vectorStoreManager as any).vectorStores.set('test-store', mockStore);
        
        const retriever = vectorStoreManager.getAdvancedRetriever('test-store');
        
        expect(retriever).toHaveProperty('getRelevantDocuments');
        expect(typeof retriever.getRelevantDocuments).toBe('function');
      });

      it('should filter documents by score threshold', async () => {
        const mockStore = {
          similaritySearchWithScore: jest.fn().mockImplementation(() => Promise.resolve([
            [new Document({ pageContent: 'high score content' }), 0.8],
            [new Document({ pageContent: 'low score content' }), 0.4],
          ]))
        };
        (vectorStoreManager as any).vectorStores.set('test-store', mockStore);
        
        const retriever = vectorStoreManager.getAdvancedRetriever('test-store');
        const results = await retriever.getRelevantDocuments('test query');
        
        expect(results).toHaveLength(1);
        expect(results[0].pageContent).toBe('high score content');
      });

      it('should fallback to basic search on error', async () => {
        const mockStore = {
          similaritySearchWithScore: jest.fn().mockImplementation(() => Promise.reject(new Error('Search failed'))),
          similaritySearch: jest.fn().mockImplementation(() => Promise.resolve([
            new Document({ pageContent: 'fallback content' })
          ]))
        };
        (vectorStoreManager as any).vectorStores.set('test-store', mockStore);
        
        const retriever = vectorStoreManager.getAdvancedRetriever('test-store');
        const results = await retriever.getRelevantDocuments('test query');
        
        expect(results).toHaveLength(1);
        expect(results[0].pageContent).toBe('fallback content');
        expect(mockStore.similaritySearch).toHaveBeenCalledWith('test query', 8);
      });
    });
  });

  describe('Legacy functions', () => {
    describe('loadVectorStore', () => {
      it('should be defined for backward compatibility', () => {
        const { loadVectorStore } = require('../../lib/vectorstore.js');
        expect(typeof loadVectorStore).toBe('function');
      });
    });

    describe('createRetriever', () => {
      it('should be defined for backward compatibility', () => {
        const { createRetriever } = require('../../lib/vectorstore.js');
        expect(typeof createRetriever).toBe('function');
      });

      it('should create retriever with legacy parameters', () => {
        const { createRetriever } = require('../../lib/vectorstore.js');
        const mockVectorStore = {
          asRetriever: jest.fn().mockReturnValue({ type: 'legacy-retriever' })
        };
        
        createRetriever(mockVectorStore);
        
        expect(mockVectorStore.asRetriever).toHaveBeenCalledWith({
          k: 5,
          searchType: 'similarity',
        });
      });
    });
  });
}); 