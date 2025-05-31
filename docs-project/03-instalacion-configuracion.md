# Instalación y Configuración - LangChain Document Chat

## 📋 Requisitos del Sistema

### Requisitos Mínimos
- **Node.js**: v16.0 o superior
- **npm**: v8.0 o superior (incluido con Node.js)
- **Sistema Operativo**: Windows 10+, macOS 10.15+, Linux (Ubuntu 18.04+)
- **Memoria RAM**: 4GB mínimo, 8GB recomendado
- **Espacio en disco**: 2GB libres mínimo

### Requisitos de API
- **OpenAI API Key**: Cuenta activa en OpenAI con créditos disponibles
- **Conexión a internet**: Para comunicación con APIs de OpenAI

### Dependencias del Sistema
```bash
# Python (para faiss-node)
python >= 3.7

# Build tools (Windows)
npm install -g windows-build-tools

# Build tools (Linux/macOS)
sudo apt-get install build-essential  # Ubuntu/Debian
xcode-select --install                # macOS
```

## 🚀 Instalación Paso a Paso

### 1. Clonar el Repositorio

```bash
# Opción 1: Clonar desde Git
git clone https://github.com/tu-usuario/langchain-document-chat.git
cd langchain-document-chat

# Opción 2: Descargar ZIP
# Descargar y extraer el archivo ZIP del proyecto
```

### 2. Instalar Dependencias

```bash
# Usando npm (recomendado)
npm install

# O usando yarn
yarn install

# Verificar instalación
npm list --depth=0
```

### 3. Configurar Variables de Entorno

#### Crear archivo `.env`
```bash
# Copiar el archivo de ejemplo
cp .env.example .env

# O crear manualmente
touch .env
```

#### Configurar `.env`
```env
# ===============================
# CONFIGURACIÓN OBLIGATORIA
# ===============================

# OpenAI API Key (REQUERIDO)
OPENAI_API_KEY=sk-tu_api_key_aqui

# ===============================
# CONFIGURACIÓN OPCIONAL
# ===============================

# Puerto del servidor API (default: 3000)
PORT=3000

# Entorno de ejecución
NODE_ENV=development

# Configuración del modelo
MODEL_NAME=gpt-3.5-turbo
EMBEDDING_MODEL=text-embedding-3-small
TEMPERATURE=0.0
MAX_TOKENS=2048

# Configuración de fragmentación
CHUNK_SIZE=1000
CHUNK_OVERLAP=200

# Configuración de búsqueda
RETRIEVER_K=5

# Configuración de logs
LOG_LEVEL=info
DEBUG=false
```

### 4. Obtener OpenAI API Key

#### Paso a paso:
1. Visita [OpenAI Platform](https://platform.openai.com/)
2. Crea una cuenta o inicia sesión
3. Ve a **API Keys** en el menú
4. Clic en **Create new secret key**
5. Copia la clave y pégala en tu archivo `.env`

#### Verificar configuración:
```bash
# Verificar que la API key está configurada
echo $OPENAI_API_KEY

# O en Windows
echo %OPENAI_API_KEY%
```

### 5. Preparar Documentos

```bash
# Crear carpeta de documentos (si no existe)
mkdir docs

# Agregar documentos de ejemplo
echo "Este es un documento de ejemplo." > docs/ejemplo.txt
echo "Otro documento con información relevante." > docs/info.txt
```

### 6. Compilar el Proyecto

```bash
# Compilar TypeScript a JavaScript
npm run build

# Verificar compilación
ls -la dist/
```

## ⚙️ Configuración Avanzada

### Configuración de TypeScript

**`tsconfig.json`**:
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "esModuleInterop": true,
    "strict": true,
    "outDir": "dist",
    "sourceMap": true,
    "declaration": true,
    "skipLibCheck": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "docs"]
}
```

### Configuración de Package.json

**Scripts personalizados**:
```json
{
  "scripts": {
    "dev": "node --loader ts-node/esm src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "cli": "node --loader ts-node/esm src/cli.ts",
    "test": "jest",
    "lint": "eslint src/**/*.ts",
    "clean": "rm -rf dist vectorstores"
  }
}
```

### Configuración de FAISS

**Problemas comunes con faiss-node**:
```bash
# Si falla la instalación de faiss-node
npm install --build-from-source faiss-node

# En sistemas con Apple Silicon (M1/M2)
arch -x86_64 npm install faiss-node

# En Windows con Visual Studio
npm config set msvs_version 2019
npm install faiss-node
```

## 🧪 Verificación de Instalación

### 1. Test de Conectividad

```bash
# Crear archivo de test
cat > test-setup.js << 'EOF'
import { config } from 'dotenv';
import { OpenAI } from '@langchain/openai';

config();

