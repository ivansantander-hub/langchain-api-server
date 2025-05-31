# LangChain Document Chat

Esta aplicación utiliza LangChain para crear un sistema de chat que responde preguntas basadas en documentos utilizando Retrieval-Augmented Generation (RAG). **Ahora incluye un cliente web completo integrado.**

## 🌟 Nuevas Funcionalidades Web

- **Cliente web integrado**: Interfaz React moderna accesible desde el navegador
- **Chat en tiempo real**: Interacción fluida con sistema de respuestas en vivo
- **Gestión de documentos**: Subida de archivos directamente desde el navegador
- **Múltiples bases de conocimiento**: Selección entre diferentes vector stores
- **Exportación de conversaciones**: Descarga del historial de chat
- **Responsive design**: Optimizado para escritorio y móviles

## Funcionalidades del Sistema

- **Gestión de documentos**:
  - Carga documentos de texto (.txt) desde la carpeta `docs/`
  - API para subir nuevos documentos a través del endpoint `/api/add-document`
  - **Subida web**: Upload de archivos (.txt, .md, .pdf) desde el navegador
  - Fragmenta los documentos en pedazos más pequeños para un procesamiento eficiente

- **Procesamiento de vectores**:
  - Crea embeddings utilizando el modelo `text-embedding-3-small` de OpenAI
  - Almacena los vectores en bases de datos FAISS locales:
    - Vectoriza todos los documentos juntos en un almacén "combined"
    - Vectoriza cada documento individual en su propio almacén
  - Sistema de gestión para cargar/crear/actualizar almacenes vectoriales

- **Generación de respuestas**:
  - Responde preguntas sobre el contenido de los documentos con RAG
  - Permite seleccionar qué almacén de vectores utilizar para cada consulta
  - Muestra las fuentes de información utilizadas para generar las respuestas
  - Sistema de cadenas de procesamiento optimizado para respuestas precisas

- **Interfaces múltiples**:
  - **🌐 Cliente web React**: Interfaz moderna y responsive (NUEVO)
  - API REST para integración con aplicaciones frontend
  - Interfaz de línea de comandos (CLI) para consultas directas
  - Endpoints para listar almacenes vectoriales disponibles

## Arquitectura técnica

- **Diseño modular**: La aplicación está estructurada en componentes independientes:
  - `document.ts`: Carga, particionado y gestión de documentos
  - `vectorstore.ts`: Gestión de embeddings y almacenes vectoriales
  - `model.ts`: Configuración del modelo de lenguaje y cadenas de procesamiento
  - `chat.ts`: Inicialización y coordinación del sistema
  - `api.ts`: Servidor REST API con middleware de archivos estáticos
  - `interface.ts`: Interfaz de línea de comandos

- **Cliente web integrado**:
  - React 18 via CDN (sin build tools)
  - CSS moderno con variables y responsive design
  - JavaScript ES6+ con Fetch API
  - Componentes modulares reutilizables

- **Tecnologías**:
  - TypeScript con Node.js para el backend
  - Express para la API REST y servir archivos estáticos
  - LangChain como framework de integración
  - FAISS para búsqueda vectorial eficiente
  - OpenAI para embeddings y generación de texto
  - React para la interfaz web

## Requisitos

- Node.js (v16 o superior)
- Una clave API de OpenAI

## 🚀 Despliegue en Railway

### Despliegue rápido:

