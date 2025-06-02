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
  // Map structure: userId -> chatId -> vectorName -> history
  private histories: Map<string, Map<string, Map<string, MessageExchange[]>>> = new Map();
  private baseDir: string = './chat-histories';
  
  constructor() {
    // Create base directory if it doesn't exist
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
    // Load existing histories from disk on startup (includes migration from old format)
    this.loadAllHistories();
  }
  
  // Get chat history for a specific user, chat and vector store
  getChatHistory(userId: string, vectorName: string, chatId: string): MessageExchange[] {
    // If user doesn't exist in the map, create an entry
    if (!this.histories.has(userId)) {
      this.histories.set(userId, new Map<string, Map<string, MessageExchange[]>>());
    }
    
    // Get the map for this user
    const userHistories = this.histories.get(userId)!;
    
    // If chat doesn't exist, create an entry
    if (!userHistories.has(chatId)) {
      userHistories.set(chatId, new Map<string, MessageExchange[]>());
    }
    
    // Get the map for this chat
    const chatHistories = userHistories.get(chatId)!;
    
    // If vector store doesn't exist, create an empty history and try to load from disk
    if (!chatHistories.has(vectorName)) {
      chatHistories.set(vectorName, []);
      this.loadChatHistory(userId, vectorName, chatId);
    }
    
    return chatHistories.get(vectorName)!;
  }

  // Get chat history in legacy format for backward compatibility
  getChatHistoryLegacy(userId: string, vectorName: string, chatId: string): LegacyHistory {
    const history = this.getChatHistory(userId, vectorName, chatId);
    return history.map(exchange => [exchange.question, exchange.answer]);
  }
  
  // Update chat history for a specific user, chat and vector store
  updateChatHistory(userId: string, vectorName: string, chatId: string, history: MessageExchange[]): void {
    // If user doesn't exist in the map, create an entry
    if (!this.histories.has(userId)) {
      this.histories.set(userId, new Map<string, Map<string, MessageExchange[]>>());
    }
    
    // Get the map for this user
    const userHistories = this.histories.get(userId)!;
    
    // If chat doesn't exist, create an entry
    if (!userHistories.has(chatId)) {
      userHistories.set(chatId, new Map<string, MessageExchange[]>());
    }
    
    // Get the map for this chat
    const chatHistories = userHistories.get(chatId)!;
    
    // Update the history
    chatHistories.set(vectorName, history);
    
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
  
  // Get the directory path for a chat within a user
  private getChatDir(userId: string, chatId: string): string {
    return path.join(this.getUserDir(userId), chatId);
  }
  
  // Get the file path for a specific chat history
  private getChatHistoryPath(userId: string, vectorName: string, chatId: string): string {
    return path.join(this.getChatDir(userId, chatId), `${vectorName}.json`);
  }
  
  // Save chat history to disk
  private saveChatHistory(userId: string, vectorName: string, chatId: string): void {
    const userDir = this.getUserDir(userId);
    
    // Ensure user directory exists
    if (!fs.existsSync(userDir)) {
      fs.mkdirSync(userDir, { recursive: true });
    }
    
    const chatDir = this.getChatDir(userId, chatId);
    
    // Ensure chat directory exists
    if (!fs.existsSync(chatDir)) {
      fs.mkdirSync(chatDir, { recursive: true });
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
        
        // Create chat map if it doesn't exist
        const userHistories = this.histories.get(userId)!;
        if (!userHistories.has(chatId)) {
          userHistories.set(chatId, new Map<string, MessageExchange[]>());
        }
        
        // Update the history
        userHistories.get(chatId)!.set(vectorName, history);
      } catch (error) {
        console.error(`Error loading chat history for ${userId}/${chatId}/${vectorName}:`, error);
      }
    }
  }
  
  // Load all chat histories from disk with migration support
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
      
      // Check if this user has the old structure (vector directories with chat files)
      const items = fs.readdirSync(userDir)
        .filter(file => fs.statSync(path.join(userDir, file)).isDirectory());
      
      // Detect old structure and migrate if needed
      let hasOldStructure = false;
      for (const item of items) {
        const itemPath = path.join(userDir, item);
        const itemFiles = fs.readdirSync(itemPath)
          .filter(file => file.endsWith('.json'));
        
        // If this directory contains .json files directly, it's old structure
        if (itemFiles.length > 0) {
          hasOldStructure = true;
          console.log(`Migrating old structure for user ${userId}, vector store ${item}`);
          
          // Migrate each chat file to new structure
          for (const chatFile of itemFiles) {
            const chatId = chatFile.replace('.json', '');
            const oldPath = path.join(itemPath, chatFile);
            const newChatDir = path.join(userDir, chatId);
            const newPath = path.join(newChatDir, `${item}.json`);
            
            // Create new chat directory
            if (!fs.existsSync(newChatDir)) {
              fs.mkdirSync(newChatDir, { recursive: true });
            }
            
            // Move the file to new location
            if (!fs.existsSync(newPath)) {
              fs.copyFileSync(oldPath, newPath);
              console.log(`Migrated ${oldPath} -> ${newPath}`);
            }
          }
        }
      }
      
      // If we migrated, clean up old structure
      if (hasOldStructure) {
        for (const item of items) {
          const itemPath = path.join(userDir, item);
          const itemFiles = fs.readdirSync(itemPath)
            .filter(file => file.endsWith('.json'));
          
          if (itemFiles.length > 0) {
            // Remove old files and directory after migration
            for (const file of itemFiles) {
              fs.unlinkSync(path.join(itemPath, file));
            }
            try {
              fs.rmdirSync(itemPath);
              console.log(`Removed old directory: ${itemPath}`);
            } catch (error) {
              console.warn(`Could not remove old directory ${itemPath}:`, error);
            }
          }
        }
      }
      
      // Now load with new structure
      const chatDirs = fs.readdirSync(userDir)
        .filter(file => fs.statSync(path.join(userDir, file)).isDirectory());
      
      // Load chat histories for each chat
      for (const chatId of chatDirs) {
        const chatDir = path.join(userDir, chatId);
        
        // Get all vector store files
        const vectorFiles = fs.readdirSync(chatDir)
          .filter(file => file.endsWith('.json'));
        
        // Load each vector store history
        for (const vectorFile of vectorFiles) {
          const vectorName = vectorFile.replace('.json', '');
          this.loadChatHistory(userId, vectorName, chatId);
        }
      }
    }
  }
  
  // Get all chat IDs for a user
  getUserChats(userId: string): string[] {
    if (!this.histories.has(userId)) {
      return [];
    }
    return Array.from(this.histories.get(userId)!.keys());
  }
  
  // Get all chat IDs for a user and vector store (now returns chats that have this vector store)
  getUserVectorChats(userId: string, vectorName: string): string[] {
    if (!this.histories.has(userId)) {
      return [];
    }
    
    const userHistories = this.histories.get(userId)!;
    const chats: string[] = [];
    
    for (const [chatId, chatHistories] of userHistories) {
      if (chatHistories.has(vectorName)) {
        chats.push(chatId);
      }
    }
    
    return chats;
  }
  
  // Get all vector stores for a user (across all chats)
  getUserVectorStores(userId: string): string[] {
    if (!this.histories.has(userId)) {
      return [];
    }
    
    const vectorStores = new Set<string>();
    const userHistories = this.histories.get(userId)!;
    
    for (const chatHistories of userHistories.values()) {
      for (const vectorName of chatHistories.keys()) {
        vectorStores.add(vectorName);
      }
    }
    
    return Array.from(vectorStores);
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
    if (!userHistories.has(chatId)) {
      return;
    }
    
    const chatHistories = userHistories.get(chatId)!;
    chatHistories.set(vectorName, []);
    
    // Save empty history to disk
    this.saveChatHistory(userId, vectorName, chatId);
  }
  
  // Delete entire chat (all vector stores for a chat)
  deleteChatCompletely(userId: string, chatId: string): void {
    if (!this.histories.has(userId)) {
      return;
    }
    
    const userHistories = this.histories.get(userId)!;
    if (!userHistories.has(chatId)) {
      return;
    }
    
    // Remove from memory
    userHistories.delete(chatId);
    
    // Remove from disk
    const chatDir = this.getChatDir(userId, chatId);
    if (fs.existsSync(chatDir)) {
      try {
        // Remove all files in chat directory
        const files = fs.readdirSync(chatDir);
        for (const file of files) {
          fs.unlinkSync(path.join(chatDir, file));
        }
        // Remove the chat directory
        fs.rmdirSync(chatDir);
        console.log(`Deleted chat completely: ${userId}/${chatId}`);
      } catch (error) {
        console.error(`Error deleting chat directory ${chatDir}:`, error);
      }
    }
  }
} 