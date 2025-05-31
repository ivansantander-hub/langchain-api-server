# Módulos Core - LangChain Document Chat

## 🧩 Arquitectura de Módulos

Los módulos core de LangChain Document Chat están diseñados siguiendo principios de **separación de responsabilidades** y **alta cohesión**. Cada módulo tiene una función específica y bien definida, facilitando el mantenimiento y la extensibilidad del sistema.

## 📁 Estructura de Módulos Core

```
src/lib/
├── 📄 chat.ts          # Gestor principal y orquestador
├── 📄 document.ts      # Procesamiento de documentos
├── 📄 vectorstore.ts   # Gestión de almacenes vectoriales
├── 📄 model.ts         # Configuración de modelos IA
├── 📄 chatHistory.ts   # Gestión de historial
├── 📄 api.ts           # Servidor API REST
└── 📄 interface.ts     # Interfaz CLI
```

---

## 🎛️ Módulo Principal: `chat.ts`

### **ChatManager Class**

```typescript
export class ChatManager {
  public chain: RunnableSequence;
  public model: ChatOpenAI;
  public vectorStoreManager: VectorStoreManager;
  public chatHistoryManager: ChatHistoryManager;
  
  constructor(
    chain: RunnableSequence,
    model: ChatOpenAI,
    vectorStoreManager: VectorStoreManager,
    chatHistoryManager: ChatHistoryManager
  ) {
    this.chain = chain;
    this.model = model;
    this.vectorStoreManager = vectorStoreManager;
    this.chatHistoryManager = chatHistoryManager;
  }
}
```

### **Funciones Principales**

#### `initializeChat(): Promise<ChatManager>`
**Propósito**: Inicialización completa del sistema de chat.

**Proceso**:
1. **Configuración de embeddings**: Crea instancia de OpenAI embeddings
2. **Inicialización de gestores**: VectorStore y ChatHistory managers
3. **Procesamiento de documentos**: Detecta y procesa documentos disponibles
4. **Configuración de modelos**: Inicializa modelo de lenguaje
5. **Creación de chains**: Configura cadenas de procesamiento

```typescript
export async function initializeChat(): Promise<ChatManager> {
  console.log("Initializing chat application with documents...");
  
  // Crear embeddings
  const embeddings = createEmbeddings();
  
  // Inicializar gestores
  const vectorStoreManager = new VectorStoreManager(embeddings);
  const chatHistoryManager = new ChatHistoryManager();
  
  // Procesar documentos
  await processAvailableDocuments(vectorStoreManager);
  
  // Configurar modelo y chain
  const model = createLanguageModel();
  const retriever = vectorStoreManager.getRetriever('combined');
  const chain = createChatChain(model, retriever);
  
  return new ChatManager(chain, model, vectorStoreManager, chatHistoryManager);
}
```

#### `processMessage(): Promise<Response>`
**Propósito**: Procesamiento central de mensajes de usuario.

**Parámetros**:
- `message: string` - Pregunta del usuario
- `userId: string` - Identificador del usuario
- `chatId: string` - Identificador de la conversación
- `storeName: string` - Nombre del almacén vectorial

**Flujo de procesamiento**:
```typescript
async processMessage(
  message: string,
  userId: string,
  chatId: string,
  storeName: string
): Promise<any> {
  try {
    // 1. Validar almacén vectorial
    if (!this.vectorStoreManager.storeExists(storeName)) {
      throw new Error(`Vector store '${storeName}' not found`);
    }
    
    // 2. Obtener retriever específico
    const retriever = this.vectorStoreManager.getRetriever(storeName);
    
    // 3. Crear chain para este contexto
    const chain = createChatChain(this.model, retriever);
    
    // 4. Recuperar historial de conversación
    const history = this.chatHistoryManager.getChatHistory(userId, storeName, chatId);
    const formattedHistory = formatChatHistory(history);
    
    // 5. Procesar mensaje con contexto
    const response = await chain.invoke({
      question: message,
      chat_history: formattedHistory
    });
    
    // 6. Actualizar historial
    this.chatHistoryManager.addExchange(userId, storeName, chatId, message, response.text);
    
    return response;
    
  } catch (error) {
    console.error('Error processing message:', error);
    throw error;
  }
}
```

### **Funciones de Gestión**

#### `getUserVectorStores(userId: string): string[]`
```typescript
getUserVectorStores(userId: string): string[] {
  return this.chatHistoryManager.getUserVectorStores(userId);
}
```

#### `getUserVectorChats(userId: string, vectorName: string): string[]`
```typescript
getUserVectorChats(userId: string, vectorName: string): string[] {
  return this.chatHistoryManager.getUserVectorChats(userId, vectorName);
}
```

