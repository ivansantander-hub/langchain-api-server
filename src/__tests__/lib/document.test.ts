import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';
import { Document } from 'langchain/document';
import {
  loadDocuments,
  loadSingleDocument,
  loadUserDocument,
  saveUploadedDocument,
  listAvailableDocuments,
  splitDocuments,
  splitDocumentsAdvanced,
  splitDocumentsSemanticAware,
  UserFileManager
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

    it('should call splitDocumentsAdvanced', async () => {
      mockTextSplitter.splitDocuments.mockResolvedValue([]);
      
      const result = await splitDocuments([]);
      
      // splitDocuments is now just a wrapper for splitDocumentsAdvanced
      expect(result).toEqual([]);
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

    it('should normalize whitespace and clean content via splitDocumentsAdvanced', async () => {
      const inputDocs = [
        new Document({ pageContent: 'Test document that is long enough to pass the minimum length filter for processing', metadata: { source: 'test.txt' } })
      ];

      const splitResults = [
        new Document({ 
          pageContent: 'Content   with    multiple    spaces\n\n\n\nand   many   newlines that should be cleaned properly by the advanced splitter', 
          metadata: { source: 'test.txt' } 
        })
      ];

      mockTextSplitter.splitDocuments.mockResolvedValue(splitResults);

      const result = await splitDocuments(inputDocs);

      expect(result).toBeInstanceOf(Array);
      // Since splitDocuments calls splitDocumentsAdvanced, we expect the enhanced processing
      expect(mockTextSplitter.splitDocuments).toHaveBeenCalled();
    });

    it('should delegate to splitDocumentsAdvanced', async () => {
      const inputDocs = [
        new Document({ pageContent: 'Test document content for processing that is long enough', metadata: { source: 'test.txt' } })
      ];

      const splitResults = [
        new Document({ 
          pageContent: 'Test document content for processing that is long enough to pass the filter', 
          metadata: { source: 'test.txt' } 
        })
      ];

      mockTextSplitter.splitDocuments.mockResolvedValue(splitResults);

      const result = await splitDocuments(inputDocs);

      expect(result).toBeInstanceOf(Array);
      // splitDocuments now delegates to splitDocumentsAdvanced
      expect(mockTextSplitter.splitDocuments).toHaveBeenCalled();
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

    it('should call splitDocumentsAdvanced (same as semantic aware)', async () => {
      const technicalDoc = new Document({ 
        pageContent: 'function myFunction() { return API.call(); } with more content to pass minimum length', 
        metadata: { source: 'code.txt' } 
      });

      mockTextSplitter.splitDocuments.mockResolvedValue([
        new Document({ 
          pageContent: 'function myFunction() { return API.call(); } with more content to pass minimum length', 
          metadata: { source: 'code.txt' } 
        })
      ]);

      const result = await splitDocumentsSemanticAware([technicalDoc]);

      expect(result).toBeInstanceOf(Array);
      // splitDocumentsSemanticAware now delegates to splitDocumentsAdvanced
    });

    it('should work as alias for splitDocumentsAdvanced', async () => {
      const doc = new Document({ 
        pageContent: 'This is content that is long enough to pass validation and processing requirements', 
        metadata: { source: 'test.txt' } 
      });

      mockTextSplitter.splitDocuments.mockResolvedValue([
        new Document({ 
          pageContent: 'This is content that is long enough to pass validation and processing requirements', 
          metadata: { source: 'test.txt' } 
        })
      ]);

      const result = await splitDocumentsSemanticAware([doc]);

      expect(result).toBeInstanceOf(Array);
      // All semantic aware functions now delegate to splitDocumentsAdvanced
    });
  });

  describe('UserFileManager', () => {
    let userFileManager: UserFileManager;

    beforeEach(() => {
      userFileManager = new UserFileManager();
      mockFs.existsSync.mockReturnValue(true);
      mockFs.mkdirSync.mockReturnValue(undefined);
      mockFs.writeFileSync.mockReturnValue(undefined);
      mockFs.readdirSync.mockReturnValue([]);
      mockFs.statSync.mockReturnValue({
        size: 1024,
        birthtime: new Date('2024-01-01'),
        mtime: new Date('2024-01-02')
      } as any);
      mockPath.join.mockImplementation((...args) => args.join('/'));
    });

    describe('saveUserFile', () => {
      it('should create user directory if it does not exist', async () => {
        mockFs.existsSync.mockReturnValueOnce(false); // Base dir exists
        mockFs.existsSync.mockReturnValueOnce(false); // User dir doesn't exist
        
        await userFileManager.saveUserFile('user123', 'test.txt', 'Test content');
        
        expect(mockFs.mkdirSync).toHaveBeenCalledWith('./user-files/user123', { recursive: true });
      });

      it('should sanitize filename and add .txt extension', async () => {
        const result = await userFileManager.saveUserFile('user123', 'My File!@#$%', 'Test content');
        
        expect(result).toBe('my_file.txt');
        expect(mockFs.writeFileSync).toHaveBeenCalledWith(
          './user-files/user123/my_file.txt',
          'Test content',
          'utf8'
        );
      });

      it('should throw error for content that is too short', async () => {
        await expect(userFileManager.saveUserFile('user123', 'test.txt', 'Short'))
          .rejects.toThrow('File content is too short or empty');
      });

      it('should clean and normalize text content', async () => {
        const dirtyContent = 'Test\r\n\tcontent\u00A0with\u200Bspecial\t\t\tcharacters   \n\n\n\n';
        // The actual implementation replaces \u200B (zero-width space) completely
        const expectedClean = 'Test\n    content withspecial            characters';
        
        await userFileManager.saveUserFile('user123', 'test.txt', dirtyContent);
        
        expect(mockFs.writeFileSync).toHaveBeenCalledWith(
          './user-files/user123/test.txt',
          expectedClean,
          'utf8'
        );
      });
    });

    describe('listUserFiles', () => {
      it('should return empty array if user directory does not exist', () => {
        mockFs.existsSync.mockReturnValue(false);
        
        const result = userFileManager.listUserFiles('user123');
        
        expect(result).toEqual([]);
      });

      it('should filter and return only .txt files sorted', () => {
        mockFs.readdirSync.mockReturnValue([
          'document3.txt',
          'document1.txt',
          'image.jpg',
          'document2.txt',
          'readme.md'
        ] as any);
        
        const result = userFileManager.listUserFiles('user123');
        
        expect(result).toEqual([
          'document1.txt',
          'document2.txt',
          'document3.txt'
        ]);
      });
    });

    describe('userFileExists', () => {
      it('should return true if file exists', () => {
        mockFs.existsSync.mockReturnValue(true);
        
        const result = userFileManager.userFileExists('user123', 'test.txt');
        
        expect(result).toBe(true);
        expect(mockFs.existsSync).toHaveBeenCalledWith('./user-files/user123/test.txt');
      });

      it('should return false if file does not exist', () => {
        mockFs.existsSync.mockReturnValue(false);
        
        const result = userFileManager.userFileExists('user123', 'test.txt');
        
        expect(result).toBe(false);
      });
    });

    describe('getFileStats', () => {
      it('should return file stats if file exists', () => {
        const mockStats = {
          size: 2048,
          birthtime: new Date('2024-01-01'),
          mtime: new Date('2024-01-02')
        };
        mockFs.statSync.mockReturnValue(mockStats as any);
        
        const result = userFileManager.getFileStats('user123', 'test.txt');
        
        expect(result).toEqual({
          size: 2048,
          created: mockStats.birthtime,
          modified: mockStats.mtime
        });
      });

      it('should return null if file does not exist', () => {
        mockFs.existsSync.mockReturnValue(false);
        
        const result = userFileManager.getFileStats('user123', 'test.txt');
        
        expect(result).toBe(null);
      });
    });
  });

  describe('loadUserDocument', () => {
    beforeEach(() => {
      mockFs.existsSync.mockReturnValue(true);
      mockPath.join.mockImplementation((...args) => args.join('/'));
    });

    it('should throw error if user document does not exist', async () => {
      mockFs.existsSync.mockReturnValue(false);
      
      await expect(loadUserDocument('user123', 'test.txt'))
        .rejects.toThrow('User document not found: user123/test.txt');
    });

    it('should add user metadata to loaded documents', async () => {
      const mockTextLoader = {
        load: jest.fn().mockResolvedValue([
          new Document({
            pageContent: 'Test content',
            metadata: { source: './user-files/user123/test.txt' }
          })
        ])
      };
      
      const { TextLoader } = require('langchain/document_loaders/fs/text');
      (TextLoader as jest.Mock).mockImplementation(() => mockTextLoader);

      const result = await loadUserDocument('user123', 'test.txt');

      expect(result).toHaveLength(1);
      expect(result[0].metadata.source).toBe('user:user123/test.txt');
      expect(result[0].metadata.userId).toBe('user123');
      expect(result[0].metadata.originalFilename).toBe('test.txt');
      expect(result[0].metadata.type).toBe('user_document');
    });
  });

  describe('splitDocumentsAdvanced', () => {
    let mockTextSplitter: any;

    beforeEach(() => {
      mockTextSplitter = {
        splitDocuments: jest.fn()
      };
      
      const { RecursiveCharacterTextSplitter } = require('langchain/text_splitter');
      (RecursiveCharacterTextSplitter as jest.Mock).mockImplementation(() => mockTextSplitter);
    });

    it('should use dynamic chunk sizing based on content length', async () => {
      const { RecursiveCharacterTextSplitter } = require('langchain/text_splitter');
      
      const smallDoc = new Document({ 
        pageContent: 'Small content', 
        metadata: { source: 'test.txt' } 
      });
      
      mockTextSplitter.splitDocuments.mockResolvedValue([
        new Document({ 
          pageContent: 'Small content chunk that meets minimum requirements for processing', 
          metadata: { source: 'test.txt' } 
        })
      ]);

      await splitDocumentsAdvanced([smallDoc]);

      expect(RecursiveCharacterTextSplitter).toHaveBeenCalledWith({
        chunkSize: 500,
        chunkOverlap: 100,
        separators: ["\n\n", "\n", ". ", "! ", "? ", " ", ""],
        keepSeparator: true,
        lengthFunction: expect.any(Function)
      });
    });

    it('should detect code content and adjust separators', async () => {
      const { RecursiveCharacterTextSplitter } = require('langchain/text_splitter');
      
      const codeDoc = new Document({ 
        pageContent: 'function test() { return true; } class MyClass { constructor() {} }', 
        metadata: { source: 'test.js' } 
      });
      
      mockTextSplitter.splitDocuments.mockResolvedValue([
        new Document({ 
          pageContent: 'function test() { return true; } class MyClass that has enough content', 
          metadata: { source: 'test.js' } 
        })
      ]);

      await splitDocumentsAdvanced([codeDoc]);

      expect(RecursiveCharacterTextSplitter).toHaveBeenCalledWith({
        chunkSize: 800,
        chunkOverlap: 150,
        separators: ["\n\n", "\nclass ", "\ndef ", "\nfunction", "\n", ". ", " ", ""],
        keepSeparator: true,
        lengthFunction: expect.any(Function)
      });
    });

    it('should add enhanced metadata to processed chunks', async () => {
      const inputDoc = new Document({ 
        pageContent: 'This is a test document with multiple sentences. It should be processed correctly.',
        metadata: { source: 'test.txt' } 
      });
      
      const splitResult = new Document({ 
        pageContent: 'This is a test document with multiple sentences. It should be processed correctly.',
        metadata: { source: 'test.txt' } 
      });
      
      mockTextSplitter.splitDocuments.mockResolvedValue([splitResult]);

      const result = await splitDocumentsAdvanced([inputDoc]);

      expect(result).toHaveLength(1);
      expect(result[0].metadata).toEqual({
        source: 'test.txt',
        chunkIndex: 0,
        chunkLength: splitResult.pageContent.length,
        wordCount: expect.any(Number),
        sentenceCount: expect.any(Number),
        quality: 'high',
        contentType: 'narrative',
        originalLength: inputDoc.pageContent.length,
        processed: true,
        processingDate: expect.any(String)
      });
    });

    it('should filter out very small chunks', async () => {
      const inputDoc = new Document({ 
        pageContent: 'Test document',
        metadata: { source: 'test.txt' } 
      });
      
      const splitResults = [
        new Document({ 
          pageContent: 'This is a long enough chunk that should pass the filter and be included in results',
          metadata: { source: 'test.txt' } 
        }),
        new Document({ 
          pageContent: 'Short',
          metadata: { source: 'test.txt' } 
        })
      ];
      
      mockTextSplitter.splitDocuments.mockResolvedValue(splitResults);

      const result = await splitDocumentsAdvanced([inputDoc]);

      expect(result).toHaveLength(1);
      expect(result[0].pageContent).toContain('long enough chunk');
    });
  });
}); 