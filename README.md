# LangChain Document Chat

Esta aplicación utiliza LangChain para crear un sistema de chat que responde preguntas basadas en documentos.

## Funcionalidades

- Carga documentos de texto desde la carpeta `docs/`
- Fragmenta los documentos en pedazos más pequeños
- Crea embeddings utilizando OpenAI
- Almacena los vectores en bases de datos FAISS locales:
  - Vectoriza todos los documentos juntos en un almacén "combined"
  - Vectoriza cada documento individual en su propio almacén
- Responde preguntas sobre el contenido de los documentos con RAG (Retrieval-Augmented Generation)
- Permite seleccionar qué almacén de vectores utilizar para cada consulta
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

### API REST

1. Coloca tus documentos de texto en la carpeta `docs/`
2. Ejecuta la aplicación:
   ```
   npm run dev
   ```
3. La API estará disponible en http://localhost:3000
4. Envía consultas al endpoint `/api/chat` con el siguiente formato:
   ```json
   {
     "question": "¿Qué información hay sobre X?",
     "vectorStore": "nombre_del_almacen" // Opcional, si se omite usa "combined"
   }
   ```
5. Para ver los almacenes vectoriales disponibles, consulta el endpoint `/api/vector-stores`

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

- `src/` - Código fuente de la aplicación
- `docs/` - Documentos de texto para consultar
- `vectorstores/` - Base de datos vectorial FAISS (generada automáticamente)
  - `combined/` - Almacén con todos los documentos
  - `documento1/`, `documento2/`, etc. - Almacenes individuales para cada documento

## Opciones de configuración

Puedes modificar los siguientes parámetros en los archivos correspondientes:

- `src/lib/document.ts`: Tamaño de fragmentos (`chunkSize`) y superposición (`chunkOverlap`)
- `src/lib/vectorstore.ts`: Número de documentos recuperados (`k`) y configuración de embeddings
- `src/lib/model.ts`: Modelo de lenguaje (`modelName`) y temperatura de generación (`temperature`) 