#### `clearChatHistory(userId: string, vectorName: string, chatId: string): void`
```typescript
clearChatHistory(userId: string, vectorName: string, chatId: string): void {
  this.chatHistoryManager.clearChatHistory(userId, vectorName, chatId);
}
```

---

## 📄 Módulo de Documentos: `document.ts`

### **Funciones de Carga**

#### `loadDocuments(): Promise<Document[]>`
**Propósito**: Carga todos los documentos desde el directorio `docs/`.

```typescript
export async function loadDocuments(): Promise<Document[]> {
  const docsDirectory = process.env.DOCS_DIRECTORY || 'docs';
  
  console.log(`Found ${await countDocuments(docsDirectory)} documents in docs directory`);
  
  const loader = new DirectoryLoader(docsDirectory, {
    ".txt": (path) => new TextLoader(path),
  });
  
  try {
    const docs = await loader.load();
    console.log(`Successfully loaded ${docs.length} documents`);
    return docs;
  } catch (error) {
    console.error('Error loading documents:', error);
    throw new Error(`Failed to load documents: ${error.message}`);
  }
}
```

#### `loadSingleDocument(filename: string): Promise<Document[]>`
**Propósito**: Carga un documento específico por nombre de archivo.

```typescript
export async function loadSingleDocument(filename: string): Promise<Document[]> {
  const docsDirectory = process.env.DOCS_DIRECTORY || 'docs';
  const filePath = path.join(docsDirectory, filename);
  
  // Verificar que el archivo existe
  if (!fs.existsSync(filePath)) {
    throw new Error(`Document ${filename} not found in ${docsDirectory}`);
  }
  
  // Verificar extensión
  if (!filename.endsWith('.txt')) {
    throw new Error(`Only .txt files are supported. Got: ${filename}`);
  }
  
  const loader = new TextLoader(filePath);
  try {
    const docs = await loader.load();
    console.log(`Loaded document: ${filename}`);
    return docs;
  } catch (error) {
    console.error(`Error loading document ${filename}:`, error);
    throw error;
  }
}
```

### **Procesamiento de Documentos**

#### `splitDocuments(docs: Document[]): Promise<Document[]>`
**Propósito**: Fragmenta documentos en chunks manejables.

```typescript
export async function splitDocuments(docs: Document[]): Promise<Document[]> {
  const chunkSize = parseInt(process.env.CHUNK_SIZE || '1000');
  const chunkOverlap = parseInt(process.env.CHUNK_OVERLAP || '200');
  
  const textSplitter = new RecursiveCharacterTextSplitter({
    chunkSize,
    chunkOverlap,
    separators: ['\n\n', '\n', ' ', ''], // Jerarquía de separadores
  });
  
  console.log(`Splitting documents with chunk size: ${chunkSize}, overlap: ${chunkOverlap}`);
  
  try {
    const splitDocs = await textSplitter.splitDocuments(docs);
    console.log(`Documents split into ${splitDocs.length} chunks`);
    return splitDocs;
  } catch (error) {
    console.error('Error splitting documents:', error);
    throw error;
  }
}
```

### **Gestión de Archivos**

#### `saveUploadedDocument(content: string, filename: string): Promise<string>`
**Propósito**: Guarda documentos subidos vía API.

```typescript
export async function saveUploadedDocument(content: string, filename: string): Promise<string> {
  const docsDirectory = process.env.DOCS_DIRECTORY || 'docs';
  
  // Validaciones
  if (!filename.endsWith('.txt')) {
    throw new Error('Only .txt files are supported');
  }
  
  if (!content || content.trim().length === 0) {
    throw new Error('Document content cannot be empty');
  }
  
  // Sanitizar nombre de archivo
  const sanitizedFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
  const filePath = path.join(docsDirectory, sanitizedFilename);
  
  // Verificar que el directorio existe
  if (!fs.existsSync(docsDirectory)) {
    fs.mkdirSync(docsDirectory, { recursive: true });
  }
  
  try {
    await fs.promises.writeFile(filePath, content, 'utf8');
    console.log(`Document saved: ${sanitizedFilename}`);
    return sanitizedFilename;
  } catch (error) {
    console.error(`Error saving document ${sanitizedFilename}:`, error);
    throw error;
  }
}
```

#### `listAvailableDocuments(): string[]`
```typescript
export function listAvailableDocuments(): string[] {
  const docsDirectory = process.env.DOCS_DIRECTORY || 'docs';
  
  if (!fs.existsSync(docsDirectory)) {
    return [];
  }
  
  return fs.readdirSync(docsDirectory)
    .filter(file => file.endsWith('.txt'))
    .sort();
}
```

