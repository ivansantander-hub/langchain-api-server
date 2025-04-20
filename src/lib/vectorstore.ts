import { OpenAIEmbeddings } from '@langchain/openai';
import { FaissStore } from '@langchain/community/vectorstores/faiss';
import { Document } from "langchain/document";

// Create embeddings
export function createEmbeddings() {
  console.log('Creating embeddings with OpenAI...');
  return new OpenAIEmbeddings({
    modelName: "text-embedding-3-small",
    dimensions: 1536
  });
}

// Function to load existing vector store or create a new one
export async function loadVectorStore(
  splitDocs: Document[], 
  embeddings: OpenAIEmbeddings
): Promise<FaissStore> {
  try {
    console.log('Trying to load existing vector store...');
    return await FaissStore.load('./vectorstore', embeddings);
  } catch {
    console.log('No existing vector store found, creating a new one...');
    // If it doesn't exist, create a new one
    const vectorStore = await FaissStore.fromDocuments(splitDocs, embeddings);
    await vectorStore.save('./vectorstore');
    console.log('Vector store saved in ./vectorstore');
    return vectorStore;
  }
}

// Create a retriever
export function createRetriever(vectorStore: FaissStore) {
  return vectorStore.asRetriever({
    k: 5,
    searchType: 'similarity',
    filter: {}
  });
} 