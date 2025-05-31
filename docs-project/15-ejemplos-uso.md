# Ejemplos Prácticos de Uso - LangChain Document Chat

## 🎯 Introducción

Esta guía presenta ejemplos prácticos y casos de uso reales del sistema LangChain Document Chat, desde implementaciones básicas hasta casos avanzados con agentes y configuraciones personalizadas.

## 🚀 Ejemplo 1: Setup Básico y Primera Consulta

### **Configuración Inicial**

```bash
# 1. Configurar el proyecto
git clone https://github.com/usuario/langchain-document-chat.git
cd langchain-document-chat
npm install

# 2. Configurar variables de entorno
echo "OPENAI_API_KEY=sk-tu-api-key-aqui" > .env
echo "DOCS_DIRECTORY=docs" >> .env
echo "LLM_MODEL=gpt-3.5-turbo" >> .env

# 3. Crear directorio de documentos y añadir contenido
mkdir docs
cat > docs/manual-empresa.txt << 'EOF'
# Manual de la Empresa TechCorp

## Políticas de Trabajo Remoto

TechCorp permite trabajo remoto hasta 3 días por semana.
Los empleados deben estar disponibles entre 9:00 AM y 5:00 PM.

## Beneficios

- Seguro médico completo
- 20 días de vacaciones anuales
- Bono por performance anual
- Capacitación técnica pagada

## Procedimientos de TI

Para solicitar nuevo software, usar el sistema interno JIRA.
Las contraseñas deben cambiarse cada 90 días.
EOF

# 4. Ejecutar el sistema
npm start
```

### **Primera Consulta por CLI**

```bash
# Procesar documentos
node dist/cli/index.js process

# Hacer una consulta
node dist/cli/index.js chat "¿Cuántos días de vacaciones tengo?"

# Resultado esperado:
# 🤖 Según el manual de la empresa, tienes 20 días de vacaciones anuales.
# 
# 📄 Fuentes consultadas:
# - manual-empresa.txt
```

### **Primera Consulta por API**

```javascript
// Ejemplo con curl
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "¿Puedo trabajar desde casa?",
    "sessionId": "session-001"
  }'

// Respuesta esperada:
{
  "message": "Sí, según las políticas de TechCorp puedes trabajar remotamente hasta 3 días por semana. Debes estar disponible entre 9:00 AM y 5:00 PM.",
  "sources": ["manual-empresa.txt"],
  "sessionId": "session-001",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

## 📚 Ejemplo 2: Gestión de Documentación Técnica

### **Caso de Uso: Base de Conocimiento de API**

```bash
# Estructura de documentos
docs/
├── api/
│   ├── authentication.md
│   ├── endpoints.md
│   └── errors.md
├── tutorials/
│   ├── getting-started.md
│   └── advanced-usage.md
└── troubleshooting/
    ├── common-issues.md
    └── performance.md
```

```markdown
<!-- docs/api/authentication.md -->
# Autenticación API

## Métodos Soportados

### API Key Authentication
```bash
curl -H "X-API-Key: your-key" https://api.example.com/data
```

### JWT Authentication
1. Obtener token: `POST /auth/login`
2. Usar token: `Authorization: Bearer <token>`

## Configuración

El API key se configura en el header `X-API-Key`.
Los tokens JWT expiran en 24 horas.
```

### **Implementación con Procesamiento Automático**

```typescript
// scripts/setup-knowledge-base.ts
import { DocumentProcessor } from '../src/core/document';
import { VectorStoreManager } from '../src/core/vectorstore';
import path from 'path';

async function setupKnowledgeBase() {
  const docProcessor = new DocumentProcessor();
  const vectorStore = new VectorStoreManager();
  
  // Procesar documentos por categorías
  const categories = ['api', 'tutorials', 'troubleshooting'];
  
  for (const category of categories) {
    console.log(`📁 Procesando categoría: ${category}`);
    
    const categoryPath = path.join('docs', category);
    const documents = await docProcessor.loadDirectory(categoryPath);
    
    // Agregar metadatos de categoría
    const enrichedDocs = documents.map(doc => ({
      ...doc,
      metadata: {
        ...doc.metadata,
        category,
        processedAt: new Date().toISOString()
      }
    }));
    
    // Crear almacén vectorial específico por categoría
    await vectorStore.createStore(category, enrichedDocs);
    console.log(`✅ Almacén '${category}' creado con ${enrichedDocs.length} documentos`);
  }
  
  // Crear almacén combinado
  await vectorStore.combineStores(['api', 'tutorials', 'troubleshooting'], 'knowledge-base');
  console.log('🔗 Almacén combinado creado');
}

