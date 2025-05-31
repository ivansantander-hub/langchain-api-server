// API Client para LangChain Document Chat
class APIClient {
    constructor(baseURL = '') {
        // Si no se proporciona baseURL, usar URL relativa (mismo dominio y puerto)
        this.baseURL = baseURL || (typeof window !== 'undefined' ? window.location.origin : '');
        this.defaultUserId = 'web-client';
        this.defaultChatId = 'default';
    }

    // Método genérico para hacer requests
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

    // Obtener información general de la API
    async getInfo() {
        return this.request('/api');
    }

    // Obtener lista de vector stores disponibles
    async getVectorStores() {
        return this.request('/api/vector-stores');
    }

    // Enviar mensaje de chat
    async sendMessage(message, options = {}) {
        const {
            vectorStore = 'combined',
            userId = this.defaultUserId,
            chatId = this.defaultChatId
        } = options;

        return this.request('/api/chat', {
            method: 'POST',
            body: JSON.stringify({
                question: message,
                vectorStore,
                userId,
                chatId
            })
        });
    }

    // Subir documento
    async uploadDocument(filename, content) {
        return this.request('/api/add-document', {
            method: 'POST',
            body: JSON.stringify({
                filename,
                content
            })
        });
    }

    // Obtener lista de usuarios
    async getUsers() {
        return this.request('/api/users');
    }

    // Obtener vector stores de un usuario
    async getUserVectorStores(userId) {
        return this.request(`/api/users/${userId}/vector-stores`);
    }

    // Obtener chats de un usuario y vector store
    async getUserChats(userId, vectorName) {
        return this.request(`/api/users/${userId}/vector-stores/${vectorName}/chats`);
    }

    // Obtener historial de mensajes
    async getChatHistory(userId, vectorName, chatId) {
        return this.request(`/api/users/${userId}/vector-stores/${vectorName}/chats/${chatId}/messages`);
    }

    // Limpiar historial de chat
    async clearChatHistory(userId, vectorName, chatId) {
        return this.request(`/api/users/${userId}/vector-stores/${vectorName}/chats/${chatId}`, {
            method: 'DELETE'
        });
    }

    // Verificar conexión con el servidor
    async checkConnection() {
        try {
            await this.getInfo();
            return true;
        } catch (error) {
            console.error('Connection check failed:', error);
            return false;
        }
    }

    // Método helper para leer archivos como texto
    static readFileAsText(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(new Error('Error reading file'));
            reader.readAsText(file);
        });
    }

    // Método helper para generar IDs únicos
    static generateId() {
        return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    // Método helper para formatear timestamps
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

// Crear instancia global del cliente API
window.apiClient = new APIClient(); 