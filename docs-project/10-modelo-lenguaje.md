# Configuración del Modelo de Lenguaje - LangChain Document Chat

## 🤖 Introducción al Sistema de IA

El sistema utiliza **OpenAI GPT** como modelo de lenguaje principal para generar respuestas contextuales basadas en documentos. Este módulo maneja la configuración, optimización y gestión del modelo de IA, proporcionando respuestas coherentes y precisas mediante técnicas de **Retrieval-Augmented Generation (RAG)**.

## 🏗️ Arquitectura del Modelo

### **Flujo de Generación de Respuestas**

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  Pregunta   │───▶│   Retrieval │───▶│ Contexto +  │───▶│   OpenAI    │
│   Usuario   │    │ (Vectorial) │    │  Pregunta   │    │ GPT Model   │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
                                             │                   │
                   ┌─────────────┐           │                   │
                   │  Documento  │───────────┘                   │
                   │  Relevante  │                               │
                   └─────────────┘                               │
                                                                 │
                   ┌─────────────┐    ┌─────────────┐            │
                   │  Respuesta  │◀───│  Generación │◀───────────┘
                   │  Coherente  │    │    (RAG)    │
                   └─────────────┘    └─────────────┘
```

### **Componentes del Sistema de IA**

1. **OpenAI Chat Model**: Modelo principal de generación
2. **Prompt Templates**: Plantillas estructuradas para contexto
3. **Chain Manager**: Orquestador de la cadena RAG
4. **Response Formatter**: Formateador de respuestas
5. **Token Manager**: Gestor de tokens y costos

## ⚙️ Configuración del Modelo OpenAI

### **Configuración Básica**

```typescript
export function createChatModel(): ChatOpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY environment variable is required');
  }
  
  const modelName = process.env.LLM_MODEL || 'gpt-3.5-turbo';
  
  // Validar modelo disponible
  validateModelName(modelName);
  
  return new ChatOpenAI({
    openAIApiKey: apiKey,
    modelName,
    temperature: parseFloat(process.env.LLM_TEMPERATURE || '0.1'),
    maxTokens: parseInt(process.env.LLM_MAX_TOKENS || '1000'),
    topP: parseFloat(process.env.LLM_TOP_P || '1'),
    frequencyPenalty: parseFloat(process.env.LLM_FREQUENCY_PENALTY || '0'),
    presencePenalty: parseFloat(process.env.LLM_PRESENCE_PENALTY || '0'),
    timeout: parseInt(process.env.LLM_TIMEOUT || '30000'),
    maxRetries: parseInt(process.env.LLM_MAX_RETRIES || '3'),
    streaming: process.env.LLM_STREAMING === 'true',
  });
}
```

### **Modelos Disponibles y Especificaciones**

```typescript
interface ModelSpecifications {
  name: string;
  maxTokens: number;
  costPer1KTokens: {
    input: number;
    output: number;
  };
  contextWindow: number;
  capabilities: string[];
  bestFor: string[];
}

const AVAILABLE_MODELS: Record<string, ModelSpecifications> = {
  'gpt-3.5-turbo': {
    name: 'GPT-3.5 Turbo',
    maxTokens: 4096,
    costPer1KTokens: { input: 0.0005, output: 0.0015 },
    contextWindow: 16385,
    capabilities: ['Chat', 'Text completion', 'Code generation'],
    bestFor: ['Conversaciones rápidas', 'Análisis de documentos básicos', 'Respuestas directas']
  },
  'gpt-3.5-turbo-16k': {
    name: 'GPT-3.5 Turbo 16K',
    maxTokens: 16384,
    costPer1KTokens: { input: 0.003, output: 0.004 },
    contextWindow: 16385,
    capabilities: ['Chat', 'Long context', 'Document analysis'],
    bestFor: ['Documentos largos', 'Análisis extensos', 'Contexto amplio']
  },
  'gpt-4': {
    name: 'GPT-4',
    maxTokens: 8192,
    costPer1KTokens: { input: 0.03, output: 0.06 },
    contextWindow: 8192,
    capabilities: ['Advanced reasoning', 'Complex analysis', 'High accuracy'],
    bestFor: ['Análisis complejos', 'Razonamiento avanzado', 'Máxima calidad']
  },
  'gpt-4-turbo': {
    name: 'GPT-4 Turbo',
    maxTokens: 4096,
    costPer1KTokens: { input: 0.01, output: 0.03 },
    contextWindow: 128000,
    capabilities: ['Very long context', 'Advanced reasoning', 'Latest knowledge'],
    bestFor: ['Documentos muy largos', 'Análisis profundos', 'Contexto masivo']
  }
};

