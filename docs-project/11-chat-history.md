# Sistema de Historial de Conversaciones - LangChain Document Chat

## 💬 Introducción al Sistema de Historial

El sistema de historial de conversaciones permite **mantener contexto persistente** entre sesiones, organizando conversaciones por usuario, almacén vectorial y contexto de chat. Esta funcionalidad es esencial para proporcionar una experiencia coherente y personalizada en sesiones largas de trabajo con documentos.

## 🏗️ Arquitectura del Sistema de Historial

### **Estructura Organizacional**

```
chat-history/
├── user_alice/                    # Usuario específico
│   ├── combined/                  # Contexto de almacén combinado
│   │   ├── general_2024-01-15/    # Sesión de chat específica
│   │   ├── analysis_2024-01-16/   # Otra sesión de análisis
│   │   └── research_2024-01-17/   # Sesión de investigación
│   ├── document_patterns/         # Contexto de documento específico
│   │   └── design_review_2024-01-15/
│   └── metadata.json             # Metadatos del usuario
├── user_bob/
│   └── combined/
│       └── onboarding_2024-01-15/
└── global_metadata.json          # Configuración global
```

### **Flujo de Gestión de Historial**

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Usuario   │───▶│  Sesión     │───▶│  Mensaje    │───▶│   Almacén   │
│    Activo   │    │   Chat      │    │   + IA      │    │  Persistente│
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
                            │                   │                   │
                            ▼                   ▼                   ▼
                    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
                    │  Contexto   │    │   Memory    │    │   Búsqueda  │
                    │ Vectorial   │    │ Management  │    │  Historial  │
                    └─────────────┘    └─────────────┘    └─────────────┘
```

## 📁 Gestión de Archivos y Estructura

### **ChatHistoryManager - Gestor Principal**

```typescript
export class ChatHistoryManager {
  private baseDirectory: string;
  private currentUser: string | null = null;
  private currentVectorStore: string | null = null;
  private currentChatId: string | null = null;
  private messageCache: Map<string, ChatMessage[]> = new Map();
  
  constructor(baseDirectory: string = 'chat-history') {
    this.baseDirectory = baseDirectory;
    this.ensureDirectoryExists(baseDirectory);
  }
  
  private ensureDirectoryExists(dir: string): void {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`📁 Created chat history directory: ${dir}`);
    }
  }
}

interface ChatMessage {
  id: string;
  timestamp: Date;
  role: 'user' | 'assistant';
  content: string;
  metadata: {
    vectorStore?: string;
    sourceDocuments?: string[];
    tokensUsed?: number;
    cost?: number;
    responseTime?: number;
    model?: string;
  };
}

interface ChatSession {
  id: string;
  name: string;
  user: string;
  vectorStore: string;
  createdAt: Date;
  lastActivity: Date;
  messageCount: number;
  totalTokens: number;
  totalCost: number;
  tags: string[];
  description?: string;
}
```

### **Inicialización de Sesión de Chat**

```typescript
initializeChatSession(
  user: string, 
  vectorStore: string, 
  chatName?: string,
  options: {
    description?: string;
    tags?: string[];
    inheritFromPrevious?: boolean;
  } = {}
): string {
  
  this.currentUser = user;
  this.currentVectorStore = vectorStore;
  
  // Generar ID único para la sesión
  const timestamp = new Date().toISOString().split('T')[0];
  const safeChatName = chatName ? this.sanitizeName(chatName) : 'general';
  const sessionId = `${safeChatName}_${timestamp}_${Date.now().toString(36)}`;
  
  this.currentChatId = sessionId;
  
  // Crear estructura de directorios
  const userDir = path.join(this.baseDirectory, `user_${user}`);
  const vectorStoreDir = path.join(userDir, vectorStore);
  const sessionDir = path.join(vectorStoreDir, sessionId);
  
  this.ensureDirectoryExists(userDir);
  this.ensureDirectoryExists(vectorStoreDir);
  this.ensureDirectoryExists(sessionDir);
  
  // Crear metadatos de sesión
  const session: ChatSession = {
    id: sessionId,
    name: chatName || 'General Chat',
    user,
    vectorStore,
    createdAt: new Date(),
    lastActivity: new Date(),
    messageCount: 0,
    totalTokens: 0,
    totalCost: 0,
    tags: options.tags || [],
    description: options.description
  };
  
  // Guardar metadatos
  this.saveSessionMetadata(session);
  
  // Heredar contexto si se solicita
  if (options.inheritFromPrevious) {
    this.inheritPreviousContext(user, vectorStore, sessionId);
  }
  
  console.log(`💬 Chat session initialized: ${sessionId} (${user}/${vectorStore})`);
  return sessionId;
}

private sanitizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\-_]/g, '_')
    .replace(/_+/g, '_')
    .trim();
}
```

### **Gestión de Mensajes**

```typescript
async addMessage(
  role: 'user' | 'assistant',
  content: string,
  metadata: Partial<ChatMessage['metadata']> = {}
): Promise<string> {
  
  if (!this.currentChatId) {
    throw new Error('No active chat session. Call initializeChatSession first.');
  }
  
  const messageId = this.generateMessageId();
  const message: ChatMessage = {
    id: messageId,
    timestamp: new Date(),
    role,
    content,
    metadata: {
      vectorStore: this.currentVectorStore || undefined,
      ...metadata
    }
  };
  
  // Agregar a cache
  const cacheKey = this.getCacheKey();
  if (!this.messageCache.has(cacheKey)) {
    this.messageCache.set(cacheKey, []);
  }
  this.messageCache.get(cacheKey)!.push(message);
  
  // Persistir mensaje
  await this.persistMessage(message);
  
  // Actualizar metadatos de sesión
  await this.updateSessionStats(message);
  
  console.log(`💬 Message added: ${role} (${content.length} chars)`);
  return messageId;
}

private async persistMessage(message: ChatMessage): Promise<void> {
  const sessionDir = this.getSessionDirectory();
  const messagesFile = path.join(sessionDir, 'messages.jsonl');
  
  // Usar JSONL (JSON Lines) para append eficiente
  const messageLine = JSON.stringify(message) + '\n';
  
  await fs.promises.appendFile(messagesFile, messageLine, 'utf8');
}

private async updateSessionStats(message: ChatMessage): Promise<void> {
  const sessionPath = this.getSessionMetadataPath();
  
  try {
    const sessionData = JSON.parse(await fs.promises.readFile(sessionPath, 'utf8'));
    
    sessionData.lastActivity = new Date().toISOString();
    sessionData.messageCount += 1;
    
    if (message.metadata.tokensUsed) {
      sessionData.totalTokens += message.metadata.tokensUsed;
    }
    
    if (message.metadata.cost) {
      sessionData.totalCost += message.metadata.cost;
    }
    
    await fs.promises.writeFile(sessionPath, JSON.stringify(sessionData, null, 2));
    
  } catch (error) {
    console.warn(`Warning: Could not update session stats: ${error.message}`);
  }
}
```

### **Recuperación de Mensajes**

```typescript
async getMessages(
  limit?: number,
  offset?: number,
  role?: 'user' | 'assistant'
): Promise<ChatMessage[]> {
  
  if (!this.currentChatId) {
    throw new Error('No active chat session');
  }
  
  const cacheKey = this.getCacheKey();
  
  // Intentar desde cache primero
  if (this.messageCache.has(cacheKey)) {
    let messages = this.messageCache.get(cacheKey)!;
    
    // Filtrar por rol si se especifica
    if (role) {
      messages = messages.filter(msg => msg.role === role);
    }
    
    // Aplicar paginación
    if (offset) {
      messages = messages.slice(offset);
    }
    
    if (limit) {
      messages = messages.slice(0, limit);
    }
    
    return messages;
  }
  
  // Cargar desde archivo
  return await this.loadMessagesFromFile(limit, offset, role);
}

