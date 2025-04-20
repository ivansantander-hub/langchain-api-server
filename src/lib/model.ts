import { SystemMessage } from '@langchain/core/messages';
import { ChatPromptTemplate, HumanMessagePromptTemplate } from '@langchain/core/prompts';
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
  const prompt = ChatPromptTemplate.fromMessages([
    new SystemMessage({
      content: "Eres un asistente experto que responde solo con información correcta no generas confusion ni problemas con la informacion, no envias informacion incorrecta ni falsa, tienes como objetivo ayudar al usuario a resolver sus dudas y problemas, eres amable y te comprendes con el usuario, no generas respuestas ambiguas."
    }),
    HumanMessagePromptTemplate.fromTemplate("{query}")
  ]);

  const memory = new BufferMemory({
    memoryKey: "chat_history",
    returnMessages: true,
    outputKey: "text"
  });
  
  return RetrievalQAChain.fromLLM(model, retriever, {
    returnSourceDocuments: true,
    // @ts-ignore - Memory is supported but TypeScript definitions might be outdated
    memory: memory,
    prompt,
  });
} 