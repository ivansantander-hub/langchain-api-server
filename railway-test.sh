#!/bin/bash

# Script para ejecutar tests en Railway
echo "🧪 Iniciando tests en Railway..."

# Establecer variables de entorno para tests
export NODE_ENV=test
export OPENAI_API_KEY=test-key-for-railway
export CI=true
export RAILWAY_ENVIRONMENT=true

# Crear directorios necesarios que pueden no existir en CI
echo "📁 Creando directorios necesarios..."
mkdir -p vectorstores
mkdir -p chat-histories

# Instalar dependencias
echo "📦 Instalando dependencias..."
npm ci

# Compilar TypeScript
echo "🔨 Compilando TypeScript..."
npm run build

# Ejecutar tests
echo "🚀 Ejecutando tests..."
npm run test:ci

# Verificar si los tests pasaron
if [ $? -eq 0 ]; then
    echo "✅ Todos los tests pasaron exitosamente"
    exit 0
else
    echo "❌ Algunos tests fallaron"
    exit 1
fi 