// Ejecutar
setupKnowledgeBase().catch(console.error);
```

### **Consultas Especializadas**

```javascript
// Consulta específica sobre autenticación
const authQuery = await fetch('http://localhost:3000/api/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: "¿Cómo configuro JWT authentication?",
    sessionId: "dev-session",
    options: {
      category: "api",
      maxSources: 3
    }
  })
});

// Consulta sobre troubleshooting
const troubleQuery = await fetch('http://localhost:3000/api/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: "Mi API está respondiendo lento, ¿qué puedo revisar?",
    sessionId: "support-session",
    options: {
      category: "troubleshooting",
      searchType: "similarity_score_threshold",
      scoreThreshold: 0.8
    }
  })
});
```

## 🤖 Ejemplo 3: Implementación con Agentes

### **Caso de Uso: Asistente de Soporte Técnico**

```typescript
// src/agents/support-agent.ts
import { DocumentExpertAgent } from '../agents/expert';
import { VectorStoreManager } from '../core/vectorstore';
import { ChatHistoryManager } from '../core/chatHistory';
import { ModelManager } from '../core/model';

export class TechnicalSupportAgent {
  private expertAgent: DocumentExpertAgent;
  private ticketHistory: Map<string, any> = new Map();
  
  constructor(
    vectorStoreManager: VectorStoreManager,
    chatHistoryManager: ChatHistoryManager,
    modelManager: ModelManager
  ) {
    this.expertAgent = new DocumentExpertAgent(
      modelManager.getChatModel(),
      vectorStoreManager,
      chatHistoryManager
    );
  }
  
  async handleSupportTicket(
    ticketId: string,
    userQuery: string,
    userInfo: {
      email: string;
      plan: 'basic' | 'pro' | 'enterprise';
      previousTickets?: number;
    }
  ): Promise<{
    response: string;
    confidence: number;
    suggestedActions: string[];
    escalate: boolean;
    estimatedResolutionTime: string;
  }> {
    
    // Agregar contexto del usuario al query
    const contextualQuery = `
Usuario: ${userInfo.email} (Plan: ${userInfo.plan})
Tickets previos: ${userInfo.previousTickets || 0}

Consulta: ${userQuery}

Por favor proporciona una respuesta personalizada basada en la documentación disponible.
`;

    try {
      const analysis = await this.expertAgent.analyze(contextualQuery, {
        includeSteps: true,
        maxIterations: 3
      });
      
      // Analizar confianza basada en fuentes encontradas
      const confidence = this.calculateConfidence(analysis);
      
      // Generar acciones sugeridas
      const suggestedActions = this.generateSuggestedActions(
        analysis.response,
        userInfo.plan
      );
      
      // Determinar si necesita escalamiento
      const escalate = confidence < 0.7 || 
                      userQuery.toLowerCase().includes('urgent') ||
                      userInfo.plan === 'enterprise';
      
      // Estimar tiempo de resolución
      const estimatedTime = this.estimateResolutionTime(
        analysis.metadata.toolsUsed,
        userInfo.plan
      );
      
      // Guardar contexto del ticket
      this.ticketHistory.set(ticketId, {
        query: userQuery,
        response: analysis.response,
        userInfo,
        timestamp: new Date(),
        confidence,
        toolsUsed: analysis.metadata.toolsUsed
      });
      
      return {
        response: analysis.response,
        confidence,
        suggestedActions,
        escalate,
        estimatedResolutionTime: estimatedTime
      };
      
    } catch (error) {
      console.error('Error in support agent:', error);
      
      return {
        response: "Lo siento, ha ocurrido un error procesando tu consulta. Un agente humano se pondrá en contacto contigo pronto.",
        confidence: 0,
        suggestedActions: ["Contactar soporte telefónico"],
        escalate: true,
        estimatedResolutionTime: "Inmediato"
      };
    }
  }
  