private async loadMessagesFromFile(
  limit?: number,
  offset?: number,
  role?: 'user' | 'assistant'
): Promise<ChatMessage[]> {
  
  const sessionDir = this.getSessionDirectory();
  const messagesFile = path.join(sessionDir, 'messages.jsonl');
  
  if (!fs.existsSync(messagesFile)) {
    return [];
  }
  
  try {
    const content = await fs.promises.readFile(messagesFile, 'utf8');
    const lines = content.trim().split('\n').filter(line => line.length > 0);
    
    let messages: ChatMessage[] = lines.map(line => {
      const parsed = JSON.parse(line);
      // Convertir timestamp string de vuelta a Date
      parsed.timestamp = new Date(parsed.timestamp);
      return parsed;
    });
    
    // Filtrar por rol
    if (role) {
      messages = messages.filter(msg => msg.role === role);
    }
    
    // Aplicar paginación
    if (offset) {
      messages = messages.slice(offset);
    }
    
    if (limit) {
      messages = messages.slice(0, limit);
    }
    
    // Actualizar cache
    const cacheKey = this.getCacheKey();
    this.messageCache.set(cacheKey, messages);
    
    return messages;
    
  } catch (error) {
    console.error(`Error loading messages: ${error.message}`);
    return [];
  }
}
```

## 🧠 Memory Management - Gestión de Memoria

### **Contexto de Conversación Inteligente**

```typescript
export class ConversationMemory {
  private maxMessages: number = parseInt(process.env.MAX_CONTEXT_MESSAGES || '20');
  private maxTokens: number = parseInt(process.env.MAX_CONTEXT_TOKENS || '4000');
  private compressionThreshold: number = parseInt(process.env.COMPRESSION_THRESHOLD || '50');
  
  constructor(private historyManager: ChatHistoryManager) {}
  
  async getRelevantContext(
    currentQuery: string,
    options: {
      includeSystemMessages?: boolean;
      prioritizeRecent?: boolean;
      semanticFiltering?: boolean;
    } = {}
  ): Promise<ChatMessage[]> {
    
    const { includeSystemMessages = false, prioritizeRecent = true, semanticFiltering = false } = options;
    
    // Obtener mensajes recientes
    const recentMessages = await this.historyManager.getMessages(this.maxMessages * 2);
    
    if (recentMessages.length === 0) {
      return [];
    }
    
    // Filtrar mensajes del sistema si no se requieren
    let filteredMessages = includeSystemMessages 
      ? recentMessages 
      : recentMessages.filter(msg => msg.role !== 'system');
    
    // Aplicar filtrado semántico si está habilitado
    if (semanticFiltering && filteredMessages.length > this.maxMessages) {
      filteredMessages = await this.applySemanticFiltering(filteredMessages, currentQuery);
    }
    
    // Priorizar mensajes recientes
    if (prioritizeRecent) {
      filteredMessages = filteredMessages.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
    }
    
    // Limitar por número de tokens
    const contextMessages = this.limitByTokens(filteredMessages);
    
    console.log(`🧠 Context prepared: ${contextMessages.length} messages (${this.estimateTokens(contextMessages)} tokens)`);
    
    return contextMessages;
  }
  
  private limitByTokens(messages: ChatMessage[]): ChatMessage[] {
    const result: ChatMessage[] = [];
    let totalTokens = 0;
    
    for (const message of messages) {
      const messageTokens = this.estimateMessageTokens(message);
      
      if (totalTokens + messageTokens > this.maxTokens) {
        break;
      }
      
      result.push(message);
      totalTokens += messageTokens;
    }
    
    return result;
  }
  
  private estimateMessageTokens(message: ChatMessage): number {
    // Estimación: role (5) + timestamp (20) + content + metadata (50)
    const contentTokens = Math.ceil(message.content.length / 3.5);
    return contentTokens + 75;
  }
  
  private estimateTokens(messages: ChatMessage[]): number {
    return messages.reduce((total, msg) => total + this.estimateMessageTokens(msg), 0);
  }
}
```

### **Compresión de Historial**

```typescript
async compressOldHistory(
  retainMessages: number = 10,
  compressionRatio: number = 0.3
): Promise<void> {
  
  const allMessages = await this.historyManager.getMessages();
  
  if (allMessages.length <= retainMessages + this.compressionThreshold) {
    console.log('📝 No compression needed');
    return;
  }
  
  // Mantener mensajes recientes
  const recentMessages = allMessages.slice(-retainMessages);
  const oldMessages = allMessages.slice(0, -retainMessages);
  
  console.log(`🗜️ Compressing ${oldMessages.length} old messages...`);
  
  // Agrupar mensajes por conversaciones temáticas
  const conversations = this.groupMessagesByTopic(oldMessages);
  
  // Comprimir cada conversación
  const compressedSummaries: ChatMessage[] = [];
  
  for (const conversation of conversations) {
    const summary = await this.createConversationSummary(conversation);
    if (summary) {
      compressedSummaries.push(summary);
    }
  }
  
  // Crear nuevo archivo con historial comprimido
  await this.saveCompressedHistory(compressedSummaries, recentMessages);
  
  console.log(`✅ History compressed: ${oldMessages.length} → ${compressedSummaries.length} summaries`);
}

