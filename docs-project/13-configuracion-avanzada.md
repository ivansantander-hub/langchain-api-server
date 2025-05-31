# Configuración Avanzada y Personalización - LangChain Document Chat

## ⚙️ Introducción a la Configuración Avanzada

Este documento cubre todas las opciones de configuración avanzada disponibles para personalizar el comportamiento del sistema LangChain Document Chat, desde variables de entorno hasta configuraciones específicas de componentes.

## 🌐 Variables de Entorno

### **Configuración Básica**

```env
# === CONFIGURACIÓN PRINCIPAL ===
NODE_ENV=production                    # Entorno de ejecución
PORT=3000                             # Puerto del servidor API
HOST=localhost                        # Host del servidor

# === OPENAI CONFIGURATION ===
OPENAI_API_KEY=sk-...                 # Clave API de OpenAI (REQUERIDA)
LLM_MODEL=gpt-3.5-turbo              # Modelo de lenguaje principal
EMBEDDING_MODEL=text-embedding-3-small # Modelo de embeddings
LLM_TEMPERATURE=0.1                   # Temperatura del modelo (0.0-2.0)
LLM_MAX_TOKENS=1000                   # Máximo tokens de respuesta
LLM_TIMEOUT=30000                     # Timeout en milisegundos

# === DIRECTORIOS ===
DOCS_DIRECTORY=docs                   # Directorio de documentos
VECTORSTORE_DIRECTORY=vectorstores    # Directorio de almacenes vectoriales
CHAT_HISTORY_DIRECTORY=chat-history   # Directorio de historial
TEMP_DIRECTORY=temp                   # Directorio temporal
BACKUP_DIRECTORY=backups              # Directorio de respaldos
```

### **Configuración de Procesamiento**

```env
# === DOCUMENT PROCESSING ===
CHUNK_SIZE=1000                       # Tamaño de fragmentos de texto
CHUNK_OVERLAP=200                     # Solapamiento entre fragmentos
MAX_FILE_SIZE=10485760                # Tamaño máximo de archivo (10MB)
SUPPORTED_EXTENSIONS=.txt             # Extensiones soportadas
MIN_DOCUMENT_LENGTH=10                # Longitud mínima de documento
MAX_DOCUMENT_LENGTH=10485760          # Longitud máxima de documento

# === VECTOR STORE ===
RETRIEVER_K=5                         # Número de documentos a recuperar
SEARCH_TYPE=similarity                # Tipo de búsqueda (similarity|mmr)
EMBEDDING_BATCH_SIZE=100              # Tamaño de lote para embeddings
VECTORSTORE_CACHE_SIZE=1000           # Tamaño de cache vectorial

# === MEMORY MANAGEMENT ===
MAX_CHAT_HISTORY=50                   # Máximo mensajes en historial
MAX_CONTEXT_MESSAGES=20               # Máximo mensajes en contexto
MAX_CONTEXT_TOKENS=4000               # Máximo tokens en contexto
COMPRESSION_THRESHOLD=50              # Umbral para compresión
```

### **Configuración de Rendimiento**

```env
# === PERFORMANCE ===
RESPONSE_CACHE_DURATION=300000        # Duración de cache (5 minutos)
SEARCH_CACHE_DURATION=600000          # Cache de búsquedas (10 minutos)
CONCURRENT_REQUESTS=10                # Requests concurrentes máximos
REQUEST_TIMEOUT=30000                 # Timeout de requests
MAX_RETRIES=3                         # Máximo reintentos

# === RATE LIMITING ===
RATE_LIMIT_WINDOW=900000              # Ventana de rate limit (15 min)
RATE_LIMIT_MAX=100                    # Máximo requests por ventana
RATE_LIMIT_DELAY_AFTER=50             # Delay después de N requests

# === MONITORING ===
ENABLE_METRICS=true                   # Habilitar métricas
METRICS_INTERVAL=60000                # Intervalo de métricas (1 min)
LOG_LEVEL=info                        # Nivel de logs (debug|info|warn|error)
ENABLE_PERFORMANCE_LOGS=false         # Logs de rendimiento detallados
```