function validateModelName(modelName: string): void {
  if (!AVAILABLE_MODELS[modelName]) {
    const availableModels = Object.keys(AVAILABLE_MODELS).join(', ');
    throw new Error(`Invalid model: ${modelName}. Available models: ${availableModels}`);
  }
}

export function getModelInfo(modelName?: string): ModelSpecifications {
  const model = modelName || process.env.LLM_MODEL || 'gpt-3.5-turbo';
  return AVAILABLE_MODELS[model];
}
```

### **Configuración Avanzada de Parámetros**

```typescript
export interface AdvancedModelConfig {
  // Parámetros de generación
  temperature: number;      // 0.0 - 2.0 (creatividad)
  maxTokens: number;        // Máximo de tokens de salida
  topP: number;            // 0.0 - 1.0 (nucleus sampling)
  frequencyPenalty: number; // -2.0 - 2.0 (repetición)
  presencePenalty: number; // -2.0 - 2.0 (temas nuevos)
  
  // Parámetros de conexión
  timeout: number;         // Timeout en millisegundos
  maxRetries: number;      // Número de reintentos
  streaming: boolean;      // Respuesta streaming
  
  // Parámetros de costo
  maxCostPerRequest: number; // Límite de costo por request
  budgetAlert: number;     // Alerta de presupuesto
}

export function createAdvancedChatModel(config: Partial<AdvancedModelConfig> = {}): ChatOpenAI {
  const defaultConfig: AdvancedModelConfig = {
    temperature: 0.1,      // Respuestas consistentes para documentos
    maxTokens: 1000,       // Respuestas moderadamente largas
    topP: 1,              // Usar toda la distribución
    frequencyPenalty: 0,   // Sin penalización por repetición
    presencePenalty: 0.1,  // Ligera variación de temas
    timeout: 30000,        // 30 segundos
    maxRetries: 3,         // 3 reintentos
    streaming: false,      // Sin streaming por defecto
    maxCostPerRequest: 0.10, // $0.10 por request máximo
    budgetAlert: 5.00      // Alerta a $5.00
  };
  
  const finalConfig = { ...defaultConfig, ...config };
  
  // Calcular costo estimado
  const model = getModelInfo();
  const estimatedCost = calculateEstimatedCost(finalConfig.maxTokens, model);
  
  if (estimatedCost > finalConfig.maxCostPerRequest) {
    console.warn(`⚠️ Estimated cost ${estimatedCost.toFixed(4)} exceeds limit ${finalConfig.maxCostPerRequest.toFixed(4)}`);
  }
  
  return new ChatOpenAI({
    openAIApiKey: process.env.OPENAI_API_KEY!,
    modelName: process.env.LLM_MODEL || 'gpt-3.5-turbo',
    temperature: finalConfig.temperature,
    maxTokens: finalConfig.maxTokens,
    topP: finalConfig.topP,
    frequencyPenalty: finalConfig.frequencyPenalty,
    presencePenalty: finalConfig.presencePenalty,
    timeout: finalConfig.timeout,
    maxRetries: finalConfig.maxRetries,
    streaming: finalConfig.streaming,
  });
}
```

## 📝 Sistema de Prompts

### **Prompt Templates Estructurados**

```typescript
export const PROMPT_TEMPLATES = {
  // Prompt principal para RAG
  RAG_SYSTEM: `Eres un asistente AI especializado en analizar documentos y proporcionar respuestas precisas basadas en el contexto proporcionado.

INSTRUCCIONES:
1. Utiliza ÚNICAMENTE la información del contexto proporcionado
2. Si la información no está en el contexto, indica claramente que no tienes esa información
3. Proporciona respuestas claras, estructuradas y útiles
4. Cita fragmentos relevantes del contexto cuando sea apropiado
5. Mantén un tono profesional y servicial

CONTEXTO:
{context}

PREGUNTA: {question}

RESPUESTA:`,

  // Prompt para análisis de documentos específicos
  DOCUMENT_ANALYSIS: `Analiza el siguiente documento y responde la pregunta específica:

DOCUMENTO: {document_name}
CONTENIDO:
{context}

PREGUNTA: {question}

Proporciona una respuesta detallada basada únicamente en el contenido del documento.`,

  // Prompt para búsquedas generales
  GENERAL_SEARCH: `Basándote en la siguiente información de múltiples documentos, responde la pregunta:

INFORMACIÓN RELEVANTE:
{context}

PREGUNTA: {question}

Proporciona una respuesta completa integrando la información de los diferentes fragmentos.`,

  // Prompt para resúmenes
  SUMMARIZATION: `Resume la información más importante sobre el tema solicitado:

INFORMACIÓN:
{context}

TEMA: {question}

Proporciona un resumen claro y estructurado con los puntos más relevantes.`
};

