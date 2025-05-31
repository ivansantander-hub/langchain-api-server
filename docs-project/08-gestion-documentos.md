# Sistema de Gestión de Documentos - LangChain Document Chat

## 📄 Introducción al Sistema de Documentos

El sistema de gestión de documentos es el componente responsable de la **carga**, **procesamiento** y **preparación** de documentos para su uso en el sistema RAG. Este módulo maneja todo el ciclo de vida de los documentos, desde su ingreso hasta su conversión en fragmentos optimizados para búsqueda vectorial.

## 🏗️ Arquitectura del Sistema

### **Flujo de Procesamiento de Documentos**

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  Documentos │───▶│   Carga     │───▶│Fragmentación│───▶│ Vectorización│
│   (.txt)    │    │ (TextLoader)│    │ (Splitter)  │    │  (Embeddings) │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
       │                   │                   │                   │
       │                   ▼                   ▼                   ▼
       │            ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
       │            │ Validación  │    │  Metadatos  │    │  Almacenes  │
       └───────────▶│ de Formato  │    │ y Contexto  │    │ Vectoriales │
                    └─────────────┘    └─────────────┘    └─────────────┘
```

### **Componentes Principales**

1. **Document Loader**: Carga archivos desde el sistema de archivos
2. **Text Splitter**: Fragmenta documentos en chunks manejables
3. **Metadata Manager**: Gestiona información contextual de documentos
4. **Validation System**: Valida formato y contenido de documentos
5. **File Manager**: Gestiona operaciones de archivo y directorio

## 📁 Gestión de Archivos y Directorios

### **Estructura de Directorios**

```
project/
├── docs/                          # Directorio fuente de documentos
│   ├── patrones_de_diseno.txt     # Documento ejemplo
│   ├── guia_de_desarrollo.txt     # Otro documento
│   └── [nuevos_documentos].txt    # Documentos agregados dinámicamente
├── temp/                          # Directorio temporal (opcional)
│   └── uploads/                   # Archivos subidos temporalmente
└── vectorstores/                  # Almacenes generados automáticamente
    ├── combined/                  # Almacén de todos los documentos
    ├── patrones_de_diseno/        # Almacén individual
    └── [documento]/               # Un almacén por documento
```

### **Variables de Configuración**

```env
# Configuración de directorios
DOCS_DIRECTORY=docs
VECTORSTORE_DIRECTORY=vectorstores
TEMP_DIRECTORY=temp

# Configuración de procesamiento
CHUNK_SIZE=1000
CHUNK_OVERLAP=200
MAX_FILE_SIZE=10485760  # 10MB en bytes
SUPPORTED_EXTENSIONS=.txt