async function testSetup() {
  try {
    // Test API key
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY no está configurada');
    }
    
    // Test modelo
    const model = new OpenAI({
      openAIApiKey: process.env.OPENAI_API_KEY,
      temperature: 0
    });
    
    const response = await model.call("Test de conectividad");
    console.log('✅ Configuración correcta');
    console.log('Respuesta de prueba:', response);
    
  } catch (error) {
    console.error('❌ Error en configuración:', error.message);
  }
}

testSetup();
EOF

# Ejecutar test
node test-setup.js
```

### 2. Test de Compilación

```bash
# Verificar compilación
npm run build

# Verificar archivos generados
ls -la dist/
```

### 3. Test de CLI

```bash
# Test CLI básico
npm run cli

# Debería mostrar:
# "Initializing chat application with documents..."
# "Available vector stores:"
```

### 4. Test de API

```bash
# Terminal 1: Iniciar servidor
npm run dev

# Terminal 2: Test endpoint
curl http://localhost:3000/
curl http://localhost:3000/api/vector-stores
```

## 🐛 Solución de Problemas Comunes

### Error: "Cannot find module 'faiss-node'"

```bash
# Solución 1: Reinstalar
npm uninstall faiss-node
npm install faiss-node

# Solución 2: Build manual
npm install --build-from-source faiss-node

# Solución 3: Usar versión específica
npm install faiss-node@0.5.1
```

### Error: "OPENAI_API_KEY is not set"

```bash
# Verificar archivo .env
cat .env | grep OPENAI_API_KEY

# Verificar formato (sin espacios extra)
OPENAI_API_KEY=sk-tu_key_sin_espacios
```

### Error: "Permission denied"

```bash
# Linux/macOS: Permisos de ejecución
chmod +x node_modules/.bin/*

# Windows: Ejecutar como administrador
# PowerShell como administrador
```

### Error: "Module not found" en TypeScript

```bash
# Limpiar y reinstalar
rm -rf node_modules package-lock.json
npm install

# Verificar tsconfig.json
npm run build
```

## 🔧 Configuración de Desarrollo

### ESLint y Prettier

```bash
# Instalar herramientas de desarrollo
npm install -D eslint prettier @typescript-eslint/parser @typescript-eslint/eslint-plugin

# Configurar .eslintrc.js
cat > .eslintrc.js << 'EOF'
module.exports = {
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended',
    '@typescript-eslint/recommended'
  ],
  env: {
    node: true,
    es2020: true
  }
};
EOF
```

### Jest para Testing

```bash
# Instalar Jest
npm install -D jest @types/jest ts-jest

# Configurar jest.config.js
cat > jest.config.js << 'EOF'
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts']
};
EOF
```

### Nodemon para Development

```bash
# Instalar nodemon
npm install -D nodemon

# Agregar script en package.json
"dev:watch": "nodemon --exec node --loader ts-node/esm src/index.ts"
```

## 📝 Archivo de Configuración Completo

**`.env` completo**:
```env
# ===============================
# OPENAI CONFIGURATION
# ===============================
OPENAI_API_KEY=sk-tu_api_key_aqui
MODEL_NAME=gpt-3.5-turbo
EMBEDDING_MODEL=text-embedding-3-small
TEMPERATURE=0.0
MAX_TOKENS=2048

# ===============================
# SERVER CONFIGURATION
# ===============================
PORT=3000
NODE_ENV=development
CORS_ORIGIN=*

# ===============================
# DOCUMENT PROCESSING
# ===============================
CHUNK_SIZE=1000
CHUNK_OVERLAP=200
DOCS_DIRECTORY=docs
VECTORSTORE_DIRECTORY=vectorstores

# ===============================
# RETRIEVAL CONFIGURATION
# ===============================
RETRIEVER_K=5
SIMILARITY_THRESHOLD=0.7

# ===============================
# LOGGING & DEBUG
# ===============================
LOG_LEVEL=info
DEBUG=false
VERBOSE=true

# ===============================
# PERFORMANCE
# ===============================
MAX_CONCURRENT_REQUESTS=10
REQUEST_TIMEOUT=30000
MEMORY_LIMIT=2048
```

## ✅ Checklist de Instalación

- [ ] Node.js v16+ instalado
- [ ] Proyecto clonado/descargado
- [ ] Dependencias instaladas (`npm install`)
- [ ] Archivo `.env` creado y configurado
- [ ] OpenAI API Key válida configurada
- [ ] Proyecto compilado (`npm run build`)
- [ ] Documentos agregados a carpeta `docs/`
- [ ] CLI funcional (`npm run cli`)
- [ ] API funcional (`npm run dev`)
- [ ] Tests básicos ejecutados

---

**Siguiente**: [Estructura del Proyecto](04-estructura-del-proyecto.md)  
**Anterior**: [Arquitectura Técnica](02-arquitectura-tecnica.md) 