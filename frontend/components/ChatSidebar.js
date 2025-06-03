// Componente Sidebar de Chats - Estilo GPT
const ChatSidebar = ({ 
    isCollapsed, 
    onToggle, 
    selectedUser, 
    selectedChat, 
    onUserChange, 
    onChatChange, 
    onChatUpdate
}) => {
    const [users, setUsers] = React.useState([]);
    const [chats, setChats] = React.useState([]);
    const [showNewUserForm, setShowNewUserForm] = React.useState(false);
    const [newUserName, setNewUserName] = React.useState('');
    const [isLoading, setIsLoading] = React.useState(false);
    const [error, setError] = React.useState(null);
    const [editingChatId, setEditingChatId] = React.useState(null);
    const [editingChatName, setEditingChatName] = React.useState('');
    const [searchTerm, setSearchTerm] = React.useState('');

    // Cargar usuarios al montar el componente
    React.useEffect(() => {
        loadUsers();
    }, []);

    // Cargar chats cuando cambia el usuario seleccionado
    React.useEffect(() => {
        if (selectedUser) {
            loadChats();
        } else {
            setChats([]);
        }
    }, [selectedUser]);

    const loadUsers = async () => {
        try {
            setIsLoading(true);
            const response = await window.apiClient.getUsers();
            setUsers(Array.isArray(response) ? response : []);
        } catch (error) {
            console.error('Error loading users:', error);
            setError('Error cargando usuarios');
            setUsers([]);
        } finally {
            setIsLoading(false);
        }
    };

    const loadChats = async () => {
        if (!selectedUser) return;
        
        try {
            setIsLoading(true);
            // Obtener todos los chats del usuario con metadatos
            const response = await window.apiClient.request(`/api/users/${selectedUser}/chats`);
            console.log('Loaded all chats for user:', selectedUser, response);
            
            // Usar los metadatos si están disponibles, sino crear formato básico
            if (response.metadata && Array.isArray(response.metadata)) {
                const formattedChats = response.metadata.map(metadata => ({
                    id: metadata.chatId,
                    name: metadata.name || (metadata.chatId === 'default' ? 'Chat Principal' : `Chat ${metadata.chatId.substring(0, 8)}`),
                    lastActivity: metadata.lastActivity || metadata.created,
                    messageCount: metadata.messageCount || 0
                }));
                
                // Ordenar por última actividad
                formattedChats.sort((a, b) => new Date(b.lastActivity) - new Date(a.lastActivity));
                setChats(formattedChats);
            } else {
                // Fallback al formato anterior
                const basicChats = response.chats.map(chatId => ({
                    id: chatId,
                    name: chatId === 'default' ? 'Chat Principal' : `Chat ${chatId.substring(0, 8)}`
                }));
                setChats(basicChats);
            }
            
            setError('');
        } catch (error) {
            console.error('Error loading chats:', error);
            setError(`Error al cargar chats: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreateUser = async () => {
        if (!newUserName.trim()) return;
        
        try {
            setIsLoading(true);
            await window.apiClient.createUser(newUserName.trim());
            setNewUserName('');
            setShowNewUserForm(false);
            await loadUsers();
        } catch (error) {
            console.error('Error creating user:', error);
            setError('Error creando usuario');
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreateChat = async () => {
        if (!selectedUser) {
            setError('Selecciona un usuario primero');
            return;
        }
        
        try {
            setIsLoading(true);
            const result = await window.apiClient.createChat(selectedUser);
            
            console.log('New chat created:', result);
            
            // Recargar la lista de chats
            await loadChats();
            
            // Seleccionar el nuevo chat automáticamente
            if (result.chatId && onChatChange) {
                onChatChange(result.chatId);
            }
            
            // Notificar al componente padre para que actualice otros componentes
            if (onChatUpdate) {
                onChatUpdate(result.chatId, { action: 'created' });
            }
            
        } catch (error) {
            console.error('Error creating chat:', error);
            setError(`Error al crear chat: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    const handleEditChat = async (chatId, newName) => {
        if (!selectedUser || !newName || !newName.trim()) {
            setError('El nombre del chat no puede estar vacío');
            cancelEditingChat();
            return;
        }
        
        try {
            setIsLoading(true);
            console.log(`Renaming chat ${chatId} to: ${newName}`);
            
            // Llamar al API para renombrar el chat
            const response = await window.apiClient.renameChat(selectedUser, chatId, newName.trim());
            console.log('Chat renamed successfully:', response);
            
            // Actualizar el chat localmente
            setChats(prevChats => 
                prevChats.map(chat => 
                    chat.id === chatId 
                        ? { ...chat, name: newName.trim() }
                        : chat
                )
            );
            
            // Limpiar el estado de edición
            setEditingChatId(null);
            setEditingChatName('');
            setError(null);
            
            // Recargar la lista de chats para asegurar sincronización
            await loadChats();
            
        } catch (error) {
            console.error('Error renaming chat:', error);
            setError(`Error al renombrar chat: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteChat = async (chatId) => {
        if (!confirm('¿Estás seguro de que quieres eliminar este chat?')) return;
        
        try {
            setIsLoading(true);
            await window.apiClient.deleteChat(selectedUser, chatId);
            await loadChats();
            
            // Si se eliminó el chat activo, limpiar la selección
            if (selectedChat && selectedChat.id === chatId) {
                onChatChange(null);
            }
        } catch (error) {
            console.error('Error deleting chat:', error);
            setError('Error eliminando chat');
        } finally {
            setIsLoading(false);
        }
    };

    const startEditingChat = (chat) => {
        setEditingChatId(chat.id);
        setEditingChatName(chat.name);
        setError(null); // Limpiar errores previos
    };

    const cancelEditingChat = () => {
        setEditingChatId(null);
        setEditingChatName('');
        setError(null);
    };

    const handleEditSubmit = (e, chatId) => {
        e.preventDefault();
        e.stopPropagation();
        handleEditChat(chatId, editingChatName);
    };

    const formatChatTime = (timestamp) => {
        const now = new Date();
        const date = new Date(timestamp);
        const diffInHours = (now - date) / (1000 * 60 * 60);
        
        if (diffInHours < 1) {
            return 'Ahora';
        } else if (diffInHours < 24) {
            return `${Math.floor(diffInHours)}h`;
        } else {
            const diffInDays = Math.floor(diffInHours / 24);
            if (diffInDays < 7) {
                return `${diffInDays}d`;
            } else {
                return date.toLocaleDateString('es-ES', { month: 'short', day: 'numeric' });
            }
        }
    };

    const getPreviewText = (chat) => {
        if (!chat.messages || chat.messages.length === 0) {
            return 'Chat nuevo';
        }
        
        const lastMessage = chat.messages[chat.messages.length - 1];
        if (lastMessage.content) {
            return lastMessage.content.substring(0, 60) + (lastMessage.content.length > 60 ? '...' : '');
        }
        
        return 'Sin mensajes';
    };

    const filteredChats = React.useMemo(() => {
        if (!searchTerm.trim()) return chats;
        
        return chats.filter(chat => 
            chat.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            getPreviewText(chat).toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [chats, searchTerm]);

    if (!isCollapsed) {
        return (
            <div className="chat-sidebar">
                <div className="sidebar-header">
                    <button className="sidebar-toggle" onClick={onToggle}>
                        <i className="fas fa-columns"></i>
                    </button>
                    <div className="sidebar-title">
                        <i className="fas fa-comments"></i>
                        <span>Chats</span>
                    </div>
                    <button 
                        className="new-chat-btn" 
                        onClick={handleCreateChat}
                        disabled={!selectedUser || isLoading}
                        title="Nuevo chat"
                    >
                        <i className="fas fa-plus"></i>
                    </button>
                </div>

                <div className="sidebar-content">
                    {/* Sección de usuario */}
                    <div className="user-section">
                        <div className="user-selector">
                            <select 
                                className="user-select"
                                value={selectedUser || ''}
                                onChange={(e) => onUserChange(e.target.value || null)}
                            >
                                <option value="">Seleccionar usuario</option>
                                {users.map(user => (
                                    <option key={user.id} value={user.id}>{user.name}</option>
                                ))}
                            </select>
                            <button 
                                className="user-action-btn"
                                onClick={() => setShowNewUserForm(!showNewUserForm)}
                                title="Nuevo usuario"
                            >
                                <i className="fas fa-user-plus"></i>
                            </button>
                        </div>

                        {showNewUserForm && (
                            <div className="new-user-form">
                                <input
                                    type="text"
                                    className="new-user-input"
                                    placeholder="Nombre del usuario"
                                    value={newUserName}
                                    onChange={(e) => setNewUserName(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && handleCreateUser()}
                                />
                                <div className="form-buttons">
                                    <button 
                                        className="form-btn secondary"
                                        onClick={() => {
                                            setShowNewUserForm(false);
                                            setNewUserName('');
                                        }}
                                    >
                                        Cancelar
                                    </button>
                                    <button 
                                        className="form-btn primary"
                                        onClick={handleCreateUser}
                                        disabled={!newUserName.trim() || isLoading}
                                    >
                                        Crear
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Sección de búsqueda */}
                    {selectedUser && (
                        <div className="search-section">
                            <div className="search-input-container">
                                <i className="fas fa-search"></i>
                                <input
                                    type="text"
                                    className="search-input"
                                    placeholder="Buscar chats..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                                {searchTerm && (
                                    <button 
                                        className="clear-search"
                                        onClick={() => setSearchTerm('')}
                                    >
                                        <i className="fas fa-times"></i>
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Sección de chats */}
                    <div className="chats-section">
                        {error && (
                            <div className="error-message">
                                <i className="fas fa-exclamation-triangle"></i>
                                {error}
                                <button 
                                    className="error-close"
                                    onClick={() => setError(null)}
                                    title="Cerrar error"
                                >
                                    <i className="fas fa-times"></i>
                                </button>
                            </div>
                        )}

                        {isLoading && (
                            <div className="loading-message">
                                <i className="fas fa-spinner fa-spin"></i>
                                Cargando...
                            </div>
                        )}

                        {!selectedUser && !isLoading && (
                            <div className="empty-chats">
                                <i className="fas fa-user-circle"></i>
                                <p>Selecciona un usuario</p>
                                <small>Para ver y gestionar chats</small>
                            </div>
                        )}

                        {selectedUser && !isLoading && filteredChats.length === 0 && !error && (
                            <div className="empty-chats">
                                <i className="fas fa-comments"></i>
                                <p>No hay chats</p>
                                <small>Crea un nuevo chat para comenzar</small>
                            </div>
                        )}

                        {filteredChats.length > 0 && (
                            <div className="chat-list">
                                {filteredChats.map(chat => (
                                    <div 
                                        key={chat.id}
                                        className={`chat-item ${selectedChat && selectedChat.id === chat.id ? 'active' : ''} ${editingChatId === chat.id ? 'editing' : ''}`}
                                        onClick={() => editingChatId !== chat.id && onChatChange(chat)}
                                    >
                                        <div className="chat-item-content">
                                            <div className="chat-item-header">
                                                {editingChatId === chat.id ? (
                                                    <form 
                                                        className="chat-edit-form"
                                                        onSubmit={(e) => handleEditSubmit(e, chat.id)}
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        <input
                                                            type="text"
                                                            className="chat-name-input"
                                                            value={editingChatName}
                                                            onChange={(e) => setEditingChatName(e.target.value)}
                                                            onBlur={(e) => {
                                                                // Solo ejecutar si el input tiene valor válido
                                                                if (e.target.value.trim()) {
                                                                    handleEditChat(chat.id, e.target.value.trim());
                                                                } else {
                                                                    cancelEditingChat();
                                                                }
                                                            }}
                                                            onKeyDown={(e) => {
                                                                e.stopPropagation();
                                                                if (e.key === 'Escape') {
                                                                    cancelEditingChat();
                                                                } else if (e.key === 'Enter') {
                                                                    e.preventDefault();
                                                                    if (editingChatName.trim()) {
                                                                        handleEditChat(chat.id, editingChatName.trim());
                                                                    } else {
                                                                        cancelEditingChat();
                                                                    }
                                                                }
                                                            }}
                                                            autoFocus
                                                            disabled={isLoading}
                                                        />
                                                        <div className="edit-form-buttons">
                                                            <button 
                                                                type="submit" 
                                                                className="edit-confirm-btn"
                                                                disabled={!editingChatName.trim() || isLoading}
                                                                title="Confirmar"
                                                            >
                                                                <i className="fas fa-check"></i>
                                                            </button>
                                                            <button 
                                                                type="button" 
                                                                className="edit-cancel-btn"
                                                                onClick={(e) => {
                                                                    e.preventDefault();
                                                                    e.stopPropagation();
                                                                    cancelEditingChat();
                                                                }}
                                                                title="Cancelar"
                                                            >
                                                                <i className="fas fa-times"></i>
                                                            </button>
                                                        </div>
                                                    </form>
                                                ) : (
                                                    <>
                                                        <span className="chat-name">{chat.name}</span>
                                                        <span className="chat-time">
                                                            {formatChatTime(chat.lastActivity || chat.updated_at || chat.created_at)}
                                                        </span>
                                                    </>
                                                )}
                                            </div>
                                            {editingChatId !== chat.id && (
                                                <div className="chat-preview">
                                                    {getPreviewText(chat)}
                                                </div>
                                            )}
                                        </div>
                                        
                                        {editingChatId !== chat.id && (
                                            <div className="chat-actions">
                                                <button 
                                                    className="chat-action-btn"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        startEditingChat(chat);
                                                    }}
                                                    title="Renombrar chat"
                                                    disabled={isLoading}
                                                >
                                                    <i className="fas fa-edit"></i>
                                                </button>
                                                <button 
                                                    className="chat-action-btn delete"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDeleteChat(chat.id);
                                                    }}
                                                    title="Eliminar chat"
                                                    disabled={isLoading}
                                                >
                                                    <i className="fas fa-trash"></i>
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="chat-sidebar collapsed">
            <div className="sidebar-header">
                <button className="sidebar-toggle" onClick={onToggle}>
                    <i className="fas fa-columns"></i>
                </button>
            </div>
        </div>
    );
};

// Exportar componente
window.ChatSidebar = ChatSidebar; 