### **Configuración de Seguridad**

```env
# === SECURITY ===
ENABLE_CORS=true                      # Habilitar CORS
CORS_ORIGIN=*                         # Origen permitido para CORS
ENABLE_API_KEY=false                  # Requerir API key
API_KEY=your-secret-key               # API key personalizada
ENABLE_REQUEST_VALIDATION=true        # Validación de requests
MAX_REQUEST_SIZE=10485760             # Tamaño máximo de request

# === RATE LIMITING & THROTTLING ===
ENABLE_THROTTLING=true                # Habilitar throttling
THROTTLE_TTL=60000                    # TTL de throttling
THROTTLE_LIMIT=60                     # Límite de throttling
IP_WHITELIST=127.0.0.1,localhost      # IPs en whitelist
```

### **Configuración de Costos**

```env
# === BUDGET MANAGEMENT ===
DAILY_BUDGET=10.00                    # Presupuesto diario ($)
MONTHLY_BUDGET=100.00                 # Presupuesto mensual ($)
COST_ALERT_THRESHOLD=0.80             # Alerta al 80% del presupuesto
ENABLE_COST_TRACKING=true             # Habilitar tracking de costos
COST_PER_REQUEST_LIMIT=0.10           # Límite de costo por request

# === USAGE OPTIMIZATION ===
ENABLE_RESPONSE_CACHING=true          # Cache de respuestas
ENABLE_EMBEDDING_CACHING=true         # Cache de embeddings
OPTIMIZE_TOKEN_USAGE=true             # Optimizar uso de tokens
ENABLE_BATCH_PROCESSING=true          # Procesamiento por lotes
```

## 🔧 Configuración de Componentes

### **Configurador Central**