export function createPromptTemplate(templateName: keyof typeof PROMPT_TEMPLATES): PromptTemplate {
  const template = PROMPT_TEMPLATES[templateName];
  
  return PromptTemplate.fromTemplate(template);
}
```

### **Prompt Dinámico Basado en Contexto**

```typescript
export function createContextualPrompt(
  query: string,
  documents: Document[],
  options: {
    documentSpecific?: boolean;
    includeMetadata?: boolean;
    maxContextLength?: number;
    responseStyle?: 'detailed' | 'concise' | 'bullet_points';
  } = {}
): string {
  
  const { documentSpecific = false, includeMetadata = true, maxContextLength = 3000, responseStyle = 'detailed' } = options;
  
  // Preparar contexto
  let context = '';
  let usedLength = 0;
  
  for (const doc of documents) {
    const docText = doc.pageContent;
    const metadata = includeMetadata ? `[Fuente: ${doc.metadata.source || 'Desconocida'}]\n` : '';
    const fullText = metadata + docText + '\n\n---\n\n';
    
    if (usedLength + fullText.length > maxContextLength) {
      // Truncar si es necesario
      const remainingSpace = maxContextLength - usedLength;
      if (remainingSpace > 100) { // Solo agregar si hay espacio significativo
        context += metadata + docText.substring(0, remainingSpace - metadata.length - 20) + '...\n\n---\n\n';
      }
      break;
    }
    
    context += fullText;
    usedLength += fullText.length;
  }
  
  // Seleccionar template base
  let baseTemplate = documentSpecific ? PROMPT_TEMPLATES.DOCUMENT_ANALYSIS : PROMPT_TEMPLATES.RAG_SYSTEM;
  
  // Personalizar según el estilo de respuesta
  let styleInstructions = '';
  switch (responseStyle) {
    case 'concise':
      styleInstructions = 'IMPORTANTE: Proporciona una respuesta concisa y directa, máximo 2-3 párrafos.\n\n';
      break;
    case 'bullet_points':
      styleInstructions = 'IMPORTANTE: Estructura tu respuesta en puntos o viñetas para mayor claridad.\n\n';
      break;
    case 'detailed':
      styleInstructions = 'IMPORTANTE: Proporciona una respuesta detallada y completa.\n\n';
      break;
  }
  
  // Construir prompt final
  const prompt = styleInstructions + baseTemplate
    .replace('{context}', context)
    .replace('{question}', query)
    .replace('{document_name}', documents[0]?.metadata?.source || 'Múltiples documentos');
  
  return prompt;
}
```

## 🔗 Chain Management - Gestión de Cadenas

### **RAG Chain Principal**

```typescript
export class RAGChain {
  private llm: ChatOpenAI;
  private vectorStoreManager: VectorStoreManager;
  private promptTemplate: PromptTemplate;
  
  constructor(llm: ChatOpenAI, vectorStoreManager: VectorStoreManager) {
    this.llm = llm;
    this.vectorStoreManager = vectorStoreManager;
    this.promptTemplate = createPromptTemplate('RAG_SYSTEM');
  }
  