# Configuración de validación
MAX_DOCUMENTS=1000
MIN_DOCUMENT_LENGTH=10
MAX_DOCUMENT_LENGTH=10485760
```

## 📂 Carga de Documentos

### **DirectoryLoader - Carga Masiva**

```typescript
export async function loadDocuments(): Promise<Document[]> {
  const docsDirectory = process.env.DOCS_DIRECTORY || 'docs';
  
  // Verificar que el directorio existe
  if (!fs.existsSync(docsDirectory)) {
    console.warn(`Documents directory ${docsDirectory} does not exist. Creating...`);
    fs.mkdirSync(docsDirectory, { recursive: true });
    return [];
  }
  
  // Contar documentos disponibles
  const documentCount = await countDocuments(docsDirectory);
  console.log(`Found ${documentCount} documents in docs directory`);
  
  if (documentCount === 0) {
    console.warn('No documents found in docs directory');
    return [];
  }
  
  // Configurar loader con filtros
  const loader = new DirectoryLoader(docsDirectory, {
    ".txt": (path) => new TextLoader(path, "utf-8"),
  });
  
  try {
    const docs = await loader.load();
    console.log(`Successfully loaded ${docs.length} documents`);
    
    // Validar documentos cargados
    const validDocs = docs.filter(validateDocument);
    if (validDocs.length !== docs.length) {
      console.warn(`${docs.length - validDocs.length} documents failed validation`);
    }
    
    return validDocs;
  } catch (error) {
    console.error('Error loading documents:', error);
    throw new Error(`Failed to load documents: ${error.message}`);
  }
}
```

### **Single Document Loader - Carga Individual**

```typescript
export async function loadSingleDocument(filename: string): Promise<Document[]> {
  const docsDirectory = process.env.DOCS_DIRECTORY || 'docs';
  const filePath = path.join(docsDirectory, filename);
  
  // Validaciones previas
  await validateFilePath(filePath, filename);
  
  // Cargar documento
  const loader = new TextLoader(filePath, "utf-8");
  try {
    const docs = await loader.load();
    console.log(`Loaded document: ${filename} (${docs[0].pageContent.length} characters)`);
    
    // Enriquecer metadatos
    docs.forEach(doc => {
      doc.metadata = {
        ...doc.metadata,
        filename,
        loadedAt: new Date().toISOString(),
        size: doc.pageContent.length
      };
    });
    
    return docs;
  } catch (error) {
    console.error(`Error loading document ${filename}:`, error);
    throw new Error(`Failed to load document ${filename}: ${error.message}`);
  }
}
```

### **Funciones de Validación**

```typescript
async function validateFilePath(filePath: string, filename: string): Promise<void> {
  // Verificar existencia
  if (!fs.existsSync(filePath)) {
    throw new Error(`Document ${filename} not found in docs directory`);
  }
  
  // Verificar extensión
  const supportedExtensions = (process.env.SUPPORTED_EXTENSIONS || '.txt').split(',');
  const fileExtension = path.extname(filename).toLowerCase();
  if (!supportedExtensions.includes(fileExtension)) {
    throw new Error(`Unsupported file type: ${fileExtension}. Supported: ${supportedExtensions.join(', ')}`);
  }
  
  // Verificar tamaño de archivo
  const stats = await fs.promises.stat(filePath);
  const maxSize = parseInt(process.env.MAX_FILE_SIZE || '10485760'); // 10MB
  if (stats.size > maxSize) {
    throw new Error(`File ${filename} is too large: ${stats.size} bytes (max: ${maxSize})`);
  }
  
  // Verificar permisos de lectura
  try {
    await fs.promises.access(filePath, fs.constants.R_OK);
  } catch (error) {
    throw new Error(`Cannot read file ${filename}: permission denied`);
  }
}

