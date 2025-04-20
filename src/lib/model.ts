import { ChatOpenAI } from '@langchain/openai';
import { RetrievalQAChain } from 'langchain/chains';
import { BufferMemory } from "langchain/memory";

// Initialize the language model
export function createLanguageModel() {
  return new ChatOpenAI({
    modelName: 'gpt-4.1-nano',
    temperature: 0,
  });
}

// Create chat chain with memory
export function createChatChain(model: ChatOpenAI, retriever: any) {
  const memory = new BufferMemory({
    memoryKey: "chat_history",
    returnMessages: true,
    outputKey: "text"
  });
  
  return RetrievalQAChain.fromLLM(model, retriever, {
    returnSourceDocuments: true,
    // @ts-ignore - Memory is supported but TypeScript definitions might be outdated
    memory: memory,
  });
} 