  async query(
    question: string,
    vectorStore: string = 'combined',
    options: {
      maxDocuments?: number;
      responseStyle?: 'detailed' | 'concise' | 'bullet_points';
      includeMetadata?: boolean;
    } = {}
  ): Promise<{
    answer: string;
    sourceDocuments: Document[];
    metadata: {
      tokensUsed: number;
      cost: number;
      responseTime: number;
      model: string;
    };
  }> {
    
    const startTime = Date.now();
    
    try {
      // 1. Obtener documentos relevantes
      console.log(`🔍 Searching for relevant documents in '${vectorStore}'`);
      const retriever = this.vectorStoreManager.getRetriever(vectorStore);
      const maxDocs = options.maxDocuments || parseInt(process.env.RETRIEVER_K || '5');
      
      const relevantDocs = await retriever.getRelevantDocuments(question);
      const limitedDocs = relevantDocs.slice(0, maxDocs);
      
      if (limitedDocs.length === 0) {
        return {
          answer: "No encontré información relevante en los documentos para responder tu pregunta.",
          sourceDocuments: [],
          metadata: {
            tokensUsed: 0,
            cost: 0,
            responseTime: Date.now() - startTime,
            model: this.llm.modelName
          }
        };
      }
      
      console.log(`📚 Found ${limitedDocs.length} relevant documents`);
      
      // 2. Crear prompt contextual
      const contextualPrompt = createContextualPrompt(question, limitedDocs, {
        includeMetadata: options.includeMetadata !== false,
        responseStyle: options.responseStyle || 'detailed'
      });
      
      // 3. Generar respuesta
      console.log(`🤖 Generating response with ${this.llm.modelName}`);
      const response = await this.llm.call([
        new HumanMessage(contextualPrompt)
      ]);
      
      // 4. Calcular métricas
      const responseTime = Date.now() - startTime;
      const tokensUsed = this.estimateTokens(contextualPrompt, response.content);
      const cost = this.calculateCost(tokensUsed);
      
      console.log(`✅ Response generated in ${responseTime}ms (${tokensUsed} tokens, $${cost.toFixed(4)})`);
      
      return {
        answer: response.content,
        sourceDocuments: limitedDocs,
        metadata: {
          tokensUsed,
          cost,
          responseTime,
          model: this.llm.modelName
        }
      };
      
    } catch (error) {
      console.error('Error in RAG chain:', error);
      throw new Error(`Failed to process query: ${error.message}`);
    }
  }
  
  private estimateTokens(prompt: string, response: string): number {
    // Estimación aproximada: 1 token ≈ 4 caracteres para inglés, 3 para español
    const totalChars = prompt.length + response.length;
    return Math.ceil(totalChars / 3.5); // Promedio ajustado para español
  }
  
  private calculateCost(tokens: number): number {
    const model = getModelInfo(this.llm.modelName);
    // Asumimos una distribución 60% input, 40% output
    const inputTokens = Math.ceil(tokens * 0.6);
    const outputTokens = Math.ceil(tokens * 0.4);
    
    return (inputTokens / 1000 * model.costPer1KTokens.input) + 
           (outputTokens / 1000 * model.costPer1KTokens.output);
  }
}
```

### **Streaming Response Chain**

```typescript
export class StreamingRAGChain extends RAGChain {
  async streamQuery(
    question: string,
    vectorStore: string = 'combined',
    onToken: (token: string) => void,
    options: any = {}
  ): Promise<void> {
    
    const retriever = this.vectorStoreManager.getRetriever(vectorStore);
    const relevantDocs = await retriever.getRelevantDocuments(question);
    
    if (relevantDocs.length === 0) {
      onToken("No encontré información relevante en los documentos para responder tu pregunta.");
      return;
    }
    
    const contextualPrompt = createContextualPrompt(question, relevantDocs, options);
    
    // Configurar modelo para streaming
    const streamingLLM = new ChatOpenAI({
      ...this.llm,
      streaming: true,
      callbacks: [
        {
          handleLLMNewToken(token: string) {
            onToken(token);
          },
        },
      ],
    });
    
    await streamingLLM.call([new HumanMessage(contextualPrompt)]);
  }
}
```

## 💰 Gestión de Costos y Tokens

### **Token Counter y Cost Tracker**

```typescript
export class TokenManager {
  private static instance: TokenManager;
  private usage: Map<string, UsageRecord> = new Map();
  private dailyBudget: number = parseFloat(process.env.DAILY_BUDGET || '10.00');
  private monthlyBudget: number = parseFloat(process.env.MONTHLY_BUDGET || '100.00');
  
  static getInstance(): TokenManager {
    if (!TokenManager.instance) {
      TokenManager.instance = new TokenManager();
    }
    return TokenManager.instance;
  }
  