  private calculateConfidence(analysis: any): number {
    const toolsUsed = analysis.metadata.toolsUsed;
    const executionTime = analysis.metadata.executionTime;
    
    let confidence = 0.5; // Base confidence
    
    // Incrementar confianza si usó herramientas de búsqueda
    if (toolsUsed.includes('document_search')) confidence += 0.3;
    if (toolsUsed.includes('document_metadata')) confidence += 0.1;
    
    // Reducir confianza si tardó mucho (puede indicar dificultad)
    if (executionTime > 10000) confidence -= 0.2;
    
    // Analizar respuesta para palabras de incertidumbre
    const uncertaintyWords = ['no estoy seguro', 'quizás', 'posiblemente'];
    const hasUncertainty = uncertaintyWords.some(word => 
      analysis.response.toLowerCase().includes(word)
    );
    
    if (hasUncertainty) confidence -= 0.3;
    
    return Math.max(0, Math.min(1, confidence));
  }
  
  private generateSuggestedActions(response: string, plan: string): string[] {
    const actions: string[] = [];
    
    // Acciones basadas en el plan
    if (plan === 'enterprise') {
      actions.push("Contactar account manager dedicado");
      actions.push("Solicitar implementación personalizada");
    }
    
    // Acciones basadas en el contenido de la respuesta
    if (response.includes('configuración')) {
      actions.push("Revisar guía de configuración");
      actions.push("Verificar variables de entorno");
    }
    
    if (response.includes('API')) {
      actions.push("Probar endpoints con Postman");
      actions.push("Verificar API key");
    }
    
    if (response.includes('error')) {
      actions.push("Revisar logs del sistema");
      actions.push("Verificar conectividad");
    }
    
    // Acciones genéricas si no hay específicas
    if (actions.length === 0) {
      actions.push("Revisar documentación relacionada");
      actions.push("Verificar configuración básica");
    }
    
    return actions;
  }
  
  private estimateResolutionTime(toolsUsed: string[], plan: string): string {
    if (plan === 'enterprise') return "1-2 horas";
    if (plan === 'pro') return "2-4 horas";
    
    // Basado en complejidad (herramientas usadas)
    if (toolsUsed.length <= 1) return "30 minutos";
    if (toolsUsed.length <= 3) return "1-2 horas";
    return "2-4 horas";
  }
}
```

### **Uso del Agente de Soporte**

```typescript
// Ejemplo de uso del agente de soporte
const supportAgent = new TechnicalSupportAgent(
  vectorStoreManager,
  chatHistoryManager,
  modelManager
);

// Ticket de usuario básico
const basicTicket = await supportAgent.handleSupportTicket(
  "TICKET-001",
  "No puedo conectarme a la API, me da error 401",
  {
    email: "usuario@empresa.com",
    plan: "basic",
    previousTickets: 2
  }
);

console.log("📞 Respuesta de soporte:", basicTicket);
// {
//   response: "El error 401 indica problemas de autenticación. Verifica que...",
//   confidence: 0.85,
//   suggestedActions: ["Verificar API key", "Revisar logs del sistema"],
//   escalate: false,
//   estimatedResolutionTime: "30 minutos"
// }

// Ticket de usuario enterprise
const enterpriseTicket = await supportAgent.handleSupportTicket(
  "TICKET-002", 
  "Necesito integrar SSO con Azure AD urgentemente",
  {
    email: "cto@bigcorp.com",
    plan: "enterprise",
    previousTickets: 0
  }
);

console.log("🏢 Respuesta enterprise:", enterpriseTicket);
// {
//   response: "Para integrar SSO con Azure AD en tu plan Enterprise...",
//   confidence: 0.75,
//   suggestedActions: ["Contactar account manager dedicado", "Solicitar implementación personalizada"],
//   escalate: true,
//   estimatedResolutionTime: "1-2 horas"
// }
```

## 🔄 Ejemplo 4: Integración con Sistema Existente

### **Caso de Uso: Integración con CRM**

```typescript
// integrations/crm-integration.ts
import { ChatManager } from '../src/core/chat';
import { VectorStoreManager } from '../src/core/vectorstore';

