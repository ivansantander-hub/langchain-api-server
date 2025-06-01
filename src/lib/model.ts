import { HumanMessage, AIMessage } from '@langchain/core/messages';
import { ChatPromptTemplate, MessagesPlaceholder } from '@langchain/core/prompts';
import { ChatOpenAI } from '@langchain/openai';
import { RunnableSequence } from '@langchain/core/runnables';
import { Document } from '@langchain/core/documents';

// Interface for retriever objects (compatible with LangChain retrievers)
export interface Retriever {
  getRelevantDocuments(query: string): Promise<Document[]>;
}

// Interface for chain input
export interface ChainInput {
  input: string;
  chat_history?: (HumanMessage | AIMessage)[];
}

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
  modelName: 'gpt-4.1-nano',
  temperature: 0.1,
  systemPrompt: `Eres un asistente especializado en responder preguntas basándote ÚNICAMENTE en el contexto proporcionado.

REGLAS ESTRICTAS:
1. SOLO responde con información que esté EXPLÍCITAMENTE presente en el contexto proporcionado
2. Si la información no está en el contexto, responde: "No tengo suficiente información en los documentos para responder esa pregunta específica"
3. NO hagas suposiciones, inferencias o añadas conocimiento externo
4. Si la pregunta es parcialmente respondible, responde solo la parte que puedes con el contexto
5. Cita qué parte del contexto usaste para tu respuesta cuando sea posible
6. Sé conciso pero completo con la información disponible

Contexto de los documentos:
{context}

Recuerda: Solo usa la información del contexto anterior. Si no está ahí, no la inventes.`,
  maxTokens: 1500,
  topP: 0.8,
  streaming: true,
};

// More conservative configuration for critical applications
export const conservativeModelConfig: ModelConfig = {
  modelName: 'gpt-4.1-nano',
  temperature: 0.0,
  systemPrompt: `Eres un asistente que responde preguntas EXCLUSIVAMENTE basándote en el contexto de documentos proporcionado.

INSTRUCCIONES CRÍTICAS:
- NUNCA inventes, asumas o uses conocimiento externo
- Si la respuesta no está en el contexto, di exactamente: "La información solicitada no se encuentra en los documentos proporcionados"
- Solo usa información que puedas citar textualmente del contexto
- Sé extremadamente preciso y conservador

Contexto:
{context}`,
  maxTokens: 1000,
  topP: 0.5,
  streaming: true,
};

// Available OpenAI models
export const availableModels = [
  { id: 'gpt-4', name: 'GPT-4', description: 'Most capable model, best for complex tasks' },
  { id: 'gpt-4.1-nano', name: 'GPT-4.1 Nano', description: 'Faster and more efficient and more accurate than GPT-4' },
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
export function createChatChain(model: ChatOpenAI, retriever: Retriever, systemPrompt: string = defaultModelConfig.systemPrompt) {
  // Create prompt template with chat history
  const prompt = ChatPromptTemplate.fromMessages([
    ["system", systemPrompt],
    new MessagesPlaceholder("chat_history"),
    ["human", "{input}"],
  ]);

  // Define the RAG pipeline
  const chain = RunnableSequence.from([
    {
      context: async (input: ChainInput) => {
        const query = typeof input.input === 'string' ? input.input : String(input.input);
        const docs = await retriever.getRelevantDocuments(query);
        return docs.map((doc: Document) => doc.pageContent).join("\n\n");
      },
      input: (input: ChainInput) => input.input,
      chat_history: (input: ChainInput) => input.chat_history || [],
    },
    prompt,
    model,
  ]);
  
  return chain;
}

// Helper function to manage chat history
export function formatChatHistory(history: [string, string][]) {
  return history.flatMap(exchange => [
    new HumanMessage(exchange[0]),
    new AIMessage(exchange[1]),
  ]);
} 