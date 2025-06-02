import { DirectoryLoader } from 'langchain/document_loaders/fs/directory';
import { TextLoader } from 'langchain/document_loaders/fs/text';
// Temporary workaround: using dynamic import for PDFLoader to avoid TypeScript compilation issues
// import { PDFLoader } from '@langchain/community/document_loaders/fs/pdf';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { Document } from "langchain/document";
import * as fs from 'fs';
import * as path from 'path';

// Improved user file management
export class UserFileManager {
  private baseDir: string = './user-files';

  constructor() {
    // Ensure base directory exists
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
  }

  // Create user directory if it doesn't exist
  private ensureUserDirectory(userId: string): string {
    const userDir = path.join(this.baseDir, userId);
    if (!fs.existsSync(userDir)) {
      fs.mkdirSync(userDir, { recursive: true });
    }
    return userDir;
  }

  // Save uploaded file for specific user
  async saveUserFile(userId: string, filename: string, content: string): Promise<string> {
    const userDir = this.ensureUserDirectory(userId);
    
    // Sanitize filename and ensure .txt extension
    const sanitizedFilename = this.sanitizeFilename(filename);
    const finalFilename = sanitizedFilename.endsWith('.txt') ? sanitizedFilename : `${sanitizedFilename}.txt`;
    const filepath = path.join(userDir, finalFilename);
    
    // Validate content
    if (!content || content.trim().length < 10) {
      throw new Error('File content is too short or empty');
    }

    // Clean and normalize content
    const cleanContent = this.cleanTextContent(content);
    
    // Write the file
    fs.writeFileSync(filepath, cleanContent, 'utf8');
    console.log(`User file saved: ${filepath} (${cleanContent.length} characters)`);
    
    return finalFilename;
  }

  // Get file path for user file
  getUserFilePath(userId: string, filename: string): string {
    const userDir = path.join(this.baseDir, userId);
    return path.join(userDir, filename);
  }

  // List files for specific user
  listUserFiles(userId: string): string[] {
    const userDir = path.join(this.baseDir, userId);
    if (!fs.existsSync(userDir)) {
      return [];
    }
    
    return fs.readdirSync(userDir)
      .filter(file => file.endsWith('.txt'))
      .sort();
  }

  // Check if user file exists
  userFileExists(userId: string, filename: string): boolean {
    const filepath = this.getUserFilePath(userId, filename);
    return fs.existsSync(filepath);
  }

  // Get file stats
  getFileStats(userId: string, filename: string): { size: number; created: Date; modified: Date } | null {
    const filepath = this.getUserFilePath(userId, filename);
    if (!fs.existsSync(filepath)) {
      return null;
    }
    
    const stats = fs.statSync(filepath);
    return {
      size: stats.size,
      created: stats.birthtime,
      modified: stats.mtime
    };
  }

  // Clean and normalize text content
  private cleanTextContent(content: string): string {
    return content
      .replace(/\r\n/g, '\n') // Normalize line endings
      .replace(/\r/g, '\n')   // Convert old Mac line endings
      .replace(/\t/g, '    ') // Convert tabs to spaces
      .replace(/\u00A0/g, ' ') // Replace non-breaking spaces
      .replace(/[\u200B-\u200D\uFEFF]/g, '') // Remove zero-width characters
      .replace(/\n{3,}/g, '\n\n') // Normalize multiple line breaks
      .replace(/[ \t]+$/gm, '') // Remove trailing spaces
      .trim();
  }

  // Sanitize filename
  private sanitizeFilename(filename: string): string {
    return filename
      .replace(/[^a-zA-Z0-9.\-_]/g, '_') // Replace special chars with underscore
      .replace(/_{2,}/g, '_') // Replace multiple underscores with single
      .replace(/^_+|_+$/g, '') // Remove leading/trailing underscores
      .toLowerCase();
  }
}

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

