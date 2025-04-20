import { config } from 'dotenv';
import { DirectoryLoader } from 'langchain/document_loaders/fs/directory';
import { TextLoader } from 'langchain/document_loaders/fs/text';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { OpenAIEmbeddings } from '@langchain/openai';
import { FaissStore } from '@langchain/community/vectorstores/faiss';
import { ChatOpenAI } from '@langchain/openai';
import { RetrievalQAChain } from 'langchain/chains';
import { createInterface } from 'readline';
import { BufferMemory } from "langchain/memory";
import { Document } from "langchain/document";

// Load environment variables
config();

// Check if OpenAI API key is set
if (!process.env.OPENAI_API_KEY) {
  console.error('Error: OPENAI_API_KEY is not set in .env');
  process.exit(1);
}

async function main() {
  console.log('Initializing chat application with documents...');
  
  // Load documents from the docs directory
  const loader = new DirectoryLoader('./docs', {
    '.txt': (path) => new TextLoader(path),
  });
  
  console.log('Loading documents...');
  const docs = await loader.load();
  console.log(`${docs.length} documents loaded.`);
  
  // Split the documents into chunks
  const textSplitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000,
    chunkOverlap: 200,
  });
  
  console.log('Splitting documents...');
  const splitDocs = await textSplitter.splitDocuments(docs);
  console.log(`Documents split into ${splitDocs.length} chunks.`);
  
  // Create embeddings with improved configuration
  console.log('Creating embeddings with OpenAI...');
  const embeddings = new OpenAIEmbeddings({
    modelName: "text-embedding-3-small", // More efficient model
    dimensions: 1536 // Optional: specify dimensions
  });
  
  // Load or create vector store
  console.log('Setting up vector store...');
  const vectorStore = await loadVectorStore(splitDocs, embeddings);
  
  // Create a retriever with improved settings
  const retriever = vectorStore.asRetriever({
    k: 5, // Retrieve top 5 most similar chunks
    searchType: 'similarity', // Specify search type
    filter: {} // Optional: additional filters
  });
  
  // Initialize the language model
  const model = new ChatOpenAI({
    modelName: 'gpt-4.1-nano',
    temperature: 0,
  });
  
  // Add conversation memory
  const memory = new BufferMemory({
    memoryKey: "chat_history",
    returnMessages: true,
  });
  
  // Create the chain with memory
  const chain = RetrievalQAChain.fromLLM(model, retriever, {
    returnSourceDocuments: true,
    // @ts-ignore - Memory is supported but TypeScript definitions might be outdated
    memory: memory,
  });
  
  // Setup readline interface for user input
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  
  // Function to handle chat interaction
  const chat = () => {
    rl.question('\nWhat would you like to ask about the documents? (Type "exit" to quit)\n> ', async (question) => {
      if (question.toLowerCase() === 'exit') {
        console.log('Goodbye!');
        rl.close();
        return;
      }
      
      try {
        console.log('Searching for answer...');
        const response = await chain._call({ query: question });
        
        console.log('\n--- Response ---');
        console.log(response.text);
        console.log('🚀 ~ rl.question ~ response:', response)
        
        chat();
      } catch (error) {
        console.error('Error processing the query:', error);
        chat();
      }
    });
  };
  
  console.log('\nSystem ready to answer questions!');
  console.log('You can ask about the content of the documents in the docs/.');
  chat();
}

// Function to load existing vector store or create a new one
async function loadVectorStore(
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

main().catch((error) => {
  console.error('Error in the application:', error);
}); 