# Guía de Desarrollo y Contribución - LangChain Document Chat

## 🚀 Introducción

¡Bienvenido al desarrollo de LangChain Document Chat! Esta guía te ayudará a configurar tu entorno de desarrollo, entender la estructura del proyecto y contribuir eficazmente.

## 🛠️ Configuración del Entorno de Desarrollo

### **Prerrequisitos**

```bash
# Software requerido
- Node.js 18+ (recomendado 20+)
- npm 9+ o yarn 3+
- Git 2.30+
- VS Code o similar IDE
- Cuenta OpenAI con API key

# Herramientas opcionales pero recomendadas
- Docker & Docker Compose
- Postman o Insomnia (para testing API)
- Redis (para cache avanzado)
```

### **Clonación y Setup Inicial**

```bash
# 1. Clonar el repositorio
git clone https://github.com/usuario/langchain-document-chat.git
cd langchain-document-chat

# 2. Instalar dependencias
npm install
# o
yarn install

# 3. Configurar variables de entorno
cp .env.example .env.development
# Editar .env.development con tus configuraciones

# 4. Crear directorios necesarios
mkdir -p docs vectorstores chat-history temp backups logs

# 5. Instalar herramientas de desarrollo globales
npm install -g typescript ts-node nodemon eslint prettier
```

### **Estructura de Variables de Entorno para Desarrollo**

```env
# .env.development
NODE_ENV=development
PORT=3000
HOST=localhost

# OpenAI (REQUERIDO)
OPENAI_API_KEY=sk-your-openai-key-here

# Configuración de desarrollo
LLM_MODEL=gpt-3.5-turbo
LLM_TEMPERATURE=0.2
LLM_MAX_TOKENS=500
LOG_LEVEL=debug
ENABLE_METRICS=true
ENABLE_PERFORMANCE_LOGS=true

# Directorios
DOCS_DIRECTORY=docs
VECTORSTORE_DIRECTORY=vectorstores
CHAT_HISTORY_DIRECTORY=chat-history

# Desarrollo - valores optimizados para desarrollo local
CHUNK_SIZE=500
CHUNK_OVERLAP=50
RETRIEVER_K=3
RESPONSE_CACHE_DURATION=60000
CONCURRENT_REQUESTS=5

# Seguridad - relajada para desarrollo
ENABLE_CORS=true
CORS_ORIGIN=*
ENABLE_API_KEY=false
ENABLE_REQUEST_VALIDATION=false

# Budget - límites conservadores para desarrollo
DAILY_BUDGET=2.00
MONTHLY_BUDGET=20.00
ENABLE_COST_TRACKING=true
```

## 📁 Estructura del Proyecto

### **Arquitectura de Directorios**

