# Configuración de Tests en Railway

Este proyecto está configurado para ejecutar tests automáticamente en Railway durante el proceso de deployment.

## 🔧 Configuración Implementada

### 1. **Tests durante el Build** (Dockerfile)
- Los tests se ejecutan durante la fase de build del Docker container
- Si los tests fallan, el deployment se cancela automáticamente
- Se usan variables de entorno de prueba durante los tests

### 2. **Scripts NPM Configurados**
```bash
npm run test:ci       # Tests optimizados para CI/CD (silent, coverage)
npm run railway:test  # Build + Tests específicos para Railway
```

### 3. **Archivos de Configuración**

#### `Dockerfile`
- **Línea clave**: `RUN npm run test:ci` en la etapa de build
- Si los tests fallan, el build se detiene y no se despliega

#### `railway.toml`
```toml
[build]
builder = "dockerfile"

[env]
NODE_ENV = "production"
```

#### `jest.config.cjs`
- Configuración específica para CI (`process.env.CI === 'true'`)
- Reportes silenciosos para logs más limpios
- Coverage automático

### 4. **Archivos Alternativos Creados**

#### `Dockerfile.test` 
- Dockerfile específico solo para tests (alternativo)

#### `nixpacks.toml`
- Configuración alternativa usando Nixpacks en lugar de Docker

#### `railway-test.sh`
- Script bash para ejecutar tests manualmente

#### `.github/workflows/railway-tests.yml`
- GitHub Actions para tests (si prefieres usar GitHub Actions)

## 🚀 Cómo Funciona

1. **Push a Railway**: Cuando haces push al repositorio conectado con Railway
2. **Build Inicia**: Railway construye el Docker container
3. **Tests Ejecutan**: Durante el build, se ejecutan automáticamente los tests
4. **Resultado**:
   - ✅ **Tests Pasan**: El deployment continúa normalmente
   - ❌ **Tests Fallan**: El build se cancela, no se despliega

## 📊 Monitoreo

- Los logs de tests aparecen en los logs de build de Railway
- Los tests incluyen coverage report
- Variables de entorno de prueba están configuradas automáticamente

## 🎯 Comandos Útiles

```bash
# Ejecutar tests localmente como en Railway
npm run test:ci

# Ejecutar tests con coverage
npm run test:coverage

# Ejecutar solo tests e2e
npm run test:e2e

# Test específico para Railway
npm run railway:test
```

## 🔒 Seguridad

- Se usan variables de entorno de prueba durante los tests
- No se exponen API keys reales durante el testing
- Tests aislados del entorno de producción

## 📝 Notas

- Los tests se ejecutan en **cada deployment**
- El proceso agrega aproximadamente 1-2 minutos al tiempo de build
- Los tests verifican tanto la aplicación principal como el CLI
- Incluye tests unitarios y end-to-end 