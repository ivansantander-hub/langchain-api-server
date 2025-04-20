# LangChain Document Chat

Esta aplicación utiliza LangChain para crear un sistema de chat que responde preguntas basadas en documentos utilizando Retrieval-Augmented Generation (RAG).

## Funcionalidades

- **Gestión de documentos**:
  - Carga documentos de texto (.txt) desde la carpeta `docs/`
  - API para subir nuevos documentos a través del endpoint `/api/add-document`
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

- **Interfaces**:
  - API REST para integración con aplicaciones frontend
  - Interfaz de línea de comandos (CLI) para consultas directas
  - Endpoints para listar almacenes vectoriales disponibles

## Arquitectura técnica

- **Diseño modular**: La aplicación está estructurada en componentes independientes:
  - `document.ts`: Carga, particionado y gestión de documentos
  - `vectorstore.ts`: Gestión de embeddings y almacenes vectoriales
  - `model.ts`: Configuración del modelo de lenguaje y cadenas de procesamiento
  - `chat.ts`: Inicialización y coordinación del sistema
  - `api.ts`: Servidor REST API
  - `interface.ts`: Interfaz de línea de comandos

- **Tecnologías**:
  - TypeScript con Node.js para el backend
  - Express para la API REST
  - LangChain como framework de integración
  - FAISS para búsqueda vectorial eficiente
  - OpenAI para embeddings y generación de texto

## Requisitos

- Node.js (v16 o superior)
- Una clave API de OpenAI

## Configuración

1. Clona este repositorio
2. Instala las dependencias:
   ```
   npm install
   ```
3. Copia el archivo `.env.example` a `.env` y agrega tu clave API de OpenAI:
   ```
   OPENAI_API_KEY=tu_clave_api_aquí
   ```

## Uso

### API REST

1. Coloca tus documentos de texto en la carpeta `docs/`
2. Ejecuta la aplicación:
   ```
   npm run dev
   ```
3. La API estará disponible en http://localhost:3000

#### Endpoints disponibles:

- **GET `/`**: Información general de la API
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
    "vectorStore": "nombre_del_almacen" // Opcional, si se omite usa "combined"
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
├── src/                   # Código fuente de la aplicación
│   ├── lib/               # Módulos principales
│   │   ├── document.ts    # Gestión de documentos
│   │   ├── vectorstore.ts # Gestión de almacenes vectoriales
│   │   ├── model.ts       # Configuración del modelo de lenguaje
│   │   ├── chat.ts        # Inicialización del sistema
│   │   ├── api.ts         # Servidor REST API
│   │   └── interface.ts   # Interfaz de línea de comandos
│   ├── index.ts           # Punto de entrada para la API
│   └── cli.ts             # Punto de entrada para la CLI
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

## Contribuciones

Las contribuciones son bienvenidas. Si deseas mejorar esta aplicación, puedes:

1. Crear un fork del repositorio
2. Crear una rama con tu característica (`git checkout -b feature/nueva-caracteristica`)
3. Realizar tus cambios
4. Commit de tus cambios (`git commit -m 'Agrega nueva característica'`)
5. Push a la rama (`git push origin feature/nueva-caracteristica`)
6. Abrir un Pull Request 