private groupMessagesByTopic(messages: ChatMessage[]): ChatMessage[][] {
  const conversations: ChatMessage[][] = [];
  let currentConversation: ChatMessage[] = [];
  
  for (let i = 0; i < messages.length; i++) {
    const message = messages[i];
    currentConversation.push(message);
    
    // Nueva conversación si hay una pausa larga o cambio de tema
    const nextMessage = messages[i + 1];
    if (nextMessage) {
      const timeDiff = new Date(nextMessage.timestamp).getTime() - new Date(message.timestamp).getTime();
      const pauseThreshold = 30 * 60 * 1000; // 30 minutos
      
      if (timeDiff > pauseThreshold || currentConversation.length >= 10) {
        conversations.push([...currentConversation]);
        currentConversation = [];
      }
    }
  }
  
  if (currentConversation.length > 0) {
    conversations.push(currentConversation);
  }
  
  return conversations;
}

private async createConversationSummary(conversation: ChatMessage[]): Promise<ChatMessage | null> {
  if (conversation.length === 0) return null;
  
  // Crear resumen de la conversación
  const userMessages = conversation.filter(msg => msg.role === 'user');
  const assistantMessages = conversation.filter(msg => msg.role === 'assistant');
  
  const topics = this.extractTopics(userMessages);
  const keyInsights = this.extractKeyInsights(assistantMessages);
  
  const summaryContent = `[RESUMEN DE CONVERSACIÓN]
Período: ${conversation[0].timestamp.toISOString()} - ${conversation[conversation.length - 1].timestamp.toISOString()}
Mensajes: ${conversation.length} (${userMessages.length} usuario, ${assistantMessages.length} asistente)

Temas principales:
${topics.map(topic => `- ${topic}`).join('\n')}

Insights clave:
${keyInsights.map(insight => `- ${insight}`).join('\n')}

Documentos consultados: ${this.getUniqueDocuments(conversation).join(', ')}
`;

  return {
    id: `summary_${Date.now()}`,
    timestamp: conversation[conversation.length - 1].timestamp,
    role: 'assistant',
    content: summaryContent,
    metadata: {
      originalMessageCount: conversation.length,
      compressionType: 'conversation_summary',
      sourceDocuments: this.getUniqueDocuments(conversation)
    }
  };
}
```

## 🔍 Búsqueda en Historial

### **Sistema de Búsqueda Avanzada**

```typescript
export class HistorySearchEngine {
  constructor(private historyManager: ChatHistoryManager) {}
  
  async searchMessages(
    query: string,
    options: {
      user?: string;
      vectorStore?: string;
      dateRange?: { from: Date; to: Date };
      role?: 'user' | 'assistant';
      includeMetadata?: boolean;
      limit?: number;
    } = {}
  ): Promise<SearchResult[]> {
    
    const { user, vectorStore, dateRange, role, includeMetadata = false, limit = 50 } = options;
    
    console.log(`🔍 Searching history for: "${query}"`);
    
    // Obtener sesiones relevantes
    const sessions = await this.findRelevantSessions(user, vectorStore, dateRange);
    
    const searchResults: SearchResult[] = [];
    
    for (const session of sessions) {
      try {
        // Cargar mensajes de la sesión
        const messages = await this.loadSessionMessages(session.id);
        
        // Filtrar por rol si se especifica
        const filteredMessages = role ? messages.filter(msg => msg.role === role) : messages;
        
        // Buscar coincidencias
        const matches = this.findMatches(filteredMessages, query, includeMetadata);
        
        searchResults.push(...matches.map(match => ({
          ...match,
          sessionInfo: {
            id: session.id,
            name: session.name,
            user: session.user,
            vectorStore: session.vectorStore,
            createdAt: session.createdAt
          }
        })));
        
      } catch (error) {
        console.warn(`Could not search in session ${session.id}:`, error);
      }
    }
    
    // Ordenar por relevancia y fecha
    const sortedResults = this.rankResults(searchResults, query);
    
    // Limitar resultados
    const limitedResults = sortedResults.slice(0, limit);
    
    console.log(`📋 Found ${limitedResults.length} matches across ${sessions.length} sessions`);
    
    return limitedResults;
  }
  