```
langchain-document-chat/
├── src/                          # Código fuente principal
│   ├── core/                     # Módulos centrales
│   │   ├── chat.ts              # Gestión de conversaciones
│   │   ├── document.ts          # Procesamiento de documentos
│   │   ├── vectorstore.ts       # Gestión de almacenes vectoriales
│   │   ├── model.ts             # Configuración de modelos
│   │   ├── chatHistory.ts       # Sistema de historial
│   │   └── interface.ts         # Interfaces TypeScript
│   ├── api/                      # API REST
│   │   ├── routes/              # Rutas de la API
│   │   ├── middleware/          # Middleware personalizado
│   │   ├── controllers/         # Controladores
│   │   └── server.ts            # Servidor Express
│   ├── cli/                      # Interfaz de línea de comandos
│   │   ├── commands/            # Comandos CLI individuales
│   │   └── index.ts             # Entry point CLI
│   ├── agents/                   # Agentes LangChain
│   │   ├── tools/               # Herramientas para agentes
│   │   ├── chains/              # Cadenas específicas
│   │   └── executors/           # Ejecutores de agentes
│   ├── utils/                    # Utilidades generales
│   │   ├── cache.ts             # Sistema de cache
│   │   ├── logger.ts            # Sistema de logging
│   │   ├── metrics.ts           # Métricas y monitoring
│   │   ├── validation.ts        # Validación de datos
│   │   └── costs.ts             # Tracking de costos
│   ├── config/                   # Configuraciones
│   │   ├── env.ts               # Variables de entorno
│   │   ├── database.ts          # Configuración DB
│   │   └── profiles.ts          # Perfiles de configuración
│   └── types/                    # Definiciones de tipos
│       ├── api.ts               # Tipos para API
│       ├── chat.ts              # Tipos para chat
│       └── documents.ts         # Tipos para documentos
├── tests/                        # Pruebas automatizadas
│   ├── unit/                    # Pruebas unitarias
│   ├── integration/             # Pruebas de integración
│   ├── e2e/                     # Pruebas end-to-end
│   └── fixtures/                # Datos de prueba
├── docs/                         # Documentos para procesamiento
├── docs-project/                 # Documentación del proyecto
├── scripts/                      # Scripts de automatización
│   ├── setup.sh                # Setup inicial
│   ├── build.sh                # Script de build
│   ├── test.sh                 # Ejecutor de tests
│   └── deploy.sh               # Script de despliegue
├── docker/                       # Configuración Docker
│   ├── Dockerfile              # Imagen principal
│   ├── docker-compose.yml      # Orquestación
│   └── nginx.conf              # Configuración Nginx
├── .github/                      # GitHub workflows
│   └── workflows/              # CI/CD pipelines
├── config/                       # Configuraciones externas
│   ├── tsconfig.json           # TypeScript config
│   ├── eslint.config.js        # ESLint config
│   ├── prettier.config.js      # Prettier config
│   └── jest.config.js          # Jest config
└── package.json                  # Dependencias y scripts
```

### **Módulos Principales**

```typescript
// src/core/index.ts - Entry point de módulos centrales
export { ChatManager } from './chat';
export { DocumentProcessor } from './document';
export { VectorStoreManager } from './vectorstore';
export { ModelManager } from './model';
export { ChatHistoryManager } from './chatHistory';
export * from './interface';

// src/api/index.ts - Entry point de API
export { createAPIServer } from './server';
export { ChatController } from './controllers/chat';
export { DocumentController } from './controllers/document';

// src/cli/index.ts - Entry point de CLI
export { CLIManager } from './commands';

// src/utils/index.ts - Entry point de utilidades
export { Logger } from './logger';
export { CacheManager } from './cache';
export { MetricsCollector } from './metrics';
export { CostTracker } from './costs';
```

## 🔧 Scripts de Desarrollo

### **Scripts Principales**

```json
{
  "scripts": {
    "dev": "nodemon --exec ts-node src/api/server.ts",
    "dev:cli": "ts-node src/cli/index.ts",
    "build": "tsc && npm run copy-assets",
    "build:production": "npm run clean && npm run build && npm run optimize",
    "start": "node dist/api/server.js",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:e2e": "jest --config jest.e2e.config.js",
    "lint": "eslint src/**/*.ts",
    "lint:fix": "eslint src/**/*.ts --fix",
    "format": "prettier --write src/**/*.ts",
    "type-check": "tsc --noEmit",
    "clean": "rimraf dist",
    "copy-assets": "cp -r src/assets dist/ || true",
    "optimize": "terser dist/**/*.js --compress --mangle --output dist/",
    "setup:dev": "npm run setup:dirs && npm run setup:env && npm run setup:docs",
    "setup:dirs": "mkdir -p docs vectorstores chat-history temp backups logs",
    "setup:env": "cp .env.example .env.development",
    "setup:docs": "node scripts/setup-sample-docs.js"
  }
}
```

### **Scripts de Automatización**