  recordUsage(
    model: string,
    inputTokens: number,
    outputTokens: number,
    cost: number,
    requestId?: string
  ): void {
    const record: UsageRecord = {
      model,
      inputTokens,
      outputTokens,
      totalTokens: inputTokens + outputTokens,
      cost,
      timestamp: new Date(),
      requestId: requestId || this.generateRequestId()
    };
    
    this.usage.set(record.requestId, record);
    
    // Verificar límites
    this.checkBudgetLimits();
    
    console.log(`💰 Usage recorded: ${record.totalTokens} tokens, $${cost.toFixed(4)} (${model})`);
  }
  
  getDailyUsage(): UsageSummary {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return this.getUsageInPeriod(today, new Date());
  }
  
  getMonthlyUsage(): UsageSummary {
    const firstDayOfMonth = new Date();
    firstDayOfMonth.setDate(1);
    firstDayOfMonth.setHours(0, 0, 0, 0);
    
    return this.getUsageInPeriod(firstDayOfMonth, new Date());
  }
  
  private getUsageInPeriod(start: Date, end: Date): UsageSummary {
    const records = Array.from(this.usage.values())
      .filter(record => record.timestamp >= start && record.timestamp <= end);
    
    const totalTokens = records.reduce((sum, record) => sum + record.totalTokens, 0);
    const totalCost = records.reduce((sum, record) => sum + record.cost, 0);
    const requestCount = records.length;
    
    const modelUsage = records.reduce((acc, record) => {
      if (!acc[record.model]) {
        acc[record.model] = { tokens: 0, cost: 0, requests: 0 };
      }
      acc[record.model].tokens += record.totalTokens;
      acc[record.model].cost += record.cost;
      acc[record.model].requests += 1;
      return acc;
    }, {} as Record<string, { tokens: number; cost: number; requests: number }>);
    
    return {
      totalTokens,
      totalCost,
      requestCount,
      modelUsage,
      period: { start, end },
      averageCostPerRequest: requestCount > 0 ? totalCost / requestCount : 0,
      averageTokensPerRequest: requestCount > 0 ? totalTokens / requestCount : 0
    };
  }
  
  private checkBudgetLimits(): void {
    const dailyUsage = this.getDailyUsage();
    const monthlyUsage = this.getMonthlyUsage();
    
    // Alertas por porcentaje de presupuesto
    if (dailyUsage.totalCost > this.dailyBudget * 0.8) {
      console.warn(`⚠️ Daily budget at ${(dailyUsage.totalCost / this.dailyBudget * 100).toFixed(1)}%`);
    }
    
    if (monthlyUsage.totalCost > this.monthlyBudget * 0.8) {
      console.warn(`⚠️ Monthly budget at ${(monthlyUsage.totalCost / this.monthlyBudget * 100).toFixed(1)}%`);
    }
    
    // Límites duros
    if (dailyUsage.totalCost >= this.dailyBudget) {
      throw new Error(`Daily budget limit reached: $${this.dailyBudget}`);
    }
    
    if (monthlyUsage.totalCost >= this.monthlyBudget) {
      throw new Error(`Monthly budget limit reached: $${this.monthlyBudget}`);
    }
  }
  
  generateUsageReport(): string {
    const daily = this.getDailyUsage();
    const monthly = this.getMonthlyUsage();
    
    return `💰 Token Usage Report
    
📅 Today:
  - Requests: ${daily.requestCount}
  - Tokens: ${daily.totalTokens.toLocaleString()}
  - Cost: $${daily.totalCost.toFixed(4)}
  - Budget used: ${(daily.totalCost / this.dailyBudget * 100).toFixed(1)}%
  
📊 This Month:
  - Requests: ${monthly.requestCount}
  - Tokens: ${monthly.totalTokens.toLocaleString()}
  - Cost: $${monthly.totalCost.toFixed(4)}
  - Budget used: ${(monthly.totalCost / this.monthlyBudget * 100).toFixed(1)}%
  
📈 Averages:
  - Cost per request: $${daily.averageCostPerRequest.toFixed(4)}
  - Tokens per request: ${Math.round(daily.averageTokensPerRequest)}
  
🤖 Models Used:
${Object.entries(daily.modelUsage).map(([model, usage]) => 
  `  - ${model}: ${usage.requests} requests, $${usage.cost.toFixed(4)}`
).join('\n')}`;
  }
  
