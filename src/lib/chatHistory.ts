import * as fs from 'fs';
import * as path from 'path';

// Interface for a single message exchange with timestamp
export interface MessageExchange {
  id: number;
  question: string;
  answer: string;
  timestamp: string;
  answerTimestamp?: string; // Optional for backward compatibility
}

// Interface for chat history context
export interface ChatContext {
  userId: string;
  vectorName: string;
  chatId: string;
  history: MessageExchange[];
}

// Legacy format for backward compatibility
export type LegacyHistory = [string, string][];

// Class to manage chat histories for different users and chat sessions
export class ChatHistoryManager {
  // Map structure: userId -> vectorName -> chatId -> history
  private histories: Map<string, Map<string, Map<string, MessageExchange[]>>> = new Map();
  private baseDir: string = './chat-histories';
  
  constructor() {
    // Ensure the base directory exists
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
    
    this.loadAllHistories();
  }
  
  // Get chat history for a specific user, vector store and chat (new format with timestamps)
  getChatHistory(userId: string, vectorName: string, chatId: string): MessageExchange[] {
    // If user doesn't exist in the map, create an entry
    if (!this.histories.has(userId)) {
      this.histories.set(userId, new Map<string, Map<string, MessageExchange[]>>());
    }
    
    // Get the map for this user
    const userHistories = this.histories.get(userId)!;
    
    // If vector store doesn't exist, create an entry
    if (!userHistories.has(vectorName)) {
      userHistories.set(vectorName, new Map<string, MessageExchange[]>());
    }
    
    // Get the map for this vector store
    const vectorHistories = userHistories.get(vectorName)!;
    
    // If chat doesn't exist, create an empty history
    if (!vectorHistories.has(chatId)) {
      vectorHistories.set(chatId, []);
    }
    
    return vectorHistories.get(chatId)!;
  }

  // Get chat history in legacy format for backward compatibility
  getChatHistoryLegacy(userId: string, vectorName: string, chatId: string): LegacyHistory {
    const history = this.getChatHistory(userId, vectorName, chatId);
    return history.map(exchange => [exchange.question, exchange.answer]);
  }
  
  // Update chat history for a specific user, vector store and chat
  updateChatHistory(userId: string, vectorName: string, chatId: string, history: MessageExchange[]): void {
    // If user doesn't exist in the map, create an entry
    if (!this.histories.has(userId)) {
      this.histories.set(userId, new Map<string, Map<string, MessageExchange[]>>());
    }
    
    // Get the map for this user
    const userHistories = this.histories.get(userId)!;
    
    // If vector store doesn't exist, create an entry
    if (!userHistories.has(vectorName)) {
      userHistories.set(vectorName, new Map<string, MessageExchange[]>());
    }
    
    // Get the map for this vector store
    const vectorHistories = userHistories.get(vectorName)!;
    
    // Update the history
    vectorHistories.set(chatId, history);
    
    // Save to disk
    this.saveChatHistory(userId, vectorName, chatId);
  }
  
  // Add a message exchange to chat history with timestamps for both question and answer
  addExchange(userId: string, vectorName: string, chatId: string, question: string, answer: string): void {
    const history = this.getChatHistory(userId, vectorName, chatId);
    const now = new Date();
    const questionTime = new Date(now.getTime() - 2000); // Question was sent 2 seconds ago
    const answerTime = now; // Answer is now
    
    const newExchange: MessageExchange = {
      id: history.length,
      question: question,
      answer: answer,
      timestamp: questionTime.toISOString(),
      answerTimestamp: answerTime.toISOString()
    };
    history.push(newExchange);
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
  
  // Load a specific chat history from disk with backward compatibility
  private loadChatHistory(userId: string, vectorName: string, chatId: string): void {
    const filePath = this.getChatHistoryPath(userId, vectorName, chatId);
    
    if (fs.existsSync(filePath)) {
      try {
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        const rawHistory = JSON.parse(fileContent);
        
        let history: MessageExchange[];
        
        // Check if this is the new format (array of objects) or legacy format (array of arrays)
        if (Array.isArray(rawHistory) && rawHistory.length > 0) {
          if (typeof rawHistory[0] === 'object' && 'id' in rawHistory[0]) {
            // New format - already MessageExchange[]
            history = rawHistory as MessageExchange[];
          } else {
            // Legacy format - convert [string, string][] to MessageExchange[]
            const legacyHistory = rawHistory as LegacyHistory;
            history = legacyHistory.map((exchange, index) => ({
              id: index,
              question: exchange[0],
              answer: exchange[1],
              timestamp: new Date().toISOString() // Use current time for legacy data
            }));
          }
        } else {
          // Empty or invalid - create empty array
          history = [];
        }
        
        // Create user map if it doesn't exist
        if (!this.histories.has(userId)) {
          this.histories.set(userId, new Map<string, Map<string, MessageExchange[]>>());
        }
        
        // Create vector store map if it doesn't exist
        const userHistories = this.histories.get(userId)!;
        if (!userHistories.has(vectorName)) {
          userHistories.set(vectorName, new Map<string, MessageExchange[]>());
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
    vectorHistories.set(chatId, [] as MessageExchange[]);
    
    // Save empty history to disk
    this.saveChatHistory(userId, vectorName, chatId);
  }
} 