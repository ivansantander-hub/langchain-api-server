# Gestión de Almacenes Vectoriales - LangChain Document Chat

## 🗄️ Introducción a los Almacenes Vectoriales

Los almacenes vectoriales son el corazón del sistema RAG, proporcionando **búsqueda semántica ultrarrápida** mediante la conversión de texto en vectores numéricos de alta dimensión. El sistema utiliza **FAISS (Facebook AI Similarity Search)** como motor de búsqueda vectorial y **OpenAI Embeddings** para la generación de vectores.

## 🏗️ Arquitectura del Sistema Vectorial

### **Flujo de Vectorización**

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  Documentos │───▶│Fragmentación│───▶│ Embeddings  │───▶│   FAISS     │
│   (texto)   │    │  (chunks)   │    │  (OpenAI)   │    │  (índice)   │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
                                             │                   │
                   ┌─────────────┐           │                   │
                   │  Consulta   │───────────┘                   │
                   │ (pregunta)  │                               │
                   └─────────────┘                               │
                                                                 │
                   ┌─────────────┐    ┌─────────────┐            │
                   │ Resultados  │◀───│  Búsqueda   │◀───────────┘
                   │(documentos) │    │(similarity) │
                   └─────────────┘    └─────────────┘
```

### **Tipos de Almacenes**

1. **Combined Store**: Contiene todos los documentos para búsquedas generales
2. **Individual Stores**: Un almacén por documento para consultas específicas
3. **Specialized Stores**: Almacenes temáticos (futuro)

## 🧠 Embeddings con OpenAI

### **Configuración del Modelo de Embeddings**

```typescript
export function createEmbeddings(): OpenAIEmbeddings {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY environment variable is required');
  }
  
  return new OpenAIEmbeddings({
    openAIApiKey: apiKey,
    modelName: process.env.EMBEDDING_MODEL || 'text-embedding-3-small',
    dimensions: 1536,               // Dimensiones del vector
    batchSize: 512,                 // Optimización para requests
    stripNewLines: true,            // Limpieza automática
    timeout: 30000,                 // Timeout de 30 segundos
    maxRetries: 3,                  // Reintentos automáticos
    requestTimeout: 30000,          // Timeout por request
  });
}
```

### **Especificaciones del Modelo text-embedding-3-small**

- **Dimensiones**: 1536 (configurable hasta 512)
- **Tokens máximos**: 8,191 por input
- **Costo**: $0.00002 por 1K tokens
- **Rendimiento**: ~62.3% en MTEB benchmark
- **Velocidad**: Optimizado para aplicaciones en tiempo real

### **Procesamiento de Embeddings**

```typescript
async function generateEmbeddings(chunks: Document[]): Promise<number[][]> {
  const embeddings = createEmbeddings();
  
  console.log(`Generating embeddings for ${chunks.length} document chunks...`);
  
  try {
    // Procesar en lotes para optimización
    const batchSize = parseInt(process.env.EMBEDDING_BATCH_SIZE || '100');
    const results: number[][] = [];
    
    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize);
      const texts = batch.map(chunk => chunk.pageContent);
      
      console.log(`Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(chunks.length/batchSize)}`);
      
      const batchEmbeddings = await embeddings.embedDocuments(texts);
      results.push(...batchEmbeddings);
      
      // Pequeña pausa para evitar rate limits
      if (i + batchSize < chunks.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    console.log(`✅ Generated ${results.length} embeddings (${results[0].length} dimensions each)`);
    return results;
    
  } catch (error) {
    console.error('Error generating embeddings:', error);
    throw new Error(`Failed to generate embeddings: ${error.message}`);
  }
}
```

## 🏪 VectorStoreManager - Gestor Principal

### **Clase VectorStoreManager**

```typescript
export class VectorStoreManager {
  private loadedStores: Map<string, FaissStore>;
  private embeddings: OpenAIEmbeddings;
  private baseDirectory: string;
  private storeMetadata: Map<string, VectorStoreMetadata>;

  constructor(embeddings: OpenAIEmbeddings) {
    this.loadedStores = new Map();
    this.embeddings = embeddings;
    this.baseDirectory = process.env.VECTORSTORE_DIRECTORY || 'vectorstores';
    this.storeMetadata = new Map();
    
    // Crear directorio base si no existe
    if (!fs.existsSync(this.baseDirectory)) {
      fs.mkdirSync(this.baseDirectory, { recursive: true });
      console.log(`Created vector stores directory: ${this.baseDirectory}`);
    }
  }
}