  private generateRequestId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
}

interface UsageRecord {
  model: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  cost: number;
  timestamp: Date;
  requestId: string;
}

interface UsageSummary {
  totalTokens: number;
  totalCost: number;
  requestCount: number;
  modelUsage: Record<string, { tokens: number; cost: number; requests: number }>;
  period: { start: Date; end: Date };
  averageCostPerRequest: number;
  averageTokensPerRequest: number;
}
```

## 🛠️ Optimizaciones y Best Practices

### **Configuración Optimizada por Caso de Uso**

```typescript
export const OPTIMIZED_CONFIGS = {
  // Para consultas rápidas y directas
  QUICK_ANSWERS: {
    model: 'gpt-3.5-turbo',
    temperature: 0.1,
    maxTokens: 300,
    topP: 0.9,
    presencePenalty: 0,
    frequencyPenalty: 0.1
  },
  
  // Para análisis detallados
  DETAILED_ANALYSIS: {
    model: 'gpt-4',
    temperature: 0.2,
    maxTokens: 1500,
    topP: 1,
    presencePenalty: 0.1,
    frequencyPenalty: 0
  },
  
  // Para documentos largos (económico)
  BULK_PROCESSING: {
    model: 'gpt-3.5-turbo-16k',
    temperature: 0,
    maxTokens: 800,
    topP: 0.8,
    presencePenalty: 0,
    frequencyPenalty: 0.2
  },
  
  // Para respuestas creativas
  CREATIVE_RESPONSES: {
    model: 'gpt-4',
    temperature: 0.7,
    maxTokens: 1000,
    topP: 0.9,
    presencePenalty: 0.3,
    frequencyPenalty: 0.3
  }
};

export function createOptimizedModel(useCase: keyof typeof OPTIMIZED_CONFIGS): ChatOpenAI {
  const config = OPTIMIZED_CONFIGS[useCase];
  
  return new ChatOpenAI({
    openAIApiKey: process.env.OPENAI_API_KEY!,
    modelName: config.model,
    temperature: config.temperature,
    maxTokens: config.maxTokens,
    topP: config.topP,
    presencePenalty: config.presencePenalty,
    frequencyPenalty: config.frequencyPenalty,
    timeout: 30000,
    maxRetries: 3,
  });
}
```

### **Caché de Respuestas**

```typescript
export class ResponseCache {
  private cache: Map<string, CachedResponse> = new Map();
  private readonly CACHE_DURATION = parseInt(process.env.RESPONSE_CACHE_DURATION || '300000'); // 5 minutos
  
  private generateKey(query: string, vectorStore: string, model: string): string {
    // Normalizar la consulta para mejorar hit rate
    const normalizedQuery = query.toLowerCase().trim().replace(/\s+/g, ' ');
    return `${vectorStore}:${model}:${normalizedQuery}`;
  }
  
  get(query: string, vectorStore: string, model: string): string | null {
    const key = this.generateKey(query, vectorStore, model);
    const cached = this.cache.get(key);
    
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      console.log(`💾 Cache hit for query: ${query.substring(0, 30)}...`);
      return cached.response;
    }
    
    // Limpiar entrada expirada
    if (cached) {
      this.cache.delete(key);
    }
    
    return null;
  }
  
  set(query: string, vectorStore: string, model: string, response: string): void {
    const key = this.generateKey(query, vectorStore, model);
    this.cache.set(key, {
      response,
      timestamp: Date.now()
    });
    
    // Limpiar cache antiguo periódicamente
    if (this.cache.size % 50 === 0) {
      this.cleanup();
    }
  }
  
  private cleanup(): void {
    const now = Date.now();
    let removedCount = 0;
    
    for (const [key, entry] of this.cache) {
      if (now - entry.timestamp > this.CACHE_DURATION) {
        this.cache.delete(key);
        removedCount++;
      }
    }
    
    if (removedCount > 0) {
      console.log(`🧹 Cleaned ${removedCount} expired cache entries`);
    }
  }
}

interface CachedResponse {
  response: string;
  timestamp: number;
}
```

---

**Siguiente**: [Sistema de Historial de Conversaciones](11-chat-history.md)  
**Anterior**: [Gestión de Almacenes Vectoriales](09-vectorstores.md) 