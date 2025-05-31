// Componente principal de la interfaz de chat
const ChatInterface = ({ selectedVectorStore, isConnected }) => {
    const [messages, setMessages] = React.useState([]);
    const [inputValue, setInputValue] = React.useState('');
    const [isLoading, setIsLoading] = React.useState(false);
    const [sessionId] = React.useState(() => window.apiClient.constructor.generateId());
    const messagesEndRef = React.useRef(null);

    const quickActions = [
        "¿Qué documentos tienes disponibles?",
        "¿Cuáles son las políticas principales?",
        "¿Cómo puedo configurar el sistema?",
        "Muéstrame ejemplos de uso",
        "¿Qué procedimientos debo seguir?"
    ];

    React.useEffect(() => {
        scrollToBottom();
    }, [messages]);

    React.useEffect(() => {
        // Mensaje de bienvenida cuando cambia el vector store
        if (selectedVectorStore) {
            addSystemMessage(`Conectado a: ${getStoreDisplayName(selectedVectorStore)}`);
        }
    }, [selectedVectorStore]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    const getStoreDisplayName = (storeName) => {
        switch (storeName) {
            case 'combined':
                return 'Todos los Documentos';
            default:
                return storeName.charAt(0).toUpperCase() + storeName.slice(1);
        }
    };

    const addMessage = (type, content, sources = null) => {
        const message = {
            id: window.apiClient.constructor.generateId(),
            type,
            content,
            sources,
            timestamp: new Date()
        };
        setMessages(prev => [...prev, message]);
        return message;
    };

    const addSystemMessage = (content) => {
        return addMessage('system', content);
    };

    const sendMessage = async (messageText) => {
        if (!messageText.trim() || !isConnected) return;

        // Agregar mensaje del usuario
        addMessage('user', messageText);
        setInputValue('');
        setIsLoading(true);

        try {
            // Enviar mensaje a la API
            const response = await window.apiClient.sendMessage(messageText, {
                vectorStore: selectedVectorStore,
                userId: 'web-client',
                chatId: sessionId
            });

            // Agregar respuesta del asistente
            addMessage('assistant', response.answer, response.sources);

        } catch (error) {
            console.error('Error sending message:', error);
            addMessage('system', `Error: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        sendMessage(inputValue);
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage(inputValue);
        }
    };

    const handleQuickAction = (action) => {
        if (!isLoading && isConnected) {
            sendMessage(action);
        }
    };

    const clearChat = () => {
        setMessages([]);
        addSystemMessage('Chat limpiado. ¿En qué puedo ayudarte?');
    };

    const exportChat = () => {
        const chatData = {
            sessionId,
            vectorStore: selectedVectorStore,
            timestamp: new Date().toISOString(),
            messages: messages.map(msg => ({
                type: msg.type,
                content: msg.content,
                sources: msg.sources,
                timestamp: msg.timestamp
            }))
        };

        const blob = new Blob([JSON.stringify(chatData, null, 2)], {
            type: 'application/json'
        });
        
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `chat-${sessionId}-${new Date().toISOString().slice(0, 10)}.json`;
        link.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="chat-container">
            {/* Header del chat */}
            <div className="chat-header">
                <div className="chat-title">
                    <h2>
                        <i className="fas fa-comments"></i>
                        Chat con Documentos
                    </h2>
                    <span className="chat-subtitle">
                        Sesión: {sessionId.slice(-8)} | Base: {getStoreDisplayName(selectedVectorStore)}
                    </span>
                </div>
                
                <div className="chat-actions">
                    <button
                        className="action-button"
                        onClick={clearChat}
                        title="Limpiar chat"
                        disabled={isLoading}
                    >
                        <i className="fas fa-trash"></i>
                    </button>
                    
                    <button
                        className="action-button"
                        onClick={exportChat}
                        title="Exportar chat"
                        disabled={messages.length === 0}
                    >
                        <i className="fas fa-download"></i>
                    </button>
                </div>
            </div>

            {/* Mensajes */}
            <div className="chat-messages">
                {messages.length === 0 && (
                    <div className="welcome-message">
                        <div className="welcome-content">
                            <i className="fas fa-robot"></i>
                            <h3>¡Hola! Soy tu asistente de documentos</h3>
                            <p>Puedo ayudarte a encontrar información en los documentos disponibles.</p>
                            <p>Prueba preguntándome algo o usa una de las acciones rápidas de abajo.</p>
                        </div>
                    </div>
                )}

                {messages.map((message) => (
                    <window.ChatMessage
                        key={message.id}
                        message={message}
                        timestamp={message.timestamp}
                    />
                ))}

                {isLoading && <window.TypingIndicator />}
                
                <div ref={messagesEndRef} />
            </div>

            {/* Input de chat */}
            <div className="chat-input-container">
                <form className="chat-input-form" onSubmit={handleSubmit}>
                    <textarea
                        className="chat-input"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder={
                            isConnected 
                                ? "Escribe tu pregunta sobre los documentos..."
                                : "Conectando al servidor..."
                        }
                        disabled={isLoading || !isConnected}
                        rows={1}
                        style={{
                            height: 'auto',
                            minHeight: '44px',
                            maxHeight: '120px'
                        }}
                        onInput={(e) => {
                            e.target.style.height = 'auto';
                            e.target.style.height = e.target.scrollHeight + 'px';
                        }}
                    />
                    
                    <button 
                        type="submit" 
                        className="send-button"
                        disabled={isLoading || !inputValue.trim() || !isConnected}
                        title="Enviar mensaje"
                    >
                        <i className="fas fa-paper-plane"></i>
                    </button>
                </form>

                {/* Acciones rápidas */}
                <div className="quick-actions">
                    {quickActions.map((action, index) => (
                        <button
                            key={index}
                            className="quick-action-button"
                            onClick={() => handleQuickAction(action)}
                            disabled={isLoading || !isConnected}
                        >
                            {action}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

// Componente para mostrar el estado de la aplicación
const AppStatus = ({ isConnected, isLoading, vectorStores, selectedStore }) => {
    // Asegurar que vectorStores es un array
    const storesArray = Array.isArray(vectorStores) ? vectorStores : [];
    
    return (
        <div className="app-status">
            <div className="status-item">
                <window.ConnectionStatus isConnected={isConnected} isLoading={isLoading} />
            </div>
            <div className="status-item">
                <i className="fas fa-database"></i>
                <span>{storesArray.length} bases disponibles</span>
            </div>
            <div className="status-item">
                <i className="fas fa-check-circle"></i>
                <span>{selectedStore}</span>
            </div>
        </div>
    );
};

window.ChatInterface = ChatInterface;
window.AppStatus = AppStatus; 