function validateDocument(doc: Document): boolean {
  const minLength = parseInt(process.env.MIN_DOCUMENT_LENGTH || '10');
  const maxLength = parseInt(process.env.MAX_DOCUMENT_LENGTH || '10485760');
  
  // Validar contenido
  if (!doc.pageContent || doc.pageContent.trim().length === 0) {
    console.warn(`Document ${doc.metadata.source} has empty content`);
    return false;
  }
  
  // Validar longitud
  if (doc.pageContent.length < minLength) {
    console.warn(`Document ${doc.metadata.source} is too short: ${doc.pageContent.length} chars`);
    return false;
  }
  
  if (doc.pageContent.length > maxLength) {
    console.warn(`Document ${doc.metadata.source} is too long: ${doc.pageContent.length} chars`);
    return false;
  }
  
  return true;
}
```

## ✂️ Fragmentación de Documentos

### **RecursiveCharacterTextSplitter**

La fragmentación es crucial para optimizar la búsqueda vectorial. El sistema utiliza el `RecursiveCharacterTextSplitter` que mantiene la coherencia semántica.

```typescript
export async function splitDocuments(docs: Document[]): Promise<Document[]> {
  const chunkSize = parseInt(process.env.CHUNK_SIZE || '1000');
  const chunkOverlap = parseInt(process.env.CHUNK_OVERLAP || '200');
  
  // Configurar splitter con jerarquía de separadores
  const textSplitter = new RecursiveCharacterTextSplitter({
    chunkSize,
    chunkOverlap,
    separators: [
      '\n\n\n',    // Separaciones de sección
      '\n\n',      // Párrafos
      '\n',        // Líneas
      '. ',        // Oraciones
      '! ',        // Exclamaciones
      '? ',        // Preguntas
      '; ',        // Punto y coma
      ', ',        // Comas
      ' ',         // Espacios
      ''           # Caracteres individuales (último recurso)
    ],
    lengthFunction: (text: string) => text.length,
  });
  
  console.log(`Splitting documents with chunk size: ${chunkSize}, overlap: ${chunkOverlap}`);
  
  try {
    const splitDocs = await textSplitter.splitDocuments(docs);
    
    // Enriquecer metadatos de chunks
    splitDocs.forEach((doc, index) => {
      doc.metadata = {
        ...doc.metadata,
        chunkIndex: index,
        chunkSize: doc.pageContent.length,
        splitAt: new Date().toISOString()
      };
    });
    
    console.log(`Documents split into ${splitDocs.length} chunks`);
    
    // Estadísticas de fragmentación
    logSplittingStats(docs, splitDocs);
    
    return splitDocs;
  } catch (error) {
    console.error('Error splitting documents:', error);
    throw error;
  }
}
```

### **Estadísticas de Fragmentación**

```typescript
function logSplittingStats(originalDocs: Document[], splitDocs: Document[]): void {
  const totalOriginalLength = originalDocs.reduce((sum, doc) => sum + doc.pageContent.length, 0);
  const totalSplitLength = splitDocs.reduce((sum, doc) => sum + doc.pageContent.length, 0);
  
  const avgChunkSize = totalSplitLength / splitDocs.length;
  const compressionRatio = (totalSplitLength / totalOriginalLength) * 100;
  
  console.log(`📊 Fragmentación completada:
  - Documentos originales: ${originalDocs.length}
  - Chunks generados: ${splitDocs.length}
  - Tamaño promedio de chunk: ${Math.round(avgChunkSize)} caracteres
  - Ratio de compresión: ${compressionRatio.toFixed(1)}%`);
}
```

### **Configuración Avanzada de Fragmentación**

```typescript
export function createCustomTextSplitter(options: {
  chunkSize?: number;
  chunkOverlap?: number;
  separators?: string[];
  preserveCodeBlocks?: boolean;
  preserveMarkdown?: boolean;
}): RecursiveCharacterTextSplitter {
  
  let separators = options.separators || ['\n\n', '\n', ' ', ''];
  
  // Preservar bloques de código
  if (options.preserveCodeBlocks) {
    separators = ['```\n', ...separators];
  }
  
  // Preservar estructura Markdown
  if (options.preserveMarkdown) {
    separators = [
      '\n## ',    // Headers H2
      '\n### ',   // Headers H3
      '\n#### ',  // Headers H4
      '\n- ',     // Lista con guiones
      '\n* ',     // Lista con asteriscos
      '\n1. ',    // Lista numerada
      ...separators
    ];
  }
  
  return new RecursiveCharacterTextSplitter({
    chunkSize: options.chunkSize || 1000,
    chunkOverlap: options.chunkOverlap || 200,
    separators,
    lengthFunction: (text: string) => text.length,
  });
}
```

## 📤 Gestión de Documentos Subidos

### **Upload API - Subida de Documentos**

```typescript
export async function saveUploadedDocument(
  content: string, 
  filename: string,
  options: {
    overwrite?: boolean;
    validateContent?: boolean;
    createBackup?: boolean;
  } = {}
): Promise<{filename: string, path: string, size: number}> {
  
  const docsDirectory = process.env.DOCS_DIRECTORY || 'docs';
  
  // Validaciones de entrada
  await validateUploadedDocument(content, filename);
  
  // Sanitizar nombre de archivo
  const sanitizedFilename = sanitizeFilename(filename);
  const filePath = path.join(docsDirectory, sanitizedFilename);
  
  // Verificar si ya existe
  if (fs.existsSync(filePath) && !options.overwrite) {
    throw new Error(`Document ${sanitizedFilename} already exists. Use overwrite option to replace.`);
  }
  
  // Crear backup si se solicita
  if (options.createBackup && fs.existsSync(filePath)) {
    await createBackup(filePath);
  }
  
  // Verificar directorio
  if (!fs.existsSync(docsDirectory)) {
    fs.mkdirSync(docsDirectory, { recursive: true });
    console.log(`Created documents directory: ${docsDirectory}`);
  }
  
  try {
    // Escribir archivo
    await fs.promises.writeFile(filePath, content, 'utf8');
    
    // Verificar escritura
    const stats = await fs.promises.stat(filePath);
    
    console.log(`📄 Document saved: ${sanitizedFilename} (${stats.size} bytes)`);
    
    return {
      filename: sanitizedFilename,
      path: filePath,
      size: stats.size
    };
    
  } catch (error) {
    console.error(`Error saving document ${sanitizedFilename}:`, error);
    throw new Error(`Failed to save document: ${error.message}`);
  }
}
```

### **Validación de Contenido**

```typescript
async function validateUploadedDocument(content: string, filename: string): Promise<void> {
  // Validar nombre de archivo
  if (!filename || filename.trim().length === 0) {
    throw new Error('Filename cannot be empty');
  }
  
  // Validar extensión
  if (!filename.endsWith('.txt')) {
    throw new Error('Only .txt files are supported');
  }
  
  // Validar contenido
  if (!content || content.trim().length === 0) {
    throw new Error('Document content cannot be empty');
  }
  
  // Validar tamaño
  const maxSize = parseInt(process.env.MAX_FILE_SIZE || '10485760');
  if (content.length > maxSize) {
    throw new Error(`Document too large: ${content.length} bytes (max: ${maxSize})`);
  }
  
  // Validar caracteres
  if (!isValidUTF8(content)) {
    throw new Error('Document contains invalid UTF-8 characters');
  }
  
  // Validar contenido mínimo
  const minLength = parseInt(process.env.MIN_DOCUMENT_LENGTH || '10');
  if (content.trim().length < minLength) {
    throw new Error(`Document too short: minimum ${minLength} characters required`);
  }
}