```bash
#!/bin/bash
# scripts/setup.sh - Setup completo del entorno de desarrollo

echo "🚀 Configurando entorno de desarrollo..."

# 1. Verificar prerrequisitos
check_prerequisites() {
    echo "📋 Verificando prerrequisitos..."
    
    if ! command -v node &> /dev/null; then
        echo "❌ Node.js no está instalado"
        exit 1
    fi
    
    if ! command -v npm &> /dev/null; then
        echo "❌ npm no está instalado"
        exit 1
    fi
    
    echo "✅ Prerrequisitos verificados"
}

# 2. Instalar dependencias
install_dependencies() {
    echo "📦 Instalando dependencias..."
    npm install
    echo "✅ Dependencias instaladas"
}

# 3. Configurar entorno
setup_environment() {
    echo "⚙️ Configurando entorno..."
    
    if [ ! -f ".env.development" ]; then
        cp .env.example .env.development
        echo "📝 Archivo .env.development creado"
        echo "🔧 Por favor, edita .env.development con tu API key de OpenAI"
    fi
    
    # Crear directorios
    mkdir -p docs vectorstores chat-history temp backups logs
    echo "📁 Directorios creados"
}

# 4. Configurar Git hooks
setup_git_hooks() {
    echo "🔧 Configurando Git hooks..."
    
    cat > .git/hooks/pre-commit << 'EOF'
#!/bin/bash
npm run lint:fix
npm run format
npm run type-check
EOF
    
    chmod +x .git/hooks/pre-commit
    echo "✅ Git hooks configurados"
}

# 5. Generar documentos de prueba
setup_sample_docs() {
    echo "📄 Generando documentos de prueba..."
    
    cat > docs/sample-doc-1.txt << 'EOF'
# Documento de Prueba 1

Este es un documento de prueba para el desarrollo de LangChain Document Chat.

## Contenido de Ejemplo

Este documento contiene información sobre:
- Desarrollo de software
- Inteligencia artificial
- Procesamiento de lenguaje natural

El sistema debería poder procesar este contenido y responder preguntas relacionadas.
EOF

    cat > docs/sample-doc-2.txt << 'EOF'
# Guía de Usuario

Esta es una guía de usuario para el sistema LangChain Document Chat.

## Características Principales

- Procesamiento de documentos de texto
- Búsqueda semántica avanzada
- Respuestas contextuales mediante IA
- API REST y interfaz CLI

## Uso Básico

1. Cargar documentos en la carpeta docs/
2. Ejecutar el procesamiento de documentos
3. Hacer preguntas sobre el contenido
EOF
    
    echo "✅ Documentos de prueba creados"
}

# Ejecutar setup
main() {
    check_prerequisites
    install_dependencies
    setup_environment
    setup_git_hooks
    setup_sample_docs
    
    echo ""
    echo "🎉 Setup completado!"
    echo ""
    echo "📝 Próximos pasos:"
    echo "1. Edita .env.development con tu API key de OpenAI"
    echo "2. Ejecuta: npm run dev"
    echo "3. Visita: http://localhost:3000"
    echo ""
}

main
```

## 🧪 Pruebas y Testing

### **Configuración de Jest**

```javascript
// jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: [
    '**/__tests__/**/*.ts',
    '**/*.(test|spec).ts'
  ],
  transform: {
    '^.+\\.ts$': 'ts-jest'
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/__tests__/**',
    '!src/**/index.ts'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  testTimeout: 30000,
  maxWorkers: 4
};
```

### **Estructura de Pruebas**

