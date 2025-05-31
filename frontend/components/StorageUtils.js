// Utilidades para manejo de localStorage para persistir estado de usuario y chat
class StorageUtils {
    // Claves para localStorage
    static KEYS = {
        LAST_USER: 'langchain_last_user',
        LAST_CHAT: 'langchain_last_chat',
        USER_PREFERENCES: 'langchain_user_preferences'
    };

    // Guardar el último usuario seleccionado
    static saveLastUser(userId) {
        try {
            if (userId) {
                localStorage.setItem(this.KEYS.LAST_USER, userId);
                console.log('💾 Usuario guardado en localStorage:', userId);
            }
        } catch (error) {
            console.warn('⚠️ Error guardando usuario en localStorage:', error);
        }
    }

    // Obtener el último usuario seleccionado
    static getLastUser() {
        try {
            const userId = localStorage.getItem(this.KEYS.LAST_USER);
            if (userId) {
                console.log('📖 Usuario recuperado de localStorage:', userId);
                return userId;
            }
        } catch (error) {
            console.warn('⚠️ Error obteniendo usuario de localStorage:', error);
        }
        return null;
    }

    // Guardar el último chat seleccionado
    static saveLastChat(chatData) {
        try {
            if (chatData) {
                const chatInfo = {
                    id: chatData.id,
                    vectorStore: chatData.vectorStore,
                    timestamp: Date.now()
                };
                localStorage.setItem(this.KEYS.LAST_CHAT, JSON.stringify(chatInfo));
                console.log('💾 Chat guardado en localStorage:', chatInfo);
            }
        } catch (error) {
            console.warn('⚠️ Error guardando chat en localStorage:', error);
        }
    }

    // Obtener el último chat seleccionado
    static getLastChat() {
        try {
            const chatData = localStorage.getItem(this.KEYS.LAST_CHAT);
            if (chatData) {
                const parsed = JSON.parse(chatData);
                console.log('📖 Chat recuperado de localStorage:', parsed);
                return parsed;
            }
        } catch (error) {
            console.warn('⚠️ Error obteniendo chat de localStorage:', error);
        }
        return null;
    }

    // Limpiar el último chat (útil cuando se cambia de usuario)
    static clearLastChat() {
        try {
            localStorage.removeItem(this.KEYS.LAST_CHAT);
            console.log('🗑️ Chat eliminado de localStorage');
        } catch (error) {
            console.warn('⚠️ Error eliminando chat de localStorage:', error);
        }
    }

    // Guardar preferencias del usuario
    static saveUserPreferences(userId, preferences) {
        try {
            if (userId && preferences) {
                const allPreferences = this.getAllUserPreferences();
                allPreferences[userId] = {
                    ...allPreferences[userId],
                    ...preferences,
                    lastUpdated: Date.now()
                };
                localStorage.setItem(this.KEYS.USER_PREFERENCES, JSON.stringify(allPreferences));
                console.log('💾 Preferencias guardadas para usuario:', userId, preferences);
            }
        } catch (error) {
            console.warn('⚠️ Error guardando preferencias:', error);
        }
    }

    // Obtener preferencias del usuario
    static getUserPreferences(userId) {
        try {
            if (userId) {
                const allPreferences = this.getAllUserPreferences();
                return allPreferences[userId] || {};
            }
        } catch (error) {
            console.warn('⚠️ Error obteniendo preferencias:', error);
        }
        return {};
    }

    // Obtener todas las preferencias de usuarios
    static getAllUserPreferences() {
        try {
            const preferences = localStorage.getItem(this.KEYS.USER_PREFERENCES);
            return preferences ? JSON.parse(preferences) : {};
        } catch (error) {
            console.warn('⚠️ Error obteniendo todas las preferencias:', error);
            return {};
        }
    }

    // Limpiar todos los datos de localStorage
    static clearAll() {
        try {
            Object.values(this.KEYS).forEach(key => {
                localStorage.removeItem(key);
            });
            console.log('🗑️ Todos los datos de localStorage eliminados');
        } catch (error) {
            console.warn('⚠️ Error limpiando localStorage:', error);
        }
    }

    // Exportar configuración para backup
    static exportData() {
        try {
            const data = {};
            Object.entries(this.KEYS).forEach(([name, key]) => {
                const value = localStorage.getItem(key);
                if (value) {
                    data[name] = value;
                }
            });
            return data;
        } catch (error) {
            console.warn('⚠️ Error exportando datos:', error);
            return {};
        }
    }

    // Importar configuración desde backup
    static importData(data) {
        try {
            if (data && typeof data === 'object') {
                Object.entries(data).forEach(([name, value]) => {
                    const key = this.KEYS[name];
                    if (key && value) {
                        localStorage.setItem(key, value);
                    }
                });
                console.log('📥 Datos importados correctamente');
                return true;
            }
        } catch (error) {
            console.warn('⚠️ Error importando datos:', error);
        }
        return false;
    }
}

// Hacer la clase disponible globalmente
window.StorageUtils = StorageUtils; 