# CLI Interface - LangChain Document Chat

## 🖥️ Interfaz de Línea de Comandos

La interfaz CLI de LangChain Document Chat proporciona una forma interactiva y directa de consultar documentos desde la terminal. Es ideal para pruebas rápidas, desarrollo y uso personal.

## 🚀 Iniciar la CLI

### Comando básico
```bash
npm run cli
```

### Con ts-node (desarrollo)
```bash
node --loader ts-node/esm src/cli.ts
```

### Desde código compilado
```bash
npm run build
node dist/cli.js
```

## 🌟 Características de la CLI

### **Interfaz Interactiva**
- **Prompt persistente**: Mantiene la sesión activa hasta que la cierres
- **Readline support**: Historial de comandos y edición de línea
- **Manejo de errores graceful**: Recuperación automática de errores

### **Selección de Almacenes Vectoriales**
- **Almacén combinado por defecto**: Busca en todos los documentos
- **Selección específica**: Usa `@nombre_almacen` para documentos específicos
- **Listado automático**: Muestra almacenes disponibles al inicio

### **Comandos Especiales**
- **`exit`**: Termina la sesión CLI
- **`help`**: Muestra ayuda (implementación futura)
- **`@almacen pregunta`**: Selecciona almacén específico

## 📖 Guía de Uso Detallada

### **Inicio de Sesión**

Cuando ejecutas `npm run cli`, verás:

```bash
$ npm run cli

> t1@1.0.0 cli
> node --loader ts-node/esm src/cli.ts

Initializing chat application with documents...
Found 8 documents in docs directory
Creating combined vector store from all documents...
Processing individual documents...
Processing existing document: patrones_de_diseno.txt
Processing existing document: guia_de_desarrollo.txt
Processing existing document: arquitectura_del_sistema.txt
Processing existing document: typescript_typing_guide.txt
Processing existing document: documentacion_de_hooks_de_carga_de_archivos.txt
Processing existing document: analisis_prisma_permisos_dms.txt
Processing existing document: guia_de_instalacion_y_configuracion.txt
Processing existing document: sistema_de_gestion_de_documentos_documentacion_principal.txt

Available vector stores:
 - combined
 - patrones_de_diseno
 - guia_de_desarrollo
 - arquitectura_del_sistema
 - typescript_typing_guide
 - documentacion_de_hooks_de_carga_de_archivos
 - analisis_prisma_permisos_dms
 - guia_de_instalacion_y_configuracion
 - sistema_de_gestion_de_documentos_documentacion_principal

Chat with your documents (type 'exit' to quit):
Use @store_name to select a specific vector store, or just ask questions for the combined store.

You:
```

### **Consultas Básicas**

#### Usando el almacén combinado (todos los documentos):
```
You: ¿Qué información tienes sobre patrones de diseño?

AI: Los patrones de diseño son soluciones reutilizables a problemas comunes 
en el desarrollo de software. Según la documentación disponible, existen 
tres categorías principales:

1. **Patrones Creacionales**: Se enfocan en la creación de objetos
   - Singleton: Garantiza una única instancia
   - Factory: Crea objetos sin especificar clases exactas
   - Builder: Construye objetos complejos paso a paso

2. **Patrones Estructurales**: Tratan con la composición de clases
   - Adapter: Permite que interfaces incompatibles trabajen juntas
   - Decorator: Añade funcionalidad a objetos dinámicamente

3. **Patrones de Comportamiento**: Se centran en algoritmos y comunicación
   - Observer: Define dependencias uno-a-muchos entre objetos
   - Strategy: Define una familia de algoritmos intercambiables

Estos patrones mejoran la reutilización, mantenibilidad y escalabilidad 
del código.

You:
```

#### Usando un almacén específico:
```
You: @patrones_de_diseno Explícame el patrón Singleton en detalle

AI: El patrón Singleton es un patrón de diseño creacional que garantiza que 
una clase tenga una única instancia y proporciona un punto de acceso global 
a esa instancia.

**Características principales:**
- **Una sola instancia**: La clase controla que solo se cree una instancia
- **Acceso global**: Proporciona un método estático para acceder a la instancia
- **Inicialización lazy**: La instancia se crea solo cuando se necesita

**Implementación típica:**
```typescript
class Singleton {
  private static instance: Singleton;
  
  private constructor() {}
  
  public static getInstance(): Singleton {
    if (!Singleton.instance) {
      Singleton.instance = new Singleton();
    }
    return Singleton.instance;
  }
}
```

**Casos de uso:**
- Configuración de aplicación
- Pools de conexiones a base de datos
- Loggers
- Caches

**Consideraciones:**
- Puede crear dependencias ocultas
- Dificulta las pruebas unitarias
- Viola el principio de responsabilidad única

You:
```

### **Cambio de Contexto**

Puedes cambiar entre diferentes almacenes durante la misma sesión:

```
You: @typescript_typing_guide ¿Cómo defino tipos personalizados?

AI: En TypeScript, puedes definir tipos personalizados de varias maneras:

1. **Type Aliases**:
```typescript
type User = {
  id: number;
  name: string;
  email: string;
};
```

2. **Interfaces**:
```typescript
interface Product {
  id: number;
  name: string;
  price: number;
}
```

3. **Tipos Unión**:
```typescript
type Status = 'pending' | 'approved' | 'rejected';
```

4. **Tipos Genéricos**:
```typescript
type ApiResponse<T> = {
  data: T;
  status: number;
  message: string;
};
```

You: @guia_de_desarrollo ¿Cuáles son las mejores prácticas para el desarrollo?

AI: Según la guía de desarrollo, las mejores prácticas incluyen:

**Estructura de Código:**
- Organizar archivos en directorios lógicos
- Usar nombres descriptivos para variables y funciones
- Mantener funciones pequeñas y enfocadas

**Control de Versiones:**
- Commits frecuentes con mensajes descriptivos
- Usar branching strategies como Git Flow
- Hacer code reviews antes de mergear

**Testing:**
- Escribir tests unitarios para toda la lógica crítica
- Implementar tests de integración
- Mantener coverage superior al 80%

**Documentación:**
- Documentar APIs y funciones públicas
- Mantener README actualizado
- Usar comentarios JSDoc donde sea apropiado

You:
```

