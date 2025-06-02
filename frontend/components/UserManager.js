// Componente para gestión de usuarios y chats
const { useState, useEffect } = React;

const UserManager = ({ onUserChange, onChatChange, selectedUser, selectedChat, compact = false, tabsOnly = false }) => {
    const [users, setUsers] = useState([]);
    const [chats, setChats] = useState([]);
    const [showNewUserForm, setShowNewUserForm] = useState(false);
    const [newUserName, setNewUserName] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [editingChatId, setEditingChatId] = useState(null);
    const [editingChatName, setEditingChatName] = useState('');

    // Cargar usuarios al montar el componente
    useEffect(() => {
        loadUsers();
    }, []);

    // Cargar chats cuando cambia el usuario seleccionado
    useEffect(() => {
        if (selectedUser) {
            loadUserChats(selectedUser);
        } else {
            setChats([]);
        }
    }, [selectedUser]);

    // Escuchar eventos de primer mensaje en un nuevo chat
    useEffect(() => {
        const handleChatFirstMessage = (event) => {
            const { chatId, firstMessage } = event.detail;
            
            // Actualizar el preview del chat en la lista local
            setChats(prevChats => 
                prevChats.map(chat => 
                    chat.id === chatId 
                        ? { ...chat, preview: firstMessage.substring(0, 50) + '...' }
                        : chat
                )
            );
        };

        window.addEventListener('chatFirstMessage', handleChatFirstMessage);
        
        return () => {
            window.removeEventListener('chatFirstMessage', handleChatFirstMessage);
        };
    }, []);

    const loadUsers = async () => {
        try {
            setIsLoading(true);
            const response = await window.apiClient.getUsers();
            const userList = response.users || [];
            setUsers(userList);
            setError(null);
            
            // Si no hay usuario seleccionado pero hay usuarios disponibles, seleccionar el primero
            if (!selectedUser && userList.length > 0) {
                onUserChange(userList[0]);
            }
        } catch (error) {
            console.error('Error loading users:', error);
            setError('Error al cargar usuarios');
            setUsers([]);
        } finally {
            setIsLoading(false);
        }
    };

    const loadUserChats = async (userId) => {
        try {
            setIsLoading(true);
            console.log(`Cargando chats para usuario: ${userId}`);
            
            // Primero, obtener todos los vector stores disponibles (incluyendo 'combined')
            const allVectorStores = ['combined']; // Siempre incluir el vector store por defecto
            
            try {
                // Obtener vector stores personalizados del usuario
                const vectorStoresResponse = await window.apiClient.getUserVectorStores(userId);
                const userVectorStores = vectorStoresResponse.vectorStores || [];
                console.log(`Vector stores personalizados encontrados: ${userVectorStores.length}`, userVectorStores);
                
                // Agregar vector stores únicos
                userVectorStores.forEach(store => {
                    if (!allVectorStores.includes(store)) {
                        allVectorStores.push(store);
                    }
                });
            } catch (vectorStoreError) {
                console.warn('Error obteniendo vector stores personalizados:', vectorStoreError);
            }
            
            console.log(`Total vector stores a revisar: ${allVectorStores.length}`, allVectorStores);
            
            let allChats = [];
            
            // Para cada vector store, obtener los chats
            for (const vectorStore of allVectorStores) {
                try {
                    const chatsResponse = await window.apiClient.getUserVectorChats(userId, vectorStore);
                    const vectorChats = chatsResponse.chats || [];
                    console.log(`Chats en ${vectorStore}: ${vectorChats.length}`, vectorChats);
                    
                    // Agregar información del vector store a cada chat
                    for (const chatId of vectorChats) {
                        // Buscar nombre personalizado en localStorage
                        const chatKey = `chat_name_${userId}_${vectorStore}_${chatId}`;
                        const customName = localStorage.getItem(chatKey);
                        
                        // Generar nombre por defecto más descriptivo
                        let defaultName;
                        if (vectorStore === 'combined') {
                            defaultName = `Chat General ${chatId.slice(-8)}`;
                        } else {
                            defaultName = `${vectorStore} - ${chatId.slice(-8)}`;
                        }
                        
                        // Intentar obtener el preview del primer mensaje
                        let preview = 'Chat disponible - Click para cargar';
                        try {
                            const messagesResponse = await window.apiClient.getChatMessages(userId, vectorStore, chatId);
                            const messages = messagesResponse.messages || [];
                            if (messages.length > 0) {
                                const firstMessage = messages[0].question || messages[0].answer || '';
                                preview = firstMessage.substring(0, 50) + (firstMessage.length > 50 ? '...' : '');
                            }
                        } catch (messageError) {
                            console.debug(`No se pudieron cargar mensajes para chat ${chatId}:`, messageError);
                        }
                        
                        allChats.push({
                            id: chatId,
                            userId: userId,
                            vectorStore: vectorStore,
                            displayName: customName || defaultName,
                            customName: customName,
                            preview: preview
                        });
                    }
                } catch (vectorError) {
                    console.warn(`Error loading chats for vector store ${vectorStore}:`, vectorError);
                }
            }
            
            // Ordenar chats por nombre para una mejor presentación
            allChats.sort((a, b) => {
                // Primero los chats generales (combined), luego los demás
                if (a.vectorStore === 'combined' && b.vectorStore !== 'combined') return -1;
                if (a.vectorStore !== 'combined' && b.vectorStore === 'combined') return 1;
                return a.displayName.localeCompare(b.displayName);
            });
            
            console.log(`Total chats cargados: ${allChats.length}`);
            setChats(allChats);
            setError(null);
            
            // Si no hay chat seleccionado pero hay chats disponibles, seleccionar el primero
            if (!selectedChat && allChats.length > 0) {
                console.log('Seleccionando primer chat disponible:', allChats[0]);
                onChatChange(allChats[0]);
            }
        } catch (error) {
            console.error('Error loading user chats:', error);
            setError('Error al cargar chats del usuario');
            setChats([]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleUserSelect = (userId) => {
        console.log('Usuario seleccionado:', userId);
        onUserChange(userId);
        onChatChange(null); // Resetear chat seleccionado
    };

    const handleChatSelect = (chat) => {
        console.log('Chat seleccionado:', chat);
        onChatChange(chat);
    };

    const handleNewUser = () => {
        setShowNewUserForm(true);
        setNewUserName('');
    };

    const handleCreateUser = async () => {
        if (!newUserName.trim()) {
            setError('El nombre de usuario no puede estar vacío');
            return;
        }

        try {
            setIsLoading(true);
            setError(null);
            
            // Crear un nuevo chat para el usuario (esto efectivamente crea el usuario)
            const response = await window.apiClient.sendMessage('Hola, soy un nuevo usuario', {
                vectorStore: 'combined',
                userId: newUserName.trim(),
                chatId: 'default'
            });
            
            // Recargar usuarios
            await loadUsers();
            
            // Seleccionar el nuevo usuario
            onUserChange(newUserName.trim());
            
            // Cerrar formulario
            setShowNewUserForm(false);
            setNewUserName('');
        } catch (error) {
            console.error('Error creating user:', error);
            setError('Error al crear usuario: ' + error.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCancelNewUser = () => {
        setShowNewUserForm(false);
        setNewUserName('');
        setError(null);
    };

    const handleDeleteChat = async (chat, event) => {
        event.stopPropagation();
        
        if (!confirm(`¿Estás seguro de que quieres eliminar el chat "${chat.displayName}"?`)) {
            return;
        }

        try {
            setIsLoading(true);
            setError(null);
            
            // Intentar eliminar el historial del chat del servidor
            try {
                await window.apiClient.clearChatHistory(chat.userId, chat.vectorStore, chat.id);
            } catch (serverError) {
                console.warn('Error al eliminar el chat del servidor, continuando con eliminación local:', serverError);
            }
            
            // Eliminar el chat de la lista local inmediatamente
            setChats(prevChats => prevChats.filter(c => 
                !(c.id === chat.id && c.vectorStore === chat.vectorStore)
            ));
            
            // Si el chat eliminado era el seleccionado, deseleccionar
            if (selectedChat && selectedChat.id === chat.id && selectedChat.vectorStore === chat.vectorStore) {
                onChatChange(null);
            }
            
            // Eliminar también el nombre personalizado del localStorage
            const chatKey = `chat_name_${chat.userId}_${chat.vectorStore}_${chat.id}`;
            localStorage.removeItem(chatKey);
            
        } catch (error) {
            console.error('Error deleting chat:', error);
            setError('Error al eliminar el chat: ' + error.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleNewChat = async () => {
        if (!selectedUser) {
            setError('Debe seleccionar un usuario primero');
            return;
        }

        try {
            setIsLoading(true);
            setError(null);
            
            // Crear un nuevo chat con un ID único
            const newChatId = window.apiClient.constructor.generateId();
            const vectorStore = 'combined'; // Vector store por defecto
            
            console.log(`Creando nuevo chat para usuario ${selectedUser}: ${newChatId}`);
            
            // Enviar un mensaje inicial para que el chat se registre en el servidor
            const initialMessage = 'Nuevo chat iniciado';
            const response = await window.apiClient.sendMessage(initialMessage, {
                vectorStore: vectorStore,
                userId: selectedUser,
                chatId: newChatId
            });
            
            console.log('Chat creado exitosamente en el servidor:', response);
            
            // Crear el objeto del nuevo chat
            const newChat = {
                id: newChatId,
                userId: selectedUser,
                vectorStore: vectorStore,
                displayName: `Chat ${new Date().toLocaleTimeString()}`,
                preview: initialMessage,
                customName: null // Indica que no tiene nombre personalizado
            };
            
            // Agregar el nuevo chat a la lista local para que aparezca inmediatamente
            setChats(prevChats => [newChat, ...prevChats]);
            
            // Seleccionar el nuevo chat
            onChatChange(newChat);
            
            console.log('Nuevo chat agregado a la lista local:', newChat);
            
        } catch (error) {
            console.error('Error creando nuevo chat:', error);
            setError('Error al crear el chat: ' + error.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleEditChatName = (chat, event) => {
        event.stopPropagation();
        setEditingChatId(chat.id);
        setEditingChatName(chat.customName || chat.displayName);
    };

    const handleSaveChatName = (chat) => {
        const trimmedName = editingChatName.trim();
        if (trimmedName && trimmedName !== chat.displayName) {
            // Actualizar el chat en la lista local
            setChats(prevChats =>
                prevChats.map(c =>
                    c.id === chat.id && c.vectorStore === chat.vectorStore
                        ? { 
                            ...c, 
                            customName: trimmedName,
                            displayName: trimmedName 
                          }
                        : c
                )
            );

            // Si es el chat seleccionado, actualizar también
            if (selectedChat && selectedChat.id === chat.id && selectedChat.vectorStore === chat.vectorStore) {
                onChatChange({
                    ...selectedChat,
                    customName: trimmedName,
                    displayName: trimmedName
                });
            }

            // Guardar en localStorage para persistencia
            const chatKey = `chat_name_${chat.userId}_${chat.vectorStore}_${chat.id}`;
            localStorage.setItem(chatKey, trimmedName);
        }
        
        setEditingChatId(null);
        setEditingChatName('');
    };

    const handleCancelEditChatName = () => {
        setEditingChatId(null);
        setEditingChatName('');
    };

    // Modo solo tabs (para la parte superior)
    if (tabsOnly) {
        return (
            <div className="chat-tabs-only">
                {selectedUser ? (
                    <div className="chat-tabs-list">
                        {chats.map(chat => (
                            <div
                                key={`${chat.vectorStore}-${chat.id}`}
                                className={`chat-tab ${selectedChat && 
                                    selectedChat.id === chat.id && 
                                    selectedChat.vectorStore === chat.vectorStore ? 'active' : ''}`}
                                onClick={() => handleChatSelect(chat)}
                                title={`${chat.displayName} - ${chat.preview}`}
                            >
                                {editingChatId === chat.id ? (
                                    <div className="chat-edit-form" onClick={(e) => e.stopPropagation()}>
                                        <input
                                            type="text"
                                            value={editingChatName}
                                            onChange={(e) => setEditingChatName(e.target.value)}
                                            className="chat-name-input"
                                            onKeyPress={(e) => {
                                                if (e.key === 'Enter') {
                                                    handleSaveChatName(chat);
                                                } else if (e.key === 'Escape') {
                                                    handleCancelEditChatName();
                                                }
                                            }}
                                            onBlur={() => handleSaveChatName(chat)}
                                            autoFocus
                                            maxLength={30}
                                        />
                                    </div>
                                ) : (
                                    <>
                                        <span className="chat-tab-name">{chat.displayName}</span>
                                        <div className="chat-tab-actions">
                                            <button
                                                className="chat-action-button"
                                                onClick={(e) => handleEditChatName(chat, e)}
                                                title="Editar nombre"
                                            >
                                                <i className="fas fa-edit"></i>
                                            </button>
                                            <button
                                                className="chat-action-button"
                                                onClick={(e) => handleDeleteChat(chat, e)}
                                                title="Eliminar chat"
                                            >
                                                <i className="fas fa-times"></i>
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        ))}
                        
                        <button
                            className="new-chat-tab"
                            onClick={handleNewChat}
                            disabled={isLoading || !selectedUser}
                            title="Crear nuevo chat"
                        >
                            <i className="fas fa-plus"></i>
                        </button>
                    </div>
                ) : (
                    <div className="chat-tabs-empty">
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                            <i className="fas fa-user"></i>
                            Selecciona un usuario para ver los chats
                        </span>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className={`user-management ${compact ? 'compact' : ''}`}>
            {!compact && (
                <h3>
                    <i className="fas fa-users"></i>
                    Gestión de Usuarios
                </h3>
            )}
            
            {error && (
                <div className="upload-status error">
                    <i className="fas fa-exclamation-triangle"></i>
                    {error}
                </div>
            )}

            {/* Selector de Usuario */}
            <div className="user-selector">
                <select
                    className="user-select"
                    value={selectedUser || ''}
                    onChange={(e) => handleUserSelect(e.target.value)}
                    disabled={isLoading}
                >
                    <option value="">Seleccionar usuario...</option>
                    {users.map(user => (
                        <option key={user} value={user}>
                            {user}
                        </option>
                    ))}
                </select>
                
                <button
                    className="new-user-button"
                    onClick={handleNewUser}
                    disabled={isLoading || showNewUserForm}
                    title="Crear nuevo usuario"
                >
                    <i className="fas fa-plus"></i>
                </button>
            </div>

            {/* Formulario para nuevo usuario */}
            {showNewUserForm && (
                <div className="new-user-form fade-in">
                    <input
                        type="text"
                        className="new-user-input"
                        placeholder="Nombre del nuevo usuario"
                        value={newUserName}
                        onChange={(e) => setNewUserName(e.target.value)}
                        onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                                handleCreateUser();
                            } else if (e.key === 'Escape') {
                                handleCancelNewUser();
                            }
                        }}
                        autoFocus
                        disabled={isLoading}
                    />
                    <button
                        className="form-button primary"
                        onClick={handleCreateUser}
                        disabled={isLoading || !newUserName.trim()}
                    >
                        <i className="fas fa-check"></i>
                        Crear
                    </button>
                    <button
                        className="form-button secondary"
                        onClick={handleCancelNewUser}
                        disabled={isLoading}
                    >
                        <i className="fas fa-times"></i>
                        Cancelar
                    </button>
                </div>
            )}

            {/* Gestión de Chats - solo en modo no-compact */}
            {selectedUser && !compact && (
                <div className="chat-management">
                    <h3>
                        <i className="fas fa-comments"></i>
                        Chats de {selectedUser}
                    </h3>

                    {chats.length > 0 ? (
                        <div className="chat-list">
                            {chats.map(chat => (
                                <div
                                    key={`${chat.vectorStore}-${chat.id}`}
                                    className={`chat-item ${selectedChat && 
                                        selectedChat.id === chat.id && 
                                        selectedChat.vectorStore === chat.vectorStore ? 'active' : ''}`}
                                    onClick={() => handleChatSelect(chat)}
                                >
                                    <div className="chat-item-info">
                                        <div className="chat-item-name">
                                            {editingChatId === chat.id ? (
                                                <div className="chat-edit-form" onClick={(e) => e.stopPropagation()}>
                                                    <input
                                                        type="text"
                                                        className="chat-name-input"
                                                        value={editingChatName}
                                                        onChange={(e) => setEditingChatName(e.target.value)}
                                                        onKeyPress={(e) => {
                                                            if (e.key === 'Enter') {
                                                                handleSaveChatName(chat);
                                                            } else if (e.key === 'Escape') {
                                                                handleCancelEditChatName();
                                                            }
                                                        }}
                                                        onBlur={() => handleSaveChatName(chat)}
                                                        autoFocus
                                                        maxLength={50}
                                                    />
                                                </div>
                                            ) : (
                                                <span title={chat.displayName}>
                                                    {chat.displayName}
                                                </span>
                                            )}
                                        </div>
                                        <div className="chat-item-preview">
                                            {chat.preview}
                                        </div>
                                    </div>
                                    <div className="chat-item-actions">
                                        <button
                                            className="chat-action-button"
                                            onClick={(e) => handleEditChatName(chat, e)}
                                            title="Editar nombre"
                                            disabled={isLoading || editingChatId === chat.id}
                                        >
                                            <i className="fas fa-edit"></i>
                                        </button>
                                        <button
                                            className="chat-action-button"
                                            onClick={(e) => handleDeleteChat(chat, e)}
                                            title="Eliminar chat"
                                            disabled={isLoading}
                                        >
                                            <i className="fas fa-trash"></i>
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="welcome-content" style={{ padding: '1rem', margin: 0 }}>
                            <i className="fas fa-comment-slash" style={{ fontSize: '2rem', marginBottom: '0.5rem' }}></i>
                            <p style={{ margin: 0, fontSize: '0.9rem' }}>
                                No hay chats para este usuario
                            </p>
                        </div>
                    )}

                    <button
                        className="new-chat-button"
                        onClick={handleNewChat}
                        disabled={isLoading}
                    >
                        <i className="fas fa-plus"></i>
                        Nuevo Chat
                    </button>
                </div>
            )}

            {isLoading && (
                <div className="upload-status">
                    <i className="fas fa-spinner fa-spin"></i>
                    Cargando...
                </div>
            )}
        </div>
    );
};

// Exportar el componente al objeto global window
window.UserManager = UserManager; 