const { useState, useEffect } = React;

const App = () => {
    // Main states
    const [isConnected, setIsConnected] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [vectorStores, setVectorStores] = useState([]);
    const [userDocuments, setUserDocuments] = useState([]);
    const [combinedStores, setCombinedStores] = useState([]);
    const [selectedVectorStore, setSelectedVectorStore] = useState('combined');
    const [error, setError] = useState(null);

    // States for user and chat management
    const [selectedUser, setSelectedUser] = useState(null);
    const [selectedChat, setSelectedChat] = useState(null);
    
    // State for document-specific chat
    const [selectedDocument, setSelectedDocument] = useState(null);
    
    // State for collapsable sidebar
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

    // Initialize the application
    useEffect(() => {
        initializeApp();
        // Restore last user and chat from localStorage
        restoreLastSession();
    }, []);

    // Reload user documents when user changes
    useEffect(() => {
        if (selectedUser) {
            loadUserDocuments();
        } else {
            setUserDocuments([]);
        }
    }, [selectedUser]);

    // Solo usar documentos de usuario, no documentos del sistema
    useEffect(() => {
        const userStores = userDocuments.map(doc => ({
            id: `${selectedUser}_${doc.filename.replace(/\.[^/.]+$/, "")}`,
            name: doc.filename,
            type: 'user',
            displayName: doc.filename,
            description: `Documento personal - ${formatFileSize(doc.size)}`,
            icon: 'fas fa-file-user',
            userId: selectedUser,
            filename: doc.filename
        }));

        setCombinedStores(userStores);
        
        // Auto-seleccionar el primer documento si hay documentos disponibles
        if (userStores.length > 0 && !selectedVectorStore) {
            const firstDoc = userStores[0];
            setSelectedVectorStore(firstDoc.id);
            setSelectedDocument({
                userId: firstDoc.userId,
                filename: firstDoc.filename,
                ready: true
            });
        }
    }, [userDocuments, selectedUser]);

    const initializeApp = async () => {
        setIsLoading(true);
        setError(null);
        
        try {
            // Check connection with the server
            const connected = await window.apiClient.checkConnection();
            setIsConnected(connected);

            if (connected) {
                // Load available vector stores
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
            
            // The API returns { stores: [...], default: '...' }
            let storesArray = [];
            let defaultStore = 'combined';
            
            if (response && typeof response === 'object') {
                if (Array.isArray(response.stores)) {
                    storesArray = response.stores;
                    defaultStore = response.default || 'combined';
                } else if (Array.isArray(response)) {
                    // Fallback if the response is directly an array
                    storesArray = response;
                } else {
                    console.warn('Unexpected vector stores response format:', response);
                    storesArray = [];
                }
            }
            
            setVectorStores(storesArray);
            
            // Select the default store or 'combined' if available
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
            setVectorStores([]); // Ensure vectorStores is an array
        }
    };

    const loadUserDocuments = async () => {
        if (!selectedUser) return;
        
        try {
            const response = await window.apiClient.getUserFiles(selectedUser);
            setUserDocuments(response.files || []);
        } catch (error) {
            console.error('Error loading user documents:', error);
            setUserDocuments([]);
        }
    };

    // Helper functions for system stores
    const getSystemStoreDisplayName = (storeName) => {
        switch (storeName) {
            case 'combined':
                return '📚 Todos los Documentos';
            case 'my-document':
                return '📄 Mi Documento';
            default:
                return storeName.charAt(0).toUpperCase() + storeName.slice(1);
        }
    };

    const getSystemStoreDescription = (storeName) => {
        switch (storeName) {
            case 'combined':
                return 'Buscar en todos los documentos del sistema';
            case 'my-document':
                return 'Documento específico del sistema';
            default:
                return `Base de conocimiento: ${storeName}`;
        }
    };

    const getSystemStoreIcon = (storeName) => {
        switch (storeName) {
            case 'combined':
                return 'fas fa-layer-group';
            case 'my-document':
                return 'fas fa-file-alt';
            default:
                return 'fas fa-database';
        }
    };

    // Helper function for file size formatting
    const formatFileSize = (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const handleVectorStoreChange = (newStore, additionalInfo = null) => {
        console.log('Vector store changed to:', newStore);
        
        // Solo cambiar el contexto, NO crear nuevo chat ni limpiar mensajes
        setSelectedVectorStore(newStore);
        
        // Si hay una selección válida, actualizar el documento seleccionado
        if (newStore && newStore !== '') {
            console.log(`Context changed to: ${newStore}. Chat continues in unified session.`);
        } else {
            // Sin documento seleccionado
            setSelectedVectorStore(null);
            console.log('No document selected for context.');
        }
    };

    const handleDocumentUploaded = async (response) => {
        console.log('Document uploaded:', response);
        // Reload vector stores after uploading a document
        await loadVectorStores();
        // Also reload user documents if user is selected
        if (selectedUser) {
            await loadUserDocuments();
        }
    };

    const handleRetryConnection = () => {
        initializeApp();
    };

    // Restore last session from localStorage
    const restoreLastSession = () => {
        try {
            console.log('🔄 Restaurando sesión anterior...');
            
            // Restore last user
            const lastUser = window.StorageUtils.getLastUser();
            if (lastUser) {
                console.log('👤 Restaurando usuario:', lastUser);
                setSelectedUser(lastUser);
                
                // Restore last chat for the user
                const lastChat = window.StorageUtils.getLastChat();
                if (lastChat) {
                    console.log('💬 Restaurando chat:', lastChat);
                    // Validate that the chat has the necessary properties
                    if (lastChat.id && lastChat.vectorStore) {
                        setSelectedChat(lastChat);
                    } else {
                        console.warn('⚠️ Chat inválido en localStorage, eliminando...');
                        window.StorageUtils.clearLastChat();
                    }
                }
            } else {
                console.log('👤 No hay usuario anterior guardado');
            }
        } catch (error) {
            console.warn('⚠️ Error restaurando sesión anterior:', error);
            // In case of error, clear localStorage to avoid future problems
            window.StorageUtils.clearAll();
        }
    };

    const handleUserChange = (userId) => {
        setSelectedUser(userId);
        // Save user in localStorage
        window.StorageUtils.saveLastUser(userId);
        
        // Reset chat when user changes and clear saved chat
        setSelectedChat(null);
        window.StorageUtils.clearLastChat();
    };

    const handleChatChange = (chat) => {
        setSelectedChat(chat);
        // Save chat in localStorage
        if (chat) {
            window.StorageUtils.saveLastChat(chat);
        }
    };

    const handleDocumentReady = (document) => {
        setSelectedDocument(document);
        // Los documentos son recursos que se pueden seleccionar para chats existentes
        // No se crean chats automáticamente
    };

    // Get user information to display in the header
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

    // Conditional rendering for connection errors
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

    // Main rendering of the application
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
                </div>
                
                <div className="header-controls">
                    <div className="status-indicator">
                        <div className="status-dot"></div>
                        <span>Conectado</span>
                    </div>
                    <window.ThemeToggle />
                    <window.AccountMenu
                        selectedUser={selectedUser}
                        onUserChange={handleUserChange}
                        onChatChange={handleChatChange}
                    />
                </div>
            </header>

            {/* Main Content */}
            <main className="app-main">
                {/* Center Area - Chat with Tabs */}
                <section className="main-chat-area">
                    {selectedUser && (
                        <div className="chat-tabs">
                            <div className="chat-tabs-header">
                                <h3>
                                    <i className="fas fa-comments"></i>
                                    Conversaciones de {selectedUser}
                                </h3>
                            </div>
                            <div className="chat-tabs-content">
                                <window.UserManager
                                    onUserChange={handleUserChange}
                                    onChatChange={handleChatChange}
                                    selectedUser={selectedUser}
                                    selectedChat={selectedChat}
                                    tabsOnly={true}
                                />
                            </div>
                        </div>
                    )}

                    <div className="chat-content">
                        {selectedUser ? (
                            <window.ChatInterface
                                selectedVectorStore={selectedVectorStore}
                                selectedUser={selectedUser}
                                selectedChat={selectedChat}
                                isConnected={isConnected}
                                selectedDocument={selectedDocument}
                            />
                        ) : (
                            <div className="welcome-message">
                                <div className="welcome-content">
                                    <i className="fas fa-robot"></i>
                                    <h3>¡Bienvenido a LangChain Document Chat!</h3>
                                    <p>Para comenzar, selecciona un usuario existente o crea uno nuevo desde el menú de cuenta en la parte superior.</p>
                                    <p>Una vez seleccionado un usuario, podrás empezar a chatear con tus documentos.</p>
                                    <div className="welcome-features">
                                        <div className="feature-item">
                                            <i className="fas fa-upload"></i>
                                            <span>Sube documentos PDF, TXT o MD</span>
                                        </div>
                                        <div className="feature-item">
                                            <i className="fas fa-search"></i>
                                            <span>Busca información en tiempo real</span>
                                        </div>
                                        <div className="feature-item">
                                            <i className="fas fa-comments"></i>
                                            <span>Mantén múltiples conversaciones</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </section>

                {/* Right Sidebar - Tools & Stats (Collapsable) */}
                <aside className={`tools-sidebar ${isSidebarCollapsed ? 'collapsed' : ''}`}>
                    <div className="sidebar-toggle">
                        <button
                            className="toggle-button"
                            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                            title={isSidebarCollapsed ? 'Expandir sidebar' : 'Colapsar sidebar'}
                        >
                            <i className={`fas fa-chevron-${isSidebarCollapsed ? 'left' : 'right'}`}></i>
                        </button>
                    </div>
                    
                    <div className="tools-sidebar-content">
                    {/* Base de Conocimiento */}
                    <section className="sidebar-section">
                        <h3>
                            <i className="fas fa-database"></i>
                            Base de Conocimiento
                        </h3>
                        <window.VectorStoreSelector
                            vectorStores={combinedStores}
                            selectedStore={selectedVectorStore}
                            onStoreChange={handleVectorStoreChange}
                            isLoading={isLoading}
                            selectedUser={selectedUser}
                        />
                    </section>

                    {/* Subir Documentos */}
                    <section className="sidebar-section">
                        <window.SimpleDocumentUploader
                            userId={selectedUser}
                            onDocumentUploaded={handleDocumentReady}
                        />
                    </section>

                    {/* Gestión de Sesión */}
                    <section className="sidebar-section">
                        <h3>
                            <i className="fas fa-history"></i>
                            Gestión de Sesión
                        </h3>
                        <window.SessionManager />
                    </section>
                    </div>
                </aside>
            </main>
        </div>
    );
};

// Render the application
const rootElement = document.getElementById('root');
const root = ReactDOM.createRoot(rootElement);
root.render(<App />); 