function sanitizeFilename(filename: string): string {
  // Remover caracteres peligrosos
  let sanitized = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
  
  // Evitar nombres reservados del sistema
  const reservedNames = ['CON', 'PRN', 'AUX', 'NUL', 'COM1', 'LPT1'];
  const nameWithoutExt = path.parse(sanitized).name.toUpperCase();
  if (reservedNames.includes(nameWithoutExt)) {
    sanitized = `doc_${sanitized}`;
  }
  
  // Limitar longitud
  if (sanitized.length > 255) {
    const ext = path.extname(sanitized);
    const name = path.parse(sanitized).name.substring(0, 255 - ext.length);
    sanitized = name + ext;
  }
  
  return sanitized;
}

function isValidUTF8(str: string): boolean {
  try {
    // Intentar codificar y decodificar
    const encoded = Buffer.from(str, 'utf8');
    const decoded = encoded.toString('utf8');
    return decoded === str;
  } catch (error) {
    return false;
  }
}
```

## 🔍 Listado y Exploración de Documentos

### **Listado de Documentos Disponibles**

```typescript
export function listAvailableDocuments(): {
  files: string[];
  totalSize: number;
  lastModified: Date | null;
  statistics: DocumentStatistics;
} {
  const docsDirectory = process.env.DOCS_DIRECTORY || 'docs';
  
  if (!fs.existsSync(docsDirectory)) {
    return {
      files: [],
      totalSize: 0,
      lastModified: null,
      statistics: { count: 0, avgSize: 0, minSize: 0, maxSize: 0 }
    };
  }
  
  const files = fs.readdirSync(docsDirectory)
    .filter(file => file.endsWith('.txt'))
    .sort();
  
  // Calcular estadísticas
  let totalSize = 0;
  let lastModified: Date | null = null;
  const sizes: number[] = [];
  
  files.forEach(file => {
    const filePath = path.join(docsDirectory, file);
    const stats = fs.statSync(filePath);
    
    totalSize += stats.size;
    sizes.push(stats.size);
    
    if (!lastModified || stats.mtime > lastModified) {
      lastModified = stats.mtime;
    }
  });
  
  const statistics: DocumentStatistics = {
    count: files.length,
    avgSize: files.length > 0 ? Math.round(totalSize / files.length) : 0,
    minSize: files.length > 0 ? Math.min(...sizes) : 0,
    maxSize: files.length > 0 ? Math.max(...sizes) : 0
  };
  
  return { files, totalSize, lastModified, statistics };
}

