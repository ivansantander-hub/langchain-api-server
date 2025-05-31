// Componente de menú de cuenta en el navbar
const { useState, useEffect, useRef } = React;

const AccountMenu = ({ selectedUser, onUserChange, onChatChange }) => {
    const [users, setUsers] = useState([]);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [showNewUserModal, setShowNewUserModal] = useState(false);
    const [newUserName, setNewUserName] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [userStats, setUserStats] = useState({
        totalChats: 0,
        lastActivity: null
    });
    
    const dropdownRef = useRef(null);

    // Cargar usuarios al montar el componente
    useEffect(() => {
        loadUsers();
    }, []);

    // Cargar estadísticas del usuario seleccionado
    useEffect(() => {
        if (selectedUser) {
            loadUserStats();
        }
    }, [selectedUser]);

    // Cerrar dropdown al hacer clic fuera
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsDropdownOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const loadUsers = async () => {
        try {
            const response = await window.apiClient.getUsers();
            const usersList = response.users || response || [];
            setUsers(usersList);
            setError(null);
        } catch (error) {
            console.error('Error loading users:', error);
            setError('No se pudieron cargar los usuarios');
            setUsers([]);
        }
    };

    const loadUserStats = async () => {
        try {
            const vectorStoresResponse = await window.apiClient.getUserVectorStores(selectedUser);
            const vectorStores = vectorStoresResponse.vectorStores || [];
            
            let totalChats = 0;
            for (const vectorStore of vectorStores) {
                try {
                    const chatsResponse = await window.apiClient.getUserVectorChats(selectedUser, vectorStore);
                    const vectorChats = chatsResponse.chats || [];
                    totalChats += vectorChats.length;
                } catch (vectorError) {
                    console.warn(`Error loading chats for vector store ${vectorStore}:`, vectorError);
                }
            }
            
            const lastActivity = new Date().toLocaleDateString();
            
            setUserStats({
                totalChats,
                lastActivity
            });
        } catch (error) {
            console.error('Error loading user stats:', error);
            setUserStats({
                totalChats: 0,
                lastActivity: null
            });
        }
    };

    const handleUserSelect = async (userName) => {
        if (userName === selectedUser) {
            setIsDropdownOpen(false);
            return;
        }

        setIsLoading(true);
        try {
            // Cambiar usuario
            onUserChange(userName);
            
            // Limpiar chat seleccionado
            onChatChange(null);
            
            setIsDropdownOpen(false);
        } catch (error) {
            console.error('Error selecting user:', error);
            setError('Error al seleccionar el usuario');
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreateUser = async () => {
        if (!newUserName.trim()) {
            setError('Por favor, ingresa un nombre de usuario');
            return;
        }

        if (users.includes(newUserName.trim())) {
            setError('Este nombre de usuario ya existe');
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            // Crear un usuario enviando un mensaje inicial (esto crea el usuario en el backend)
            await window.apiClient.sendMessage('Hola, soy un nuevo usuario', {
                vectorStore: 'combined',
                userId: newUserName.trim(),
                chatId: 'default'
            });
            
            // Recargar la lista de usuarios
            await loadUsers();
            
            // Seleccionar el nuevo usuario automáticamente
            onUserChange(newUserName.trim());
            onChatChange(null);
            
            // Cerrar modal y limpiar formulario
            setShowNewUserModal(false);
            setNewUserName('');
        } catch (error) {
            console.error('Error creating user:', error);
            setError('Error al crear el usuario. Inténtalo de nuevo.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleLogout = () => {
        onUserChange(null);
        onChatChange(null);
        setIsDropdownOpen(false);
    };

    const getUserAvatar = (userName) => {
        return userName ? userName.charAt(0).toUpperCase() : '?';
    };

    const getUserInfo = () => {
        if (!selectedUser) {
            return {
                name: 'Invitado',
                avatar: '?',
                status: 'No conectado'
            };
        }

        return {
            name: selectedUser,
            avatar: getUserAvatar(selectedUser),
            status: userStats.totalChats > 0 ? `${userStats.totalChats} conversaciones` : 'Nuevo usuario'
        };
    };

    const userInfo = getUserInfo();

    return (
        <div className="account-menu" ref={dropdownRef}>
            <button
                className="account-button"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                disabled={isLoading}
            >
                <div className="account-avatar">
                    {userInfo.avatar}
                </div>
                <div className="account-name">
                    {userInfo.name}
                </div>
                <i className={`fas fa-chevron-down ${isDropdownOpen ? 'rotated' : ''}`}></i>
            </button>

            {isDropdownOpen && (
                <div className="account-dropdown">
                    {selectedUser && (
                        <>
                            <div className="dropdown-header">
                                <div className="dropdown-avatar">
                                    {userInfo.avatar}
                                </div>
                                <div className="dropdown-user-info">
                                    <div className="dropdown-user-name">{userInfo.name}</div>
                                    <div className="dropdown-user-stats">{userInfo.status}</div>
                                </div>
                            </div>
                            <hr className="dropdown-divider" />
                        </>
                    )}

                    <div className="dropdown-section">
                        <div className="dropdown-section-title">Usuarios</div>
                        <div className="user-list">
                            {users.length > 0 ? (
                                users.map(user => (
                                    <button
                                        key={user}
                                        className={`user-item ${user === selectedUser ? 'active' : ''}`}
                                        onClick={() => handleUserSelect(user)}
                                        disabled={isLoading}
                                    >
                                        <div className="user-item-avatar">
                                            {getUserAvatar(user)}
                                        </div>
                                        <div className="user-item-name">{user}</div>
                                    </button>
                                ))
                            ) : (
                                <div className="no-users">
                                    <i className="fas fa-users"></i>
                                    <p>No hay usuarios creados</p>
                                </div>
                            )}
                        </div>
                    </div>

                    <hr className="dropdown-divider" />

                    <div className="dropdown-actions">
                        <button
                            className="dropdown-action-button"
                            onClick={() => {
                                setShowNewUserModal(true);
                                setIsDropdownOpen(false);
                            }}
                        >
                            <i className="fas fa-user-plus"></i>
                            Crear nuevo usuario
                        </button>
                        
                        {selectedUser && (
                            <button
                                className="dropdown-action-button logout"
                                onClick={handleLogout}
                            >
                                <i className="fas fa-sign-out-alt"></i>
                                Cerrar sesión
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Modal para crear nuevo usuario */}
            <window.Modal
                isOpen={showNewUserModal}
                onClose={() => {
                    setShowNewUserModal(false);
                    setNewUserName('');
                    setError(null);
                }}
                title="Crear Nuevo Usuario"
                size="small"
            >
                {error && (
                    <div className="modal-error">
                        <i className="fas fa-exclamation-triangle"></i>
                        {error}
                    </div>
                )}

                <div className="modal-form">
                    <div className="form-group">
                        <label htmlFor="newUserName">Nombre de usuario:</label>
                        <input
                            id="newUserName"
                            type="text"
                            className="form-input"
                            placeholder="Ej: usuario1"
                            value={newUserName}
                            onChange={(e) => setNewUserName(e.target.value)}
                            onKeyPress={(e) => {
                                if (e.key === 'Enter' && newUserName.trim()) {
                                    handleCreateUser();
                                }
                            }}
                            disabled={isLoading}
                            autoFocus
                        />
                    </div>

                    <div className="modal-actions">
                        <button
                            className="modal-button secondary"
                            onClick={() => {
                                setShowNewUserModal(false);
                                setNewUserName('');
                                setError(null);
                            }}
                            disabled={isLoading}
                        >
                            Cancelar
                        </button>
                        <button
                            className="modal-button primary"
                            onClick={handleCreateUser}
                            disabled={isLoading || !newUserName.trim()}
                        >
                            {isLoading ? (
                                <>
                                    <i className="fas fa-spinner fa-spin"></i>
                                    Creando...
                                </>
                            ) : (
                                <>
                                    <i className="fas fa-plus"></i>
                                    Crear Usuario
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </window.Modal>
        </div>
    );
};

// Exportar componente
window.AccountMenu = AccountMenu; 