export class CRMIntegration {
  private chatManager: ChatManager;
  private vectorStoreManager: VectorStoreManager;
  private crmAPI: any; // Tu API de CRM existente
  
  constructor(chatManager: ChatManager, vectorStoreManager: VectorStoreManager, crmAPI: any) {
    this.chatManager = chatManager;
    this.vectorStoreManager = vectorStoreManager;
    this.crmAPI = crmAPI;
  }
  
  async enrichCustomerQuery(
    customerId: string,
    query: string
  ): Promise<{
    response: string;
    customerContext: any;
    suggestedFollowUp: string[];
    priority: 'low' | 'medium' | 'high';
  }> {
    
    // 1. Obtener contexto del cliente desde CRM
    const customerData = await this.crmAPI.getCustomer(customerId);
    const tickets = await this.crmAPI.getCustomerTickets(customerId);
    const purchases = await this.crmAPI.getCustomerPurchases(customerId);
    
    // 2. Crear contexto enriquecido
    const enrichedQuery = `
    CONTEXTO DEL CLIENTE:
    - ID: ${customerId}
    - Tipo: ${customerData.type}
    - Plan: ${customerData.plan}
    - Tickets anteriores: ${tickets.length}
    - Última compra: ${purchases[0]?.date || 'N/A'}
    - Valor total: $${customerData.totalValue}
    
    CONSULTA: ${query}
    
    Proporciona una respuesta personalizada considerando el contexto del cliente.
    `;
    
    // 3. Procesar con el sistema de documentos
    const chatResponse = await this.chatManager.chat(enrichedQuery);
    
    // 4. Determinar prioridad basada en el cliente
    const priority = this.determinePriority(customerData, query);
    
    // 5. Generar acciones de seguimiento
    const followUp = this.generateFollowUpActions(customerData, chatResponse);
    
    // 6. Actualizar CRM con la interacción
    await this.crmAPI.createInteraction(customerId, {
      type: 'ai_assistance',
      query,
      response: chatResponse.message,
      sources: chatResponse.sources,
      priority,
      timestamp: new Date()
    });
    
    return {
      response: chatResponse.message,
      customerContext: {
        ...customerData,
        ticketCount: tickets.length,
        recentPurchases: purchases.slice(0, 3)
      },
      suggestedFollowUp: followUp,
      priority
    };
  }
  
  private determinePriority(customerData: any, query: string): 'low' | 'medium' | 'high' {
    // VIP customers get high priority
    if (customerData.type === 'enterprise' || customerData.totalValue > 100000) {
      return 'high';
    }
    
    // Urgent keywords
    const urgentKeywords = ['urgent', 'down', 'critical', 'emergency', 'broken'];
    if (urgentKeywords.some(keyword => query.toLowerCase().includes(keyword))) {
      return 'high';
    }
    
    // Pro customers get medium priority
    if (customerData.plan === 'pro') {
      return 'medium';
    }
    
    return 'low';
  }
  
  private generateFollowUpActions(customerData: any, chatResponse: any): string[] {
    const actions: string[] = [];
    
    // Acciones basadas en el tipo de cliente
    if (customerData.type === 'enterprise') {
      actions.push("Asignar account manager");
      actions.push("Programar call de seguimiento");
    }
    
    // Acciones basadas en la respuesta
    if (chatResponse.sources.length === 0) {
      actions.push("Crear documentación faltante");
      actions.push("Escalar a soporte técnico");
    }
    
    if (chatResponse.message.includes('configuración')) {
      actions.push("Ofrecer sesión de configuración");
    }
    
    return actions;
  }
  