interface DocumentStatistics {
  count: number;
  avgSize: number;
  minSize: number;
  maxSize: number;
}
```

### **Información Detallada de Documento**

```typescript
export async function getDocumentInfo(filename: string): Promise<DocumentInfo> {
  const docsDirectory = process.env.DOCS_DIRECTORY || 'docs';
  const filePath = path.join(docsDirectory, filename);
  
  if (!fs.existsSync(filePath)) {
    throw new Error(`Document ${filename} not found`);
  }
  
  const stats = await fs.promises.stat(filePath);
  const content = await fs.promises.readFile(filePath, 'utf8');
  
  // Análisis de contenido
  const lines = content.split('\n').length;
  const words = content.split(/\s+/).filter(word => word.length > 0).length;
  const characters = content.length;
  const charactersNoSpaces = content.replace(/\s/g, '').length;
  
  // Estimación de chunks
  const chunkSize = parseInt(process.env.CHUNK_SIZE || '1000');
  const estimatedChunks = Math.ceil(characters / chunkSize);
  
  return {
    filename,
    path: filePath,
    size: stats.size,
    created: stats.birthtime,
    modified: stats.mtime,
    accessed: stats.atime,
    content: {
      lines,
      words,
      characters,
      charactersNoSpaces,
      estimatedChunks
    },
    encoding: detectEncoding(content)
  };
}

interface DocumentInfo {
  filename: string;
  path: string;
  size: number;
  created: Date;
  modified: Date;
  accessed: Date;
  content: {
    lines: number;
    words: number;
    characters: number;
    charactersNoSpaces: number;
    estimatedChunks: number;
  };
  encoding: string;
}
```

## 🔄 Procesamiento Automático

### **Watch System - Detección de Cambios**

```typescript
export function setupDocumentWatcher(
  vectorStoreManager: VectorStoreManager,
  callback?: (event: string, filename: string) => void
): fs.FSWatcher {
  const docsDirectory = process.env.DOCS_DIRECTORY || 'docs';
  
  if (!fs.existsSync(docsDirectory)) {
    fs.mkdirSync(docsDirectory, { recursive: true });
  }
  
  const watcher = fs.watch(docsDirectory, { recursive: false }, async (eventType, filename) => {
    if (!filename || !filename.endsWith('.txt')) {
      return;
    }
    
    console.log(`📁 File ${eventType}: ${filename}`);
    
    try {
      if (eventType === 'change' || eventType === 'rename') {
        const filePath = path.join(docsDirectory, filename);
        
        if (fs.existsSync(filePath)) {
          // Archivo agregado o modificado
          console.log(`Processing updated document: ${filename}`);
          await processNewDocument(filename, vectorStoreManager);
        } else {
          // Archivo eliminado
          console.log(`Document removed: ${filename}`);
          await handleDocumentRemoval(filename, vectorStoreManager);
        }
      }
      
      callback?.(eventType, filename);
      
    } catch (error) {
      console.error(`Error processing file change ${filename}:`, error);
    }
  });
  
  console.log(`📁 Document watcher started for: ${docsDirectory}`);
  return watcher;
}

