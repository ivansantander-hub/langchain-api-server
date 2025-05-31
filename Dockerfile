# Usar Node.js 18 LTS Alpine para menor tamaño y sin dependencias innecesarias
FROM node:18-alpine

# Instalar solo las dependencias mínimas necesarias para compilación
RUN apk add --no-cache \
    make \
    g++

# Establecer directorio de trabajo
WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar dependencias de Node.js
RUN npm ci --only=production && npm cache clean --force

# Copiar código fuente
COPY . .

# Compilar TypeScript
RUN npm run build

# Remover dependencias de desarrollo después de la compilación
RUN npm prune --production

# Crear usuario no-root para seguridad
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Cambiar al usuario no-root
USER nodejs

# Exponer puerto
EXPOSE 3000

# Comando de inicio
CMD ["npm", "start"] 