```typescript
export class AdvancedConfiguration {
  private static instance: AdvancedConfiguration;
  private config: ConfigurationOptions;
  private validators: Map<string, (value: any) => boolean> = new Map();
  
  static getInstance(): AdvancedConfiguration {
    if (!AdvancedConfiguration.instance) {
      AdvancedConfiguration.instance = new AdvancedConfiguration();
    }
    return AdvancedConfiguration.instance;
  }
  
  constructor() {
    this.config = this.loadConfiguration();
    this.setupValidators();
    this.validateConfiguration();
  }
  
  private loadConfiguration(): ConfigurationOptions {
    return {
      // Server Configuration
      server: {
        port: parseInt(process.env.PORT || '3000'),
        host: process.env.HOST || 'localhost',
        environment: (process.env.NODE_ENV || 'development') as 'development' | 'production',
        enableMetrics: process.env.ENABLE_METRICS === 'true',
        logLevel: (process.env.LOG_LEVEL || 'info') as 'debug' | 'info' | 'warn' | 'error'
      },
      
      // OpenAI Configuration
      openai: {
        apiKey: process.env.OPENAI_API_KEY!,
        llmModel: process.env.LLM_MODEL || 'gpt-3.5-turbo',
        embeddingModel: process.env.EMBEDDING_MODEL || 'text-embedding-3-small',
        temperature: parseFloat(process.env.LLM_TEMPERATURE || '0.1'),
        maxTokens: parseInt(process.env.LLM_MAX_TOKENS || '1000'),
        timeout: parseInt(process.env.LLM_TIMEOUT || '30000'),
        maxRetries: parseInt(process.env.LLM_MAX_RETRIES || '3')
      },
      
      // Document Processing
      documents: {
        directory: process.env.DOCS_DIRECTORY || 'docs',
        chunkSize: parseInt(process.env.CHUNK_SIZE || '1000'),
        chunkOverlap: parseInt(process.env.CHUNK_OVERLAP || '200'),
        maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760'),
        supportedExtensions: (process.env.SUPPORTED_EXTENSIONS || '.txt').split(','),
        minLength: parseInt(process.env.MIN_DOCUMENT_LENGTH || '10'),
        maxLength: parseInt(process.env.MAX_DOCUMENT_LENGTH || '10485760')
      },
      
      // Vector Store Configuration
      vectorStore: {
        directory: process.env.VECTORSTORE_DIRECTORY || 'vectorstores',
        retrieverK: parseInt(process.env.RETRIEVER_K || '5'),
        searchType: (process.env.SEARCH_TYPE || 'similarity') as 'similarity' | 'mmr',
        batchSize: parseInt(process.env.EMBEDDING_BATCH_SIZE || '100'),
        cacheSize: parseInt(process.env.VECTORSTORE_CACHE_SIZE || '1000')
      },
      
      // Memory Management
      memory: {
        maxChatHistory: parseInt(process.env.MAX_CHAT_HISTORY || '50'),
        maxContextMessages: parseInt(process.env.MAX_CONTEXT_MESSAGES || '20'),
        maxContextTokens: parseInt(process.env.MAX_CONTEXT_TOKENS || '4000'),
        compressionThreshold: parseInt(process.env.COMPRESSION_THRESHOLD || '50')
      },
      
      // Performance Configuration
      performance: {
        responseCacheDuration: parseInt(process.env.RESPONSE_CACHE_DURATION || '300000'),
        searchCacheDuration: parseInt(process.env.SEARCH_CACHE_DURATION || '600000'),
        concurrentRequests: parseInt(process.env.CONCURRENT_REQUESTS || '10'),
        requestTimeout: parseInt(process.env.REQUEST_TIMEOUT || '30000'),
        enableBatchProcessing: process.env.ENABLE_BATCH_PROCESSING === 'true'
      },
      
      // Security Configuration
      security: {
        enableCors: process.env.ENABLE_CORS === 'true',
        corsOrigin: process.env.CORS_ORIGIN || '*',
        enableApiKey: process.env.ENABLE_API_KEY === 'true',
        apiKey: process.env.API_KEY,
        maxRequestSize: parseInt(process.env.MAX_REQUEST_SIZE || '10485760'),
        enableRequestValidation: process.env.ENABLE_REQUEST_VALIDATION === 'true'
      },
      
      // Budget Management
      budget: {
        dailyBudget: parseFloat(process.env.DAILY_BUDGET || '10.00'),
        monthlyBudget: parseFloat(process.env.MONTHLY_BUDGET || '100.00'),
        alertThreshold: parseFloat(process.env.COST_ALERT_THRESHOLD || '0.80'),
        enableTracking: process.env.ENABLE_COST_TRACKING === 'true',
        costPerRequestLimit: parseFloat(process.env.COST_PER_REQUEST_LIMIT || '0.10')
      }
    };
  }
}

interface ConfigurationOptions {
  server: ServerConfig;
  openai: OpenAIConfig;
  documents: DocumentConfig;
  vectorStore: VectorStoreConfig;
  memory: MemoryConfig;
  performance: PerformanceConfig;
  security: SecurityConfig;
  budget: BudgetConfig;
}
```

### **Configuración de Perfiles**