  private findMatches(
    messages: ChatMessage[], 
    query: string, 
    includeMetadata: boolean
  ): Array<{ message: ChatMessage; score: number; matchType: string }> {
    
    const lowercaseQuery = query.toLowerCase();
    const results: Array<{ message: ChatMessage; score: number; matchType: string }> = [];
    
    for (const message of messages) {
      let score = 0;
      let matchType = '';
      
      // Búsqueda en contenido
      const contentMatch = this.calculateContentMatch(message.content, lowercaseQuery);
      if (contentMatch.score > 0) {
        score += contentMatch.score;
        matchType = contentMatch.type;
      }
      
      // Búsqueda en metadatos si está habilitada
      if (includeMetadata && message.metadata.sourceDocuments) {
        const metadataMatch = message.metadata.sourceDocuments.some(doc => 
          doc.toLowerCase().includes(lowercaseQuery)
        );
        if (metadataMatch) {
          score += 0.3;
          matchType += matchType ? '+metadata' : 'metadata';
        }
      }
      
      if (score > 0) {
        results.push({ message, score, matchType });
      }
    }
    
    return results;
  }
  
  private calculateContentMatch(content: string, query: string): { score: number; type: string } {
    const lowercaseContent = content.toLowerCase();
    
    // Coincidencia exacta
    if (lowercaseContent.includes(query)) {
      const occurrences = (lowercaseContent.match(new RegExp(query, 'g')) || []).length;
      return { score: 1.0 + (occurrences - 1) * 0.2, type: 'exact' };
    }
    
    // Coincidencia de palabras
    const queryWords = query.split(/\s+/);
    const contentWords = lowercaseContent.split(/\s+/);
    
    let wordMatches = 0;
    for (const queryWord of queryWords) {
      if (contentWords.some(contentWord => contentWord.includes(queryWord))) {
        wordMatches++;
      }
    }
    
    if (wordMatches > 0) {
      const wordScore = (wordMatches / queryWords.length) * 0.7;
      return { score: wordScore, type: 'partial' };
    }
    
    // Coincidencia fuzzy (básica)
    const similarity = this.calculateStringSimilarity(lowercaseContent, query);
    if (similarity > 0.3) {
      return { score: similarity * 0.5, type: 'fuzzy' };
    }
    
    return { score: 0, type: 'none' };
  }
  
  private calculateStringSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const distance = this.levenshteinDistance(longer, shorter);
    return (longer.length - distance) / longer.length;
  }
  
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
    
    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
    
    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,     // deletion
          matrix[j - 1][i] + 1,     // insertion
          matrix[j - 1][i - 1] + indicator // substitution
        );
      }
    }
    
    return matrix[str2.length][str1.length];
  }
}

interface SearchResult {
  message: ChatMessage;
  score: number;
  matchType: string;
  sessionInfo: {
    id: string;
    name: string;
    user: string;
    vectorStore: string;
    createdAt: Date;
  };
}
```

## 📊 Estadísticas y Análisis

### **Analizador de Conversaciones**

```typescript
export class ConversationAnalyzer {
  constructor(private historyManager: ChatHistoryManager) {}
  
