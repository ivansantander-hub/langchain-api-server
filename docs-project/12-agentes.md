# Documentación de Agentes LangChain - LangChain Document Chat

## 🤖 Introducción a los Agentes LangChain

Los **agentes LangChain** son sistemas inteligentes que pueden **razonar** sobre qué acciones tomar y en qué orden, utilizando un modelo de lenguaje como motor de razonamiento. A diferencia de las cadenas secuenciales, los agentes pueden tomar decisiones dinámicas basadas en la entrada del usuario y el contexto actual.

## 🏗️ Arquitectura de Agentes

### **Componentes Principales**

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Usuario   │───▶│   Agente    │───▶│Herramientas │───▶│  Respuesta  │
│  (Entrada)  │    │    LLM      │    │   (Tools)   │    │   Final     │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
                            │                   │                   │
                            ▼                   ▼                   ▼
                    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
                    │   Memory    │    │  Executor   │    │   Estado    │
                    │ (Historial) │    │ (Decisión)  │    │  (Tracking) │
                    └─────────────┘    └─────────────┘    └─────────────┘
```

### **Flujo de Procesamiento**

1. **Input Processing**: El agente recibe la consulta del usuario
2. **Reasoning**: El LLM analiza qué herramientas necesita usar
3. **Tool Selection**: Selecciona y ejecuta herramientas específicas
4. **Result Integration**: Integra los resultados de las herramientas
5. **Response Generation**: Genera la respuesta final al usuario

## 🛠️ Tipos de Agentes Disponibles

### **Zero-Shot React Agent**

Agente que puede usar herramientas basándose únicamente en la descripción de la herramienta.

```typescript
export function createZeroShotAgent(
  llm: ChatOpenAI,
  tools: Tool[]
): AgentExecutor {
  
  const agent = createReactAgent({
    llm,
    tools,
    prompt: createReactPrompt(tools)
  });
  
  return new AgentExecutor({
    agent,
    tools,
    verbose: process.env.AGENT_VERBOSE === 'true',
    maxIterations: parseInt(process.env.AGENT_MAX_ITERATIONS || '5'),
    returnIntermediateSteps: true,
    handleParsingErrors: true
  });
}

function createReactPrompt(tools: Tool[]): ChatPromptTemplate {
  const toolNames = tools.map(tool => tool.name).join(', ');
  const toolDescriptions = tools.map(tool => 
    `${tool.name}: ${tool.description}`
  ).join('\n');

  return ChatPromptTemplate.fromTemplate(`
Eres un asistente especializado en análisis de documentos. Tienes acceso a las siguientes herramientas:

{tool_descriptions}

Usa este formato para responder:

Pregunta: la pregunta de entrada que debes responder
Pensamiento: siempre debes pensar sobre qué hacer
Acción: la acción a tomar, debe ser una de [{tool_names}]
Entrada de Acción: la entrada para la acción
Observación: el resultado de la acción
... (este proceso de Pensamiento/Acción/Entrada de Acción/Observación puede repetirse N veces)
Pensamiento: Ahora sé la respuesta final
Respuesta Final: la respuesta final a la pregunta original

Pregunta: {input}
Pensamiento: {agent_scratchpad}
`);
}
```

### **Conversational Agent**

Agente optimizado para conversaciones con memoria.

```typescript
export class ConversationalDocumentAgent {
  private executor: AgentExecutor;
  private memory: ConversationBufferMemory;
  
  constructor(
    llm: ChatOpenAI,
    tools: Tool[],
    vectorStoreManager: VectorStoreManager
  ) {
    this.memory = new ConversationBufferMemory({
      memoryKey: "chat_history",
      returnMessages: true,
      outputKey: "output"
    });
    
    const conversationalTools = [
      ...tools,
      new DocumentSearchTool(vectorStoreManager),
      new DocumentSummaryTool(llm),
      new ConversationMemoryTool(this.memory)
    ];
    
    this.executor = this.createConversationalExecutor(llm, conversationalTools);
  }
  
  private createConversationalExecutor(
    llm: ChatOpenAI, 
    tools: Tool[]
  ): AgentExecutor {
    
    const prompt = ChatPromptTemplate.fromMessages([
      ["system", `Eres un asistente especializado en análisis de documentos con capacidades conversacionales.

Tienes acceso a las siguientes herramientas:
{tools}

Usa las herramientas cuando sea necesario para proporcionar respuestas precisas basadas en documentos.

Formato de respuesta:
- Si necesitas usar una herramienta, hazlo antes de responder
- Proporciona respuestas conversacionales y naturales
- Mantén el contexto de la conversación anterior
- Cita fuentes cuando uses información de documentos`],
      
      new MessagesPlaceholder("chat_history"),
      ["human", "{input}"],
      new MessagesPlaceholder("agent_scratchpad")
    ]);
    
    const agent = createOpenAIFunctionsAgent({
      llm,
      tools,
      prompt
    });
    
    return new AgentExecutor({
      agent,
      tools,
      memory: this.memory,
      verbose: true,
      maxIterations: 3,
      returnIntermediateSteps: false
    });
  }
  
