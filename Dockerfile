# Etapa 1: Build con todas las herramientas necesarias
FROM node:18-alpine AS builder

# Instalar herramientas de compilación y Python
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    linux-headers \
    libc6-compat

# Establecer Python3 como python por defecto
RUN ln -sf python3 /usr/bin/python

# Establecer directorio de trabajo
WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar todas las dependencias (incluyendo devDependencies para el build)
RUN npm ci

# Copiar código fuente
COPY . .

# Crear directorios que pueden estar en .dockerignore pero son necesarios para tests
RUN mkdir -p vectorstores chat-histories

# Compilar TypeScript
RUN npm run build

# ⚡ EJECUTAR TESTS DURANTE EL BUILD ⚡
# Establecer variables de entorno para los tests
ENV NODE_ENV=test
ENV OPENAI_API_KEY=test-key-for-railway
ENV CI=true
ENV RAILWAY_ENVIRONMENT=true

# Ejecutar tests - Si fallan, el build falla
RUN npm run test:ci

# Instalar solo dependencias de producción en directorio limpio
RUN mkdir /app-prod && cp package*.json /app-prod/
WORKDIR /app-prod
RUN npm ci --omit=dev

# Etapa 2: Imagen final sin herramientas de compilación
FROM node:18-alpine AS production

# Instalar solo las dependencias mínimas de runtime
RUN apk add --no-cache \
    dumb-init

# Crear usuario no-root para seguridad
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Establecer directorio de trabajo
WORKDIR /app

# Copiar node_modules compilados desde la etapa de build
COPY --from=builder /app-prod/node_modules ./node_modules

# Copiar código compilado y archivos necesarios
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./

# Copiar archivos estáticos necesarios
COPY --from=builder /app/frontend ./frontend

# Cambiar permisos al usuario nodejs
RUN chown -R nodejs:nodejs /app

# Cambiar al usuario no-root
USER nodejs

# Exponer puerto
EXPOSE 3000

# Usar dumb-init para manejo correcto de señales
ENTRYPOINT ["dumb-init", "--"]

# Comando de inicio
CMD ["npm", "start"] 