```typescript
export class ConfigurationProfiles {
  static readonly PROFILES = {
    // Perfil para desarrollo local
    DEVELOPMENT: {
      server: { logLevel: 'debug', enableMetrics: true },
      openai: { temperature: 0.2, maxTokens: 500 },
      performance: { responseCacheDuration: 60000, concurrentRequests: 5 },
      budget: { dailyBudget: 1.00, enableTracking: true },
      security: { enableApiKey: false, enableRequestValidation: false }
    },
    
    // Perfil para producción
    PRODUCTION: {
      server: { logLevel: 'warn', enableMetrics: true },
      openai: { temperature: 0.1, maxTokens: 1000 },
      performance: { responseCacheDuration: 300000, concurrentRequests: 20 },
      budget: { dailyBudget: 50.00, enableTracking: true },
      security: { enableApiKey: true, enableRequestValidation: true }
    },
    
    // Perfil para alto rendimiento
    HIGH_PERFORMANCE: {
      openai: { llmModel: 'gpt-3.5-turbo-16k', maxTokens: 2000 },
      vectorStore: { batchSize: 200, cacheSize: 2000 },
      performance: { 
        responseCacheDuration: 600000, 
        concurrentRequests: 50,
        enableBatchProcessing: true 
      },
      memory: { maxContextMessages: 30, maxContextTokens: 8000 }
    },
    
    // Perfil económico
    BUDGET_CONSCIOUS: {
      openai: { llmModel: 'gpt-3.5-turbo', temperature: 0, maxTokens: 500 },
      performance: { responseCacheDuration: 1800000 }, // 30 minutos
      budget: { dailyBudget: 5.00, costPerRequestLimit: 0.05 },
      vectorStore: { retrieverK: 3 }, // Menos documentos = menos tokens
      memory: { maxContextMessages: 10, maxContextTokens: 2000 }
    }
  };
  
  static applyProfile(profileName: keyof typeof ConfigurationProfiles.PROFILES): void {
    const profile = ConfigurationProfiles.PROFILES[profileName];
    const config = AdvancedConfiguration.getInstance();
    
    console.log(`🔧 Applying configuration profile: ${profileName}`);
    
    // Aplicar configuraciones del perfil
    Object.entries(profile).forEach(([category, settings]) => {
      Object.entries(settings).forEach(([key, value]) => {
        const envKey = `${category.toUpperCase()}_${key.toUpperCase()}`;
        process.env[envKey] = String(value);
      });
    });
    
    // Recargar configuración
    config.reload();
  }
}
```

## 🎯 Configuraciones Específicas por Componente

### **Configuración del Chat Manager**

```typescript
export interface ChatManagerConfig {
  // Configuración de respuestas
  defaultResponseStyle: 'detailed' | 'concise' | 'bullet_points';
  includeSourceCitations: boolean;
  maxSourceDocuments: number;
  
  // Configuración de contexto
  contextStrategy: 'recent' | 'relevant' | 'mixed';
  contextWindowSize: number;
  enableContextCompression: boolean;
  
  // Configuración de memoria
  memoryType: 'buffer' | 'summary' | 'token_buffer';
  memoryRetentionDays: number;
  autoSaveInterval: number;
  
  // Configuración de validación
  enableInputValidation: boolean;
  maxInputLength: number;
  allowedLanguages: string[];
}

export function createChatManagerConfig(): ChatManagerConfig {
  return {
    defaultResponseStyle: (process.env.DEFAULT_RESPONSE_STYLE as any) || 'detailed',
    includeSourceCitations: process.env.INCLUDE_SOURCE_CITATIONS !== 'false',
    maxSourceDocuments: parseInt(process.env.MAX_SOURCE_DOCUMENTS || '5'),
    
    contextStrategy: (process.env.CONTEXT_STRATEGY as any) || 'mixed',
    contextWindowSize: parseInt(process.env.CONTEXT_WINDOW_SIZE || '4000'),
    enableContextCompression: process.env.ENABLE_CONTEXT_COMPRESSION === 'true',
    
    memoryType: (process.env.MEMORY_TYPE as any) || 'buffer',
    memoryRetentionDays: parseInt(process.env.MEMORY_RETENTION_DAYS || '30'),
    autoSaveInterval: parseInt(process.env.AUTO_SAVE_INTERVAL || '60000'),
    
    enableInputValidation: process.env.ENABLE_INPUT_VALIDATION !== 'false',
    maxInputLength: parseInt(process.env.MAX_INPUT_LENGTH || '2000'),
    allowedLanguages: (process.env.ALLOWED_LANGUAGES || 'es,en').split(',')
  };
}
```

### **Configuración del Vector Store**