### **Comandos Especiales**

#### Salir de la CLI:
```
You: exit
Goodbye!
```

#### Información de ayuda:
```
You: help
Available commands:
- Type questions to get answers from all documents
- Use @store_name question to query specific document
- Type 'exit' to quit

Available stores:
- combined (all documents)
- patrones_de_diseno
- guia_de_desarrollo
- arquitectura_del_sistema
[... lista completa ...]

You:
```

## 🔧 Características Técnicas

### **Gestión de Sesión**
```typescript
// La CLI mantiene estado durante toda la sesión
const chatManager = await initializeChat();

// Historial de conversación persistente por almacén
const history = chatManager.chatHistoryManager.getChatHistory(
  'cli-user', 
  selectedStore, 
  'cli-session'
);
```

### **Parsing de Comandos**
```typescript
function parseCommand(input: string): { store?: string, question: string } {
  const trimmed = input.trim();
  
  // Detectar selección de almacén: @store_name question
  if (trimmed.startsWith('@')) {
    const spaceIndex = trimmed.indexOf(' ');
    if (spaceIndex > 0) {
      return {
        store: trimmed.substring(1, spaceIndex),
        question: trimmed.substring(spaceIndex + 1).trim()
      };
    }
  }
  
  return { question: trimmed };
}
```

### **Manejo de Errores**
```typescript
try {
  const response = await chatManager.processMessage(
    question, 
    'cli-user', 
    'cli-session', 
    selectedStore
  );
  console.log(`\nAI: ${response.text}\n`);
} catch (error) {
  console.error('Error processing your question:', error.message);
  console.log('Please try again or type "exit" to quit.\n');
}
```

## 🎨 Personalización de la CLI

### **Modificar Prompts**
Edita `src/lib/interface.ts` para personalizar los prompts:

```typescript
// Prompt principal
const prompt = 'You: ';

// Mensaje de bienvenida
console.log('Chat with your documents (type \'exit\' to quit):');
console.log('Use @store_name to select a specific vector store, or just ask questions for the combined store.\n');

// Prompt de respuesta
console.log(`\nAI: ${response.text}\n`);
```

### **Agregar Comandos Personalizados**
```typescript
// En src/lib/interface.ts
function handleSpecialCommands(input: string): boolean {
  const command = input.trim().toLowerCase();
  
  switch (command) {
    case 'help':
      showHelp();
      return true;
    case 'list':
      listAvailableStores();
      return true;
    case 'clear':
      console.clear();
      return true;
    case 'history':
      showHistory();
      return true;
    default:
      return false;
  }
}
```

## ⚡ Optimizaciones y Rendimiento

### **Carga Lazy de Almacenes**
- Los almacenes vectoriales se cargan solo cuando se seleccionan
- Reutilización de almacenes ya cargados en memoria
- Inicialización rápida del almacén combinado

### **Historial de Comandos**
- **Readline**: Usa las flechas ↑↓ para navegar el historial
- **Edición de línea**: Usa ←→ para editar comandos
- **Autocompletado**: Implementación futura para nombres de almacenes

### **Gestión de Memoria**
- Historial limitado para evitar uso excesivo de memoria
- Cleanup automático de embeddings no utilizados
- Garbage collection optimizado para sesiones largas

## 🐛 Troubleshooting CLI

### **Error: "Cannot read properties of undefined"**
```bash
# Verificar que los documentos estén en la carpeta docs/
ls docs/

# Verificar que haya documentos .txt
ls docs/*.txt
```

### **Error: "OPENAI_API_KEY is not set"**
```bash
# Verificar variable de entorno
echo $OPENAI_API_KEY

# Verificar archivo .env
cat .env | grep OPENAI_API_KEY
```

### **CLI no responde**
```bash
# Verificar logs en la terminal
# Usar Ctrl+C para terminar y reiniciar

# Verificar memoria disponible
npm run cli -- --max-old-space-size=4096
```

### **Respuestas lentas**
- **Primera consulta**: Normal, se están cargando los almacenes
- **Consultas siguientes**: Deberían ser más rápidas
- **Documentos grandes**: Pueden requerir más tiempo de procesamiento

## 📚 Ejemplos de Flujos de Trabajo

### **Análisis de documentación técnica**
```bash
You: ¿Qué documentos tienes disponibles?
You: @arquitectura_del_sistema Explica los componentes principales
You: @patrones_de_diseno ¿Qué patrones recomiendas para esta arquitectura?
You: ¿Cómo integro estos patrones en TypeScript?
You: exit
```

### **Desarrollo guiado por documentación**
```bash
You: @guia_de_desarrollo ¿Cuál es el proceso de desarrollo recomendado?
You: @typescript_typing_guide ¿Cómo estructuro los tipos para este proyecto?
You: ¿Hay ejemplos de implementación en los documentos?
You: exit
```

---

**Siguiente**: [Módulos Core](07-modulos-core.md)  
**Anterior**: [API Endpoints](05-api-endpoints.md) 