async function processNewDocument(
  filename: string, 
  vectorStoreManager: VectorStoreManager
): Promise<void> {
  try {
    // Cargar documento
    const docs = await loadSingleDocument(filename);
    
    // Fragmentar
    const splitDocs = await splitDocuments(docs);
    
    // Agregar a almacenes vectoriales
    await vectorStoreManager.addDocumentToVectorStores(filename, splitDocs);
    
    console.log(`✅ Document ${filename} processed and added to vector stores`);
    
  } catch (error) {
    console.error(`Failed to process new document ${filename}:`, error);
  }
}
```

### **Backup System**

```typescript
async function createBackup(filePath: string): Promise<string> {
  const backupDir = path.join(path.dirname(filePath), '.backups');
  
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = path.basename(filePath);
  const backupFilename = `${path.parse(filename).name}_${timestamp}${path.extname(filename)}`;
  const backupPath = path.join(backupDir, backupFilename);
  
  await fs.promises.copyFile(filePath, backupPath);
  console.log(`📋 Backup created: ${backupFilename}`);
  
  return backupPath;
}

export async function cleanupOldBackups(maxAge: number = 7): Promise<void> {
  const docsDirectory = process.env.DOCS_DIRECTORY || 'docs';
  const backupDir = path.join(docsDirectory, '.backups');
  
  if (!fs.existsSync(backupDir)) {
    return;
  }
  
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - maxAge);
  
  const files = await fs.promises.readdir(backupDir);
  let deletedCount = 0;
  
  for (const file of files) {
    const filePath = path.join(backupDir, file);
    const stats = await fs.promises.stat(filePath);
    
    if (stats.mtime < cutoffDate) {
      await fs.promises.unlink(filePath);
      deletedCount++;
    }
  }
  
  console.log(`🗑️ Cleaned up ${deletedCount} old backup files`);
}
```

## 📊 Métricas y Monitoreo

### **Document Processing Metrics**

```typescript
export class DocumentMetrics {
  private static instance: DocumentMetrics;
  private metrics: Map<string, any> = new Map();
  
  static getInstance(): DocumentMetrics {
    if (!DocumentMetrics.instance) {
      DocumentMetrics.instance = new DocumentMetrics();
    }
    return DocumentMetrics.instance;
  }
  
  recordDocumentLoad(filename: string, size: number, processingTime: number): void {
    this.metrics.set(`load_${filename}`, {
      filename,
      size,
      processingTime,
      timestamp: new Date()
    });
  }
  
  recordDocumentSplit(filename: string, originalChunks: number, finalChunks: number): void {
    this.metrics.set(`split_${filename}`, {
      filename,
      originalChunks,
      finalChunks,
      compressionRatio: (finalChunks / originalChunks) * 100,
      timestamp: new Date()
    });
  }
  
  getMetrics(): any {
    return Object.fromEntries(this.metrics);
  }
  
  generateReport(): string {
    const loadMetrics = Array.from(this.metrics.entries())
      .filter(([key]) => key.startsWith('load_'))
      .map(([, value]) => value);
    
    const splitMetrics = Array.from(this.metrics.entries())
      .filter(([key]) => key.startsWith('split_'))
      .map(([, value]) => value);
    
    const totalDocs = loadMetrics.length;
    const avgProcessingTime = totalDocs > 0 
      ? loadMetrics.reduce((sum, metric) => sum + metric.processingTime, 0) / totalDocs 
      : 0;
    
    return `📊 Document Processing Report:
    - Total documents processed: ${totalDocs}
    - Average processing time: ${avgProcessingTime.toFixed(2)}ms
    - Total chunks generated: ${splitMetrics.reduce((sum, metric) => sum + metric.finalChunks, 0)}
    - Average compression ratio: ${splitMetrics.length > 0 
      ? (splitMetrics.reduce((sum, metric) => sum + metric.compressionRatio, 0) / splitMetrics.length).toFixed(1) 
      : 0}%`;
  }
}
```

---

**Siguiente**: [Gestión de Almacenes Vectoriales](09-vectorstores.md)  
**Anterior**: [Módulos Core](07-modulos-core.md) 