```typescript
export interface VectorStoreAdvancedConfig {
  // Configuración de índices
  indexType: 'Flat' | 'IVF' | 'HNSW';
  indexParameters: {
    nlist?: number;      // Para IVF
    nprobe?: number;     // Para IVF  
    efConstruction?: number; // Para HNSW
    efSearch?: number;   // Para HNSW
  };
  
  // Configuración de búsqueda
  searchAlgorithm: 'similarity' | 'mmr' | 'similarity_score_threshold';
  scoreThreshold: number;
  lambda: number; // Para MMR
  fetchK: number; // Documentos candidatos
  
  // Configuración de optimización
  enableAutoOptimization: boolean;
  optimizationInterval: number;
  compressionLevel: number;
  enableParallelSearch: boolean;
}

export function createVectorStoreConfig(): VectorStoreAdvancedConfig {
  return {
    indexType: (process.env.VECTOR_INDEX_TYPE as any) || 'Flat',
    indexParameters: {
      nlist: parseInt(process.env.VECTOR_NLIST || '100'),
      nprobe: parseInt(process.env.VECTOR_NPROBE || '10'),
      efConstruction: parseInt(process.env.VECTOR_EF_CONSTRUCTION || '200'),
      efSearch: parseInt(process.env.VECTOR_EF_SEARCH || '50')
    },
    
    searchAlgorithm: (process.env.SEARCH_ALGORITHM as any) || 'similarity',
    scoreThreshold: parseFloat(process.env.SCORE_THRESHOLD || '0.7'),
    lambda: parseFloat(process.env.MMR_LAMBDA || '0.5'),
    fetchK: parseInt(process.env.FETCH_K || '15'),
    
    enableAutoOptimization: process.env.ENABLE_AUTO_OPTIMIZATION === 'true',
    optimizationInterval: parseInt(process.env.OPTIMIZATION_INTERVAL || '3600000'), // 1 hora
    compressionLevel: parseInt(process.env.COMPRESSION_LEVEL || '1'),
    enableParallelSearch: process.env.ENABLE_PARALLEL_SEARCH === 'true'
  };
}
```

## 🔐 Configuración de Seguridad Avanzada

### **Sistema de Autenticación**

```typescript
export interface AuthConfig {
  // Configuración básica
  enableAuth: boolean;
  authMethod: 'api_key' | 'jwt' | 'oauth' | 'basic';
  
  // Configuración de API Keys
  apiKeys: string[];
  apiKeyHeader: string;
  enableApiKeyRotation: boolean;
  
  // Configuración JWT
  jwtSecret: string;
  jwtExpiration: string;
  enableRefreshTokens: boolean;
  
  // Configuración de rate limiting
  enableRateLimit: boolean;
  rateLimitWindow: number;
  rateLimitMax: number;
  rateLimitKeyGenerator: 'ip' | 'user' | 'api_key';
}

export class SecurityManager {
  private config: AuthConfig;
  
  constructor() {
    this.config = {
      enableAuth: process.env.ENABLE_AUTH === 'true',
      authMethod: (process.env.AUTH_METHOD as any) || 'api_key',
      
      apiKeys: (process.env.API_KEYS || '').split(',').filter(Boolean),
      apiKeyHeader: process.env.API_KEY_HEADER || 'X-API-Key',
      enableApiKeyRotation: process.env.ENABLE_API_KEY_ROTATION === 'true',
      
      jwtSecret: process.env.JWT_SECRET || 'your-secret-key',
      jwtExpiration: process.env.JWT_EXPIRATION || '24h',
      enableRefreshTokens: process.env.ENABLE_REFRESH_TOKENS === 'true',
      
      enableRateLimit: process.env.ENABLE_RATE_LIMIT === 'true',
      rateLimitWindow: parseInt(process.env.RATE_LIMIT_WINDOW || '900000'),
      rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || '100'),
      rateLimitKeyGenerator: (process.env.RATE_LIMIT_KEY_GENERATOR as any) || 'ip'
    };
  }
  
  validateApiKey(providedKey: string): boolean {
    if (!this.config.enableAuth) return true;
    if (this.config.authMethod !== 'api_key') return false;
    
    return this.config.apiKeys.includes(providedKey);
  }
  
  generateSecurityHeaders(): Record<string, string> {
    return {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
      'Content-Security-Policy': "default-src 'self'",
      'Referrer-Policy': 'strict-origin-when-cross-origin'
    };
  }
}
```

## 📊 Configuración de Monitoreo

### **Sistema de Métricas Avanzado**

