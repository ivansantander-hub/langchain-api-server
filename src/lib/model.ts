import { SystemMessage, HumanMessage, AIMessage } from '@langchain/core/messages';
import { ChatPromptTemplate, MessagesPlaceholder } from '@langchain/core/prompts';
import { ChatOpenAI } from '@langchain/openai';
import { RunnablePassthrough, RunnableSequence } from '@langchain/core/runnables';
import { Document } from '@langchain/core/documents';

// Configuration interface for the model
export interface ModelConfig {
  modelName: string;
  temperature: number;
  systemPrompt: string;
  maxTokens?: number;
  topP?: number;
  streaming?: boolean;
}

// Default configuration
export const defaultModelConfig: ModelConfig = {
  modelName: 'gpt-3.5-turbo',
  temperature: 0.7,
  systemPrompt: `You are a helpful assistant that answers questions based on the provided context.
Use the following pieces of retrieved context to answer the user's question.
If you don't know the answer, say that you don't know. 
Use three sentences maximum and keep the answer concise.

Context: {context}`,
  maxTokens: 1000,
  topP: 1,
  streaming: true,
};

// Available OpenAI models
export const availableModels = [
  { id: 'gpt-4', name: 'GPT-4', description: 'Most capable model, best for complex tasks' },
  { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', description: 'Faster and more efficient than GPT-4' },
  { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', description: 'Fast and cost-effective for most tasks' },
  { id: 'gpt-3.5-turbo-16k', name: 'GPT-3.5 Turbo 16K', description: 'Extended context window version' },
];

// Initialize the language model with configuration
export function createLanguageModel(config: ModelConfig = defaultModelConfig): ChatOpenAI {
  return new ChatOpenAI({
    modelName: config.modelName,
    temperature: config.temperature,
    maxTokens: config.maxTokens,
    topP: config.topP,
    streaming: config.streaming || false,
  });
}

// Create chat chain with conversation history management and configurable prompt
export function createChatChain(model: ChatOpenAI, retriever: any, systemPrompt: string = defaultModelConfig.systemPrompt) {
  // Create prompt template with chat history
  const prompt = ChatPromptTemplate.fromMessages([
    ["system", systemPrompt],
    new MessagesPlaceholder("chat_history"),
    ["human", "{input}"],
  ]);

  // Define the RAG pipeline
  const chain = RunnableSequence.from([
    {
      // First, prepare inputs for retrieval and later steps
      context: async (input: any) => {
        // Make sure we're passing a string to the retriever
        const query = typeof input.input === 'string' ? input.input : String(input.input);
        // Now get the documents and concatenate their content
        const docs = await retriever.getRelevantDocuments(query);
        return docs.map((doc: Document) => doc.pageContent).join("\n\n");
      },
      input: (input: any) => input.input,
      chat_history: (input: any) => input.chat_history || [],
    },
    // Then feed the docs, question, and chat history to the prompt
    prompt,
    // Finally, generate the answer using the model
    model,
  ]);
  
  // Return the chain
  return chain;
}

// Helper function to manage chat history
export function formatChatHistory(history: [string, string][]) {
  return history.flatMap(exchange => [
    new HumanMessage(exchange[0]),
    new AIMessage(exchange[1]),
  ]);
} 