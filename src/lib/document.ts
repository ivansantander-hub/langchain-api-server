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

// Split the documents into chunks with improved parameters
export async function splitDocuments(docs: Document[]) {
  console.log('Splitting documents with improved chunking...');
  const textSplitter = new RecursiveCharacterTextSplitter({
    chunkSize: 800, // Chunks more smaller for better precision
    chunkOverlap: 150, // Reduced overlap but enough
    separators: ["\n\n", "\n", ". ", "! ", "? ", " ", ""], // More intelligent separators
    keepSeparator: true,
  });
  
  const splitDocs = await textSplitter.splitDocuments(docs);
  
  // Post-process chunks to improve quality
  const improvedChunks = splitDocs
    .filter(doc => doc.pageContent.trim().length > 50) // Filter very small chunks
    .map(doc => {
      // Clean and normalize the content
      const cleanContent = doc.pageContent
        .replace(/\s+/g, ' ') // Normalize spaces
        .replace(/\n{3,}/g, '\n\n') // Normalize line breaks
        .trim();
      
      return new Document({
        pageContent: cleanContent,
        metadata: {
          ...doc.metadata,
          chunkLength: cleanContent.length,
          processed: true
        }
      });
    });
  
  console.log(`Documents split into ${improvedChunks.length} high-quality chunks.`);
  return improvedChunks;
}

// Advanced semantic chunking (for better document understanding)
export async function splitDocumentsSemanticAware(docs: Document[]) {
  console.log('Splitting documents with semantic-aware chunking...');
  
  // Different strategies for different content types
  const strategies = {
    technical: {
      chunkSize: 600,
      chunkOverlap: 100,
      separators: ["\n\n", "\n", ". ", ":", ";", " ", ""]
    },
    narrative: {
      chunkSize: 1000,
      chunkOverlap: 200,
      separators: ["\n\n", "\n", ". ", "! ", "? ", " ", ""]
    },
    default: {
      chunkSize: 800,
      chunkOverlap: 150,
      separators: ["\n\n", "\n", ". ", "! ", "? ", " ", ""]
    }
  };

  const allChunks: Document[] = [];

  for (const doc of docs) {
    // Detect content type based on characteristics
    const content = doc.pageContent;
    let strategy = strategies.default;
    
    // Simple heuristics for content type detection
    if (content.includes('function') || content.includes('class') || content.includes('API')) {
      strategy = strategies.technical;
    } else if (content.split('. ').length > content.split('\n').length) {
      strategy = strategies.narrative;
    }

    console.log(`Processing document with ${strategy === strategies.technical ? 'technical' : strategy === strategies.narrative ? 'narrative' : 'default'} strategy`);

    const textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: strategy.chunkSize,
      chunkOverlap: strategy.chunkOverlap,
      separators: strategy.separators,
      keepSeparator: true,
    });

    const chunks = await textSplitter.splitDocuments([doc]);
    
    // Enhance chunks with better metadata
    const enhancedChunks = chunks
      .filter(chunk => chunk.pageContent.trim().length > 30)
      .map((chunk, index) => {
        const cleanContent = chunk.pageContent
          .replace(/\s+/g, ' ')
          .trim();

        return new Document({
          pageContent: cleanContent,
          metadata: {
            ...chunk.metadata,
            chunkIndex: index,
            chunkLength: cleanContent.length,
            contentType: strategy === strategies.technical ? 'technical' : 
                        strategy === strategies.narrative ? 'narrative' : 'general',
            quality: cleanContent.length > 100 ? 'high' : 'medium'
          }
        });
      });

    allChunks.push(...enhancedChunks);
  }

  console.log(`Documents split into ${allChunks.length} semantic-aware chunks.`);
  return allChunks;
} 