```typescript
export interface MonitoringConfig {
  // Configuración general
  enableMonitoring: boolean;
  metricsInterval: number;
  retentionPeriod: number;
  
  // Métricas específicas
  trackPerformance: boolean;
  trackUsage: boolean;
  trackErrors: boolean;
  trackCosts: boolean;
  
  // Alertas
  enableAlerts: boolean;
  alertThresholds: {
    responseTime: number;
    errorRate: number;
    costPerHour: number;
    memoryUsage: number;
  };
  
  // Exportación
  exportFormat: 'json' | 'csv' | 'prometheus';
  exportInterval: number;
  exportDestination: string;
}

export class MonitoringManager {
  private config: MonitoringConfig;
  private metrics: Map<string, any> = new Map();
  
  constructor() {
    this.config = {
      enableMonitoring: process.env.ENABLE_MONITORING === 'true',
      metricsInterval: parseInt(process.env.METRICS_INTERVAL || '60000'),
      retentionPeriod: parseInt(process.env.METRICS_RETENTION || '2592000000'), // 30 días
      
      trackPerformance: process.env.TRACK_PERFORMANCE === 'true',
      trackUsage: process.env.TRACK_USAGE === 'true',
      trackErrors: process.env.TRACK_ERRORS === 'true',
      trackCosts: process.env.TRACK_COSTS === 'true',
      
      enableAlerts: process.env.ENABLE_ALERTS === 'true',
      alertThresholds: {
        responseTime: parseInt(process.env.ALERT_RESPONSE_TIME || '5000'),
        errorRate: parseFloat(process.env.ALERT_ERROR_RATE || '0.05'),
        costPerHour: parseFloat(process.env.ALERT_COST_PER_HOUR || '1.00'),
        memoryUsage: parseFloat(process.env.ALERT_MEMORY_USAGE || '0.80')
      },
      
      exportFormat: (process.env.METRICS_EXPORT_FORMAT as any) || 'json',
      exportInterval: parseInt(process.env.METRICS_EXPORT_INTERVAL || '3600000'),
      exportDestination: process.env.METRICS_EXPORT_DESTINATION || './metrics'
    };
  }
  
  recordMetric(name: string, value: any, tags: Record<string, string> = {}): void {
    if (!this.config.enableMonitoring) return;
    
    const timestamp = new Date();
    const metricKey = `${name}_${timestamp.getTime()}`;
    
    this.metrics.set(metricKey, {
      name,
      value,
      tags,
      timestamp
    });
    
    // Limpiar métricas antiguas
    this.cleanupOldMetrics();
  }
  
  private cleanupOldMetrics(): void {
    const cutoff = Date.now() - this.config.retentionPeriod;
    
    for (const [key, metric] of this.metrics) {
      if (metric.timestamp.getTime() < cutoff) {
        this.metrics.delete(key);
      }
    }
  }
}
```

## 🏗️ Configuración de Despliegue

### **Configuraciones por Entorno**

```typescript
export const ENVIRONMENT_CONFIGS = {
  development: {
    database: {
      host: 'localhost',
      port: 5432,
      ssl: false
    },
    cache: {
      enabled: false,
      ttl: 300
    },
    logging: {
      level: 'debug',
      enableConsole: true,
      enableFile: false
    }
  },
  
  staging: {
    database: {
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || '5432'),
      ssl: true
    },
    cache: {
      enabled: true,
      ttl: 600,
      redis: {
        host: process.env.REDIS_HOST,
        port: parseInt(process.env.REDIS_PORT || '6379')
      }
    },
    logging: {
      level: 'info',
      enableConsole: false,
      enableFile: true,
      enableElastic: true
    }
  },
  
  production: {
    database: {
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || '5432'),
      ssl: true,
      poolSize: 20
    },
    cache: {
      enabled: true,
      ttl: 1800,
      redis: {
        host: process.env.REDIS_HOST,
        port: parseInt(process.env.REDIS_PORT || '6379'),
        cluster: true
      }
    },
    logging: {
      level: 'warn',
      enableConsole: false,
      enableFile: true,
      enableElastic: true,
      enableSentry: true
    }
  }
};
```

---

**Siguiente**: [Guía de Desarrollo y Contribución](14-desarrollo-contribucion.md)  
**Anterior**: [Documentación de Agentes LangChain](12-agentes.md) 