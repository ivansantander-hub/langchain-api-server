import * as fs from 'fs';
import * as path from 'path';

// Interface for chat history context
export interface ChatContext {
  userId: string;
  vectorName: string;
  chatId: string;
  history: [string, string][];
}

// Class to manage chat histories for different users and chat sessions
export class ChatHistoryManager {
  // Map structure: userId -> vectorName -> chatId -> history
  private histories: Map<string, Map<string, Map<string, [string, string][]>>> = new Map();
  private baseDir: string = './chat-histories';
  
  constructor() {
    // Ensure the base directory exists
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
    
    // Load existing chat histories
    this.loadAllHistories();
  }
  
  // Get a unique key for a chat history
  private getHistoryKey(userId: string, vectorName: string, chatId: string): string {
    return `${userId}-${vectorName}-${chatId}`;
  }
  
  // Get chat history for a specific user, vector store and chat
  getChatHistory(userId: string, vectorName: string, chatId: string): [string, string][] {
    // If user doesn't exist in the map, create an entry
    if (!this.histories.has(userId)) {
      this.histories.set(userId, new Map<string, Map<string, [string, string][]>>());
    }
    
    // Get the map for this user
    const userHistories = this.histories.get(userId)!;
    
    // If vector store doesn't exist, create an entry
    if (!userHistories.has(vectorName)) {
      userHistories.set(vectorName, new Map<string, [string, string][]>());
    }
    
    // Get the map for this vector store
    const vectorHistories = userHistories.get(vectorName)!;
    
    // If chat doesn't exist, create an empty history
    if (!vectorHistories.has(chatId)) {
      vectorHistories.set(chatId, []);
    }
    
    return vectorHistories.get(chatId)!;
  }
  
  // Update chat history for a specific user, vector store and chat
  updateChatHistory(userId: string, vectorName: string, chatId: string, history: [string, string][]): void {
    // If user doesn't exist in the map, create an entry
    if (!this.histories.has(userId)) {
      this.histories.set(userId, new Map<string, Map<string, [string, string][]>>());
    }
    
    // Get the map for this user
    const userHistories = this.histories.get(userId)!;
    
    // If vector store doesn't exist, create an entry
    if (!userHistories.has(vectorName)) {
      userHistories.set(vectorName, new Map<string, [string, string][]>());
    }
    
    // Get the map for this vector store
    const vectorHistories = userHistories.get(vectorName)!;
    
    // Update the history
    vectorHistories.set(chatId, history);
    
    // Save to disk
    this.saveChatHistory(userId, vectorName, chatId);
  }
  
  // Add a message exchange to chat history
  addExchange(userId: string, vectorName: string, chatId: string, question: string, answer: string): void {
    const history = this.getChatHistory(userId, vectorName, chatId);
    history.push([question, answer]);
    this.updateChatHistory(userId, vectorName, chatId, history);
  }
  
  // Get the directory path for a user
  private getUserDir(userId: string): string {
    return path.join(this.baseDir, userId);
  }
  
  // Get the directory path for a vector store within a user
  private getVectorDir(userId: string, vectorName: string): string {
    return path.join(this.getUserDir(userId), vectorName);
  }
  
  // Get the file path for a specific chat history
  private getChatHistoryPath(userId: string, vectorName: string, chatId: string): string {
    return path.join(this.getVectorDir(userId, vectorName), `${chatId}.json`);
  }
  
  // Save chat history to disk
  private saveChatHistory(userId: string, vectorName: string, chatId: string): void {
    const userDir = this.getUserDir(userId);
    
    // Ensure user directory exists
    if (!fs.existsSync(userDir)) {
      fs.mkdirSync(userDir, { recursive: true });
    }
    
    const vectorDir = this.getVectorDir(userId, vectorName);
    
    // Ensure vector store directory exists
    if (!fs.existsSync(vectorDir)) {
      fs.mkdirSync(vectorDir, { recursive: true });
    }
    
    const history = this.getChatHistory(userId, vectorName, chatId);
    const filePath = this.getChatHistoryPath(userId, vectorName, chatId);
    
    fs.writeFileSync(filePath, JSON.stringify(history, null, 2));
  }
  
  // Load a specific chat history from disk
  private loadChatHistory(userId: string, vectorName: string, chatId: string): void {
    const filePath = this.getChatHistoryPath(userId, vectorName, chatId);
    
    if (fs.existsSync(filePath)) {
      try {
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        const history = JSON.parse(fileContent) as [string, string][];
        
        // Create user map if it doesn't exist
        if (!this.histories.has(userId)) {
          this.histories.set(userId, new Map<string, Map<string, [string, string][]>>());
        }
        
        // Create vector store map if it doesn't exist
        const userHistories = this.histories.get(userId)!;
        if (!userHistories.has(vectorName)) {
          userHistories.set(vectorName, new Map<string, [string, string][]>());
        }
        
        // Update the history
        userHistories.get(vectorName)!.set(chatId, history);
      } catch (error) {
        console.error(`Error loading chat history for ${userId}/${vectorName}/${chatId}:`, error);
      }
    }
  }
  
  // Load all chat histories from disk
  private loadAllHistories(): void {
    if (!fs.existsSync(this.baseDir)) {
      return;
    }
    
    // Get all user directories
    const userDirs = fs.readdirSync(this.baseDir)
      .filter(file => fs.statSync(path.join(this.baseDir, file)).isDirectory());
    
    // Load chat histories for each user
    for (const userId of userDirs) {
      const userDir = path.join(this.baseDir, userId);
      
      // Get all vector store directories
      const vectorDirs = fs.readdirSync(userDir)
        .filter(file => fs.statSync(path.join(userDir, file)).isDirectory());
      
      // Load chat histories for each vector store
      for (const vectorName of vectorDirs) {
        const vectorDir = path.join(userDir, vectorName);
        
        // Get all chat history files
        const chatFiles = fs.readdirSync(vectorDir)
          .filter(file => file.endsWith('.json'));
        
        // Load each chat history
        for (const chatFile of chatFiles) {
          const chatId = chatFile.replace('.json', '');
          this.loadChatHistory(userId, vectorName, chatId);
        }
      }
    }
  }
  
  // Get all chat IDs for a user and vector store
  getUserVectorChats(userId: string, vectorName: string): string[] {
    if (!this.histories.has(userId)) {
      return [];
    }
    
    const userHistories = this.histories.get(userId)!;
    if (!userHistories.has(vectorName)) {
      return [];
    }
    
    return Array.from(userHistories.get(vectorName)!.keys());
  }
  
  // Get all vector stores for a user
  getUserVectorStores(userId: string): string[] {
    if (!this.histories.has(userId)) {
      return [];
    }
    
    return Array.from(this.histories.get(userId)!.keys());
  }
  
  // Get all user IDs
  getUserIds(): string[] {
    return Array.from(this.histories.keys());
  }
  
  // Clear chat history for a specific user, vector store, and chat
  clearChatHistory(userId: string, vectorName: string, chatId: string): void {
    if (!this.histories.has(userId)) {
      return;
    }
    
    const userHistories = this.histories.get(userId)!;
    if (!userHistories.has(vectorName)) {
      return;
    }
    
    const vectorHistories = userHistories.get(vectorName)!;
    vectorHistories.set(chatId, []);
    
    // Save empty history to disk
    this.saveChatHistory(userId, vectorName, chatId);
  }
} 