---

## 🗃️ Módulo VectorStore: `vectorstore.ts`

### **VectorStoreManager Class**

```typescript
export class VectorStoreManager {
  private loadedStores: Map<string, FaissStore>;
  private embeddings: OpenAIEmbeddings;
  private baseDirectory: string;

  constructor(embeddings: OpenAIEmbeddings) {
    this.loadedStores = new Map();
    this.embeddings = embeddings;
    this.baseDirectory = process.env.VECTORSTORE_DIRECTORY || 'vectorstores';
  }
}
```

### **Métodos Principales**

#### `loadOrCreateVectorStore(storeName: string, docs?: Document[]): Promise<void>`
**Propósito**: Carga almacén existente o crea uno nuevo.

```typescript
async loadOrCreateVectorStore(storeName: string, docs?: Document[]): Promise<void> {
  const storePath = path.join(this.baseDirectory, storeName);
  
  try {
    if (this.storeExists(storeName)) {
      // Cargar almacén existente
      console.log(`Loading existing vector store: ${storeName}`);
      const store = await FaissStore.load(storePath, this.embeddings);
      this.loadedStores.set(storeName, store);
    } else if (docs && docs.length > 0) {
      // Crear nuevo almacén
      console.log(`Creating new vector store: ${storeName}`);
      const store = await FaissStore.fromDocuments(docs, this.embeddings);
      await store.save(storePath);
      this.loadedStores.set(storeName, store);
      console.log(`Vector store ${storeName} created and saved`);
    } else {
      throw new Error(`No documents provided for new store: ${storeName}`);
    }
  } catch (error) {
    console.error(`Error loading/creating vector store ${storeName}:`, error);
    throw error;
  }
}
```

#### `addDocumentToVectorStores(filename: string, docs: Document[]): Promise<void>`
**Propósito**: Agrega documento a almacenes existentes y crea individual.

```typescript
async addDocumentToVectorStores(filename: string, docs: Document[]): Promise<void> {
  const storeName = path.parse(filename).name;
  
  try {
    // 1. Crear almacén individual para el documento
    await this.loadOrCreateVectorStore(storeName, docs);
    
    // 2. Agregar al almacén combinado
    if (this.storeExists('combined')) {
      const combinedStore = await this.loadVectorStore('combined');
      await combinedStore.addDocuments(docs);
      
      // Guardar almacén actualizado
      const combinedPath = path.join(this.baseDirectory, 'combined');
      await combinedStore.save(combinedPath);
      console.log(`Document ${filename} added to combined store`);
    }
    
  } catch (error) {
    console.error(`Error adding document ${filename} to vector stores:`, error);
    throw error;
  }
}
```

### **Métodos de Acceso**

#### `getRetriever(storeName: string): VectorStoreRetriever`
```typescript
getRetriever(storeName: string): VectorStoreRetriever {
  const store = this.loadedStores.get(storeName);
  if (!store) {
    throw new Error(`Vector store '${storeName}' not loaded`);
  }
  
  const k = parseInt(process.env.RETRIEVER_K || '5');
  return store.asRetriever(k);
}
```

#### `storeExists(storeName: string): boolean`
```typescript
storeExists(storeName: string): boolean {
  const storePath = path.join(this.baseDirectory, storeName);
  const indexPath = path.join(storePath, 'index.faiss');
  const pklPath = path.join(storePath, 'index.pkl');
  
  return fs.existsSync(indexPath) && fs.existsSync(pklPath);
}
```

---

## 🤖 Módulo de Modelos: `model.ts`

### **Configuración de Modelos**

#### `createLanguageModel(): ChatOpenAI`
```typescript
export function createLanguageModel(): ChatOpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY environment variable is required');
  }
  
  return new ChatOpenAI({
    openAIApiKey: apiKey,
    modelName: process.env.MODEL_NAME || 'gpt-3.5-turbo',
    temperature: parseFloat(process.env.TEMPERATURE || '0.0'),
    maxTokens: parseInt(process.env.MAX_TOKENS || '2048'),
    streaming: false,
  });
}
```

#### `createEmbeddings(): OpenAIEmbeddings`
```typescript
export function createEmbeddings(): OpenAIEmbeddings {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY environment variable is required');
  }
  
  return new OpenAIEmbeddings({
    openAIApiKey: apiKey,
    modelName: process.env.EMBEDDING_MODEL || 'text-embedding-3-small',
    batchSize: 512, // Optimización para requests
    stripNewLines: true,
  });
}
```

### **Configuración de Chains**