interface VectorStoreMetadata {
  name: string;
  documentCount: number;
  vectorCount: number;
  createdAt: Date;
  lastUpdated: Date;
  size: number;
  documents: string[];
}
```

### **Métodos de Gestión de Almacenes**

#### `loadOrCreateVectorStore(storeName: string, docs?: Document[]): Promise<void>`

```typescript
async loadOrCreateVectorStore(storeName: string, docs?: Document[]): Promise<void> {
  const storePath = path.join(this.baseDirectory, storeName);
  
  try {
    if (this.storeExists(storeName)) {
      // Cargar almacén existente
      console.log(`📂 Loading existing vector store: ${storeName}`);
      const store = await FaissStore.load(storePath, this.embeddings);
      this.loadedStores.set(storeName, store);
      
      // Cargar metadatos
      await this.loadStoreMetadata(storeName);
      
    } else if (docs && docs.length > 0) {
      // Crear nuevo almacén
      console.log(`🆕 Creating new vector store: ${storeName}`);
      
      const startTime = Date.now();
      const store = await FaissStore.fromDocuments(docs, this.embeddings);
      const creationTime = Date.now() - startTime;
      
      // Guardar almacén
      await store.save(storePath);
      this.loadedStores.set(storeName, store);
      
      // Crear metadatos
      const metadata: VectorStoreMetadata = {
        name: storeName,
        documentCount: docs.length,
        vectorCount: docs.length,
        createdAt: new Date(),
        lastUpdated: new Date(),
        size: await this.calculateStoreSize(storePath),
        documents: docs.map(doc => doc.metadata.source || 'unknown')
      };
      
      await this.saveStoreMetadata(storeName, metadata);
      this.storeMetadata.set(storeName, metadata);
      
      console.log(`✅ Vector store ${storeName} created in ${creationTime}ms (${docs.length} vectors)`);
      
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

```typescript
async addDocumentToVectorStores(filename: string, docs: Document[]): Promise<void> {
  const storeName = path.parse(filename).name;
  
  try {
    // 1. Crear almacén individual para el documento
    console.log(`📄 Creating individual store for: ${filename}`);
    await this.loadOrCreateVectorStore(storeName, docs);
    
    // 2. Agregar al almacén combinado
    if (this.storeExists('combined')) {
      console.log(`📚 Adding ${filename} to combined store`);
      
      const combinedStore = await this.loadVectorStore('combined');
      
      // Agregar documentos al almacén existente
      await combinedStore.addDocuments(docs);
      
      // Guardar almacén actualizado
      const combinedPath = path.join(this.baseDirectory, 'combined');
      await combinedStore.save(combinedPath);
      
      // Actualizar metadatos
      await this.updateStoreMetadata('combined', docs, filename);
      
      console.log(`✅ Document ${filename} added to combined store`);
    } else {
      console.log('📚 No combined store exists, creating with this document');
      await this.loadOrCreateVectorStore('combined', docs);
    }
    
  } catch (error) {
    console.error(`Error adding document ${filename} to vector stores:`, error);
    throw error;
  }
}
```

### **Métodos de Acceso y Búsqueda**

#### `getRetriever(storeName: string): VectorStoreRetriever`

```typescript
getRetriever(storeName: string): VectorStoreRetriever {
  const store = this.loadedStores.get(storeName);
  if (!store) {
    throw new Error(`Vector store '${storeName}' not loaded. Available stores: ${this.getAvailableStores().join(', ')}`);
  }
  
  const k = parseInt(process.env.RETRIEVER_K || '5');
  const searchType = process.env.SEARCH_TYPE || 'similarity';
  
  return store.asRetriever({
    k,
    searchType: searchType as 'similarity' | 'mmr',
    searchKwargs: {
      lambda: 0.5,  // Para MMR (diversidad vs relevancia)
      fetchK: k * 3 // Obtener más candidatos para MMR
    }
  });
}
```

#### `searchSimilarDocuments(storeName: string, query: string, k?: number): Promise<DocumentWithScore[]>`

```typescript
async searchSimilarDocuments(
  storeName: string, 
  query: string, 
  k: number = 5
): Promise<DocumentWithScore[]> {
  
  const store = this.loadedStores.get(storeName);
  if (!store) {
    throw new Error(`Vector store '${storeName}' not loaded`);
  }
  
  try {
    console.log(`🔍 Searching in store '${storeName}' for: "${query.substring(0, 50)}..."`);
    
    const results = await store.similaritySearchWithScore(query, k);
    
    console.log(`📋 Found ${results.length} similar documents (scores: ${results.map(r => r[1].toFixed(3)).join(', ')})`);
    
    return results.map(([doc, score]) => ({
      document: doc,
      score,
      similarity: 1 - score // Convertir distancia a similaridad
    }));
    
  } catch (error) {
    console.error(`Error searching in store ${storeName}:`, error);
    throw error;
  }
}

interface DocumentWithScore {
  document: Document;
  score: number;
  similarity: number;
}
```

## 📁 Gestión de Archivos FAISS

### **Estructura de Archivos**

Cada almacén vectorial se almacena como dos archivos:

```
vectorstores/
├── combined/
│   ├── index.faiss          # Índice vectorial binario
│   ├── index.pkl           # Metadatos en pickle
│   └── metadata.json       # Metadatos legibles
├── documento1/
│   ├── index.faiss
│   ├── index.pkl
│   └── metadata.json
└── documento2/
    ├── index.faiss
    ├── index.pkl
    └── metadata.json
```

### **Verificación de Integridad**

```typescript
storeExists(storeName: string): boolean {
  const storePath = path.join(this.baseDirectory, storeName);
  const indexPath = path.join(storePath, 'index.faiss');
  const pklPath = path.join(storePath, 'index.pkl');
  
  const exists = fs.existsSync(indexPath) && fs.existsSync(pklPath);
  
  if (exists) {
    // Verificar que los archivos no estén corruptos
    try {
      const indexStat = fs.statSync(indexPath);
      const pklStat = fs.statSync(pklPath);
      
      if (indexStat.size === 0 || pklStat.size === 0) {
        console.warn(`⚠️ Vector store ${storeName} has zero-sized files`);
        return false;
      }
      
      return true;
    } catch (error) {
      console.warn(`⚠️ Error checking vector store ${storeName}:`, error);
      return false;
    }
  }
  
  return false;
}
```

### **Carga con Reintentos**

```typescript
private async loadVectorStore(storeName: string): Promise<FaissStore> {
  if (this.loadedStores.has(storeName)) {
    return this.loadedStores.get(storeName)!;
  }
  
  const storePath = path.join(this.baseDirectory, storeName);
  const maxRetries = 3;
  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`📂 Loading vector store ${storeName} (attempt ${attempt}/${maxRetries})`);
      
      const store = await FaissStore.load(storePath, this.embeddings);
      this.loadedStores.set(storeName, store);
      
      console.log(`✅ Vector store ${storeName} loaded successfully`);
      return store;
      
    } catch (error) {
      lastError = error as Error;
      console.warn(`⚠️ Failed to load vector store ${storeName} (attempt ${attempt}): ${error.message}`);
      
      if (attempt < maxRetries) {
        // Esperar antes de reintentar
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
  }
  
  throw new Error(`Failed to load vector store ${storeName} after ${maxRetries} attempts: ${lastError.message}`);
}
```

## 🔄 Operaciones de Mantenimiento

### **Reconstrucción de Índices**

```typescript
async rebuildVectorStore(storeName: string): Promise<void> {
  console.log(`🔧 Rebuilding vector store: ${storeName}`);
  
  try {
    // 1. Obtener documentos originales
    const metadata = this.storeMetadata.get(storeName);
    if (!metadata) {
      throw new Error(`No metadata found for store ${storeName}`);
    }
    
    // 2. Cargar documentos desde fuentes originales
    const docs: Document[] = [];
    for (const docPath of metadata.documents) {
      try {
        const docName = path.basename(docPath);
        const loadedDocs = await loadSingleDocument(docName);
        const splitDocs = await splitDocuments(loadedDocs);
        docs.push(...splitDocs);
      } catch (error) {
        console.warn(`Could not reload document ${docPath}:`, error);
      }
    }
    
    if (docs.length === 0) {
      throw new Error(`No documents could be reloaded for store ${storeName}`);
    }
    
    // 3. Crear backup del almacén actual
    const storePath = path.join(this.baseDirectory, storeName);
    const backupPath = `${storePath}_backup_${Date.now()}`;
    
    if (fs.existsSync(storePath)) {
      await fs.promises.rename(storePath, backupPath);
      console.log(`📋 Backup created: ${backupPath}`);
    }
    
    // 4. Recrear almacén
    this.loadedStores.delete(storeName);
    await this.loadOrCreateVectorStore(storeName, docs);
    
    // 5. Eliminar backup si todo fue exitoso
    if (fs.existsSync(backupPath)) {
      await fs.promises.rm(backupPath, { recursive: true });
      console.log(`✅ Store ${storeName} rebuilt successfully`);
    }
    
  } catch (error) {
    console.error(`Error rebuilding store ${storeName}:`, error);
    throw error;
  }
}
```

### **Optimización de Almacenes**

```typescript
async optimizeVectorStore(storeName: string): Promise<void> {
  console.log(`⚡ Optimizing vector store: ${storeName}`);
  
  const store = this.loadedStores.get(storeName);
  if (!store) {
    throw new Error(`Store ${storeName} not loaded`);
  }
  
  try {
    // FAISS permite varias optimizaciones según el tipo de índice
    // Por ahora, simplemente reempaquetamos el índice
    const storePath = path.join(this.baseDirectory, storeName);
    
    // Guardar con optimización
    await store.save(storePath);
    
    // Recargar el almacén optimizado
    this.loadedStores.delete(storeName);
    await this.loadVectorStore(storeName);
    
    console.log(`✅ Store ${storeName} optimized`);
    
  } catch (error) {
    console.error(`Error optimizing store ${storeName}:`, error);
    throw error;
  }
}
```

### **Limpieza de Almacenes Huérfanos**

```typescript
async cleanupOrphanedStores(): Promise<void> {
  console.log('🧹 Cleaning up orphaned vector stores...');
  
  const storeDirectories = fs.readdirSync(this.baseDirectory)
    .filter(dir => {
      const dirPath = path.join(this.baseDirectory, dir);
      return fs.statSync(dirPath).isDirectory();
    });
  
  const docsDirectory = process.env.DOCS_DIRECTORY || 'docs';
  const availableDocuments = fs.existsSync(docsDirectory) 
    ? fs.readdirSync(docsDirectory)
        .filter(file => file.endsWith('.txt'))
        .map(file => path.parse(file).name)
    : [];
  
  let removedCount = 0;
  
  for (const storeDir of storeDirectories) {
    if (storeDir === 'combined') continue; // Nunca eliminar el almacén combinado
    
    // Verificar si existe el documento fuente
    if (!availableDocuments.includes(storeDir)) {
      const storePath = path.join(this.baseDirectory, storeDir);
      
      try {
        await fs.promises.rm(storePath, { recursive: true });
        this.loadedStores.delete(storeDir);
        this.storeMetadata.delete(storeDir);
        removedCount++;
        
        console.log(`🗑️ Removed orphaned store: ${storeDir}`);
      } catch (error) {
        console.warn(`Could not remove orphaned store ${storeDir}:`, error);
      }
    }
  }
  
  console.log(`✅ Cleanup completed. Removed ${removedCount} orphaned stores.`);
}
```

## 📊 Métricas y Estadísticas

### **Información de Almacenes**

```typescript
getStoreStatistics(storeName: string): VectorStoreStatistics | null {
  const metadata = this.storeMetadata.get(storeName);
  if (!metadata) {
    return null;
  }
  
  const storePath = path.join(this.baseDirectory, storeName);
  let indexSize = 0;
  let pklSize = 0;
  
  try {
    const indexPath = path.join(storePath, 'index.faiss');
    const pklPath = path.join(storePath, 'index.pkl');
    
    if (fs.existsSync(indexPath)) {
      indexSize = fs.statSync(indexPath).size;
    }
    
    if (fs.existsSync(pklPath)) {
      pklSize = fs.statSync(pklPath).size;
    }
  } catch (error) {
    console.warn(`Error getting store size for ${storeName}:`, error);
  }
  
  return {
    name: storeName,
    vectorCount: metadata.vectorCount,
    documentCount: metadata.documentCount,
    totalSize: indexSize + pklSize,
    indexSize,
    metadataSize: pklSize,
    createdAt: metadata.createdAt,
    lastUpdated: metadata.lastUpdated,
    documentsIncluded: metadata.documents,
    averageVectorSize: metadata.vectorCount > 0 ? indexSize / metadata.vectorCount : 0,
    compressionRatio: metadata.vectorCount > 0 ? (indexSize / (metadata.vectorCount * 1536 * 4)) : 0
  };
}

interface VectorStoreStatistics {
  name: string;
  vectorCount: number;
  documentCount: number;
  totalSize: number;
  indexSize: number;
  metadataSize: number;
  createdAt: Date;
  lastUpdated: Date;
  documentsIncluded: string[];
  averageVectorSize: number;
  compressionRatio: number;
}
```

### **Reporte Global**

```typescript
generateGlobalReport(): string {
  const stores = this.getAvailableStores();
  let totalVectors = 0;
  let totalSize = 0;
  let totalDocuments = 0;
  
  const storeStats = stores.map(storeName => {
    const stats = this.getStoreStatistics(storeName);
    if (stats) {
      totalVectors += stats.vectorCount;
      totalSize += stats.totalSize;
      totalDocuments += stats.documentCount;
    }
    return stats;
  }).filter(Boolean);
  
  const avgVectorsPerStore = stores.length > 0 ? totalVectors / stores.length : 0;
  const avgSizePerStore = stores.length > 0 ? totalSize / stores.length : 0;
  
  return `📊 Vector Stores Global Report:
  
🏪 Stores Overview:
  - Total stores: ${stores.length}
  - Total vectors: ${totalVectors.toLocaleString()}
  - Total documents: ${totalDocuments}
  - Total size: ${(totalSize / 1024 / 1024).toFixed(2)} MB
  
📈 Averages:
  - Vectors per store: ${Math.round(avgVectorsPerStore)}
  - Size per store: ${(avgSizePerStore / 1024 / 1024).toFixed(2)} MB
  
🗂️ Store Details:
${storeStats.map(stats => `  - ${stats!.name}: ${stats!.vectorCount} vectors, ${(stats!.totalSize / 1024).toFixed(1)} KB`).join('\n')}`;
}
```

## ⚡ Optimizaciones y Rendimiento

### **Configuración Avanzada de FAISS**

```typescript
// Para casos de uso avanzados, se puede configurar FAISS directamente
async createOptimizedFaissStore(
  docs: Document[], 
  options: {
    indexType?: 'Flat' | 'IVF' | 'HNSW';
    nprobe?: number;
    nlist?: number;
  } = {}
): Promise<FaissStore> {
  
  const { indexType = 'Flat', nprobe = 10, nlist = 100 } = options;
  
  console.log(`Creating optimized FAISS store with ${indexType} index`);
  
  // Configurar según el tipo de índice
  let store: FaissStore;
  
  switch (indexType) {
    case 'IVF':
      // Índice invertido para datasets grandes
      store = await FaissStore.fromDocuments(docs, this.embeddings);
      // Note: La configuración específica de IVF requeriría acceso directo a FAISS
      break;
      
    case 'HNSW':
      // Hierarchical Navigable Small World para búsqueda rápida
      store = await FaissStore.fromDocuments(docs, this.embeddings);
      break;
      
    default:
      // Flat L2 (búsqueda exhaustiva, exacta)
      store = await FaissStore.fromDocuments(docs, this.embeddings);
  }
  
  console.log(`✅ Optimized ${indexType} store created with ${docs.length} vectors`);
  return store;
}
```

### **Caché de Búsquedas**

```typescript
private searchCache: Map<string, { results: DocumentWithScore[], timestamp: number }> = new Map();
private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

async cachedSimilaritySearch(
  storeName: string, 
  query: string, 
  k: number = 5
): Promise<DocumentWithScore[]> {
  
  const cacheKey = `${storeName}:${query}:${k}`;
  const cached = this.searchCache.get(cacheKey);
  
  // Verificar cache válido
  if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
    console.log(`💾 Cache hit for query: ${query.substring(0, 30)}...`);
    return cached.results;
  }
  
  // Realizar búsqueda
  const results = await this.searchSimilarDocuments(storeName, query, k);
  
  // Guardar en cache
  this.searchCache.set(cacheKey, {
    results,
    timestamp: Date.now()
  });
  
  // Limpiar cache antiguo
  this.cleanupSearchCache();
  
  return results;
}

private cleanupSearchCache(): void {
  const now = Date.now();
  for (const [key, entry] of this.searchCache) {
    if (now - entry.timestamp > this.CACHE_DURATION) {
      this.searchCache.delete(key);
    }
  }
}
```

---

**Siguiente**: [Configuración del Modelo de Lenguaje](10-modelo-lenguaje.md)  
**Anterior**: [Gestión de Documentos](08-gestion-documentos.md) 