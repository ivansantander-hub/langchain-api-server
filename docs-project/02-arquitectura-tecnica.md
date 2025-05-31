# Arquitectura Técnica - LangChain Document Chat

## 🏗️ Visión General de la Arquitectura

LangChain Document Chat implementa una arquitectura modular basada en microservicios internos que se ejecutan en un único proceso Node.js. El sistema utiliza el patrón **Retrieval-Augmented Generation (RAG)** para combinar búsqueda vectorial con generación de lenguaje natural.

## 📊 Diagrama de Arquitectura General

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend Clients                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │   Web App   │  │   Mobile    │  │   CLI Interface     │  │
│  │   (React)   │  │    App      │  │   (Terminal)        │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────┬───────────────────┬───────────────────┘
                      │ HTTP/REST         │ Direct
                      │                   │
┌─────────────────────▼───────────────────▼───────────────────┐
│                  Express API Server                        │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │                 API Routes                              │ │
│  │  /api/chat  /api/vector-stores  /api/add-document     │ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────┐
│                Chat Manager Core                           │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │  Document   │  │ VectorStore │  │  Chat History       │  │
│  │  Manager    │  │  Manager    │  │  Manager            │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────┬───────────┬─────────────┬─────────────────┘
                  │           │             │
┌─────────────────▼─┐  ┌──────▼─────┐  ┌─────▼─────────────────┐
│   File System    │  │   FAISS    │  │    Memory Store       │
│   (docs/)        │  │ VectorDB   │  │  (Chat History)       │
└───────────────────┘  └────────────┘  └───────────────────────┘
                              │
                    ┌─────────▼─────────┐
                    │   OpenAI API      │
                    │ (Embeddings + LLM)│
                    └───────────────────┘
```

## 🔧 Componentes Principales

### 1. **Chat Manager** (`src/lib/chat.ts`)

El **Chat Manager** es el componente central que orquesta toda la aplicación:

```typescript
interface ChatManager {
  chain: RunnableSequence;
  model: ChatOpenAI;
  vectorStoreManager: VectorStoreManager;
  chatHistoryManager: ChatHistoryManager;
  
  processMessage(message: string, userId: string, chatId: string, storeName: string): Promise<Response>;
  getUserVectorStores(userId: string): string[];
  getUserVectorChats(userId: string, vectorName: string): string[];
  clearChatHistory(userId: string, vectorName: string, chatId: string): void;
}
```

**Responsabilidades:**
- Coordinar todos los componentes del sistema
- Gestionar el flujo de procesamiento de mensajes
- Mantener el estado de las conversaciones
- Proporcionar interfaces unificadas para API y CLI

### 2. **Document Manager** (`src/lib/document.ts`)

Gestiona la carga, procesamiento y fragmentación de documentos:

```typescript
interface DocumentManager {
  loadDocuments(): Promise<Document[]>;
  loadSingleDocument(filename: string): Promise<Document[]>;
  splitDocuments(docs: Document[]): Promise<Document[]>;
  saveUploadedDocument(content: string, filename: string): Promise<string>;
  listAvailableDocuments(): string[];
}
```

**Características técnicas:**
- **Fragmentación inteligente**: Divide documentos en chunks de 1000 caracteres con overlap de 200
- **Carga asíncrona**: Procesamiento no bloqueante de archivos
- **Validación de formato**: Verifica que los archivos sean de texto válido
- **Gestión de metadatos**: Preserva información de fuente para trazabilidad

### 3. **VectorStore Manager** (`src/lib/vectorstore.ts`)

Administra múltiples almacenes vectoriales FAISS:

```typescript
interface VectorStoreManager {
  loadOrCreateVectorStore(storeName: string, docs?: Document[]): Promise<void>;
  addDocumentToVectorStores(filename: string, docs: Document[]): Promise<void>;
  getRetriever(storeName: string): VectorStoreRetriever;
  storeExists(storeName: string): boolean;
  getAvailableStores(): string[];
}
```

**Arquitectura de almacenes:**
- **Combined Store**: Contiene todos los documentos para búsquedas generales
- **Individual Stores**: Un almacén por documento para consultas específicas
- **Persistencia**: Almacenes guardados en disco en formato FAISS
- **Lazy Loading**: Carga almacenes solo cuando se necesitan

### 4. **Model Manager** (`src/lib/model.ts`)

Configura y gestiona los modelos de IA:

```typescript
interface ModelManager {
  createLanguageModel(): ChatOpenAI;
  createEmbeddings(): OpenAIEmbeddings;
  createChatChain(model: ChatOpenAI, retriever: VectorStoreRetriever): RunnableSequence;
  formatChatHistory(history: [string, string][]): BaseMessage[];
}
```

**Configuración de modelos:**
- **LLM**: GPT-3.5-turbo con temperatura 0.0 para máxima precisión
- **Embeddings**: text-embedding-3-small con 1536 dimensiones
- **Retriever**: Top-k=5 para balance entre relevancia y diversidad
- **Prompt Engineering**: Templates optimizados para respuestas contextuales

### 5. **Chat History Manager** (`src/lib/chatHistory.ts`)

Sistema avanzado de gestión de historial de conversaciones:

```typescript
interface ChatHistoryManager {
  addExchange(userId: string, vectorName: string, chatId: string, question: string, answer: string): void;
  getChatHistory(userId: string, vectorName: string, chatId: string): [string, string][];
  clearChatHistory(userId: string, vectorName: string, chatId: string): void;
  getUserIds(): string[];
  getUserVectorStores(userId: string): string[];
  getUserVectorChats(userId: string, vectorName: string): string[];
}
```

**Estructura de datos:**
```typescript
Map<userId, Map<vectorName, Map<chatId, [question, answer][]>>>
```

**Características:**
- **Organización jerárquica**: Usuario → VectorStore → Chat → Mensajes
- **Persistencia en memoria**: Historial mantenido durante la sesión
- **Gestión granular**: Control fino sobre diferentes contextos de conversación

## 🔄 Flujos de Datos

### Flujo de Inicialización

```
1. Carga variables de entorno (.env)
2. Inicializa Chat Manager
   ├── Crea embeddings (OpenAI)
   ├── Inicializa VectorStore Manager
   ├── Crea Chat History Manager
   └── Detecta documentos disponibles
