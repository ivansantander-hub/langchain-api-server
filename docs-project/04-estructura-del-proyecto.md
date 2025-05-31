# Estructura del Proyecto - LangChain Document Chat

## 🗂️ Vista General de la Estructura

```
langchain-document-chat/
├── 📁 .cursor/                     # Configuración del editor Cursor
├── 📁 .git/                        # Control de versiones Git
├── 📁 agents/                      # Agentes LangChain (experimentales)
│   └── 📄 basic.ts                 # Agente básico con herramientas
├── 📁 chat-histories/              # Historiales de chat (futuro)
├── 📁 dist/                        # Código compilado (JavaScript)
│   ├── 📄 index.js                 # Punto de entrada principal compilado
│   ├── 📄 cli.js                   # CLI compilado
│   └── 📁 lib/                     # Librerías compiladas
├── 📁 docs/                        # Documentos fuente para procesamiento
│   ├── 📄 patrones_de_diseno.txt
│   ├── 📄 guia_de_desarrollo.txt
│   ├── 📄 arquitectura_del_sistema.txt
│   └── 📄 [otros_documentos].txt
├── 📁 docs-project/                # Documentación del proyecto
│   ├── 📄 README.md                # Índice de documentación
│   ├── 📄 01-introduccion-general.md
│   └── 📄 [otros_archivos_docs].md
├── 📁 node_modules/                # Dependencias NPM
├── 📁 src/                         # Código fuente TypeScript
│   ├── 📄 index.ts                 # Punto de entrada API
│   ├── 📄 cli.ts                   # Punto de entrada CLI
│   ├── 📄 test.ts                  # Archivo de pruebas
│   └── 📁 lib/                     # Módulos principales
│       ├── 📄 api.ts               # Servidor Express y endpoints
│       ├── 📄 chat.ts              # Gestor principal de chat
│       ├── 📄 chatHistory.ts       # Gestión de historial
│       ├── 📄 document.ts          # Procesamiento de documentos
│       ├── 📄 interface.ts         # Interfaz CLI
│       ├── 📄 model.ts             # Configuración de modelos IA
│       └── 📄 vectorstore.ts       # Gestión de almacenes vectoriales
├── 📁 vectorstores/                # Almacenes vectoriales FAISS
│   ├── 📁 combined/                # Almacén con todos los documentos
│   │   ├── 📄 index.faiss          # Índice vectorial FAISS
│   │   └── 📄 index.pkl            # Metadatos pickle
│   ├── 📁 [documento1]/            # Almacén individual por documento
│   │   ├── 📄 index.faiss
│   │   └── 📄 index.pkl
│   └── 📁 [documento2]/
├── 📄 .env                         # Variables de entorno (no en Git)
├── 📄 .env.example                 # Ejemplo de configuración
├── 📄 .gitignore                   # Archivos ignorados por Git
├── 📄 package.json                 # Configuración del proyecto NPM
├── 📄 package-lock.json            # Lockfile de dependencias
├── 📄 yarn.lock                    # Lockfile de Yarn
├── 📄 tsconfig.json                # Configuración TypeScript
└── 📄 README.md                    # Documentación principal
```

## 📂 Directorio `/src` - Código Fuente

### **Punto de Entrada**

#### `src/index.ts` - Servidor API
```typescript
// Inicialización principal del servidor API
import { config } from 'dotenv';
import { initializeChat, createApiServer } from './lib/chat.js';

async function main() {
  // Inicializar sistema de chat
  const chatManager = await initializeChat();
  
  // Crear y iniciar servidor API
  const apiServer = createApiServer(
    chatManager, 
    chatManager.model, 
    chatManager.vectorStoreManager
  );
  await apiServer.startServer();
}
```

**Propósito**: Punto de entrada para la API REST. Inicializa todos los componentes y lanza el servidor Express.

#### `src/cli.ts` - Interfaz CLI
```typescript
// Punto de entrada para la interfaz de línea de comandos
import { config } from 'dotenv';
import { startCLI } from './lib/chat.js';

async function main() {
  await startCLI();
}
```

**Propósito**: Punto de entrada para la interfaz CLI interactiva.

### **Módulos Core** (`src/lib/`)

