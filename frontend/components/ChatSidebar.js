// Componente Sidebar de Chats - Estilo GPT
const ChatSidebar = ({ 
    isCollapsed, 
    onToggle, 
    selectedUser, 
    selectedChat, 
    onUserChange, 
    onChatChange 
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
            // Obtener todos los chats del usuario sin filtrar por vector store
            const response = await window.apiClient.request(`/api/users/${selectedUser}/chats`);
            console.log('Loaded all chats for user:', selectedUser, response);
            
            // Transformar la respuesta de la API en el formato esperado por el componente
            const chatIds = response.chats || [];
            const formattedChats = chatIds.map(chatId => ({
                id: chatId,
                name: chatId === 'default' ? 'Chat Principal' : `Chat ${chatId.substring(0, 8)}`,
                lastMessage: 'Chat existente',
                timestamp: new Date().toISOString(),
                messages: []
            }));
            
            setChats(formattedChats);
        } catch (error) {
            console.error('Error loading chats:', error);
            setError('Error cargando chats');
            setChats([]);
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
        if (!selectedUser) return;
        
        try {
            setIsLoading(true);
            const response = await window.apiClient.createChat(selectedUser);
            console.log('Created new chat:', response);
            await loadChats();
            if (onChatChange && response.chat) {
                onChatChange(response.chat);
            }
        } catch (error) {
            console.error('Error creating chat:', error);
            setError('Error creando chat');
        } finally {
            setIsLoading(false);
        }
    };

    const handleEditChat = async (chatId) => {
        if (!editingChatName.trim()) return;
        
        try {
            setIsLoading(true);
            await window.apiClient.renameChat(selectedUser, chatId, editingChatName.trim());
            setEditingChatId(null);
            setEditingChatName('');
            await loadChats();
        } catch (error) {
            console.error('Error editing chat:', error);
            setError('Error editando chat');
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
    };

    const cancelEditingChat = () => {
        setEditingChatId(null);
        setEditingChatName('');
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
                                        className={`chat-item ${selectedChat && selectedChat.id === chat.id ? 'active' : ''}`}
                                        onClick={() => onChatChange(chat)}
                                    >
                                        <div className="chat-item-content">
                                            <div className="chat-item-header">
                                                {editingChatId === chat.id ? (
                                                    <form 
                                                        className="chat-edit-form"
                                                        onSubmit={(e) => {
                                                            e.preventDefault();
                                                            handleEditChat(chat.id);
                                                        }}
                                                    >
                                                        <input
                                                            type="text"
                                                            className="chat-name-input"
                                                            value={editingChatName}
                                                            onChange={(e) => setEditingChatName(e.target.value)}
                                                            onBlur={() => handleEditChat(chat.id)}
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Escape') {
                                                                    cancelEditingChat();
                                                                }
                                                            }}
                                                            autoFocus
                                                        />
                                                    </form>
                                                ) : (
                                                    <span className="chat-name">{chat.name}</span>
                                                )}
                                                <span className="chat-time">
                                                    {formatChatTime(chat.updated_at || chat.created_at)}
                                                </span>
                                            </div>
                                            <div className="chat-preview">
                                                {getPreviewText(chat)}
                                            </div>
                                        </div>
                                        
                                        <div className="chat-actions">
                                            <button 
                                                className="chat-action-btn"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    startEditingChat(chat);
                                                }}
                                                title="Renombrar chat"
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
                                            >
                                                <i className="fas fa-trash"></i>
                                            </button>
                                        </div>
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

// Exportar el componente
window.ChatSidebar = ChatSidebar; 