```typescript
// tests/unit/core/chat.test.ts
import { ChatManager } from '../../../src/core/chat';
import { MockModelManager } from '../../mocks/modelManager';
import { MockVectorStoreManager } from '../../mocks/vectorStoreManager';

describe('ChatManager', () => {
  let chatManager: ChatManager;
  let mockModelManager: MockModelManager;
  let mockVectorStoreManager: MockVectorStoreManager;
  
  beforeEach(() => {
    mockModelManager = new MockModelManager();
    mockVectorStoreManager = new MockVectorStoreManager();
    chatManager = new ChatManager(mockModelManager, mockVectorStoreManager);
  });
  
  describe('chat', () => {
    it('should process simple query', async () => {
      const response = await chatManager.chat('Hello, how are you?');
      
      expect(response).toBeDefined();
      expect(response.message).toContain('Hello');
      expect(response.sources).toBeDefined();
    });
    
    it('should handle document-based query', async () => {
      mockVectorStoreManager.mockSearchResults([
        {
          pageContent: 'Test document content',
          metadata: { source: 'test.txt' }
        }
      ]);
      
      const response = await chatManager.chat('What is in the test document?');
      
      expect(response.sources).toHaveLength(1);
      expect(response.sources[0]).toBe('test.txt');
    });
    
    it('should handle errors gracefully', async () => {
      mockModelManager.throwError('API Error');
      
      const response = await chatManager.chat('Test query');
      
      expect(response.error).toBeDefined();
      expect(response.message).toContain('error');
    });
  });
});

// tests/integration/api/chat.test.ts
import request from 'supertest';
import { createAPIServer } from '../../../src/api/server';

describe('Chat API Integration', () => {
  let app: any;
  
  beforeAll(async () => {
    app = await createAPIServer();
  });
  
  describe('POST /api/chat', () => {
    it('should respond to chat request', async () => {
      const response = await request(app)
        .post('/api/chat')
        .send({
          message: 'Hello, test query',
          sessionId: 'test-session'
        });
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('sources');
    });
    
    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/chat')
        .send({});
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });
  });
});
```

### **Mocks y Fixtures**

```typescript
// tests/mocks/modelManager.ts
import { ModelManager } from '../../src/core/model';

export class MockModelManager extends ModelManager {
  private shouldThrowError = false;
  private errorMessage = '';
  
  constructor() {
    super('test-api-key');
  }
  
  throwError(message: string): void {
    this.shouldThrowError = true;
    this.errorMessage = message;
  }
  
  async generateResponse(prompt: string): Promise<string> {
    if (this.shouldThrowError) {
      throw new Error(this.errorMessage);
    }
    
    return `Mock response for: ${prompt}`;
  }
}

// tests/fixtures/documents.ts
export const SAMPLE_DOCUMENTS = [
  {
    content: 'This is a sample document about artificial intelligence.',
    metadata: { source: 'ai-doc.txt', type: 'text' }
  },
  {
    content: 'Guide to using LangChain for document processing.',
    metadata: { source: 'langchain-guide.txt', type: 'text' }
  }
];

export const SAMPLE_CHAT_SESSIONS = [
  {
    sessionId: 'test-session-1',
    messages: [
      { role: 'user', content: 'What is AI?' },
      { role: 'assistant', content: 'AI is artificial intelligence...' }
    ]
  }
];
```

## 🔄 Flujo de Trabajo de Desarrollo

### **Branching Strategy**

```bash
# Estructura de branches
main                    # Producción estable
├── develop            # Integración de desarrollo
├── feature/           # Nuevas características
│   ├── feature/chat-improvements
│   ├── feature/agent-system
│   └── feature/advanced-search
├── bugfix/            # Corrección de bugs
│   ├── bugfix/memory-leak
│   └── bugfix/search-accuracy
├── hotfix/            # Correcciones urgentes
└── release/           # Preparación de releases
    └── release/v2.1.0
```

### **Workflow de Desarrollo**

```bash
# 1. Crear nueva feature
git checkout develop
git pull origin develop
git checkout -b feature/nueva-funcionalidad

# 2. Desarrollo
# ... hacer cambios ...

# 3. Testing local
npm run test
npm run lint:fix
npm run type-check

# 4. Commit siguiendo convenciones
git add .
git commit -m "feat: agregar nueva funcionalidad de búsqueda avanzada"

# 5. Push y crear PR
git push origin feature/nueva-funcionalidad
# Crear Pull Request en GitHub

# 6. Después de aprobación y merge
git checkout develop
git pull origin develop
git branch -d feature/nueva-funcionalidad
```

### **Convenciones de Commits**

