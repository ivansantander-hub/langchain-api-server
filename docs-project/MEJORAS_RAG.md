# Mejoras al Sistema RAG para Reducir Alucinaciones

## Problemas Identificados y Solucionados

### 1. **Embeddings Desactualizados**
**Problema**: Uso de `text-embedding-3-small` con dimensiones limitadas
**Solución**: 
- Upgrade a `text-embedding-3-large` con 3072 dimensiones (mejor precisión)
- Configuración optimizada de batch size y parámetros

### 2. **Chunking Subóptimo**
**Problema**: Chunks muy grandes (1000 chars) con overlap excesivo
**Solución**:
- Chunks más pequeños (600-800 chars) para mayor precisión
- Chunking semántico adaptativo según tipo de contenido
- Post-procesamiento para limpiar y filtrar chunks de baja calidad
- Separadores más inteligentes

### 3. **Búsqueda Limitada**
**Problema**: Solo 5 documentos con búsqueda básica por similitud
**Solución**:
- Retriever avanzado que combina múltiples estrategias
- MMR (Maximal Marginal Relevance) para diversidad
- Filtrado por score threshold (≥0.6)
- Hasta 8-10 documentos más relevantes

### 4. **Modelo Propenso a Alucinaciones**
**Problema**: GPT-3.5 con temperatura alta (0.7)
**Solución**:
- Upgrade a GPT-3.5-turbo
- Temperatura muy baja (0.0-0.1) para determinismo
- Prompts estrictos anti-alucinaciones
- TopP conservador (0.5-0.8)

## Nuevas Funciones Implementadas

### 1. **createFastEmbeddings()**
Embeddings optimizados para velocidad manteniendo calidad

### 2. **getAdvancedRetriever()**
Retriever híbrido que combina:
- Búsqueda por similitud con scores
- Filtrado por threshold
- Deduplicación inteligente

### 3. **splitDocumentsSemanticAware()**
Chunking adaptativo según tipo de contenido:
- **Técnico**: Chunks pequeños (600 chars) para código/APIs
- **Narrativo**: Chunks medianos (1000 chars) para texto corrido
- **General**: Configuración balanceada (800 chars)

### 4. **conservativeModelConfig**
Configuración ultra-conservadora para aplicaciones críticas:
- Temperatura 0.0 (completamente determinístico)
- Prompts extremadamente estrictos
- Límites de tokens conservadores

## Configuraciones Disponibles

### Alta Calidad (Recomendado para reducir alucinaciones)
```typescript
import { highQualityConfig } from './config.js';
// - text-embedding-3-large (3072 dims)
// - Chunking semántico (600 chars)
// - Retriever avanzado (6 docs, threshold 0.7)
// - GPT-3.5-turbo (temp 0.0)
```

### Balanceada (Buen equilibrio)
```typescript
import { balancedConfig } from './config.js';
// - text-embedding-3-small (1536 dims)
// - Chunking estándar mejorado (800 chars)
// - Retriever avanzado (8 docs, threshold 0.6)
// - GPT-3.5-turbo (temp 0.1)
```

### Rápida (Para pruebas)
```typescript
import { fastConfig } from './config.js';
// - text-embedding-3-small
// - Chunking básico (1000 chars)
// - Retriever estándar (5 docs)
// - GPT-3.5-turbo (temp 0.2)
```

## Cómo Usar las Mejoras

### 1. Para inicializar con embeddings mejorados:
```typescript
// Para máxima calidad
const embeddings = createEmbeddings(); // usa text-embedding-3-large

// Para velocidad
const embeddings = createFastEmbeddings(); // usa text-embedding-3-small
```

### 2. Para usar chunking semántico:
```typescript
import { splitDocumentsSemanticAware } from './document.js';

const docs = await loadDocuments();
const chunks = await splitDocumentsSemanticAware(docs); // Chunking inteligente
```

### 3. Para usar retrieval avanzado:
```typescript
// En processMessage, usar useAdvancedRetrieval: true (por defecto)
const response = await chatManager.processMessage(
  message,
  userId,
  chatId,
  storeName,
  conservativeModelConfig, // Configuración anti-alucinaciones
  true // useAdvancedRetrieval
);
```

## Prompts Anti-Alucinaciones Implementados

### Prompt Estricto (por defecto)
```
Eres un asistente especializado en responder preguntas basándote ÚNICAMENTE en el contexto proporcionado.

REGLAS ESTRICTAS:
1. SOLO responde con información que esté EXPLÍCITAMENTE presente en el contexto
2. Si la información no está en el contexto, responde: "No tengo suficiente información en los documentos para responder esa pregunta específica"
3. NO hagas suposiciones, inferencias o añadas conocimiento externo
4. Cita qué parte del contexto usaste para tu respuesta cuando sea posible
```

### Prompt Ultra-Conservador
```
INSTRUCCIONES CRÍTICAS:
- NUNCA inventes, asumas o uses conocimiento externo
- Si la respuesta no está en el contexto, di exactamente: "La información solicitada no se encuentra en los documentos proporcionados"
- Solo usa información que puedas citar textualmente del contexto
```

## Parámetros Optimizados

### Embeddings
- **Modelo**: text-embedding-3-large (mejor precisión)
- **Dimensiones**: 3072 (máximo disponible)
- **Batch size**: 512 (procesamiento eficiente)

### Chunking
- **Tamaño**: 600-800 caracteres (óptimo para precisión)
- **Overlap**: 100-150 caracteres (suficiente contexto)
- **Filtros**: Elimina chunks < 50 caracteres

### Retrieval
- **K**: 6-8 documentos (suficiente contexto sin ruido)
- **Score threshold**: ≥0.6 (solo alta relevancia)
- **Estrategia**: MMR para diversidad

### Modelo
- **Temperatura**: 0.0-0.1 (máximo determinismo)
- **Top-P**: 0.5-0.8 (conservador)
- **Max tokens**: 1000-1500 (respuestas concisas)

## Monitoreo y Debug

Las mejoras incluyen logging detallado:
- Estrategia de chunking utilizada
- Número de documentos encontrados
- Scores de relevancia
- Configuración de modelo usada

## Resultados Esperados

Con estas mejoras deberías ver:
1. **Menos alucinaciones** - El modelo solo usa información del contexto
2. **Mayor precisión** - Embeddings y chunking mejorados
3. **Respuestas más relevantes** - Mejor retrieval de documentos
4. **Mayor consistencia** - Configuración determinística

## Migración

El sistema es backward-compatible. Para usar las mejoras:
1. Los nuevos embeddings se aplicarán a documentos nuevos
2. Para documentos existentes, considera re-indexar con `createEmbeddings()`
3. El nuevo comportamiento se activa automáticamente 