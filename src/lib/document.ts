import { DirectoryLoader } from 'langchain/document_loaders/fs/directory';
import { TextLoader } from 'langchain/document_loaders/fs/text';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { Document } from "langchain/document";
import * as fs from 'fs';
import * as path from 'path';

// Load all documents from the docs directory
export async function loadDocuments() {
  console.log('Loading all documents...');
  const loader = new DirectoryLoader('./docs', {
    '.txt': (path) => new TextLoader(path),
  });
  
  const docs = await loader.load();
  console.log(`${docs.length} documents loaded.`);
  return docs;
}

// Load a specific document by filename
export async function loadSingleDocument(filename: string): Promise<Document[]> {
  const filepath = path.join('./docs', filename);
  
  if (!fs.existsSync(filepath)) {
    throw new Error(`Document not found: ${filename}`);
  }
  
  console.log(`Loading document: ${filename}`);
  const loader = new TextLoader(filepath);
  const docs = await loader.load();
  console.log(`Document loaded: ${filename}`);
  return docs;
}

// Save an uploaded document to the docs directory
export async function saveUploadedDocument(fileContent: string, filename: string): Promise<string> {
  // Ensure docs directory exists
  if (!fs.existsSync('./docs')) {
    fs.mkdirSync('./docs', { recursive: true });
  }
  
  // Ensure the filename has .txt extension
  const sanitizedFilename = filename.endsWith('.txt') ? filename : `${filename}.txt`;
  const filepath = path.join('./docs', sanitizedFilename);
  
  // Write the file
  fs.writeFileSync(filepath, fileContent, 'utf8');
  console.log(`Document saved to: ${filepath}`);
  
  return sanitizedFilename;
}

// List all available documents in the docs directory
export function listAvailableDocuments(): string[] {
  if (!fs.existsSync('./docs')) {
    return [];
  }
  
  return fs.readdirSync('./docs')
    .filter(file => file.endsWith('.txt'));
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