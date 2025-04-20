import { DirectoryLoader } from 'langchain/document_loaders/fs/directory';
import { TextLoader } from 'langchain/document_loaders/fs/text';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { Document } from "langchain/document";

// Load documents from the docs directory
export async function loadDocuments() {
  console.log('Loading documents...');
  const loader = new DirectoryLoader('./docs', {
    '.txt': (path) => new TextLoader(path),
  });
  
  const docs = await loader.load();
  console.log(`${docs.length} documents loaded.`);
  return docs;
}

// Split the documents into chunks
export async function splitDocuments(docs: Document[]) {
  console.log('Splitting documents...');
  const textSplitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000,
    chunkOverlap: 200,
  });
  
  const splitDocs = await textSplitter.splitDocuments(docs);
  console.log(`Documents split into ${splitDocs.length} chunks.`);
  return splitDocs;
} 