  async chat(message: string): Promise<string> {
    try {
      const result = await this.executor.invoke({
        input: message
      });
      
      return result.output;
    } catch (error) {
      console.error('Error in conversational agent:', error);
      return 'Lo siento, hubo un error procesando tu consulta. ¿Podrías intentar reformularla?';
    }
  }
}
```

## 🔧 Herramientas Personalizadas

### **Document Search Tool**

```typescript
export class DocumentSearchTool extends Tool {
  name = "document_search";
  description = "Busca información específica en documentos cargados. Útil para encontrar información exacta sobre temas específicos.";
  
  constructor(private vectorStoreManager: VectorStoreManager) {
    super();
  }
  
  async _call(query: string): Promise<string> {
    try {
      console.log(`🔍 Agent searching documents for: ${query}`);
      
      const retriever = this.vectorStoreManager.getRetriever('combined');
      const documents = await retriever.getRelevantDocuments(query);
      
      if (documents.length === 0) {
        return "No encontré información relevante sobre ese tema en los documentos.";
      }
      
      // Formatear resultados para el agente
      const formattedResults = documents.slice(0, 3).map((doc, index) => {
        const source = doc.metadata.source || 'Documento desconocido';
        const content = doc.pageContent.substring(0, 300) + '...';
        return `[Resultado ${index + 1}]\nFuente: ${source}\nContenido: ${content}\n`;
      }).join('\n');
      
      return `Encontré la siguiente información relevante:\n\n${formattedResults}`;
      
    } catch (error) {
      return `Error buscando en documentos: ${error.message}`;
    }
  }
}
```

### **Document Summary Tool**

```typescript
export class DocumentSummaryTool extends Tool {
  name = "document_summary";
  description = "Crea resúmenes de documentos específicos o información encontrada. Útil para condensar información larga.";
  
  constructor(private llm: ChatOpenAI) {
    super();
  }
  
  async _call(input: string): Promise<string> {
    try {
      // El input puede ser el contenido a resumir o el nombre de un documento
      const prompt = `Resume la siguiente información de manera concisa y estructurada:

${input}

Proporciona un resumen que incluya:
1. Los puntos principales
2. Información clave
3. Conclusiones importantes

Resumen:`;

      const response = await this.llm.call([new HumanMessage(prompt)]);
      return response.content;
      
    } catch (error) {
      return `Error creando resumen: ${error.message}`;
    }
  }
}
```

### **Calculator Tool**

```typescript
export class CalculatorTool extends Tool {
  name = "calculator";
  description = "Realiza cálculos matemáticos simples. Input debe ser una expresión matemática válida como '2 + 2' o '10 * 5'.";
  
  async _call(expression: string): Promise<string> {
    try {
      // Sanitizar la expresión para seguridad
      const sanitized = expression.replace(/[^0-9+\-*/().\s]/g, '');
      
      if (!sanitized.trim()) {
        return "Expresión matemática inválida";
      }
      
      // Evaluar de forma segura (en producción usar una librería como math.js)
      const result = Function(`"use strict"; return (${sanitized})`)();
      
      return `El resultado de ${expression} es: ${result}`;
      
    } catch (error) {
      return `Error en el cálculo: expresión inválida`;
    }
  }
}
```

### **Document Metadata Tool**

```typescript
export class DocumentMetadataTool extends Tool {
  name = "document_metadata";
  description = "Obtiene metadatos e información sobre documentos disponibles (lista de documentos, fechas, tamaños, etc.)";
  
  constructor(private vectorStoreManager: VectorStoreManager) {
    super();
  }
  
  async _call(query: string): Promise<string> {
    try {
      const availableStores = this.vectorStoreManager.getAvailableStores();
      
      if (query.toLowerCase().includes('lista') || query.toLowerCase().includes('documentos')) {
        const storeInfo = availableStores.map(store => {
          const stats = this.vectorStoreManager.getStoreStatistics(store);
          return `- ${store}: ${stats?.vectorCount || 0} fragmentos, ${stats?.documentCount || 0} documentos`;
        }).join('\n');
        
        return `Documentos disponibles:\n${storeInfo}`;
      }
      
      if (query.toLowerCase().includes('estadísticas')) {
        const report = this.vectorStoreManager.generateGlobalReport();
        return report;
      }
      
      return `Información disponible sobre documentos. Pregunta específicamente sobre:
- "lista de documentos" para ver todos los documentos
- "estadísticas" para ver métricas completas
- nombre específico de documento para detalles`;
      
    } catch (error) {
      return `Error obteniendo metadatos: ${error.message}`;
    }
  }
}
```

## 🎯 Agente Especializado en Documentos

### **Document Expert Agent**

```typescript
export class DocumentExpertAgent {
  private executor: AgentExecutor;
  private tools: Tool[];
  
