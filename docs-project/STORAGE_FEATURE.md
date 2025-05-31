# Funcionalidad de Almacenamiento de Sesión

## 📋 Descripción
Se ha implementado una funcionalidad completa para guardar y restaurar automáticamente el último usuario y chat seleccionado utilizando `localStorage` del navegador.

## 🚀 Características Implementadas

### 1. Almacenamiento Automático
- **Usuario**: Se guarda automáticamente cuando se selecciona un usuario
- **Chat**: Se guarda automáticamente cuando se selecciona un chat
- **Persistencia**: Los datos persisten entre sesiones del navegador

### 2. Restauración Automática
- Al cargar la aplicación, se restaura automáticamente:
  - El último usuario seleccionado
  - El último chat activo para ese usuario
- Validación de datos para evitar estados inconsistentes

### 3. Gestión de Sesión
- **Componente SessionManager**: Panel de administración en el sidebar
- **Información en tiempo real**: Estado actual de los datos guardados
- **Acciones disponibles**:
  - Exportar configuración como archivo JSON
  - Importar configuración desde archivo JSON
  - Limpiar todos los datos guardados

## 📁 Archivos Modificados/Creados

### Nuevos Archivos
1. **`frontend/components/StorageUtils.js`**
   - Clase utilitaria para manejo de localStorage
   - Métodos para guardar/recuperar usuario y chat
   - Sistema de preferencias por usuario
   - Funciones de exportación/importación

2. **`frontend/components/SessionManager.js`**
   - Componente React para gestión visual
   - Panel colapsable con información de sesión
   - Botones para exportar/importar/limpiar datos

### Archivos Modificados
1. **`frontend/app.js`**
   - Integración de la funcionalidad de almacenamiento
   - Hooks para guardar datos automáticamente
   - Función de restauración de sesión

2. **`frontend/index.html`**
   - Agregadas referencias a los nuevos scripts

## 🔧 Funcionalidades Técnicas

### StorageUtils - Métodos Principales
```javascript
// Guardar/recuperar usuario
StorageUtils.saveLastUser(userId)
StorageUtils.getLastUser()

// Guardar/recuperar chat
StorageUtils.saveLastChat(chatData)
StorageUtils.getLastChat()

// Limpiar datos
StorageUtils.clearLastChat()
StorageUtils.clearAll()

// Exportar/importar
StorageUtils.exportData()
StorageUtils.importData(data)
```

### Estructura de Datos Guardados
```javascript
// Usuario
localStorage['langchain_last_user'] = "nombre_usuario"

// Chat
localStorage['langchain_last_chat'] = {
  "id": "chat_id",
  "vectorStore": "store_name",
  "timestamp": 1234567890123
}

// Preferencias de usuario
localStorage['langchain_user_preferences'] = {
  "usuario1": {
    "theme": "dark",
    "language": "es",
    "lastUpdated": 1234567890123
  }
}
```

## 🎯 Flujo de Funcionamiento

### Al Cargar la Aplicación
1. Se ejecuta `restoreLastSession()`
2. Se recupera el último usuario desde localStorage
3. Si existe usuario, se restaura su último chat
4. Se validan los datos antes de aplicarlos

### Al Cambiar Usuario
1. Se guarda el nuevo usuario en localStorage
2. Se limpia el chat guardado (ya que cambió el contexto)
3. Se resetea la selección de chat actual

### Al Cambiar Chat
1. Se guarda la información del chat en localStorage
2. Incluye: ID, vectorStore y timestamp

## 🔍 Componente SessionManager

### Información Mostrada
- **Usuario actual**: Último usuario seleccionado
- **Chat activo**: ID del último chat seleccionado
- **Vector Store**: Base de conocimiento del chat
- **Timestamp**: Cuándo se guardó la sesión

### Acciones Disponibles
- **Exportar**: Descargar configuración como JSON
- **Importar**: Cargar configuración desde archivo
- **Limpiar**: Eliminar todos los datos guardados

## ⚡ Ventajas de la Implementación

1. **Experiencia de Usuario Mejorada**
   - No pierde el contexto al recargar la página
   - Continúa desde donde dejó la conversación

2. **Backup y Portabilidad**
   - Puede exportar su configuración
   - Transferir configuración entre navegadores/dispositivos

3. **Gestión de Datos**
   - Control total sobre los datos guardados
   - Opción de limpiar datos si es necesario

4. **Robustez**
   - Manejo de errores en localStorage
   - Validación de datos corruptos
   - Logs detallados para debugging

## 🔐 Consideraciones de Privacidad
- Los datos se almacenan únicamente en el navegador local
- No se envían datos a servidores externos
- El usuario tiene control total sobre sus datos guardados
- Opción de limpiar todos los datos en cualquier momento

## 🚀 Uso
La funcionalidad es completamente automática. Los usuarios simplemente:
1. Seleccionan un usuario
2. Seleccionan un chat
3. Al recargar la página, todo se restaura automáticamente

Para gestión avanzada, pueden usar el panel "Sesión Guardada" en el sidebar derecho. 