#### `src/lib/chat.ts` - Gestor Principal
```typescript
export interface ChatManager {
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

**Funcionalidades clave**:
- Inicialización de todos los componentes
- Coordinación entre módulos
- Procesamiento de mensajes con contexto
- Gestión de estados de conversación

#### `src/lib/document.ts` - Procesamiento de Documentos
```typescript
// Funciones principales de gestión de documentos
export async function loadDocuments(): Promise<Document[]>
export async function loadSingleDocument(filename: string): Promise<Document[]>
export async function splitDocuments(docs: Document[]): Promise<Document[]>
export async function saveUploadedDocument(content: string, filename: string): Promise<string>
export function listAvailableDocuments(): string[]
```

**Características técnicas**:
- **DirectoryLoader**: Carga automática desde `docs/`
- **RecursiveCharacterTextSplitter**: Fragmentación inteligente
- **Parámetros de fragmentación**:
  - `chunkSize: 1000` caracteres
  - `chunkOverlap: 200` caracteres
  - Separadores jerárquicos: `['\n\n', '\n', ' ', '']`

#### `src/lib/vectorstore.ts` - Almacenes Vectoriales
```typescript
export class VectorStoreManager {
  private loadedStores: Map<string, FaissStore>;
  private embeddings: OpenAIEmbeddings;
  
  async loadOrCreateVectorStore(storeName: string, docs?: Document[]): Promise<void>
  async addDocumentToVectorStores(filename: string, docs: Document[]): Promise<void>
  getRetriever(storeName: string): VectorStoreRetriever
  storeExists(storeName: string): boolean
  getAvailableStores(): string[]
}
```

**Arquitectura de almacenes**:
- **Combined**: Todos los documentos juntos
- **Individual**: Un almacén por documento
- **Lazy loading**: Carga bajo demanda
- **Persistencia**: Formato FAISS nativo

#### `src/lib/model.ts` - Modelos de IA
```typescript
// Configuración de modelos
export function createLanguageModel(): ChatOpenAI
export function createEmbeddings(): OpenAIEmbeddings
export function createChatChain(model: ChatOpenAI, retriever: VectorStoreRetriever): RunnableSequence
export function formatChatHistory(history: [string, string][]): BaseMessage[]
```

**Configuraciones**:
- **LLM**: `gpt-3.5-turbo`, temperatura 0.0
- **Embeddings**: `text-embedding-3-small`, 1536 dimensiones
- **Retriever**: k=5, similarity search
- **Chain**: RAG con historial de conversación

#### `src/lib/api.ts` - Servidor API REST
```typescript
export function createApiServer(
  chatManager: any,
  model: ChatOpenAI,
  vectorStoreManager: VectorStoreManager
): APIServer
```

**Endpoints implementados**:
- `GET /` - Información de la API
- `GET /api/vector-stores` - Lista almacenes disponibles
- `POST /api/chat` - Procesar consultas
- `POST /api/add-document` - Subir documentos
- `GET /api/users` - Gestión de usuarios
- `GET|DELETE /api/users/:userId/...` - Gestión de historiales

#### `src/lib/interface.ts` - CLI Interactiva
```typescript
export async function startChatInterface(
  chain: RunnableSequence,
  model: ChatOpenAI,
  vectorStoreManager: VectorStoreManager,
  chatManager: any
): Promise<void>
```

**Funcionalidades CLI**:
- Interfaz readline interactiva
- Selección de almacén vectorial con `@storeName`
- Comandos especiales (`exit`, `help`)
- Manejo de errores graceful

#### `src/lib/chatHistory.ts` - Gestión de Historial
```typescript
export class ChatHistoryManager {
  private chatHistories: Map<string, Map<string, Map<string, [string, string][]>>>;
  
