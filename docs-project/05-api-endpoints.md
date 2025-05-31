# API Endpoints - LangChain Document Chat

## 🌐 Servidor API REST

La API REST de LangChain Document Chat proporciona endpoints completos para integrar el sistema de chat con documentos en aplicaciones web, móviles o cualquier cliente HTTP.

**Base URL**: `http://localhost:3000` (configurable con variable `PORT`)

## 📋 Lista de Endpoints

### **Información General**
- `GET /` - Información de la API y endpoints disponibles

### **Gestión de Chat**
- `POST /api/chat` - Procesar consultas de chat
- `GET /api/vector-stores` - Listar almacenes vectoriales disponibles

### **Gestión de Documentos**
- `POST /api/add-document` - Subir nuevos documentos

### **Gestión de Usuarios e Historiales**
- `GET /api/users` - Listar todos los usuarios
- `GET /api/users/:userId/vector-stores` - Listar almacenes por usuario
- `GET /api/users/:userId/vector-stores/:vectorName/chats` - Listar chats por usuario y almacén
- `GET /api/users/:userId/vector-stores/:vectorName/chats/:chatId/messages` - Obtener historial completo
- `DELETE /api/users/:userId/vector-stores/:vectorName/chats/:chatId` - Limpiar historial de chat

---

## 🔍 Documentación Detallada de Endpoints

### 1. **GET /** - Información de la API

**Descripción**: Proporciona información general sobre la API y lista todos los endpoints disponibles.

**Request**:
```http
GET /
Content-Type: application/json
```

**Response**:
```json
{
  "message": "LangChain Document Chat API",
  "endpoints": {
    "/api/chat": "POST - Send a question to get an answer from the documents",
    "/api/vector-stores": "GET - List all available vector stores",
    "/api/add-document": "POST - Upload and add a document to vector stores",
    "/api/users": "GET - List all users with chat history",
    "/api/users/:userId/vector-stores": "GET - List all vector stores with chat history for a user",
    "/api/users/:userId/vector-stores/:vectorName/chats": "GET - List all chats for a specific user and vector store",
    "/api/users/:userId/vector-stores/:vectorName/chats/:chatId": "DELETE - Clear chat history for a specific context",
    "/api/users/:userId/vector-stores/:vectorName/chats/:chatId/messages": "GET - Get complete chat history messages for a specific context"
  }
}
```

**Códigos de estado**:
- `200 OK` - Información retornada exitosamente

---

### 2. **POST /api/chat** - Procesar Consultas

**Descripción**: Endpoint principal para enviar preguntas y recibir respuestas basadas en documentos.

**Request**:
```http
POST /api/chat
Content-Type: application/json

{
  "question": "¿Qué información hay sobre patrones de diseño?",
  "vectorStore": "patrones_de_diseno",  // Opcional
  "userId": "user123",                  // Opcional
  "chatId": "chat456"                   // Opcional
}
```

**Parámetros**:
- `question` (string, requerido): La pregunta del usuario
- `vectorStore` (string, opcional): Nombre del almacén vectorial específico. Default: "combined"
- `userId` (string, opcional): Identificador del usuario. Default: "default"
- `chatId` (string, opcional): Identificador de la conversación. Default: "default"

**Response exitosa**:
```json
{
  "answer": "Los patrones de diseño son soluciones reutilizables a problemas comunes en el desarrollo de software...",
  "sources": [
    {
      "content": "Fragmento del documento que se utilizó como contexto...",
      "metadata": {
        "source": "docs/patrones_de_diseno.txt",
        "page": 0
      }
    }
  ],
  "vectorStore": "patrones_de_diseno",
  "userId": "user123",
  "chatId": "chat456"
}
```

**Response de error**:
```json
{
  "error": "Vector store 'store_inexistente' not found",
  "available": ["combined", "patrones_de_diseno", "guia_de_desarrollo"]
}
```

**Códigos de estado**:
- `200 OK` - Respuesta generada exitosamente
- `400 Bad Request` - Pregunta faltante o parámetros inválidos
- `404 Not Found` - Almacén vectorial no encontrado
- `500 Internal Server Error` - Error del servidor

---

### 3. **GET /api/vector-stores** - Listar Almacenes Vectoriales

**Descripción**: Retorna la lista de todos los almacenes vectoriales disponibles en el sistema.

**Request**:
```http
GET /api/vector-stores
```

**Response**:
```json
{
  "stores": [
    "combined",
    "patrones_de_diseno",
    "guia_de_desarrollo",
    "arquitectura_del_sistema",
    "typescript_typing_guide"
  ],
  "default": "combined"
}
```

**Códigos de estado**:
- `200 OK` - Lista retornada exitosamente

---

### 4. **POST /api/add-document** - Subir Documentos

**Descripción**: Permite subir nuevos documentos que serán procesados y agregados a los almacenes vectoriales.

**Request**:
```http
POST /api/add-document
Content-Type: application/json

{
  "filename": "nuevo_documento.txt",
  "content": "Contenido completo del documento a procesar..."
}
```

**Parámetros**:
- `filename` (string, requerido): Nombre del archivo incluyendo extensión
- `content` (string, requerido): Contenido completo del documento

**Response exitosa**:
```json
{
  "message": "Document nuevo_documento.txt successfully added to vector stores",
  "vectorStores": [
    "nuevo_documento",  // Almacén individual creado
    "combined"          // Almacén combinado actualizado
  ]
}
```

**Response de error**:
```json
{
  "error": "filename and content are required"
}
```