// Load a specific document by filename from user directory
export async function loadUserDocument(userId: string, filename: string): Promise<Document[]> {
  const userFileManager = new UserFileManager();
  const filepath = userFileManager.getUserFilePath(userId, filename);
  
  if (!fs.existsSync(filepath)) {
    throw new Error(`User document not found: ${userId}/${filename}`);
  }
  
  console.log(`Loading user document: ${userId}/${filename}`);
  
  const loader = new TextLoader(filepath);
  const docs = await loader.load();
  
  // Add user metadata to documents
  const enhancedDocs = docs.map(doc => new Document({
    pageContent: doc.pageContent,
    metadata: {
      ...doc.metadata,
      userId,
      originalFilename: filename,
      source: `user:${userId}/${filename}`,
      type: 'user_document'
    }
  }));
  
  console.log(`User document loaded: ${userId}/${filename} (${enhancedDocs.length} sections)`);
  return enhancedDocs;
}

// Load a specific document by filename (legacy function)
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

// Save an uploaded document to the docs directory (legacy function)
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

// Enhanced text splitter with better semantic awareness
export async function splitDocumentsAdvanced(docs: Document[]): Promise<Document[]> {
  console.log('Splitting documents with advanced semantic chunking...');
  
  const allChunks: Document[] = [];

  for (const doc of docs) {
    const content = doc.pageContent;
    const contentLength = content.length;
    
    // Dynamic chunk sizing based on content characteristics
    let chunkSize = 1000;
    let chunkOverlap = 200;
    
    // Adjust for content type and length
    if (contentLength < 2000) {
      chunkSize = 500;
      chunkOverlap = 100;
    } else if (contentLength > 10000) {
      chunkSize = 1200;
      chunkOverlap = 250;
    }
    
    // Detect content type for better splitting
    const hasCode = /function|class|def |import |#include/i.test(content);
    const hasLists = /^\s*[-*+•]\s/m.test(content) || /^\s*\d+\.\s/m.test(content);
    const hasHeaders = /^#+\s/m.test(content) || /^[A-Z][^.!?]*:$/m.test(content);
    
    let separators = ["\n\n", "\n", ". ", "! ", "? ", " ", ""];
    
    if (hasCode) {
      separators = ["\n\n", "\nclass ", "\ndef ", "\nfunction", "\n", ". ", " ", ""];
      chunkSize = 800;
      chunkOverlap = 150;
    } else if (hasLists) {
      separators = ["\n\n", "\n• ", "\n- ", "\n* ", "\n", ". ", " ", ""];
    } else if (hasHeaders) {
      separators = ["\n\n", "\n# ", "\n## ", "\n### ", "\n", ". ", " ", ""];
    }

    const textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize,
      chunkOverlap,
      separators,
      keepSeparator: true,
      lengthFunction: (text: string) => text.length,
    });

    const chunks = await textSplitter.splitDocuments([doc]);
    
    // Post-process and enhance chunks
    const enhancedChunks = chunks
      .map((chunk, index) => {
        const cleanContent = chunk.pageContent
          .replace(/\s+/g, ' ')
          .replace(/\n{3,}/g, '\n\n')
          .trim();

        // Skip very small or empty chunks
        if (cleanContent.length < 50) {
          return null;
        }

        // Calculate content quality score
        const wordCount = cleanContent.split(/\s+/).length;
        const sentenceCount = cleanContent.split(/[.!?]+/).length;
        const hasCompleteThoughts = sentenceCount > 1 && wordCount > 10;
        
        return new Document({
          pageContent: cleanContent,
          metadata: {
            ...chunk.metadata,
            chunkIndex: index,
            chunkLength: cleanContent.length,
            wordCount,
            sentenceCount,
            quality: hasCompleteThoughts ? 'high' : wordCount > 20 ? 'medium' : 'low',
            contentType: hasCode ? 'code' : hasLists ? 'list' : hasHeaders ? 'structured' : 'narrative',
            originalLength: contentLength,
            processed: true,
            processingDate: new Date().toISOString()
          }
        });
      })
      .filter(chunk => chunk !== null) as Document[];

    allChunks.push(...enhancedChunks);
  }

  console.log(`Documents split into ${allChunks.length} high-quality semantic chunks.`);
  return allChunks;
}

// Split the documents into chunks with improved parameters (legacy function)
export async function splitDocuments(docs: Document[]) {
  return splitDocumentsAdvanced(docs);
}

// Advanced semantic chunking (for better document understanding)
export async function splitDocumentsSemanticAware(docs: Document[]) {
  return splitDocumentsAdvanced(docs);
} 