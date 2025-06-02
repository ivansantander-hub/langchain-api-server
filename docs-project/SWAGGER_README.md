# Documentación Swagger API

## ¡Swagger ha sido integrado exitosamente en tu API LangChain! 🎉

### Acceso a la documentación

Una vez que tengas el servidor ejecutándose, puedes acceder a la documentación interactiva de Swagger en:

```
http://localhost:3000/api-docs
```

### Características incluidas

✅ **Documentación completa de endpoints**: Todos los endpoints principales están documentados
✅ **Interfaz interactiva**: Puedes probar los endpoints directamente desde la interfaz de Swagger
✅ **Esquemas de datos**: Definiciones completas de request/response schemas
✅ **Ejemplos de uso**: Ejemplos prácticos para cada endpoint
✅ **Organización por tags**: Endpoints organizados en categorías:
- Health: Estado del sistema
- Chat: Endpoints de chat y procesamiento
- Vector Stores: Gestión de vector stores
- Models: Información sobre modelos
- Documents: Gestión de documentos
- Users: Gestión de usuarios e historial

### Endpoints documentados

#### **Chat**
- `POST /api/chat` - Enviar mensaje al chat con ejemplos de uso

#### **Documents**
- `POST /api/add-document` - Subir documentos (texto o PDF)

#### **Vector Stores**
- `GET /api/vector-stores` - Listar vector stores disponibles

#### **Models**
- `GET /api/models` - Obtener modelos disponibles (cached)
- `GET /api/models/openai` - Obtener modelos en vivo de OpenAI

#### **Health**
- `GET /api/health` - Health check del servidor
- `GET /api` - Información general de la API

#### **Users**
- `GET /api/users` - Listar usuarios
- `DELETE /api/users/{userId}/vector-stores/{vectorName}/chats/{chatId}` - Limpiar historial

### Cómo usar Swagger UI

1. **Explorar endpoints**: Navega por las diferentes categorías usando los tags
2. **Probar endpoints**: Haz clic en "Try it out" en cualquier endpoint
3. **Ver esquemas**: Revisa los schemas de request/response para entender la estructura de datos
4. **Ejecutar requests**: Ingresa los parámetros necesarios y ejecuta las pruebas

### Personalización

La configuración de Swagger se encuentra en `src/lib/swagger.ts` donde puedes:
- Modificar la información de la API
- Agregar nuevos esquemas
- Personalizar la apariencia
- Agregar más ejemplos

### Para agregar documentación a nuevos endpoints

Usa el formato JSDoc con anotaciones `@swagger`:

```javascript
/**
 * @swagger
 * /api/nuevo-endpoint:
 *   get:
 *     summary: Descripción breve
 *     description: Descripción detallada
 *     tags: [NombreTag]
 *     responses:
 *       200:
 *         description: Respuesta exitosa
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 */
app.get('/api/nuevo-endpoint', (req, res) => {
  // Tu código aquí
});
```

### Próximos pasos

1. Ejecuta tu API: `npm run dev` o `npm start`
2. Visita http://localhost:3000/api-docs
3. ¡Explora y prueba tu API documentada!

### Nota importante

Asegúrate de actualizar las URLs del servidor en `src/lib/swagger.ts` cuando despliegues a producción. 