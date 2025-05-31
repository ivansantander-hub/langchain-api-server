import { DirectoryLoader } from 'langchain/document_loaders/fs/directory';
import { TextLoader } from 'langchain/document_loaders/fs/text';
// Temporary workaround: using dynamic import for PDFLoader to avoid TypeScript compilation issues
// import { PDFLoader } from '@langchain/community/document_loaders/fs/pdf';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { Document } from "langchain/document";
import * as fs from 'fs';
import * as path from 'path';

// Load all documents from the docs directory
export async function loadDocuments() {
  console.log('Loading all documents...');
  
  // Dynamic import for PDFLoader to avoid compilation issues
  const { PDFLoader } = await import('@langchain/community/document_loaders/fs/pdf');
  
  const loader = new DirectoryLoader('./docs', {
    '.txt': (path) => new TextLoader(path),
    '.pdf': (path) => new PDFLoader(path),
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
  
  let loader;
  if (filename.toLowerCase().endsWith('.pdf')) {
    // Dynamic import for PDFLoader to avoid compilation issues
    const { PDFLoader } = await import('@langchain/community/document_loaders/fs/pdf');
    loader = new PDFLoader(filepath);
  } else {
    loader = new TextLoader(filepath);
  }
  
  const docs = await loader.load();
  console.log(`Document loaded: ${filename} (${docs.length} pages/sections)`);
  return docs;
}

// Save an uploaded document to the docs directory
export async function saveUploadedDocument(fileContent: string, filename: string): Promise<string> {
  // Ensure docs directory exists
  if (!fs.existsSync('./docs')) {
    fs.mkdirSync('./docs', { recursive: true });
  }
  
  // For text content, ensure .txt extension
  const sanitizedFilename = filename.endsWith('.txt') || filename.endsWith('.pdf') ? 
    filename : `${filename}.txt`;
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
    .filter(file => file.endsWith('.txt') || file.endsWith('.pdf'));
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