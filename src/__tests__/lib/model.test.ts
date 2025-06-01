import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { 
  defaultModelConfig, 
  conservativeModelConfig, 
  availableModels,
  createLanguageModel,
  createChatChain,
  formatChatHistory,
  ModelConfig 
} from '../../lib/model.js';
import { HumanMessage, AIMessage } from '@langchain/core/messages';

// Mock dependencies
jest.mock('@langchain/openai');
jest.mock('@langchain/core/messages');
jest.mock('@langchain/core/prompts');
jest.mock('@langchain/core/runnables');

describe('model.ts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.OPENAI_API_KEY = 'test-api-key';
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('ModelConfig interface and defaults', () => {
    it('should have correct default model configuration', () => {
      expect(defaultModelConfig).toEqual({
        modelName: 'gpt-4-turbo',
        temperature: 0.1,
        systemPrompt: expect.stringContaining('ÚNICAMENTE en el contexto proporcionado'),
        maxTokens: 1500,
        topP: 0.8,
        streaming: true,
      });
    });

    it('should have strict anti-hallucination prompt in default config', () => {
      expect(defaultModelConfig.systemPrompt).toContain('REGLAS ESTRICTAS');
      expect(defaultModelConfig.systemPrompt).toContain('SOLO responde con información que esté EXPLÍCITAMENTE presente');
      expect(defaultModelConfig.systemPrompt).toContain('NO hagas suposiciones, inferencias o añadas conocimiento externo');
    });

    it('should have conservative model configuration', () => {
      expect(conservativeModelConfig).toEqual({
        modelName: 'gpt-4-turbo',
        temperature: 0.0,
        systemPrompt: expect.stringContaining('EXCLUSIVAMENTE basándote en el contexto'),
        maxTokens: 1000,
        topP: 0.5,
        streaming: true,
      });
    });

    it('should have ultra-strict prompt in conservative config', () => {
      expect(conservativeModelConfig.systemPrompt).toContain('INSTRUCCIONES CRÍTICAS');
      expect(conservativeModelConfig.systemPrompt).toContain('NUNCA inventes, asumas o uses conocimiento externo');
      expect(conservativeModelConfig.systemPrompt).toContain('extremadamente preciso y conservador');
    });

    it('should have lower temperature in conservative config', () => {
      expect(conservativeModelConfig.temperature).toBe(0.0);
      expect(conservativeModelConfig.topP).toBe(0.5);
      expect(conservativeModelConfig.maxTokens).toBeLessThan(defaultModelConfig.maxTokens!);
    });
  });

  describe('availableModels', () => {
    it('should contain expected OpenAI models', () => {
      expect(availableModels).toEqual([
        { id: 'gpt-4', name: 'GPT-4', description: 'Most capable model, best for complex tasks' },
        { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', description: 'Faster and more efficient than GPT-4' },
        { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', description: 'Fast and cost-effective for most tasks' },
        { id: 'gpt-3.5-turbo-16k', name: 'GPT-3.5 Turbo 16K', description: 'Extended context window version' },
      ]);
    });

    it('should have all required properties for each model', () => {
      availableModels.forEach(model => {
        expect(model).toHaveProperty('id');
        expect(model).toHaveProperty('name');
        expect(model).toHaveProperty('description');
        expect(typeof model.id).toBe('string');
        expect(typeof model.name).toBe('string');
        expect(typeof model.description).toBe('string');
      });
    });
  });

  describe('createLanguageModel', () => {
    it('should create language model with default configuration', () => {
      const { ChatOpenAI } = require('@langchain/openai');
      
      createLanguageModel();
      
      expect(ChatOpenAI).toHaveBeenCalledWith({
        modelName: defaultModelConfig.modelName,
        temperature: defaultModelConfig.temperature,
        maxTokens: defaultModelConfig.maxTokens,
        topP: defaultModelConfig.topP,
        streaming: defaultModelConfig.streaming,
      });
    });

    it('should create language model with custom configuration', () => {
      const { ChatOpenAI } = require('@langchain/openai');
      const customConfig: ModelConfig = {
        modelName: 'gpt-3.5-turbo',
        temperature: 0.5,
        systemPrompt: 'Custom prompt',
        maxTokens: 2000,
        topP: 0.9,
        streaming: false,
      };
      
      createLanguageModel(customConfig);
      
      expect(ChatOpenAI).toHaveBeenCalledWith({
        modelName: 'gpt-3.5-turbo',
        temperature: 0.5,
        maxTokens: 2000,
        topP: 0.9,
        streaming: false,
      });
    });

    it('should handle missing optional parameters', () => {
      const { ChatOpenAI } = require('@langchain/openai');
      const minimalConfig: ModelConfig = {
        modelName: 'gpt-4',
        temperature: 0.0,
        systemPrompt: 'Test prompt'
      };
      
      createLanguageModel(minimalConfig);
      
      expect(ChatOpenAI).toHaveBeenCalledWith({
        modelName: 'gpt-4',
        temperature: 0.0,
        maxTokens: undefined,
        topP: undefined,
        streaming: false, // Default value
      });
    });
  });

  describe('formatChatHistory', () => {
    it('should format empty history correctly', () => {
      const formatted = formatChatHistory([]);
      
      expect(formatted).toEqual([]);
    });

    it('should format single exchange correctly', () => {
      const history: [string, string][] = [['Hello', 'Hi there!']];
      
      formatChatHistory(history);
      
      expect(HumanMessage).toHaveBeenCalledWith('Hello');
      expect(AIMessage).toHaveBeenCalledWith('Hi there!');
    });

    it('should format multiple exchanges correctly', () => {
      const history: [string, string][] = [
        ['Hello', 'Hi there!'],
        ['How are you?', 'I am doing well, thank you!'],
        ['What can you do?', 'I can help you with various tasks.']
      ];
      
      formatChatHistory(history);
      
      expect(HumanMessage).toHaveBeenCalledTimes(3);
      expect(AIMessage).toHaveBeenCalledTimes(3);
      expect(HumanMessage).toHaveBeenNthCalledWith(1, 'Hello');
      expect(AIMessage).toHaveBeenNthCalledWith(1, 'Hi there!');
      expect(HumanMessage).toHaveBeenNthCalledWith(2, 'How are you?');
      expect(AIMessage).toHaveBeenNthCalledWith(2, 'I am doing well, thank you!');
    });

    it('should maintain order of messages', () => {
      const history: [string, string][] = [
        ['First question', 'First answer'],
        ['Second question', 'Second answer']
      ];
      
      const result = formatChatHistory(history);
      
      // Should return flattened array in order: Human, AI, Human, AI
      expect(result).toHaveLength(4);
    });
  });

  describe('createChatChain', () => {
    let mockModel: any;
    let mockRetriever: any;

    beforeEach(() => {
      mockModel = {
        invoke: jest.fn().mockImplementation(() => Promise.resolve({ content: 'Test response' }))
      } as any;
      
      mockRetriever = {
        getRelevantDocuments: jest.fn().mockImplementation(() => Promise.resolve([
          { pageContent: 'Document 1 content' },
          { pageContent: 'Document 2 content' }
        ]))
      } as any;
    });

    it('should create chat chain with default system prompt', () => {
      const { ChatPromptTemplate } = require('@langchain/core/prompts');
      const { RunnableSequence } = require('@langchain/core/runnables');
      
      createChatChain(mockModel, mockRetriever);
      
      expect(ChatPromptTemplate.fromMessages).toHaveBeenCalled();
      expect(RunnableSequence.from).toHaveBeenCalled();
    });

    it('should create chat chain with custom system prompt', () => {
      const customPrompt = 'Custom system prompt with {context}';
      const { ChatPromptTemplate } = require('@langchain/core/prompts');
      
      createChatChain(mockModel, mockRetriever, customPrompt);
      
      expect(ChatPromptTemplate.fromMessages).toHaveBeenCalledWith([
        ["system", customPrompt],
        expect.anything(), // MessagesPlaceholder
        ["human", "{input}"],
      ]);
    });

    it('should include chat history placeholder', () => {
      const { MessagesPlaceholder } = require('@langchain/core/prompts');
      
      createChatChain(mockModel, mockRetriever);
      
      expect(MessagesPlaceholder).toHaveBeenCalledWith("chat_history");
    });

    it('should create runnable sequence with correct structure', () => {
      const { RunnableSequence } = require('@langchain/core/runnables');
      
      createChatChain(mockModel, mockRetriever);
      
      const sequenceCall = (RunnableSequence.from as jest.Mock).mock.calls[0][0] as any[];
      expect(sequenceCall).toHaveLength(3); // context/input/chat_history, prompt, model
      
      // First element should be an object with context, input, and chat_history
      expect(sequenceCall[0]).toHaveProperty('context');
      expect(sequenceCall[0]).toHaveProperty('input');
      expect(sequenceCall[0]).toHaveProperty('chat_history');
      expect(typeof (sequenceCall[0] as any).context).toBe('function');
      expect(typeof (sequenceCall[0] as any).input).toBe('function');
      expect(typeof (sequenceCall[0] as any).chat_history).toBe('function');
    });
  });

  describe('Anti-hallucination features', () => {
    it('should use conservative temperature in default config', () => {
      expect(defaultModelConfig.temperature).toBeLessThanOrEqual(0.1);
    });

    it('should use zero temperature in conservative config', () => {
      expect(conservativeModelConfig.temperature).toBe(0.0);
    });

    it('should have lower topP in conservative config', () => {
      expect(conservativeModelConfig.topP).toBeLessThanOrEqual(0.5);
    });

    it('should have token limits to prevent rambling', () => {
      expect(defaultModelConfig.maxTokens).toBeLessThanOrEqual(1500);
      expect(conservativeModelConfig.maxTokens).toBeLessThanOrEqual(1000);
    });

    it('should use GPT-4-turbo by default for better accuracy', () => {
      expect(defaultModelConfig.modelName).toBe('gpt-4-turbo');
      expect(conservativeModelConfig.modelName).toBe('gpt-4-turbo');
    });
  });
}); 