#### `createChatChain(model: ChatOpenAI, retriever: VectorStoreRetriever): RunnableSequence`
```typescript
export function createChatChain(
  model: ChatOpenAI,
  retriever: VectorStoreRetriever
): RunnableSequence {
  // Template optimizado para RAG con historial
  const prompt = ChatPromptTemplate.fromMessages([
    ["system", `Eres un asistente especializado en responder preguntas basándote en documentos específicos.

INSTRUCCIONES:
1. Usa ÚNICAMENTE la información proporcionada en el contexto
2. Si la información no está en el contexto, indica claramente que no tienes esa información
3. Mantén las respuestas concisas pero completas
4. Proporciona ejemplos cuando sea relevante
5. Considera el historial de conversación para dar respuestas contextuales

Contexto de documentos:
{context}

Historial de conversación:
{chat_history}`],
    ["human", "{question}"]
  ]);
  
  // Chain con contexto y historial
  return RunnableSequence.from([
    {
      context: retriever,
      question: new RunnablePassthrough(),
      chat_history: new RunnablePassthrough(),
    },
    prompt,
    model,
    new StringOutputParser(),
  ]);
}
```

### **Utilidades de Historial**

#### `formatChatHistory(history: [string, string][]): BaseMessage[]`
```typescript
export function formatChatHistory(history: [string, string][]): BaseMessage[] {
  const messages: BaseMessage[] = [];
  
  for (const [question, answer] of history) {
    messages.push(new HumanMessage(question));
    messages.push(new AIMessage(answer));
  }
  
  return messages;
}
```

---

## 📚 Módulo de Historial: `chatHistory.ts`

### **ChatHistoryManager Class**

```typescript
export class ChatHistoryManager {
  private chatHistories: Map<string, Map<string, Map<string, [string, string][]>>>;
  
  constructor() {
    // Estructura: userId -> vectorName -> chatId -> [question, answer][]
    this.chatHistories = new Map();
  }
}
```

### **Métodos de Gestión**

#### `addExchange(userId: string, vectorName: string, chatId: string, question: string, answer: string): void`
```typescript
addExchange(userId: string, vectorName: string, chatId: string, question: string, answer: string): void {
  // Crear jerarquía si no existe
  if (!this.chatHistories.has(userId)) {
    this.chatHistories.set(userId, new Map());
  }
  
  const userHistories = this.chatHistories.get(userId)!;
  if (!userHistories.has(vectorName)) {
    userHistories.set(vectorName, new Map());
  }
  
  const vectorHistories = userHistories.get(vectorName)!;
  if (!vectorHistories.has(chatId)) {
    vectorHistories.set(chatId, []);
  }
  
  // Agregar intercambio
  const chatHistory = vectorHistories.get(chatId)!;
  chatHistory.push([question, answer]);
  
  // Limitar historial para gestión de memoria
  const maxHistory = parseInt(process.env.MAX_CHAT_HISTORY || '50');
  if (chatHistory.length > maxHistory) {
    chatHistory.splice(0, chatHistory.length - maxHistory);
  }
}
```

### **Métodos de Consulta**

#### `getChatHistory(userId: string, vectorName: string, chatId: string): [string, string][]`
```typescript
getChatHistory(userId: string, vectorName: string, chatId: string): [string, string][] {
  return this.chatHistories.get(userId)?.get(vectorName)?.get(chatId) || [];
}
```

#### `getUserIds(): string[]`
```typescript
getUserIds(): string[] {
  return Array.from(this.chatHistories.keys());
}
```

---

## 🔧 Interacción Entre Módulos

### **Flujo de Inicialización**
```
1. chat.ts → initializeChat()
2. model.ts → createEmbeddings()
3. vectorstore.ts → new VectorStoreManager()
4. chatHistory.ts → new ChatHistoryManager()
5. document.ts → processAvailableDocuments()
6. model.ts → createLanguageModel() + createChatChain()
```

### **Flujo de Procesamiento de Mensaje**
```
1. chat.ts → processMessage()
2. vectorstore.ts → getRetriever()
3. chatHistory.ts → getChatHistory()
4. model.ts → formatChatHistory()
5. model.ts → chain.invoke()
6. chatHistory.ts → addExchange()
```

### **Gestión de Dependencias**
```typescript
// Inyección de dependencias clara
export class ChatManager {
  constructor(
    private chain: RunnableSequence,
    private model: ChatOpenAI,
    private vectorStoreManager: VectorStoreManager,
    private chatHistoryManager: ChatHistoryManager
  ) {}
}
```

---

**Siguiente**: [Gestión de Documentos](08-gestion-documentos.md)  
**Anterior**: [CLI Interface](06-cli-interface.md) 