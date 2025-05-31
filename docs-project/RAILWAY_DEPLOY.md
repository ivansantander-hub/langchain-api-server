# 🚂 Guía de Despliegue en Railway

Esta guía te ayudará a desplegar tu aplicación LangChain Document Chat en Railway de forma rápida y sencilla.

## 📋 Prerrequisitos

1. **Cuenta en Railway**: Regístrate en [railway.app](https://railway.app)
2. **Clave API de OpenAI**: Obtén tu clave desde [platform.openai.com](https://platform.openai.com/api-keys)
3. **Repositorio en GitHub**: Fork este repositorio a tu cuenta

## 🚀 Pasos para Desplegar

### 1. Preparar el Repositorio

```bash
# Si ya tienes el código local, asegúrate de que está actualizado
git add .
git commit -m "Preparado para Railway deployment"
git push origin main
```

### 2. Conectar con Railway

1. Ve a [railway.app](https://railway.app) e inicia sesión
2. Haz clic en **"New Project"**
3. Selecciona **"Deploy from GitHub repo"**
4. Autoriza Railway a acceder a tu GitHub si es necesario
5. Selecciona tu repositorio del proyecto

### 3. Configurar Variables de Entorno

En el dashboard de Railway:

1. Ve a la pestaña **"Variables"**
2. Agrega la siguiente variable:
   ```
   OPENAI_API_KEY=tu_clave_api_aquí
   ```
3. Haz clic en **"Add Variable"**

### 4. Configurar el Despliegue

Railway detectará automáticamente:
- ✅ **Procfile**: `web: npm run build && npm start`
- ✅ **package.json**: Para instalar dependencias
- ✅ **Puerto**: Se asigna automáticamente via `process.env.PORT`

### 5. Desplegar

1. Haz clic en **"Deploy"**
2. Railway automáticamente:
   - Instalará dependencias (`npm install`)
   - Construirá el proyecto (`npm run build`)
   - Iniciará la aplicación (`npm start`)
3. El proceso tomará 2-3 minutos

## 🌐 Acceder a tu Aplicación

Una vez desplegada:

1. Railway te proporcionará una URL única (ej: `https://tu-app.railway.app`)
2. **¡Abre la URL en tu navegador!**
3. Verás la interfaz web completa funcionando

## 🔧 Características del Despliegue

### Lo que funciona automáticamente:
- ✅ **Cliente web**: Interfaz React completa
- ✅ **API REST**: Todos los endpoints funcionando  
- ✅ **Subida de archivos**: Upload desde el navegador
- ✅ **Vector stores**: Almacenamiento persistente
- ✅ **HTTPS**: Certificado automático de Railway
- ✅ **Escalado**: Se ajusta según el tráfico

### URLs disponibles:
- **`/`**: Cliente web principal
- **`/api`**: Información de la API
- **`/api/chat`**: Endpoint de chat
- **`/api/vector-stores`**: Lista de bases de conocimiento
- **`/api/add-document`**: Subida de documentos

## 📂 Gestión de Documentos

### Documentos iniciales:
Los documentos en la carpeta `docs/` se cargarán automáticamente al iniciar la aplicación.

### Agregar nuevos documentos:
1. **Desde la web**: Usa el botón "Subir Documento" en la interfaz
2. **Via API**: Envía POST a `/api/add-document`

## 🔄 Actualizaciones

Para actualizar tu aplicación:

```bash
# Haz cambios en tu código local
git add .
git commit -m "Actualización de la aplicación"
git push origin main
```

Railway automáticamente detectará los cambios y redesplegará.

## 🛠️ Configuración Avanzada

### Variables de entorno adicionales (opcionales):

```bash
# Modelo de OpenAI (por defecto: gpt-3.5-turbo)
OPENAI_MODEL=gpt-4

# Modelo de embeddings (por defecto: text-embedding-3-small)  
OPENAI_EMBEDDING_MODEL=text-embedding-3-large

# Configuración de chunks
CHUNK_SIZE=1000
CHUNK_OVERLAP=200
```

### Configurar dominio personalizado:

1. En Railway, ve a **"Settings"**
2. Sección **"Domains"**
3. Agrega tu dominio personalizado
4. Configura los DNS según las instrucciones

## 🚨 Solución de Problemas

### Error: "OpenAI API key not found"
```bash
# Verifica que la variable esté configurada correctamente
OPENAI_API_KEY=sk-...tu_clave_completa
```

### Error: "Build failed"
1. Verifica que el `Procfile` existe en la raíz
2. Verifica que el `package.json` tiene los scripts correctos

### Error: "Application crashed"
1. Ve a **"Deployments"** en Railway
2. Revisa los logs para identificar el problema
3. Verifica que todas las dependencias están instaladas

### La aplicación no carga:
1. Verifica que la URL de Railway funciona
2. Espera 2-3 minutos después del despliegue
3. Revisa los logs en Railway

## 📊 Monitoreo

### Métricas disponibles en Railway:
- **CPU usage**: Uso del procesador
- **Memory usage**: Uso de memoria
- **Network**: Tráfico de red
- **Response times**: Tiempos de respuesta

### Logs en tiempo real:
1. Ve a **"Deployments"** en Railway
2. Haz clic en el despliegue activo
3. Revisa los logs para debug

## 💰 Costos

### Railway:
- **Plan gratuito**: $5 USD de crédito mensual
- **Pro Plan**: $20 USD/mes con más recursos

### OpenAI:
- **Costo por uso**: Según tokens procesados
- **Estimado**: ~$0.01-0.10 USD por conversación típica

## 🎉 ¡Listo!

Tu aplicación LangChain Document Chat está ahora desplegada y accesible desde cualquier lugar del mundo. Puedes:

- 💬 **Chatear** con tus documentos desde cualquier navegador
- 📄 **Subir** nuevos documentos sobre la marcha  
- 🔄 **Compartir** la URL con otros usuarios
- 📈 **Escalar** automáticamente según la demanda

## 🆘 Soporte

Si tienes problemas:

1. **Railway Docs**: [docs.railway.app](https://docs.railway.app)
2. **Railway Discord**: Comunidad activa de desarrolladores
3. **GitHub Issues**: Reporta problemas específicos del código
4. **OpenAI Support**: Para problemas con la API 