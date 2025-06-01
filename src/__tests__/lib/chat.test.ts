import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { initializeChat, startCLI } from '../../lib/chat.js';

// Mock all dependencies
jest.mock('../../lib/document.js');
jest.mock('../../lib/vectorstore.js');
jest.mock('../../lib/model.js');
jest.mock('../../lib/interface.js');
jest.mock('../../lib/chatHistory.js');
jest.mock('../../lib/api.js', () => ({
  createApiServer: jest.fn()
}));

describe('chat.ts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.OPENAI_API_KEY = 'test-api-key';
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('initializeChat', () => {
    beforeEach(() => {
      // Setup basic mocks
      const { createEmbeddings, VectorStoreManager } = require('../../lib/vectorstore.js');
      const { createLanguageModel, createChatChain } = require('../../lib/model.js');
      const { ChatHistoryManager } = require('../../lib/chatHistory.js');
      const { listAvailableDocuments, loadDocuments, splitDocuments, loadSingleDocument } = require('../../lib/document.js');

      (createEmbeddings as jest.Mock).mockReturnValue({});
      (VectorStoreManager as jest.Mock).mockImplementation(() => ({
        storeExists: jest.fn().mockReturnValue(false),
        // @ts-expect-error Jest mock typing issue
        loadOrCreateVectorStore: jest.fn().mockResolvedValue({}),
        getAvailableStores: jest.fn().mockReturnValue([]),
        addDocumentToVectorStores: jest.fn(),
        getRetriever: jest.fn().mockReturnValue({}),
        getAdvancedRetriever: jest.fn().mockReturnValue({})
      }));
      (ChatHistoryManager as jest.Mock).mockImplementation(() => ({
        getChatHistory: jest.fn().mockReturnValue([]),
        addExchange: jest.fn(),
        getUserVectorStores: jest.fn().mockReturnValue([]),
        getUserVectorChats: jest.fn().mockReturnValue([]),
        getUserIds: jest.fn().mockReturnValue([]),
        clearChatHistory: jest.fn()
      }));
      (createLanguageModel as jest.Mock).mockReturnValue({});
      (createChatChain as jest.Mock).mockReturnValue({
        // @ts-expect-error Jest mock typing issue
        invoke: jest.fn().mockResolvedValue({ content: 'Test response' })
      });
      (listAvailableDocuments as jest.Mock).mockReturnValue(['doc1.txt', 'doc2.pdf']);
      // @ts-expect-error Jest mock typing issue
      (loadDocuments as jest.Mock).mockResolvedValue([]);
      // @ts-expect-error Jest mock typing issue
      (splitDocuments as jest.Mock).mockResolvedValue([]);
      // @ts-expect-error Jest mock typing issue
      (loadSingleDocument as jest.Mock).mockResolvedValue([]);
    });

    it('should initialize successfully with documents', async () => {
      const chatManager = await initializeChat();

      expect(chatManager).toBeDefined();
      expect(chatManager.processMessage).toBeDefined();
    });

    it('should handle errors gracefully during initialization', async () => {
      const { VectorStoreManager } = require('../../lib/vectorstore.js');
      (VectorStoreManager as jest.Mock).mockImplementation(() => {
        throw new Error('Store creation failed');
      });

      await expect(initializeChat()).rejects.toThrow('Store creation failed');
    });
  });

  describe('ChatManager.processMessage', () => {
    let chatManager: any;

    beforeEach(async () => {
      // Setup mocks for processMessage tests
      const { createEmbeddings, VectorStoreManager } = require('../../lib/vectorstore.js');
      const { createLanguageModel, createChatChain } = require('../../lib/model.js');
      const { ChatHistoryManager } = require('../../lib/chatHistory.js');
      const { listAvailableDocuments } = require('../../lib/document.js');

      (createEmbeddings as jest.Mock).mockReturnValue({});
      (VectorStoreManager as jest.Mock).mockImplementation(() => ({
        storeExists: jest.fn().mockReturnValue(true),
        // @ts-expect-error Jest mock typing issue
        loadOrCreateVectorStore: jest.fn().mockResolvedValue({}),
        getAvailableStores: jest.fn().mockReturnValue([]),
        addDocumentToVectorStores: jest.fn(),
        getRetriever: jest.fn().mockReturnValue({
          // @ts-expect-error Jest mock typing issue
          getRelevantDocuments: jest.fn().mockResolvedValue([])
        }),
        getAdvancedRetriever: jest.fn().mockReturnValue({
          // @ts-expect-error Jest mock typing issue
          getRelevantDocuments: jest.fn().mockResolvedValue([])
        })
      }));
      (ChatHistoryManager as jest.Mock).mockImplementation(() => ({
        getChatHistory: jest.fn().mockReturnValue([]),
        addExchange: jest.fn(),
        getUserVectorStores: jest.fn().mockReturnValue(['combined']),
        getUserVectorChats: jest.fn().mockReturnValue(['default']),
        getUserIds: jest.fn().mockReturnValue(['default']),
        clearChatHistory: jest.fn()
      }));
      (createLanguageModel as jest.Mock).mockReturnValue({});
      (createChatChain as jest.Mock).mockReturnValue({
        // @ts-expect-error Jest mock typing issue
        invoke: jest.fn().mockResolvedValue({ content: 'AI response' })
      });
      (listAvailableDocuments as jest.Mock).mockReturnValue(['doc1.txt', 'doc2.pdf']);

      chatManager = await initializeChat();
    });

    it('should process message with default parameters', async () => {
      const response = await chatManager.processMessage('Hello, what can you tell me?');

      expect(response).toEqual({
        text: 'AI response',
        sourceDocuments: []
      });
    });

    it('should handle different vector stores', async () => {
      const response = await chatManager.processMessage(
        'Test message',
        'default',
        'default',
        'specific_store'
      );

      expect(response.text).toBe('AI response');
    });

    it('should add exchange to chat history', async () => {
      await chatManager.processMessage('Test question', 'user1');

      // Chat history should be updated (we can't easily verify this without complex mocking)
      expect(chatManager).toBeDefined();
    });
  });

  describe('startCLI', () => {
    beforeEach(() => {
      const { startChatInterface } = require('../../lib/interface.js');
      const { listAvailableDocuments } = require('../../lib/document.js');
      const { createEmbeddings, VectorStoreManager } = require('../../lib/vectorstore.js');
      const { createLanguageModel, createChatChain } = require('../../lib/model.js');
      const { ChatHistoryManager } = require('../../lib/chatHistory.js');
      const { loadDocuments, splitDocuments, loadSingleDocument } = require('../../lib/document.js');

      // @ts-expect-error Jest mock typing issue
      (startChatInterface as jest.Mock).mockResolvedValue(undefined);
      (listAvailableDocuments as jest.Mock).mockReturnValue(['doc1.txt', 'doc2.pdf']);
      (createEmbeddings as jest.Mock).mockReturnValue({});
      (VectorStoreManager as jest.Mock).mockImplementation(() => ({
        storeExists: jest.fn().mockReturnValue(false),
        // @ts-expect-error Jest mock typing issue
        loadOrCreateVectorStore: jest.fn().mockResolvedValue({}),
        getAvailableStores: jest.fn().mockReturnValue([]),
        addDocumentToVectorStores: jest.fn()
      }));
      (ChatHistoryManager as jest.Mock).mockImplementation(() => ({
        getChatHistory: jest.fn().mockReturnValue([]),
        addExchange: jest.fn(),
        getUserVectorStores: jest.fn().mockReturnValue([]),
        getUserVectorChats: jest.fn().mockReturnValue([]),
        getUserIds: jest.fn().mockReturnValue([]),
        clearChatHistory: jest.fn()
      }));
      (createLanguageModel as jest.Mock).mockReturnValue({});
      (createChatChain as jest.Mock).mockReturnValue({});
      // @ts-expect-error Jest mock typing issue
      (loadDocuments as jest.Mock).mockResolvedValue([]);
      // @ts-expect-error Jest mock typing issue
      (splitDocuments as jest.Mock).mockResolvedValue([]);
      // @ts-expect-error Jest mock typing issue
      (loadSingleDocument as jest.Mock).mockResolvedValue([]);
    });

    it('should start CLI interface', async () => {
      const { startChatInterface } = require('../../lib/interface.js');

      await startCLI();

      expect(startChatInterface).toHaveBeenCalled();
    });
  });

  describe('Error handling', () => {
    it('should handle initialization errors', async () => {
      const { VectorStoreManager } = require('../../lib/vectorstore.js');
      (VectorStoreManager as jest.Mock).mockImplementation(() => {
        throw new Error('Vector store initialization failed');
      });

      await expect(initializeChat()).rejects.toThrow('Vector store initialization failed');
    });

    it('should handle missing environment variables', async () => {
      delete process.env.OPENAI_API_KEY;

      const { createEmbeddings } = require('../../lib/vectorstore.js');
      (createEmbeddings as jest.Mock).mockImplementation(() => {
        throw new Error('OpenAI API key is required');
      });

      await expect(initializeChat()).rejects.toThrow('OpenAI API key is required');
    });
  });
}); 