1. **Haz fork** de este repositorio
2. **Conecta con Railway**:
   - Ve a [Railway.app](https://railway.app)
   - Conecta tu cuenta de GitHub
   - Selecciona este repositorio
3. **Configura variables de entorno**:
   - `OPENAI_API_KEY`: Tu clave API de OpenAI
   - `PORT`: Se asigna automáticamente por Railway
4. **Despliega**: Railway construirá y desplegará automáticamente

### Variables de entorno requeridas:
```
OPENAI_API_KEY=tu_clave_api_aquí
```

## Configuración Local

1. Clona este repositorio
2. Instala las dependencias:
   ```
   npm install
   ```
3. Crea un archivo `.env` y agrega tu clave API de OpenAI:
   ```
   OPENAI_API_KEY=tu_clave_api_aquí
   ```

## Uso

### 🌐 Cliente Web (Recomendado)

1. Coloca tus documentos de texto en la carpeta `docs/`
2. Ejecuta la aplicación:
   ```
   npm run build && npm start
   ```
3. **Abre tu navegador** en http://localhost:3000
4. **¡Disfruta la interfaz web completa!**
   - Sube documentos arrastrando archivos
   - Chatea con tus documentos en tiempo real
   - Cambia entre diferentes bases de conocimiento
   - Exporta conversaciones

### API REST

La API está disponible en http://localhost:3000

#### Endpoints disponibles:

- **GET `/`**: Sirve el cliente web
- **GET `/api`**: Información general de la API
- **GET `/api/vector-stores`**: Lista todos los almacenes vectoriales disponibles
- **POST `/api/add-document`**: Sube un nuevo documento
  ```json
  {
    "filename": "documento.txt",
    "content": "Contenido del documento..."
  }
  ```
- **POST `/api/chat`**: Envía consultas al sistema
  ```json
  {
    "question": "¿Qué información hay sobre X?",
    "vectorStore": "nombre_del_almacen", // Opcional, si se omite usa "combined"
    "userId": "usuario", // Opcional para historial separado
    "chatId": "sesion" // Opcional para múltiples conversaciones
  }
  ```

### Interfaz de línea de comandos (CLI)

1. Coloca tus documentos de texto en la carpeta `docs/`
2. Ejecuta la CLI:
   ```
   npm run cli
   ```
3. Realiza preguntas sobre el contenido de tus documentos
4. Para seleccionar un almacén vectorial específico, utiliza el prefijo `@nombre_almacen`:
   ```
   @documento1 ¿Qué información contiene este documento?
   ```
5. Si no se especifica un almacén, se utiliza el almacén "combined" con todos los documentos
6. Escribe "exit" para terminar la sesión

## Estructura del proyecto

```
proyecto/
├── docs/                  # Documentos de texto para consultar
├── vectorstores/          # Base de datos vectorial FAISS (generada automáticamente)
│   ├── combined/          # Almacén con todos los documentos
│   └── [documentos]/      # Almacenes individuales para cada documento
├── components/            # Componentes React del cliente web
│   ├── ChatMessage.js     # Componente para mensajes individuales
│   ├── ChatInterface.js   # Interfaz principal de chat
│   ├── DocumentManager.js # Gestión de subida de documentos
│   └── VectorStoreSelector.js # Selector de bases de conocimiento
├── src/                   # Código fuente de la aplicación
│   ├── lib/               # Módulos principales
│   │   ├── document.ts    # Gestión de documentos
│   │   ├── vectorstore.ts # Gestión de almacenes vectoriales
│   │   ├── model.ts       # Configuración del modelo de lenguaje
│   │   ├── chat.ts        # Inicialización del sistema
│   │   ├── api.ts         # Servidor REST API + archivos estáticos
│   │   └── interface.ts   # Interfaz de línea de comandos
│   ├── index.ts           # Punto de entrada para la API
│   └── cli.ts             # Punto de entrada para la CLI
├── index.html             # Cliente web principal
├── styles.css             # Estilos del cliente web
├── api.js                 # Cliente API JavaScript
├── app.js                 # Aplicación React principal
├── Procfile               # Configuración para Railway
├── railway.env.example    # Variables de entorno para Railway
├── package.json           # Dependencias y scripts
├── tsconfig.json          # Configuración de TypeScript
└── .env                   # Variables de entorno (API keys)
```

## Opciones de configuración

Puedes modificar los siguientes parámetros en los archivos correspondientes:

- **Parámetros de fragmentación** (`src/lib/document.ts`):
  - `chunkSize`: Tamaño de los fragmentos de texto (default: 1000)
  - `chunkOverlap`: Superposición entre fragmentos (default: 200)

- **Configuración de vectores** (`src/lib/vectorstore.ts`):
  - Modelo de embeddings: `text-embedding-3-small`
  - Dimensiones: 1536
  - `k`: Número de documentos recuperados (default: 5)

- **Modelo de lenguaje** (`src/lib/model.ts`):
  - Modelo: `gpt-3.5-turbo`
  - Temperatura: 0.0 (máxima precisión)
  - Prompt: Personalizable para controlar el estilo de respuesta

## Características técnicas adicionales

- **Gestión inteligente de vectores**: El sistema detecta automáticamente nuevos documentos y actualiza los almacenes vectoriales correspondientes
- **Recuperación de fuentes**: Todas las respuestas incluyen referencias a los fragmentos de texto utilizados
- **Manejo asíncrono**: Procesamiento eficiente de documentos y consultas
- **Respuestas contextuales**: El sistema utiliza la información relevante de los documentos para generar respuestas precisas
- **Cliente web integrado**: Sin necesidad de configuración adicional para la interfaz web
- **Escalable**: Listo para despliegue en plataformas cloud como Railway

## 🚀 Despliegue en Producción

### Railway (Recomendado)
- Configuración automática con el `Procfile` incluido
- Variables de entorno fáciles de configurar
- HTTPS automático
- Escalado automático

### Otros proveedores
- Heroku: Usar el mismo `Procfile`
- Vercel: Funciona con configuración mínima
- DigitalOcean App Platform: Compatible
- Render: Usar comando de build `npm run build && npm start`

## Contribuciones

Las contribuciones son bienvenidas. Si deseas mejorar esta aplicación, puedes:

1. Crear un fork del repositorio
2. Crear una rama con tu característica (`git checkout -b feature/nueva-caracteristica`)
3. Realizar tus cambios
4. Commit de tus cambios (`git commit -m 'Agrega nueva característica'`)
5. Push a la rama (`git push origin feature/nueva-caracteristica`)
6. Abrir un Pull Request 