  async generateUserReport(user: string): Promise<UserActivityReport> {
    const sessions = await this.historyManager.getUserSessions(user);
    
    let totalMessages = 0;
    let totalTokens = 0;
    let totalCost = 0;
    const vectorStoreUsage: Record<string, number> = {};
    const dailyActivity: Record<string, number> = {};
    const topTopics: string[] = [];
    
    for (const session of sessions) {
      totalMessages += session.messageCount;
      totalTokens += session.totalTokens;
      totalCost += session.totalCost;
      
      // Uso por almacén vectorial
      vectorStoreUsage[session.vectorStore] = (vectorStoreUsage[session.vectorStore] || 0) + 1;
      
      // Actividad diaria
      const day = session.createdAt.toISOString().split('T')[0];
      dailyActivity[day] = (dailyActivity[day] || 0) + session.messageCount;
    }
    
    return {
      user,
      period: {
        from: sessions.length > 0 ? sessions[sessions.length - 1].createdAt : new Date(),
        to: sessions.length > 0 ? sessions[0].createdAt : new Date()
      },
      sessions: sessions.length,
      totalMessages,
      totalTokens,
      totalCost,
      averageMessagesPerSession: sessions.length > 0 ? totalMessages / sessions.length : 0,
      vectorStoreUsage,
      dailyActivity,
      topTopics,
      mostActiveDay: this.findMostActiveDay(dailyActivity),
      averageCostPerMessage: totalMessages > 0 ? totalCost / totalMessages : 0
    };
  }
  
  private findMostActiveDay(dailyActivity: Record<string, number>): string | null {
    let maxDay = null;
    let maxMessages = 0;
    
    for (const [day, messages] of Object.entries(dailyActivity)) {
      if (messages > maxMessages) {
        maxMessages = messages;
        maxDay = day;
      }
    }
    
    return maxDay;
  }
}

interface UserActivityReport {
  user: string;
  period: { from: Date; to: Date };
  sessions: number;
  totalMessages: number;
  totalTokens: number;
  totalCost: number;
  averageMessagesPerSession: number;
  vectorStoreUsage: Record<string, number>;
  dailyActivity: Record<string, number>;
  topTopics: string[];
  mostActiveDay: string | null;
  averageCostPerMessage: number;
}
```

## 🧹 Mantenimiento y Limpieza

### **Limpieza Automática de Historial**

```typescript
async cleanupOldHistory(
  retentionDays: number = 90,
  maxSizeMB: number = 100
): Promise<void> {
  
  console.log(`🧹 Starting history cleanup (retention: ${retentionDays} days, max size: ${maxSizeMB}MB)`);
  
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
  
  const allSessions = await this.getAllSessions();
  let deletedSessions = 0;
  let freedSpaceMB = 0;
  
  for (const session of allSessions) {
    if (session.lastActivity < cutoffDate) {
      try {
        const sessionSize = await this.getSessionSizeMB(session.id);
        await this.deleteSession(session.id);
        deletedSessions++;
        freedSpaceMB += sessionSize;
        
      } catch (error) {
        console.warn(`Could not delete session ${session.id}:`, error);
      }
    }
  }
  
  // Verificar tamaño total después de la limpieza
  const totalSizeAfter = await this.getTotalHistorySizeMB();
  
  if (totalSizeAfter > maxSizeMB) {
    console.log(`📦 Size still exceeds limit (${totalSizeAfter}MB > ${maxSizeMB}MB), compressing more sessions...`);
    await this.compressLargestSessions(totalSizeAfter - maxSizeMB);
  }
  
  console.log(`✅ Cleanup completed: ${deletedSessions} sessions deleted, ${freedSpaceMB.toFixed(2)}MB freed`);
}

private async compressLargestSessions(targetReductionMB: number): Promise<void> {
  const sessions = await this.getAllSessions();
  
  // Ordenar por tamaño descendente
  const sessionsWithSize = await Promise.all(
    sessions.map(async session => ({
      session,
      sizeMB: await this.getSessionSizeMB(session.id)
    }))
  );
  
  sessionsWithSize.sort((a, b) => b.sizeMB - a.sizeMB);
  
  let compressedMB = 0;
  for (const { session, sizeMB } of sessionsWithSize) {
    if (compressedMB >= targetReductionMB) break;
    
    try {
      const beforeSize = sizeMB;
      await this.compressSession(session.id);
      const afterSize = await this.getSessionSizeMB(session.id);
      
      compressedMB += (beforeSize - afterSize);
      console.log(`📦 Compressed session ${session.id}: ${beforeSize.toFixed(2)}MB → ${afterSize.toFixed(2)}MB`);
      
    } catch (error) {
      console.warn(`Could not compress session ${session.id}:`, error);
    }
  }
}
```

---

**Siguiente**: [Documentación de Agentes LangChain](12-agentes.md)  
**Anterior**: [Configuración del Modelo de Lenguaje](10-modelo-lenguaje.md) 