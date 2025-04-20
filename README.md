# LangChain Document Chat

Esta aplicación utiliza LangChain para crear un sistema de chat que responde preguntas basadas en documentos.

## Funcionalidades

- Carga documentos de texto desde la carpeta `docs/`
- Fragmenta los documentos en pedazos más pequeños
- Crea embeddings utilizando OpenAI
- Almacena los vectores en una base de datos FAISS local
- Responde preguntas sobre el contenido de los documentos con RAG (Retrieval-Augmented Generation)
- Muestra las fuentes de información utilizadas para generar las respuestas

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

1. Coloca tus documentos de texto en la carpeta `docs/`
2. Ejecuta la aplicación:
   ```
   npm run dev
   ```
3. Realiza preguntas sobre el contenido de tus documentos
4. Escribe "salir" para terminar la sesión

## Estructura del proyecto

- `src/` - Código fuente de la aplicación
- `docs/` - Documentos de texto para consultar
- `vectorstore/` - Base de datos vectorial FAISS (generada automáticamente)

## Opciones de configuración

Puedes modificar los siguientes parámetros en `src/index.ts`:

- Tamaño de fragmentos (`chunkSize`)
- Superposición de fragmentos (`chunkOverlap`)
- Número de documentos recuperados (`k`)
- Modelo de lenguaje (`modelName`)
- Temperatura de generación (`temperature`) 