  async processBulkQueries(queries: Array<{customerId: string, query: string}>): Promise<any[]> {
    console.log(`📊 Procesando ${queries.length} consultas en lote...`);
    
    const results = await Promise.all(
      queries.map(async ({ customerId, query }) => {
        try {
          const result = await this.enrichCustomerQuery(customerId, query);
          return { customerId, success: true, ...result };
        } catch (error) {
          console.error(`Error procesando consulta para ${customerId}:`, error);
          return { customerId, success: false, error: error.message };
        }
      })
    );
    
    // Generar reporte
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    
    console.log(`✅ Procesamiento completado: ${successful} exitosas, ${failed} fallidas`);
    
    return results;
  }
}

// Uso de la integración
const crmIntegration = new CRMIntegration(chatManager, vectorStoreManager, crmAPI);

// Consulta individual
const customerResponse = await crmIntegration.enrichCustomerQuery(
  "CUST-12345",
  "¿Cómo configuro webhooks para mi aplicación?"
);

// Procesamiento en lote
const bulkQueries = [
  { customerId: "CUST-001", query: "Problemas con autenticación" },
  { customerId: "CUST-002", query: "¿Cómo escalo mi plan?" },
  { customerId: "CUST-003", query: "API no responde" }
];

const bulkResults = await crmIntegration.processBulkQueries(bulkQueries);
```

## 📱 Ejemplo 5: Interfaz Web Interactiva

### **Frontend React con Chat en Tiempo Real**

```jsx
// components/ChatInterface.jsx
import React, { useState, useEffect, useRef } from 'react';
import './ChatInterface.css';

