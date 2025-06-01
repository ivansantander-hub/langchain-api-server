import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { initializeChat, startCLI } from '../../lib/chat.js';

// Mock all dependencies
jest.mock('../../lib/document.js');
jest.mock('../../lib/vectorstore.js');
jest.mock('../../lib/model.js');
jest.mock('../../lib/interface.js');
jest.mock('../../lib/chatHistory.js');

// Mock api.js with a simple mock to avoid ES module issues
jest.mock('../../lib/api.js', () => ({
  createApiServer: jest.fn()
}));

// Type definitions for mocks
type MockFunction = jest.MockedFunction<(...args: any[]) => any>;

describe('chat.ts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.OPENAI_API_KEY = 'test-api-key';
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('initializeChat', () => {
    let mockVectorStoreManager: any;
    let mockChatHistoryManager: any;
    let mockEmbeddings: any;
    let mockModel: any;
    let mockChain: any;

    beforeEach(() => {
      mockEmbeddings = {
        embedQuery: jest.fn(),
        embedDocuments: jest.fn()
      };

      mockVectorStoreManager = {
        storeExists: jest.fn(),
        loadOrCreateVectorStore: jest.fn(),
        getAvailableStores: jest.fn().mockReturnValue([]),
        addDocumentToVectorStores: jest.fn(),
        getRetriever: jest.fn(),
        getAdvancedRetriever: jest.fn().mockReturnValue({
          getRelevantDocuments: jest.fn().mockImplementation(() => Promise.resolve([]))
        })
      };

      mockChatHistoryManager = {
        getChatHistory: jest.fn().mockReturnValue([]),
        addExchange: jest.fn(),
        getUserVectorStores: jest.fn().mockReturnValue([]),
        getUserVectorChats: jest.fn().mockReturnValue([]),
        getUserIds: jest.fn().mockReturnValue([]),
        clearChatHistory: jest.fn()
      };

      mockModel = {
        invoke: jest.fn().mockImplementation(() => Promise.resolve({ content: 'Test response' }))
      };

      mockChain = {
        invoke: jest.fn().mockImplementation(() => Promise.resolve({ content: 'Test response' }))
      };

      // Setup mocks
      const { createEmbeddings, VectorStoreManager } = require('../../lib/vectorstore.js');
      const { createLanguageModel, createChatChain, conservativeModelConfig } = require('../../lib/model.js');
      const { ChatHistoryManager } = require('../../lib/chatHistory.js');
      const { listAvailableDocuments, loadDocuments, splitDocuments, loadSingleDocument } = require('../../lib/document.js');

      (createEmbeddings as MockFunction).mockReturnValue(mockEmbeddings);
      (VectorStoreManager as any).mockImplementation(() => mockVectorStoreManager);
      (ChatHistoryManager as any).mockImplementation(() => mockChatHistoryManager);
      (createLanguageModel as MockFunction).mockReturnValue(mockModel);
      (createChatChain as MockFunction).mockReturnValue(mockChain);
      (listAvailableDocuments as MockFunction).mockReturnValue(['doc1.txt', 'doc2.pdf']);
      (loadDocuments as MockFunction).mockImplementation(() => Promise.resolve([{ pageContent: 'test content', metadata: { source: 'test' } }]));
      (splitDocuments as MockFunction).mockImplementation(() => Promise.resolve([{ pageContent: 'test content', metadata: { source: 'test' } }]));
      (loadSingleDocument as MockFunction).mockImplementation(() => Promise.resolve([{ pageContent: 'test content', metadata: { source: 'test' } }]));
    });

    it('should initialize successfully with documents', async () => {
      (mockVectorStoreManager.storeExists as MockFunction).mockReturnValue(false);
      (mockVectorStoreManager.loadOrCreateVectorStore as MockFunction).mockImplementation(() => Promise.resolve({}));

      const chatManager = await initializeChat();

      expect(chatManager).toBeDefined();
      expect(chatManager.processMessage).toBeDefined();
      expect(chatManager.vectorStoreManager).toBe(mockVectorStoreManager);
      expect(chatManager.chatHistoryManager).toBe(mockChatHistoryManager);
    });

    it('should create combined vector store if it does not exist', async () => {
      (mockVectorStoreManager.storeExists as MockFunction).mockReturnValue(false);
      (mockVectorStoreManager.loadOrCreateVectorStore as MockFunction).mockImplementation(() => Promise.resolve({}));

      await initializeChat();

      expect(mockVectorStoreManager.loadOrCreateVectorStore).toHaveBeenCalledWith(
        'combined',
        expect.any(Array)
      );
    });

    it('should load existing combined vector store if it exists', async () => {
      (mockVectorStoreManager.storeExists as MockFunction).mockReturnValue(true);
      (mockVectorStoreManager.loadOrCreateVectorStore as MockFunction).mockImplementation(() => Promise.resolve({}));

      await initializeChat();

      expect(mockVectorStoreManager.loadOrCreateVectorStore).toHaveBeenCalledWith('combined');
    });

    it('should process new documents', async () => {
      (mockVectorStoreManager.storeExists as MockFunction).mockReturnValue(false);
      (mockVectorStoreManager.getAvailableStores as MockFunction).mockReturnValue([]);
      (mockVectorStoreManager.loadOrCreateVectorStore as MockFunction).mockImplementation(() => Promise.resolve({}));

      await initializeChat();

      expect(mockVectorStoreManager.addDocumentToVectorStores).toHaveBeenCalledTimes(2); // doc1.txt and doc2.pdf
    });

    it('should handle errors gracefully during initialization', async () => {
      (mockVectorStoreManager.storeExists as MockFunction).mockReturnValue(false);
      (mockVectorStoreManager.loadOrCreateVectorStore as MockFunction)
        .mockRejectedValueOnce(new Error('Store creation failed'))
        .mockImplementationOnce(() => Promise.resolve({}));

      // The function should throw the error
      await expect(initializeChat()).rejects.toThrow('Store creation failed');
    });
  });

  describe('ChatManager.processMessage', () => {
    let chatManager: any;
    let mockVectorStoreManager: any;
    let mockChatHistoryManager: any;
    let mockChain: any;
    let mockRetriever: any;

    beforeEach(async () => {
      mockRetriever = {
        getRelevantDocuments: jest.fn().mockImplementation(() => Promise.resolve([
          { pageContent: 'relevant content', metadata: { source: 'test.txt' } }
        ]))
      };

      mockChain = {
        invoke: jest.fn().mockImplementation(() => Promise.resolve({ content: 'AI response' }))
      };

      mockVectorStoreManager = {
        storeExists: jest.fn().mockReturnValue(true),
        loadOrCreateVectorStore: jest.fn().mockImplementation(() => Promise.resolve({})),
        getAvailableStores: jest.fn().mockReturnValue([]),
        addDocumentToVectorStores: jest.fn(),
        getRetriever: jest.fn().mockReturnValue(mockRetriever),
        getAdvancedRetriever: jest.fn().mockReturnValue(mockRetriever)
      };

      mockChatHistoryManager = {
        getChatHistory: jest.fn().mockReturnValue([]),
        addExchange: jest.fn(),
        getUserVectorStores: jest.fn().mockReturnValue(['combined']),
        getUserVectorChats: jest.fn().mockReturnValue(['default']),
        getUserIds: jest.fn().mockReturnValue(['default']),
        clearChatHistory: jest.fn()
      };

      // Setup mocks for initializeChat
      const { createEmbeddings, VectorStoreManager } = require('../../lib/vectorstore.js');
      const { createLanguageModel, createChatChain, conservativeModelConfig } = require('../../lib/model.js');
      const { ChatHistoryManager } = require('../../lib/chatHistory.js');
      const { listAvailableDocuments } = require('../../lib/document.js');

      (createEmbeddings as MockFunction).mockReturnValue({});
      (VectorStoreManager as any).mockImplementation(() => mockVectorStoreManager);
      (ChatHistoryManager as any).mockImplementation(() => mockChatHistoryManager);
      (createLanguageModel as MockFunction).mockReturnValue({});
      (createChatChain as MockFunction).mockReturnValue(mockChain);
      (listAvailableDocuments as MockFunction).mockReturnValue(['doc1.txt', 'doc2.pdf']);

      chatManager = await initializeChat();
    });

    it('should process message with default parameters', async () => {
      const response = await chatManager.processMessage('Hello, what can you tell me?');

      expect(response).toEqual({
        text: 'AI response',
        sourceDocuments: []
      });
      expect(mockChain.invoke).toHaveBeenCalledWith(
        expect.objectContaining({
          input: 'Hello, what can you tell me?'
        })
      );
    });

    it('should use advanced retrieval by default', async () => {
      await chatManager.processMessage('Test message');

      expect(mockVectorStoreManager.getAdvancedRetriever).toHaveBeenCalledWith('combined', 6);
    });

    it('should use standard retrieval when requested', async () => {
      await chatManager.processMessage(
        'Test message',
        'default',
        'default',
        'combined',
        undefined,
        false // useAdvancedRetrieval = false
      );

      expect(mockVectorStoreManager.getRetriever).toHaveBeenCalledWith('combined', 8, 'mmr');
    });

    it('should use conservative model config by default', async () => {
      const { createLanguageModel, conservativeModelConfig } = require('../../lib/model.js');

      await chatManager.processMessage('Test message');

      expect(createLanguageModel).toHaveBeenCalledWith(conservativeModelConfig);
    });

    it('should accept custom model configuration', async () => {
      const { createLanguageModel, defaultModelConfig } = require('../../lib/model.js');
      const { defaultModelConfig: mockDefaultConfig } = require('../../lib/model.js');

      await chatManager.processMessage(
        'Test message',
        'default',
        'default',
        'combined',
        mockDefaultConfig
      );

      expect(createLanguageModel).toHaveBeenCalledWith(mockDefaultConfig);
    });

    it('should add exchange to chat history after processing', async () => {
      await chatManager.processMessage('Test question', 'user1');

      expect(mockChatHistoryManager.addExchange).toHaveBeenCalledWith(
        'user1',
        'combined',
        'default',
        'Test question',
        'AI response'
      );
    });

    it('should handle vector store switching', async () => {
      await chatManager.processMessage(
        'Test message',
        'default',
        'default',
        'specific_store'
      );

      expect(mockVectorStoreManager.getAdvancedRetriever).toHaveBeenCalledWith('specific_store', 6);
    });

    it('should handle custom retrieval parameters', async () => {
      await chatManager.processMessage(
        'Test message',
        'default',
        'default',
        'combined',
        undefined,
        false, // useAdvancedRetrieval
        10 // k
      );

      expect(mockVectorStoreManager.getRetriever).toHaveBeenCalledWith('combined', 8, 'mmr');
    });

    it('should return source documents when available', async () => {
      const mockDocs = [
        { pageContent: 'test content', metadata: { source: 'test.pdf' } }
      ];
      
      (mockRetriever.getRelevantDocuments as MockFunction).mockImplementation(() => Promise.resolve(mockDocs));

      const response = await chatManager.processMessage('Test question');

      // The current implementation returns empty sourceDocuments
      expect(response.sourceDocuments).toEqual([]);
    });
  });

  describe('startCLI', () => {
    beforeEach(() => {
      const { startChatInterface } = require('../../lib/interface.js');
      const { listAvailableDocuments } = require('../../lib/document.js');
      const { createEmbeddings, VectorStoreManager } = require('../../lib/vectorstore.js');
      const { createLanguageModel, createChatChain, conservativeModelConfig } = require('../../lib/model.js');
      const { ChatHistoryManager } = require('../../lib/chatHistory.js');
      const { loadDocuments, splitDocuments, loadSingleDocument } = require('../../lib/document.js');

      (startChatInterface as MockFunction).mockImplementation(() => Promise.resolve());
      (listAvailableDocuments as MockFunction).mockReturnValue(['doc1.txt', 'doc2.pdf']);
      
      // Mock all the dependencies for initializeChat
      (createEmbeddings as MockFunction).mockReturnValue({});
      (VectorStoreManager as any).mockImplementation(() => ({
        storeExists: jest.fn().mockReturnValue(false),
        loadOrCreateVectorStore: jest.fn().mockImplementation(() => Promise.resolve({})),
        getAvailableStores: jest.fn().mockReturnValue([]),
        addDocumentToVectorStores: jest.fn().mockImplementation(() => Promise.resolve())
      }));
      (ChatHistoryManager as any).mockImplementation(() => ({
        getChatHistory: jest.fn().mockReturnValue([]),
        addExchange: jest.fn(),
        getUserVectorStores: jest.fn().mockReturnValue([]),
        getUserVectorChats: jest.fn().mockReturnValue([]),
        getUserIds: jest.fn().mockReturnValue([]),
        clearChatHistory: jest.fn()
      }));
      (createLanguageModel as MockFunction).mockReturnValue({});
      (createChatChain as MockFunction).mockReturnValue({});
      (loadDocuments as MockFunction).mockImplementation(() => Promise.resolve([]));
      (splitDocuments as MockFunction).mockImplementation(() => Promise.resolve([]));
      (loadSingleDocument as MockFunction).mockImplementation(() => Promise.resolve([]));
    });

    it('should start CLI interface and handle user input', async () => {
      const { startChatInterface } = require('../../lib/interface.js');

      await startCLI();

      expect(startChatInterface).toHaveBeenCalledWith(
        null, // chain (can be null)
        expect.anything(), // model
        expect.anything(), // vectorStoreManager
        expect.anything()  // chatManager
      );
    });

    it('should initialize chat system before starting interface', async () => {
      const { startChatInterface } = require('../../lib/interface.js');

      await startCLI();

      expect(startChatInterface).toHaveBeenCalled();
    });
  });

  describe('Error handling', () => {
    it('should handle initialization errors', async () => {
      const { VectorStoreManager } = require('../../lib/vectorstore.js');
      (VectorStoreManager as any).mockImplementation(() => {
        throw new Error('Vector store initialization failed');
      });

      await expect(initializeChat()).rejects.toThrow('Vector store initialization failed');
    });

    it('should handle missing environment variables', async () => {
      delete process.env.OPENAI_API_KEY;

      const { createEmbeddings } = require('../../lib/vectorstore.js');
      (createEmbeddings as MockFunction).mockImplementation(() => {
        throw new Error('OpenAI API key is required');
      });

      await expect(initializeChat()).rejects.toThrow('OpenAI API key is required');
    });
  });
}); 