**Códigos de estado**:
- `200 OK` - Documento agregado exitosamente
- `400 Bad Request` - Parámetros faltantes
- `500 Internal Server Error` - Error procesando el documento

---

### 5. **GET /api/users** - Listar Usuarios

**Descripción**: Retorna una lista de todos los usuarios que tienen historial de chat almacenado.

**Request**:
```http
GET /api/users
```

**Response**:
```json
{
  "users": [
    "default",
    "user123",
    "admin",
    "developer"
  ]
}
```

**Códigos de estado**:
- `200 OK` - Lista de usuarios retornada

---

### 6. **GET /api/users/:userId/vector-stores** - Almacenes por Usuario

**Descripción**: Lista todos los almacenes vectoriales donde un usuario específico tiene historial de conversaciones.

**Request**:
```http
GET /api/users/user123/vector-stores
```

**Response**:
```json
{
  "userId": "user123",
  "vectorStores": [
    "combined",
    "patrones_de_diseno",
    "guia_de_desarrollo"
  ]
}
```

**Códigos de estado**:
- `200 OK` - Lista retornada exitosamente

---

### 7. **GET /api/users/:userId/vector-stores/:vectorName/chats** - Chats por Usuario y Almacén

**Descripción**: Lista todos los chats (conversaciones) que un usuario tiene en un almacén vectorial específico.

**Request**:
```http
GET /api/users/user123/vector-stores/patrones_de_diseno/chats
```

**Response**:
```json
{
  "userId": "user123",
  "vectorName": "patrones_de_diseno",
  "chats": [
    "default",
    "chat456",
    "session_2024_01_15"
  ]
}
```

**Códigos de estado**:
- `200 OK` - Lista de chats retornada

---

### 8. **GET /api/users/:userId/vector-stores/:vectorName/chats/:chatId/messages** - Historial Completo

**Descripción**: Obtiene el historial completo de mensajes de una conversación específica.

**Request**:
```http
GET /api/users/user123/vector-stores/patrones_de_diseno/chats/chat456/messages
```

**Response**:
```json
{
  "userId": "user123",
  "vectorName": "patrones_de_diseno",
  "chatId": "chat456",
  "messages": [
    {
      "id": 0,
      "question": "¿Qué es el patrón Singleton?",
      "answer": "El patrón Singleton garantiza que una clase tenga solo una instancia...",
      "timestamp": "2024-01-15T10:30:00.000Z"
    },
    {
      "id": 1,
      "question": "¿Cuándo debo usar Factory Pattern?",
      "answer": "El patrón Factory es útil cuando necesitas crear objetos...",
      "timestamp": "2024-01-15T10:32:00.000Z"
    }
  ]
}
```

**Códigos de estado**:
- `200 OK` - Historial retornado exitosamente

---

### 9. **DELETE /api/users/:userId/vector-stores/:vectorName/chats/:chatId** - Limpiar Historial

**Descripción**: Elimina todo el historial de una conversación específica.

**Request**:
```http
DELETE /api/users/user123/vector-stores/patrones_de_diseno/chats/chat456
```

**Response**:
```json
{
  "message": "Chat history cleared successfully",
  "userId": "user123",
  "vectorName": "patrones_de_diseno",
  "chatId": "chat456"
}
```

**Códigos de estado**:
- `200 OK` - Historial eliminado exitosamente

---

## 🛡️ Características de Seguridad y Validación

### **CORS**
- **Configuración**: Habilitado para todos los orígenes por defecto
- **Personalización**: Configurable con variable `CORS_ORIGIN`

### **Validación de Entrada**
- **Campos requeridos**: Validación automática de parámetros obligatorios
- **Tipos de datos**: Verificación de tipos JSON
- **Tamaño de payload**: Límite de 10MB para documentos

### **Manejo de Errores**
- **Códigos HTTP estándar**: Respuestas consistentes
- **Mensajes descriptivos**: Errores informativos para debugging
- **Logs detallados**: Registro completo de errores del servidor

## 🚀 Ejemplos de Uso con cURL

### Chat básico:
```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"question": "¿Qué información tienes sobre TypeScript?"}'
```

### Chat con almacén específico:
```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "question": "Explica los patrones de diseño más importantes",
    "vectorStore": "patrones_de_diseno",
    "userId": "developer",
    "chatId": "session_123"
  }'
```

### Subir documento:
```bash
curl -X POST http://localhost:3000/api/add-document \
  -H "Content-Type: application/json" \
  -d '{
    "filename": "nuevo_manual.txt",
    "content": "Este es el contenido del nuevo manual técnico..."
  }'
```

### Listar almacenes:
```bash
curl http://localhost:3000/api/vector-stores
```

### Obtener historial:
```bash
curl http://localhost:3000/api/users/developer/vector-stores/patrones_de_diseno/chats/session_123/messages
```

## 🔧 Configuración del Servidor

### Variables de Entorno
```env
PORT=3000                    # Puerto del servidor
CORS_ORIGIN=*               # Configuración CORS
MAX_REQUEST_SIZE=10mb       # Tamaño máximo de requests
REQUEST_TIMEOUT=30000       # Timeout de requests (ms)
```

### Middleware Configurado
- **CORS**: Habilitado para desarrollo
- **JSON Parser**: Límite de 10MB
- **Error Handler**: Manejo centralizado de errores
- **Logging**: Registro de todas las requests

---

**Siguiente**: [CLI Interface](06-cli-interface.md)  
**Anterior**: [Estructura del Proyecto](04-estructura-del-proyecto.md) 