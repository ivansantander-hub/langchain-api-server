import { SystemMessage, HumanMessage, AIMessage } from '@langchain/core/messages';
import { ChatPromptTemplate, MessagesPlaceholder } from '@langchain/core/prompts';
import { ChatOpenAI } from '@langchain/openai';
import { RunnablePassthrough, RunnableSequence } from '@langchain/core/runnables';
import { Document } from '@langchain/core/documents';

// Initialize the language model
export function createLanguageModel() {
  return new ChatOpenAI({
    modelName: 'gpt-4.1-nano',
    temperature: 0,
  });
}

// Create chat chain with conversation history management
export function createChatChain(model: ChatOpenAI, retriever: any) {
  // Define system prompt for RAG
  const systemPrompt = `
    You are a helpful assistant that answers questions based on the provided context.
    Use the following pieces of retrieved context to answer the user's question.
    If you don't know the answer, say that you don't know. 
    Use three sentences maximum and keep the answer concise.
    
    Context: {context}
  `;

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