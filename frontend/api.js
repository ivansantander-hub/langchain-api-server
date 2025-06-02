// API Client para LangChain Document Chat
class APIClient {
    constructor() {
        this.baseURL = 'http://localhost:3000';
        // this.baseURL = 'https://langchain-api-server-production.up.railway.app';
        this.defaultUserId = 'web-client';
        this.defaultChatId = 'default';
        console.log('🚀 ~ APIClient ~ constructor ~ this.baseURL:', this.baseURL)
    }

    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        };

        try {
            const response = await fetch(url, config);
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error(`API Error (${endpoint}):`, error);
            throw error;
        }
    }

    async getInfo() {
        return this.request('/api');
    }

    async getVectorStores() {
        return this.request('/api/vector-stores');
    }

    // ===== NUEVOS MÉTODOS PARA GESTIÓN DE ARCHIVOS POR USUARIO =====

    // Subir y vectorizar archivo en una sola operación
    async uploadAndVectorizeFile(userId, filename, content) {
        return this.request('/api/upload-and-vectorize', {
            method: 'POST',
            body: JSON.stringify({
                userId,
                filename,
                content
            })
        });
    }

    // Subir archivo de texto (sin vectorización) - legacy
    async uploadFile(userId, filename, content) {
        return this.request('/api/upload-file', {
            method: 'POST',
            body: JSON.stringify({
                userId,
                filename,
                content
            })
        });
    }

    // Vectorizar archivo ya subido
    async vectorizeFile(userId, filename) {
        return this.request('/api/load-vector', {
            method: 'POST',
            body: JSON.stringify({
                userId,
                filename
            })
        });
    }

    // Obtener archivos de un usuario
    async getUserFiles(userId) {
        return this.request(`/api/users/${userId}/files`);
    }

    // Obtener vector stores de un usuario 
    async getUserVectorStores(userId) {
        return this.request(`/api/users/${userId}/vector-stores`);
    }

    // ===== MÉTODOS DE CHAT MEJORADOS =====

    // Send message to chat with support for user documents
    async sendMessage(message, options = {}) {
        const {
            vectorStore = 'combined',
            userId = this.defaultUserId,
            chatId = this.defaultChatId,
            modelConfig = null,
            filename = null // Nuevo: para chat con documento específico
        } = options;

        const requestBody = {
            question: message,
            vectorStore,
            userId,
            chatId
        };

        // Agregar filename si se especifica (para chat con documento específico)
        if (filename) {
            requestBody.filename = filename;
        }

        if (modelConfig) {
            requestBody.modelConfig = modelConfig;
        }

        return this.request('/api/chat', {
            method: 'POST',
            body: JSON.stringify(requestBody)
        });
    }

    // ===== MÉTODOS LEGACY (MANTENIDOS PARA COMPATIBILIDAD) =====

    // Upload document (legacy - ahora usa el flujo de uploadFile + vectorizeFile)
    async uploadDocument(filename, content) {
        // Por compatibilidad, usar el endpoint legacy
        return this.request('/api/add-document', {
            method: 'POST',
            body: JSON.stringify({
                filename,
                content
            })
        });
    }

    // ===== MÉTODOS DE GESTIÓN DE USUARIOS Y CHATS =====

    // Get list of users
    async getUsers() {
        try {
            const response = await this.request('/api/users');
            return response;
        } catch (error) {
            console.error('Error getting users:', error);
            return { users: [] };
        }
    }

    // Create user (by sending an initial message)
    async createUser(userId) {
        try {
            const response = await this.sendMessage('Hola, soy un nuevo usuario', {
                vectorStore: 'combined',
                userId: userId,
                chatId: 'default'
            });
            return response;
        } catch (error) {
            console.error('Error creating user:', error);
            throw new Error(`No se pudo crear el usuario: ${error.message}`);
        }
    }

    // Get chats of a user and vector store
    async getUserChats(userId, vectorName) {
        try {
            const response = await this.request(`/api/users/${userId}/vector-stores/${vectorName}/chats`);
            return response;
        } catch (error) {
            console.error(`Error getting chats for user ${userId} and vector ${vectorName}:`, error);
            return { chats: [] };
        }
    }

    // Get chats of a user and vector store (alias for compatibility)
    async getUserVectorChats(userId, vectorName) {
        return this.getUserChats(userId, vectorName);
    }

    // Get messages of a specific chat
    async getChatMessages(userId, vectorName, chatId) {
        try {
            const response = await this.request(`/api/users/${userId}/vector-stores/${vectorName}/chats/${chatId}/messages`);
            return response;
        } catch (error) {
            console.error(`Error getting messages for chat ${chatId}:`, error);
            return { messages: [] };
        }
    }

    // Get chat history
    async getChatHistory(userId, vectorName, chatId) {
        return this.getChatMessages(userId, vectorName, chatId);
    }

    // Clear chat history for a specific vector store
    async clearChatHistory(userId, vectorName, chatId) {
        try {
            const response = await this.request(`/api/users/${userId}/vector-stores/${vectorName}/chats/${chatId}`, {
                method: 'DELETE'
            });
            return response;
        } catch (error) {
            console.error(`Error clearing chat history for ${chatId}:`, error);
            throw new Error(`No se pudo eliminar el historial del chat: ${error.message}`);
        }
    }

    // Delete entire chat (all vector stores)
    async deleteChatCompletely(userId, chatId) {
        try {
            const response = await this.request(`/api/users/${userId}/chats/${chatId}`, {
                method: 'DELETE'
            });
            return response;
        } catch (error) {
            console.error(`Error deleting chat completely ${chatId}:`, error);
            throw new Error(`No se pudo eliminar el chat completamente: ${error.message}`);
        }
    }

    // ===== MÉTODOS DE UTILIDAD =====

    // Check connection with the server
    async checkConnection() {
        try {
            await this.getInfo();
            return true;
        } catch (error) {
            console.error('Connection check failed:', error);
            return false;
        }
    }

    // Helper method to read files as text
    static readFileAsText(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(new Error('Error reading file'));
            reader.readAsText(file);
        });
    }

    // Helper method to generate unique IDs
    static generateId() {
        return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    // Helper method to format timestamps
    static formatTimestamp(date = new Date()) {
        return date.toLocaleString('es-ES', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    }
}

window.apiClient = new APIClient();
window.api = window.apiClient; 