  constructor(
    llm: ChatOpenAI,
    vectorStoreManager: VectorStoreManager,
    chatHistoryManager: ChatHistoryManager
  ) {
    this.tools = [
      new DocumentSearchTool(vectorStoreManager),
      new DocumentSummaryTool(llm),
      new DocumentMetadataTool(vectorStoreManager),
      new CalculatorTool(),
      new ComparisonTool(vectorStoreManager, llm),
      new QuestionGeneratorTool(llm)
    ];
    
    this.executor = this.createExpertExecutor(llm);
  }
  
  private createExpertExecutor(llm: ChatOpenAI): AgentExecutor {
    const systemPrompt = `Eres un experto analista de documentos con acceso a herramientas especializadas.

CAPACIDADES:
- Búsqueda semántica en documentos
- Análisis y resumen de contenido
- Comparación entre documentos
- Extracción de información específica
- Generación de preguntas para clarificación

INSTRUCCIONES:
1. Usa las herramientas disponibles para proporcionar respuestas precisas
2. Cita siempre las fuentes de información
3. Si necesitas más información, usa la herramienta de preguntas
4. Proporciona respuestas estructuradas y claras
5. Indica cuando la información no está disponible en los documentos

HERRAMIENTAS DISPONIBLES:
{tools}

FORMATO DE USE:
- Analiza la pregunta cuidadosamente
- Determina qué herramientas necesitas
- Ejecuta las herramientas en orden lógico
- Integra los resultados en una respuesta coherente`;

    const prompt = ChatPromptTemplate.fromMessages([
      ["system", systemPrompt],
      ["human", "{input}"],
      new MessagesPlaceholder("agent_scratchpad")
    ]);
    
    const agent = createOpenAIFunctionsAgent({
      llm,
      tools: this.tools,
      prompt
    });
    
    return new AgentExecutor({
      agent,
      tools: this.tools,
      verbose: true,
      maxIterations: 5,
      returnIntermediateSteps: true,
      handleParsingErrors: (error: OutputParserException) => {
        return `Hubo un error procesando la respuesta. ¿Podrías reformular tu pregunta? Error: ${error.message}`;
      }
    });
  }
  
  async analyze(
    query: string, 
    options: {
      maxIterations?: number;
      includeSteps?: boolean;
      specificDocument?: string;
    } = {}
  ): Promise<{
    response: string;
    steps?: any[];
    metadata: {
      toolsUsed: string[];
      executionTime: number;
      iterations: number;
    }
  }> {
    
    const startTime = Date.now();
    
    try {
      // Agregar contexto de documento específico si se proporciona
      let enhancedQuery = query;
      if (options.specificDocument) {
        enhancedQuery = `Enfócate en el documento "${options.specificDocument}": ${query}`;
      }
      
      const result = await this.executor.invoke({
        input: enhancedQuery
      });
      
      const executionTime = Date.now() - startTime;
      
      // Extraer herramientas usadas de los pasos intermedios
      const toolsUsed = result.intermediateSteps?.map((step: any) => 
        step.action?.tool || 'unknown'
      ).filter((tool: string) => tool !== 'unknown') || [];
      
      return {
        response: result.output,
        steps: options.includeSteps ? result.intermediateSteps : undefined,
        metadata: {
          toolsUsed: [...new Set(toolsUsed)], // Eliminar duplicados
          executionTime,
          iterations: result.intermediateSteps?.length || 0
        }
      };
      
    } catch (error) {
      console.error('Error in document expert agent:', error);
      return {
        response: `Lo siento, hubo un error analizando tu consulta: ${error.message}`,
        metadata: {
          toolsUsed: [],
          executionTime: Date.now() - startTime,
          iterations: 0
        }
      };
    }
  }
}
```

## 📊 Métricas y Monitoring de Agentes

### **Agent Performance Monitor**

```typescript
export class AgentMonitor {
  private static instance: AgentMonitor;
  private metrics: Map<string, AgentMetric> = new Map();
  
  static getInstance(): AgentMonitor {
    if (!AgentMonitor.instance) {
      AgentMonitor.instance = new AgentMonitor();
    }
    return AgentMonitor.instance;
  }
  