```bash
# Formato: tipo(alcance): descripción

# Tipos disponibles:
feat:     # Nueva funcionalidad
fix:      # Corrección de bug
docs:     # Cambios en documentación
style:    # Formato, punto y coma, etc
refactor: # Refactoring de código
test:     # Agregar o modificar tests
chore:    # Cambios en build, etc

# Ejemplos:
feat(chat): agregar soporte para múltiples idiomas
fix(vectorstore): corregir error en búsqueda semántica
docs(api): actualizar documentación de endpoints
test(core): agregar tests para ChatManager
refactor(utils): simplificar función de validación
```

## 📋 Guidelines de Contribución

### **Estándares de Código**

```typescript
// 1. Naming Conventions
// Clases: PascalCase
export class DocumentProcessor { }

// Interfaces: PascalCase con prefijo I (opcional)
export interface IChatResponse { }

// Funciones/Variables: camelCase
const vectorStoreManager = new VectorStoreManager();

// Constantes: UPPER_SNAKE_CASE
const DEFAULT_CHUNK_SIZE = 1000;

// 2. File Structure
// Cada archivo debe tener un propósito específico
// Exportar funciones/clases principales al final
// Imports organizados: external, internal, types

// 3. Error Handling
// Siempre manejar errores explícitamente
try {
  const result = await riskyOperation();
  return result;
} catch (error) {
  logger.error('Operation failed:', error);
  throw new CustomError('Specific error message', error);
}

// 4. Documentation
/**
 * Procesa documentos y crea embeddings vectoriales
 * @param documents Array de documentos a procesar
 * @param options Opciones de configuración
 * @returns Promise con resultado del procesamiento
 * @throws DocumentProcessingError si falla el procesamiento
 */
```

### **Checklist de Pull Request**

```markdown
## Pull Request Checklist

### ✅ Desarrollo
- [ ] El código sigue las convenciones establecidas
- [ ] Se agregaron/actualizaron tests necesarios
- [ ] Todos los tests pasan localmente
- [ ] Se ejecutó lint y se corrigieron problemas
- [ ] Se verificó type checking
- [ ] Se agregó documentación necesaria

### ✅ Funcionalidad
- [ ] La feature funciona como se esperaba
- [ ] Se probó en diferentes escenarios
- [ ] Se verificó compatibilidad con features existentes
- [ ] Se probó rendimiento si es relevante
- [ ] Se verificó que no hay regresiones

### ✅ Documentación
- [ ] Se actualizó documentación técnica
- [ ] Se agregaron comentarios en código complejo
- [ ] Se actualizó README si es necesario
- [ ] Se documentaron nuevas APIs/interfaces

### ✅ Testing
- [ ] Tests unitarios agregados/actualizados
- [ ] Tests de integración si es relevante
- [ ] Cobertura de tests mantiene nivel aceptable
- [ ] Tests pasan en CI/CD

### 📝 Descripción
Breve descripción de los cambios realizados...

### 🔧 Tipo de Cambio
- [ ] Bug fix
- [ ] Nueva feature
- [ ] Breaking change
- [ ] Refactoring
- [ ] Documentación
```

### **Proceso de Review**

```markdown
## Criterios de Review

### 🔍 Code Review Focus
1. **Funcionalidad**: ¿Hace lo que debería hacer?
2. **Performance**: ¿Es eficiente el código?
3. **Security**: ¿Hay vulnerabilidades potenciales?
4. **Maintainability**: ¿Es fácil de mantener?
5. **Testing**: ¿Está bien probado?

### 👥 Review Roles
- **Author**: Responder comentarios, hacer ajustes
- **Reviewer**: Dar feedback constructivo, aprobar cambios
- **Maintainer**: Decisión final, merge a develop

### ⏱️ Timeline Esperado
- Primera review: 24-48 horas
- Respuesta a comentarios: 24 horas
- Review final: 24 horas
- Merge: Inmediato tras aprobación
```

---

**Siguiente**: [Ejemplos Prácticos de Uso](15-ejemplos-uso.md)  
**Anterior**: [Configuración Avanzada](13-configuracion-avanzada.md) 