const ChatInterface = () => {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId] = useState(() => `session-${Date.now()}`);
  const messagesEndRef = useRef(null);
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };
  
  useEffect(scrollToBottom, [messages]);
  
  const sendMessage = async (message) => {
    if (!message.trim()) return;
    
    // Agregar mensaje del usuario
    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: message,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          sessionId,
          options: {
            includeSourceCitations: true,
            maxSources: 5
          }
        }),
      });
      
      const data = await response.json();
      
      // Agregar respuesta del asistente
      const assistantMessage = {
        id: Date.now() + 1,
        type: 'assistant',
        content: data.message,
        sources: data.sources || [],
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, assistantMessage]);
      
    } catch (error) {
      console.error('Error sending message:', error);
      
      const errorMessage = {
        id: Date.now() + 1,
        type: 'error',
        content: 'Lo siento, hubo un error procesando tu mensaje. Por favor intenta de nuevo.',
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleSubmit = (e) => {
    e.preventDefault();
    sendMessage(inputValue);
  };
  
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(inputValue);
    }
  };
  
  return (
    <div className="chat-interface">
      <div className="chat-header">
        <h2>🤖 LangChain Document Assistant</h2>
        <div className="session-info">Session: {sessionId}</div>
      </div>
      
      <div className="chat-messages">
        {messages.map((message) => (
          <div key={message.id} className={`message ${message.type}`}>
            <div className="message-content">
              {message.content}
              
              {message.sources && message.sources.length > 0 && (
                <div className="message-sources">
                  <strong>📄 Fuentes:</strong>
                  <ul>
                    {message.sources.map((source, index) => (
                      <li key={index}>{source}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            
            <div className="message-timestamp">
              {message.timestamp.toLocaleTimeString()}
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="message assistant loading">
            <div className="typing-indicator">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>
      
      <form className="chat-input-form" onSubmit={handleSubmit}>
        <div className="input-container">
          <textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Escribe tu pregunta sobre los documentos..."
            disabled={isLoading}
            rows={1}
          />
          <button 
            type="submit" 
            disabled={isLoading || !inputValue.trim()}
            className="send-button"
          >
            📤
          </button>
        </div>
      </form>
      
      <div className="chat-suggestions">
        <div className="suggestions-title">💡 Preguntas sugeridas:</div>
        <div className="suggestions-list">
          {[
            "¿Cuáles son las políticas de la empresa?",
            "¿Cómo configurar la autenticación?",
            "¿Qué procedimientos debo seguir?",
            "Muéstrame ejemplos de uso de la API"
          ].map((suggestion, index) => (
            <button
              key={index}
              className="suggestion-button"
              onClick={() => sendMessage(suggestion)}
              disabled={isLoading}
            >
              {suggestion}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;
```

### **CSS para la Interfaz**

```css
/* components/ChatInterface.css */
.chat-interface {
  display: flex;
  flex-direction: column;
  height: 100vh;
  max-width: 800px;
  margin: 0 auto;
  border: 1px solid #e0e0e0;
  border-radius: 10px;
  overflow: hidden;
  background: white;
}

.chat-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 1rem;
  text-align: center;
}

.chat-header h2 {
  margin: 0;
  font-size: 1.5rem;
}

.session-info {
  font-size: 0.8rem;
  opacity: 0.8;
  margin-top: 0.5rem;
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
  background: #f8f9fa;
}

.message {
  margin-bottom: 1rem;
  display: flex;
  flex-direction: column;
}

.message.user {
  align-items: flex-end;
}

.message.assistant {
  align-items: flex-start;
}

.message.error {
  align-items: center;
}

.message-content {
  max-width: 70%;
  padding: 0.75rem 1rem;
  border-radius: 1rem;
  white-space: pre-wrap;
  word-wrap: break-word;
}

.message.user .message-content {
  background: #007bff;
  color: white;
  border-bottom-right-radius: 0.25rem;
}

.message.assistant .message-content {
  background: white;
  border: 1px solid #e0e0e0;
  border-bottom-left-radius: 0.25rem;
}

.message.error .message-content {
  background: #ff6b6b;
  color: white;
  text-align: center;
}

.message-sources {
  margin-top: 0.5rem;
  padding-top: 0.5rem;
  border-top: 1px solid #e0e0e0;
  font-size: 0.9rem;
}

.message-sources ul {
  margin: 0.25rem 0 0 0;
  padding-left: 1rem;
}

.message-timestamp {
  font-size: 0.7rem;
  color: #666;
  margin-top: 0.25rem;
  align-self: flex-end;
}

.message.assistant .message-timestamp {
  align-self: flex-start;
}

.loading .message-content {
  background: #f0f0f0;
  padding: 1rem;
}

.typing-indicator {
  display: flex;
  gap: 0.25rem;
}

.typing-indicator span {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #999;
  animation: typing 1.4s infinite ease-in-out;
}

.typing-indicator span:nth-child(1) { animation-delay: -0.32s; }
.typing-indicator span:nth-child(2) { animation-delay: -0.16s; }

@keyframes typing {
  0%, 80%, 100% { 
    transform: scale(0);
    opacity: 0.5;
  } 
  40% { 
    transform: scale(1);
    opacity: 1;
  }
}

.chat-input-form {
  border-top: 1px solid #e0e0e0;
  padding: 1rem;
  background: white;
}

.input-container {
  display: flex;
  gap: 0.5rem;
  align-items: flex-end;
}

.input-container textarea {
  flex: 1;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 0.5rem;
  resize: none;
  font-family: inherit;
  min-height: 40px;
  max-height: 120px;
}

.send-button {
  padding: 0.75rem;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 0.5rem;
  cursor: pointer;
  font-size: 1.2rem;
  min-width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.send-button:hover:not(:disabled) {
  background: #0056b3;
}

.send-button:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.chat-suggestions {
  background: #f8f9fa;
  padding: 1rem;
  border-top: 1px solid #e0e0e0;
}

.suggestions-title {
  font-weight: bold;
  margin-bottom: 0.5rem;
  color: #666;
}

.suggestions-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.suggestion-button {
  padding: 0.5rem 0.75rem;
  background: white;
  border: 1px solid #ddd;
  border-radius: 1rem;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s;
}

.suggestion-button:hover:not(:disabled) {
  background: #e9ecef;
  border-color: #007bff;
}

.suggestion-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Responsive */
@media (max-width: 768px) {
  .chat-interface {
    height: 100vh;
    border-radius: 0;
    border: none;
  }
  
  .message-content {
    max-width: 85%;
  }
  
  .suggestions-list {
    flex-direction: column;
  }
  
  .suggestion-button {
    text-align: left;
  }
}
```

---

**Siguiente**: [Solución de Problemas](16-troubleshooting.md)  
**Anterior**: [Guía de Desarrollo y Contribución](14-desarrollo-contribucion.md) 