  addExchange(userId: string, vectorName: string, chatId: string, question: string, answer: string): void
  getChatHistory(userId: string, vectorName: string, chatId: string): [string, string][]
  clearChatHistory(userId: string, vectorName: string, chatId: string): void
  getUserIds(): string[]
  getUserVectorStores(userId: string): string[]
  getUserVectorChats(userId: string, vectorName: string): string[]
}
```

**Estructura de datos**:
```
Map<userId, Map<vectorName, Map<chatId, [question, answer][]>>>
```

## 📁 Directorio `/docs` - Documentos Fuente

### Estructura Típica
```
docs/
├── 📄 patrones_de_diseno.txt              # 7.5KB - Patrones de diseño
├── 📄 guia_de_desarrollo.txt               # 9.3KB - Guía desarrollo
├── 📄 arquitectura_del_sistema.txt         # 8.6KB - Arquitectura
├── 📄 typescript_typing_guide.txt          # 12KB - Guía TypeScript
├── 📄 documentacion_de_hooks_de_carga_de_archivos.txt  # 16KB - Hooks
├── 📄 analisis_prisma_permisos_dms.txt     # 29KB - Análisis Prisma
├── 📄 guia_de_instalacion_y_configuracion.txt  # 3.2KB - Instalación
└── 📄 sistema_de_gestion_de_documentos_documentacion_principal.txt  # 2.3KB
```

### Características de los Documentos
- **Formato**: Archivos `.txt` en UTF-8
- **Contenido**: Documentación técnica, guías, análisis
- **Procesamiento**: Fragmentación automática en chunks
- **Metadatos**: Preservación de nombres de archivo y ruta

## 📁 Directorio `/vectorstores` - Almacenes FAISS

### Estructura de Almacenes
```
vectorstores/
├── 📁 combined/                    # Almacén combinado
│   ├── 📄 index.faiss             # Índice vectorial (binario)
│   └── 📄 index.pkl               # Metadatos (pickle)
├── 📁 patrones_de_diseno/         # Almacén individual
│   ├── 📄 index.faiss
│   └── 📄 index.pkl
├── 📁 guia_de_desarrollo/
│   ├── 📄 index.faiss
│   └── 📄 index.pkl
└── 📁 [nombre_documento]/         # Un directorio por documento
    ├── 📄 index.faiss
    └── 📄 index.pkl
```

### Archivos FAISS
- **`index.faiss`**: Índice vectorial optimizado en formato binario
- **`index.pkl`**: Metadatos en formato pickle de Python
  - Mapeo de vectores a fragmentos de texto
  - Información de documentos fuente
  - Configuración del embeddings

## 📁 Directorio `/dist` - Código Compilado

### Estructura Post-Compilación
```
dist/
├── 📄 index.js                    # API servidor compilado
├── 📄 index.js.map                # Source map
├── 📄 index.d.ts                  # Declaraciones TypeScript
├── 📄 cli.js                      # CLI compilado
├── 📄 cli.js.map
├── 📄 cli.d.ts
└── 📁 lib/                        # Librerías compiladas
    ├── 📄 api.js
    ├── 📄 api.d.ts
    ├── 📄 chat.js
    ├── 📄 chat.d.ts
    ├── 📄 document.js
    ├── 📄 document.d.ts
    ├── 📄 model.js
    ├── 📄 model.d.ts
    ├── 📄 vectorstore.js
    ├── 📄 vectorstore.d.ts
    ├── 📄 interface.js
    ├── 📄 interface.d.ts
    ├── 📄 chatHistory.js
    └── 📄 chatHistory.d.ts
```

## 📁 Directorio `/agents` - Agentes Experimentales

### `agents/basic.ts`
```typescript
// Agente experimental con herramientas
import { OpenAI } from "langchain/llms/openai";
import { initializeAgentExecutor } from "langchain/agents";
import { SerpAPI, Calculator } from "langchain/tools";
```

**Propósito**: Implementación experimental de agentes LangChain con herramientas externas (búsqueda web, calculadora).

## 📄 Archivos de Configuración

### `package.json` - Configuración NPM
```json
{
  "name": "t1",
  "version": "1.0.0",
  "type": "module",
  "main": "dist/index.js",
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js",
    "dev": "node --loader ts-node/esm src/index.ts",
    "cli": "node --loader ts-node/esm src/cli.ts"
  }
}
```

### `tsconfig.json` - TypeScript
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "esModuleInterop": true,
    "strict": true,
    "outDir": "dist"
  }
}
```

### `.gitignore` - Control de Versiones
```
node_modules/
dist/
.env
vectorstores/
*.log
```

## 🔄 Flujo de Archivos

### Ciclo de Vida de un Documento
1. **Ingreso**: Documento colocado en `/docs/` o subido via API
2. **Procesamiento**: Carga y fragmentación en `document.ts`
3. **Vectorización**: Conversión a embeddings en `vectorstore.ts`
4. **Almacenamiento**: Persistencia en `/vectorstores/[nombre]/`
5. **Consulta**: Búsqueda y recuperación para respuestas
6. **Respuesta**: Generación de respuesta con contexto

### Flujo de Desarrollo
1. **Código fuente** en `/src/` (TypeScript)
2. **Compilación** con `tsc` → `/dist/` (JavaScript)
3. **Ejecución** desde `/dist/` en producción
4. **Desarrollo** directo desde `/src/` con ts-node

---

**Siguiente**: [API Endpoints](05-api-endpoints.md)  
**Anterior**: [Instalación y Configuración](03-instalacion-configuracion.md) 