import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';
import { Document } from 'langchain/document';
import {
  loadDocuments,
  loadSingleDocument,
  saveUploadedDocument,
  listAvailableDocuments,
  splitDocuments,
  splitDocumentsSemanticAware
} from '../../lib/document.js';

// Mock dependencies
jest.mock('fs');
jest.mock('path');
jest.mock('langchain/document_loaders/fs/directory');
jest.mock('langchain/document_loaders/fs/text');
jest.mock('langchain/text_splitter');

const mockFs = fs as jest.Mocked<typeof fs>;
const mockPath = path as jest.Mocked<typeof path>;

describe('document.ts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('saveUploadedDocument', () => {
    beforeEach(() => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.mkdirSync.mockReturnValue(undefined);
      mockFs.writeFileSync.mockReturnValue(undefined);
      mockPath.join.mockImplementation((...args) => args.join('/'));
    });

    it('should create docs directory if it does not exist', async () => {
      mockFs.existsSync.mockReturnValue(false);
      
      await saveUploadedDocument('Test content', 'test.txt');
      
      expect(mockFs.mkdirSync).toHaveBeenCalledWith('./docs', { recursive: true });
    });

    it('should save document with .txt extension', async () => {
      const result = await saveUploadedDocument('Test content', 'test.txt');
      
      expect(mockFs.writeFileSync).toHaveBeenCalledWith('./docs/test.txt', 'Test content', 'utf8');
      expect(result).toBe('test.txt');
    });

    it('should add .txt extension if not present', async () => {
      const result = await saveUploadedDocument('Test content', 'test');
      
      expect(mockFs.writeFileSync).toHaveBeenCalledWith('./docs/test.txt', 'Test content', 'utf8');
      expect(result).toBe('test.txt');
    });

    it('should keep .pdf extension', async () => {
      const result = await saveUploadedDocument('PDF content', 'document.pdf');
      
      expect(mockFs.writeFileSync).toHaveBeenCalledWith('./docs/document.pdf', 'PDF content', 'utf8');
      expect(result).toBe('document.pdf');
    });

    it('should handle special characters in filename', async () => {
      const result = await saveUploadedDocument('Content', 'test file (1).txt');
      
      expect(mockFs.writeFileSync).toHaveBeenCalledWith('./docs/test file (1).txt', 'Content', 'utf8');
      expect(result).toBe('test file (1).txt');
    });
  });

  describe('listAvailableDocuments', () => {
    it('should return empty array if docs directory does not exist', () => {
      mockFs.existsSync.mockReturnValue(false);
      
      const result = listAvailableDocuments();
      
      expect(result).toEqual([]);
      expect(mockFs.existsSync).toHaveBeenCalledWith('./docs');
    });

    it('should filter and return only .txt and .pdf files', () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readdirSync.mockReturnValue([
        'document1.txt',
        'document2.pdf',
        'image.jpg',
        'readme.md',
        'document3.txt',
        '.hidden.txt'
      ] as any);
      
      const result = listAvailableDocuments();
      
      expect(result).toEqual([
        'document1.txt',
        'document2.pdf',
        'document3.txt',
        '.hidden.txt'
      ]);
    });

    it('should handle empty directory', () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readdirSync.mockReturnValue([] as any);
      
      const result = listAvailableDocuments();
      
      expect(result).toEqual([]);
    });
  });

  describe('splitDocuments', () => {
    let mockTextSplitter: any;

    beforeEach(() => {
      mockTextSplitter = {
        splitDocuments: jest.fn()
      };
      
      const { RecursiveCharacterTextSplitter } = require('langchain/text_splitter');
      (RecursiveCharacterTextSplitter as jest.Mock).mockImplementation(() => mockTextSplitter);
    });

    it('should create text splitter with improved parameters', async () => {
      const { RecursiveCharacterTextSplitter } = require('langchain/text_splitter');
      mockTextSplitter.splitDocuments.mockResolvedValue([]);
      
      await splitDocuments([]);
      
      expect(RecursiveCharacterTextSplitter).toHaveBeenCalledWith({
        chunkSize: 800,
        chunkOverlap: 150,
        separators: ["\n\n", "\n", ". ", "! ", "? ", " ", ""],
        keepSeparator: true,
      });
    });

    it('should filter out small chunks', async () => {
      const inputDocs = [
        new Document({ pageContent: 'Test document content', metadata: { source: 'test.txt' } })
      ];

      const splitResults = [
        new Document({ pageContent: 'Large chunk with sufficient content to pass the filter', metadata: { source: 'test.txt' } }),
        new Document({ pageContent: 'Small', metadata: { source: 'test.txt' } }), // Should be filtered out
        new Document({ pageContent: 'Another large chunk with enough content to be useful', metadata: { source: 'test.txt' } })
      ];

      mockTextSplitter.splitDocuments.mockResolvedValue(splitResults);

      const result = await splitDocuments(inputDocs);

      expect(result).toHaveLength(2);
      expect(result[0].pageContent).toContain('Large chunk with sufficient content');
      expect(result[1].pageContent).toContain('Another large chunk with enough content');
    });

    it('should normalize whitespace and clean content', async () => {
      const inputDocs = [
        new Document({ pageContent: 'Test document', metadata: { source: 'test.txt' } })
      ];

      const splitResults = [
        new Document({ 
          pageContent: 'Content   with    multiple    spaces\n\n\n\nand   many   newlines', 
          metadata: { source: 'test.txt' } 
        })
      ];

      mockTextSplitter.splitDocuments.mockResolvedValue(splitResults);

      const result = await splitDocuments(inputDocs);

      expect(result[0].pageContent).toBe('Content with multiple spaces and many newlines');
      expect(result[0].metadata.processed).toBe(true);
      expect(result[0].metadata.chunkLength).toBe('Content with multiple spaces and many newlines'.length);
    });

    it('should add processing metadata to chunks', async () => {
      const inputDocs = [
        new Document({ pageContent: 'Test document content for processing', metadata: { source: 'test.txt' } })
      ];

      const splitResults = [
        new Document({ 
          pageContent: 'Test document content for processing that is long enough to pass the filter', 
          metadata: { source: 'test.txt' } 
        })
      ];

      mockTextSplitter.splitDocuments.mockResolvedValue(splitResults);

      const result = await splitDocuments(inputDocs);

      expect(result).toHaveLength(1);
      expect(result[0].metadata).toEqual({
        source: 'test.txt',
        chunkLength: 'Test document content for processing that is long enough to pass the filter'.length,
        processed: true
      });
    });
  });

  describe('splitDocumentsSemanticAware', () => {
    let mockTextSplitter: any;

    beforeEach(() => {
      mockTextSplitter = {
        splitDocuments: jest.fn()
      };
      
      const { RecursiveCharacterTextSplitter } = require('langchain/text_splitter');
      (RecursiveCharacterTextSplitter as jest.Mock).mockImplementation(() => mockTextSplitter);
    });

    it('should detect technical content and use appropriate strategy', async () => {
      const { RecursiveCharacterTextSplitter } = require('langchain/text_splitter');
      
      const technicalDoc = new Document({ 
        pageContent: 'function myFunction() { return API.call(); }', 
        metadata: { source: 'code.txt' } 
      });

      mockTextSplitter.splitDocuments.mockResolvedValue([
        new Document({ 
          pageContent: 'function myFunction() { return API.call(); }', 
          metadata: { source: 'code.txt' } 
        })
      ]);

      await splitDocumentsSemanticAware([technicalDoc]);

      expect(RecursiveCharacterTextSplitter).toHaveBeenCalledWith({
        chunkSize: 600,
        chunkOverlap: 100,
        separators: ["\n\n", "\n", ". ", ":", ";", " ", ""],
        keepSeparator: true,
      });
    });

    it('should detect narrative content and use appropriate strategy', async () => {
      const { RecursiveCharacterTextSplitter } = require('langchain/text_splitter');
      
      const narrativeDoc = new Document({ 
        pageContent: 'This is a story. It has many sentences. Each sentence tells part of the tale. The narrative flows naturally from one idea to the next.', 
        metadata: { source: 'story.txt' } 
      });

      mockTextSplitter.splitDocuments.mockResolvedValue([
        new Document({ 
          pageContent: 'This is a story. It has many sentences.', 
          metadata: { source: 'story.txt' } 
        })
      ]);

      await splitDocumentsSemanticAware([narrativeDoc]);

      expect(RecursiveCharacterTextSplitter).toHaveBeenCalledWith({
        chunkSize: 1000,
        chunkOverlap: 200,
        separators: ["\n\n", "\n", ". ", "! ", "? ", " ", ""],
        keepSeparator: true,
      });
    });

    it('should use default strategy for general content', async () => {
      const { RecursiveCharacterTextSplitter } = require('langchain/text_splitter');
      
      const generalDoc = new Document({ 
        pageContent: 'This is general documentation\nIt contains various information\nBut does not fit specific patterns', 
        metadata: { source: 'general.txt' } 
      });

      mockTextSplitter.splitDocuments.mockResolvedValue([
        new Document({ 
          pageContent: 'This is general documentation', 
          metadata: { source: 'general.txt' } 
        })
      ]);

      await splitDocumentsSemanticAware([generalDoc]);

      expect(RecursiveCharacterTextSplitter).toHaveBeenCalledWith({
        chunkSize: 800,
        chunkOverlap: 150,
        separators: ["\n\n", "\n", ". ", "! ", "? ", " ", ""],
        keepSeparator: true,
      });
    });

    it('should add enhanced metadata with content type', async () => {
      const technicalDoc = new Document({ 
        pageContent: 'function test() { class MyClass { } }', 
        metadata: { source: 'code.txt' } 
      });

      mockTextSplitter.splitDocuments.mockResolvedValue([
        new Document({ 
          pageContent: 'function test() { class MyClass { } }', 
          metadata: { source: 'code.txt' } 
        })
      ]);

      const result = await splitDocumentsSemanticAware([technicalDoc]);

      expect(result[0].metadata).toEqual({
        source: 'code.txt',
        chunkIndex: 0,
        chunkLength: 'function test() { class MyClass { } }'.length,
        contentType: 'technical',
        quality: 'medium'
      });
    });

    it('should filter out very small chunks', async () => {
      const inputDoc = new Document({ 
        pageContent: 'Content for testing', 
        metadata: { source: 'test.txt' } 
      });

      mockTextSplitter.splitDocuments.mockResolvedValue([
        new Document({ pageContent: 'Good chunk with enough content and more text', metadata: { source: 'test.txt' } }),
        new Document({ pageContent: 'Small', metadata: { source: 'test.txt' } }),
        new Document({ pageContent: 'Another good chunk with sufficient content', metadata: { source: 'test.txt' } })
      ]);

      const result = await splitDocumentsSemanticAware([inputDoc]);

      expect(result).toHaveLength(2);
      expect(result[0].pageContent).toBe('Good chunk with enough content and more text');
      expect(result[1].pageContent).toBe('Another good chunk with sufficient content');
    });

    it('should assign quality based on chunk length', async () => {
      const inputDoc = new Document({ 
        pageContent: 'Test content', 
        metadata: { source: 'test.txt' } 
      });

      mockTextSplitter.splitDocuments.mockResolvedValue([
        new Document({ 
          pageContent: 'This is a very long chunk with lots of content that should be marked as high quality because it has more than 100 characters', 
          metadata: { source: 'test.txt' } 
        }),
        new Document({ 
          pageContent: 'Short chunk that has more than thirty characters to pass the filter', 
          metadata: { source: 'test.txt' } 
        })
      ]);

      const result = await splitDocumentsSemanticAware([inputDoc]);

      expect(result).toHaveLength(2);
      expect(result[0].metadata.quality).toBe('high');
      expect(result[1].metadata.quality).toBe('medium');
    });
  });
}); 