  recordExecution(
    agentType: string,
    query: string,
    toolsUsed: string[],
    executionTime: number,
    success: boolean,
    iterations: number
  ): void {
    
    const key = `${agentType}_${Date.now()}`;
    const metric: AgentMetric = {
      agentType,
      query: query.substring(0, 100), // Limitar longitud
      toolsUsed,
      executionTime,
      success,
      iterations,
      timestamp: new Date()
    };
    
    this.metrics.set(key, metric);
    
    // Limpiar métricas antiguas (mantener últimas 1000)
    if (this.metrics.size > 1000) {
      const oldestKey = this.metrics.keys().next().value;
      this.metrics.delete(oldestKey);
    }
    
    console.log(`📊 Agent execution recorded: ${agentType} (${executionTime}ms, ${iterations} iterations)`);
  }
  
  generateReport(): string {
    const metrics = Array.from(this.metrics.values());
    
    if (metrics.length === 0) {
      return "No hay métricas de agentes disponibles";
    }
    
    const totalExecutions = metrics.length;
    const successfulExecutions = metrics.filter(m => m.success).length;
    const successRate = (successfulExecutions / totalExecutions) * 100;
    
    const avgExecutionTime = metrics.reduce((sum, m) => sum + m.executionTime, 0) / totalExecutions;
    const avgIterations = metrics.reduce((sum, m) => sum + m.iterations, 0) / totalExecutions;
    
    // Herramientas más usadas
    const toolUsage: Record<string, number> = {};
    metrics.forEach(m => {
      m.toolsUsed.forEach(tool => {
        toolUsage[tool] = (toolUsage[tool] || 0) + 1;
      });
    });
    
    const topTools = Object.entries(toolUsage)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([tool, count]) => `  - ${tool}: ${count} usos`)
      .join('\n');
    
    return `🤖 Agent Performance Report

📈 General:
  - Total ejecuciones: ${totalExecutions}
  - Tasa de éxito: ${successRate.toFixed(1)}%
  - Tiempo promedio: ${avgExecutionTime.toFixed(0)}ms
  - Iteraciones promedio: ${avgIterations.toFixed(1)}

🛠️ Herramientas más usadas:
${topTools}

📊 Rendimiento por tipo de agente:
${this.getAgentTypeStats(metrics)}`;
  }
  
  private getAgentTypeStats(metrics: AgentMetric[]): string {
    const typeStats: Record<string, {
      count: number;
      avgTime: number;
      successRate: number;
    }> = {};
    
    metrics.forEach(m => {
      if (!typeStats[m.agentType]) {
        typeStats[m.agentType] = { count: 0, avgTime: 0, successRate: 0 };
      }
      
      typeStats[m.agentType].count++;
      typeStats[m.agentType].avgTime += m.executionTime;
      if (m.success) typeStats[m.agentType].successRate++;
    });
    
    return Object.entries(typeStats)
      .map(([type, stats]) => {
        const avgTime = stats.avgTime / stats.count;
        const successRate = (stats.successRate / stats.count) * 100;
        return `  - ${type}: ${stats.count} ejecuciones, ${avgTime.toFixed(0)}ms promedio, ${successRate.toFixed(1)}% éxito`;
      })
      .join('\n');
  }
}

interface AgentMetric {
  agentType: string;
  query: string;
  toolsUsed: string[];
  executionTime: number;
  success: boolean;
  iterations: number;
  timestamp: Date;
}
```

## 🔄 Integración con el Sistema Principal

### **Agent Factory**

```typescript
export class AgentFactory {
  static createDocumentAgent(
    llm: ChatOpenAI,
    vectorStoreManager: VectorStoreManager,
    chatHistoryManager: ChatHistoryManager,
    type: 'expert' | 'conversational' | 'zero-shot' = 'expert'
  ): DocumentExpertAgent | ConversationalDocumentAgent | AgentExecutor {
    
    switch (type) {
      case 'expert':
        return new DocumentExpertAgent(llm, vectorStoreManager, chatHistoryManager);
        
      case 'conversational':
        return new ConversationalDocumentAgent(llm, this.createBasicTools(vectorStoreManager, llm), vectorStoreManager);
        
      case 'zero-shot':
        return createZeroShotAgent(llm, this.createBasicTools(vectorStoreManager, llm));
        
      default:
        throw new Error(`Unknown agent type: ${type}`);
    }
  }
  
  private static createBasicTools(
    vectorStoreManager: VectorStoreManager,
    llm: ChatOpenAI
  ): Tool[] {
    return [
      new DocumentSearchTool(vectorStoreManager),
      new DocumentSummaryTool(llm),
      new DocumentMetadataTool(vectorStoreManager),
      new CalculatorTool()
    ];
  }
}
```

---

**Siguiente**: [Configuración Avanzada](13-configuracion-avanzada.md)  
**Anterior**: [Sistema de Historial de Conversaciones](11-chat-history.md) 