3. Procesa documentos
   ├── Verifica almacén combinado existente
   ├── Carga/Crea almacén combinado
   └── Procesa documentos individuales
4. Configura modelo de lenguaje
5. Crea cadenas de procesamiento
6. Inicia servidor API/CLI
```

### Flujo de Procesamiento de Mensajes

```
1. Recibe mensaje del usuario
2. Identifica contexto (userId, chatId, vectorStore)
3. Recupera historial de conversación relevante
4. Selecciona retriever apropiado
5. Busca documentos relevantes
   ├── Genera embedding de la consulta
   ├── Busca en FAISS (similarity search)
   └── Recupera top-k documentos más similares
6. Construye contexto para el modelo
   ├── Combina historial + documentos + consulta
   └── Aplica prompt template
7. Genera respuesta con modelo de lenguaje
8. Actualiza historial de conversación
9. Retorna respuesta estructurada
```

## 🗄️ Gestión de Datos

### Estructura de Directorios

```
project/
├── docs/                    # Documentos fuente
│   ├── documento1.txt
│   ├── documento2.txt
│   └── ...
├── vectorstores/           # Almacenes FAISS
│   ├── combined/
│   │   ├── index.faiss
│   │   └── index.pkl
│   ├── documento1/
│   │   ├── index.faiss
│   │   └── index.pkl
│   └── ...
├── chat-histories/         # Historiales persistentes (futuro)
└── src/
    └── lib/               # Módulos core
```

### Formatos de Datos

**Documentos FAISS:**
- **index.faiss**: Índice vectorial binario optimizado
- **index.pkl**: Metadatos y mapeo de documentos en formato pickle

**Embeddings:**
- **Dimensiones**: 1536 (text-embedding-3-small)
- **Tipo**: Float32 para optimización de memoria
- **Normalización**: L2 norm para similarity search eficiente

## ⚡ Optimizaciones de Rendimiento

### 1. **Carga Lazy de Almacenes Vectoriales**
```typescript
private async loadVectorStore(storeName: string): Promise<FaissStore> {
  if (this.loadedStores.has(storeName)) {
    return this.loadedStores.get(storeName)!;
  }
  // Load only when needed
  const store = await FaissStore.load(storePath, this.embeddings);
  this.loadedStores.set(storeName, store);
  return store;
}
```

### 2. **Caché de Embeddings**
- Embeddings se calculan una sola vez por documento
- Reutilización automática en múltiples almacenes
- Persistencia en disco para evitar recálculo

### 3. **Fragmentación Optimizada**
```typescript
const textSplitter = new RecursiveCharacterTextSplitter({
  chunkSize: 1000,        // Balance entre contexto y precisión
  chunkOverlap: 200,      // Preserva continuidad semántica
  separators: ['\n\n', '\n', ' ', ''], // Jerarquía inteligente
});
```

### 4. **Procesamiento Asíncrono**
- Todas las operaciones I/O son no bloqueantes
- Procesamiento paralelo de múltiples documentos
- Timeouts configurables para operaciones de IA

## 🔒 Seguridad y Configuración

### Variables de Entorno
```env
OPENAI_API_KEY=sk-...           # API key de OpenAI (requerido)
PORT=3000                       # Puerto del servidor API
NODE_ENV=development            # Entorno de ejecución
MAX_TOKENS=2048                 # Límite de tokens por respuesta
TEMPERATURE=0.0                 # Temperatura del modelo
```

### Validación de Entrada
- **API**: Validación de JSON schema para todos los endpoints
- **CLI**: Sanitización de entrada de usuario
- **Archivos**: Verificación de tipos MIME y tamaño máximo

### Manejo de Errores
```typescript
try {
  const response = await processMessage(message);
  return response;
} catch (error) {
  if (error instanceof OpenAIError) {
    return handleOpenAIError(error);
  } else if (error instanceof ValidationError) {
    return handleValidationError(error);
  } else {
    return handleGenericError(error);
  }
}
```

## 🔄 Escalabilidad

### Diseño Modular
- **Componentes independientes**: Cada módulo puede evolucionar por separado
- **Interfaces bien definidas**: Facilita testing y mocking
- **Inyección de dependencias**: Flexibilidad en configuración

### Consideraciones Futuras
- **Múltiples bases de datos**: Soporte para PostgreSQL con pgvector
- **Distributed storage**: Redis para historial de conversaciones
- **Microservicios**: Separación en servicios independientes
- **Load balancing**: Múltiples instancias del servidor

---

**Siguiente**: [Instalación y Configuración](03-instalacion-configuracion.md)  
**Anterior**: [Introducción General](01-introduccion-general.md) 