// Aplicación principal de LangChain Document Chat Cliente Web
const { useState, useEffect } = React;

const App = () => {
    // Estados principales
    const [isConnected, setIsConnected] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [vectorStores, setVectorStores] = useState([]);
    const [selectedVectorStore, setSelectedVectorStore] = useState('combined');
    const [error, setError] = useState(null);
    
    // Estados para gestión de usuarios y chats
    const [selectedUser, setSelectedUser] = useState(null);
    const [selectedChat, setSelectedChat] = useState(null);

    // Inicialización de la aplicación
    useEffect(() => {
        initializeApp();
    }, []);

    const initializeApp = async () => {
        setIsLoading(true);
        setError(null);
        
        try {
            // Verificar conexión con el servidor
            const connected = await window.apiClient.checkConnection();
            setIsConnected(connected);

            if (connected) {
                // Cargar vector stores disponibles
                await loadVectorStores();
            } else {
                setError('No se puede conectar al servidor. Verifica que esté ejecutándose en http://localhost:3000');
            }
        } catch (error) {
            console.error('Error initializing app:', error);
            setError(`Error de inicialización: ${error.message}`);
            setIsConnected(false);
        } finally {
            setIsLoading(false);
        }
    };

    const loadVectorStores = async () => {
        try {
            const response = await window.apiClient.getVectorStores();
            console.log('Vector stores response:', response);
            
            // La API devuelve { stores: [...], default: '...' }
            let storesArray = [];
            let defaultStore = 'combined';
            
            if (response && typeof response === 'object') {
                if (Array.isArray(response.stores)) {
                    storesArray = response.stores;
                    defaultStore = response.default || 'combined';
                } else if (Array.isArray(response)) {
                    // Fallback si la respuesta es directamente un array
                    storesArray = response;
                } else {
                    console.warn('Unexpected vector stores response format:', response);
                    storesArray = [];
                }
            }
            
            setVectorStores(storesArray);
            
            // Seleccionar el store por defecto o 'combined' si está disponible
            if (storesArray.includes(defaultStore)) {
                setSelectedVectorStore(defaultStore);
            } else if (storesArray.includes('combined')) {
                setSelectedVectorStore('combined');
            } else if (storesArray.length > 0) {
                setSelectedVectorStore(storesArray[0]);
            }
        } catch (error) {
            console.error('Error loading vector stores:', error);
            setError(`Error cargando bases de conocimiento: ${error.message}`);
            setVectorStores([]); // Asegurar que vectorStores sea un array
        }
    };

    const handleVectorStoreChange = (newStore) => {
        setSelectedVectorStore(newStore);
    };

    const handleDocumentUploaded = async (response) => {
        console.log('Document uploaded:', response);
        // Recargar vector stores después de subir un documento
        await loadVectorStores();
    };

    const handleRetryConnection = () => {
        initializeApp();
    };

    const handleUserChange = (userId) => {
        setSelectedUser(userId);
        // Resetear chat cuando cambia el usuario
        setSelectedChat(null);
    };

    const handleChatChange = (chat) => {
        setSelectedChat(chat);
    };

    // Obtener información del usuario para mostrar en el header
    const getCurrentUserInfo = () => {
        if (!selectedUser) {
            return {
                name: 'Seleccionar Usuario',
                avatar: '?',
                status: 'Sin usuario seleccionado'
            };
        }

        const chatInfo = selectedChat 
            ? `${selectedChat.vectorStore} - ${selectedChat.id}`
            : 'Nuevo chat';

        return {
            name: selectedUser,
            avatar: selectedUser.charAt(0).toUpperCase(),
            status: chatInfo
        };
    };

    // Renderizado condicional para errores de conexión
    if (error && !isConnected) {
        return (
            <div className="app">
                <div className="app-header">
                    <div className="header-left">
                        <div className="header-title">
                            <h1>
                                <i className="fas fa-robot"></i>
                                LangChain Document Chat
                            </h1>
                            <div className="header-subtitle">Cliente Web</div>
                        </div>
                    </div>
                    <div className="header-controls">
                        <window.ThemeToggle />
                    </div>
                </div>
                
                <div className="error-container">
                    <div className="error-content">
                        <i className="fas fa-exclamation-triangle"></i>
                        <h2>Error de Conexión</h2>
                        <p>{error}</p>
                        
                        <div className="error-actions">
                            <button 
                                className="retry-button"
                                onClick={handleRetryConnection}
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <>
                                        <i className="fas fa-spinner fa-spin"></i>
                                        Conectando...
                                    </>
                                ) : (
                                    <>
                                        <i className="fas fa-redo"></i>
                                        Reintentar Conexión
                                    </>
                                )}
                            </button>
                        </div>

                        <div className="connection-help">
                            <h3>Pasos para resolver:</h3>
                            <ol>
                                <li>Verifica que el servidor esté ejecutándose</li>
                                <li>Ejecuta <code>npm start</code> en el directorio del proyecto</li>
                                <li>El servidor debe estar disponible en <code>http://localhost:3000</code></li>
                                <li>Verifica que no haya problemas de CORS</li>
                            </ol>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    const userInfo = getCurrentUserInfo();

    // Renderizado principal de la aplicación
    return (
        <div className="app">
            {/* Header */}
            <header className="app-header">
                <div className="header-left">
                    <div className="header-title">
                        <h1>
                            <i className="fas fa-robot"></i>
                            LangChain Document Chat
                        </h1>
                        <div className="header-subtitle">
                            Asistente Inteligente de Documentos
                        </div>
                    </div>
                    
                    {selectedUser && (
                        <div className="user-info">
                            <div className="user-avatar">
                                {userInfo.avatar}
                            </div>
                            <div className="user-details">
                                <div className="user-name">{userInfo.name}</div>
                                <div className="user-status">{userInfo.status}</div>
                            </div>
                        </div>
                    )}
                </div>
                
                <div className="header-controls">
                    <window.ThemeToggle />
                    <div className="status-indicator">
                        <div className="status-dot"></div>
                        <span>Conectado</span>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="app-main">
                {/* Sidebar */}
                <aside className="sidebar">
                    {/* User Management */}
                    <section className="sidebar-section">
                        <window.UserManager
                            onUserChange={handleUserChange}
                            onChatChange={handleChatChange}
                            selectedUser={selectedUser}
                            selectedChat={selectedChat}
                        />
                    </section>

                    {/* Vector Store Selector */}
                    <section className="sidebar-section">
                        <window.VectorStoreSelector
                            vectorStores={vectorStores}
                            selectedStore={selectedVectorStore}
                            onStoreChange={handleVectorStoreChange}
                            isLoading={isLoading}
                        />
                    </section>

                    {/* Document Manager */}
                    <section className="sidebar-section">
                        <window.DocumentManager
                            onDocumentUploaded={handleDocumentUploaded}
                            isLoading={isLoading}
                        />
                    </section>

                    {/* Document Stats */}
                    <section className="sidebar-section">
                        <window.DocumentStats
                            vectorStores={vectorStores}
                        />
                    </section>
                </aside>

                {/* Chat Area */}
                <section className="chat-area">
                    {selectedUser ? (
                        <window.ChatInterface
                            selectedVectorStore={selectedVectorStore}
                            selectedUser={selectedUser}
                            selectedChat={selectedChat}
                            isConnected={isConnected}
                        />
                    ) : (
                        <div className="welcome-message">
                            <div className="welcome-content">
                                <i className="fas fa-user-plus"></i>
                                <h3>¡Bienvenido!</h3>
                                <p>Para comenzar, selecciona un usuario existente o crea uno nuevo desde el panel lateral.</p>
                                <p>Una vez seleccionado un usuario, podrás empezar a chatear con tus documentos.</p>
                            </div>
                        </div>
                    )}
                </section>
            </main>
        </div>
    );
};

// Renderizar la aplicación
const rootElement = document.getElementById('root');
const root = ReactDOM.createRoot(rootElement);
root.render(<App />); 