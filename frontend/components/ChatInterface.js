// Componente principal de la interfaz de chat
const ChatInterface = ({ selectedVectorStore, selectedUser, selectedChat, isConnected }) => {
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

    // Cargar historial cuando cambia el chat seleccionado
    React.useEffect(() => {
        const loadChatHistory = async () => {
            if (selectedChat && selectedUser && selectedChat.id) {
                try {
                    setIsLoading(true);
                    setMessages([]); // Limpiar mensajes primero
                    
                    // Solo cargar historial si no es un chat completamente nuevo
                    if (selectedChat.preview !== 'Chat nuevo - Sin mensajes') {
                        const response = await window.apiClient.getChatMessages(
                            selectedUser,
                            selectedChat.vectorStore,
                            selectedChat.id
                        );
                        
                        if (response.messages && response.messages.length > 0) {
                            // Convertir el historial del servidor al formato local
                            const chatMessages = [];
                            response.messages.forEach((msg, index) => {
                                // Agregar pregunta del usuario
                                if (msg.question) {
                                    chatMessages.push({
                                        id: `${selectedChat.id}-user-${index}`,
                                        type: 'user',
                                        content: msg.question,
                                        timestamp: new Date(msg.timestamp || Date.now())
                                    });
                                }
                                
                                // Agregar respuesta del asistente
                                if (msg.answer) {
                                    chatMessages.push({
                                        id: `${selectedChat.id}-assistant-${index}`,
                                        type: 'assistant',
                                        content: msg.answer,
                                        timestamp: new Date(msg.timestamp || Date.now())
                                    });
                                }
                            });
                            
                            setMessages(chatMessages);
                        }
                    }
                    
                    // Agregar mensaje de bienvenida si no hay mensajes
                    if (selectedChat && selectedVectorStore) {
                        const welcomeMessage = `Chat: ${selectedChat.displayName} - ${getStoreDisplayName(selectedVectorStore)}`;
                        addSystemMessage(welcomeMessage);
                    }
                    
                } catch (error) {
                    console.error('Error loading chat history:', error);
                    addSystemMessage('Error al cargar el historial del chat');
                } finally {
                    setIsLoading(false);
                }
            } else {
                // Si no hay chat seleccionado, limpiar mensajes
                setMessages([]);
            }
        };

        loadChatHistory();
    }, [selectedChat?.id, selectedUser]); // Observar el ID del chat y el usuario

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
        if (!messageText.trim() || !isConnected || !selectedUser) return;

        // Agregar mensaje del usuario
        addMessage('user', messageText);
        setInputValue('');
        setIsLoading(true);

        try {
            // Determinar el vector store a usar - priorizar el del chat seleccionado
            const vectorStoreToUse = selectedChat?.vectorStore || selectedVectorStore;
            const chatIdToUse = selectedChat?.id || sessionId;

            // Enviar mensaje a la API
            const response = await window.apiClient.sendMessage(messageText, {
                vectorStore: vectorStoreToUse,
                userId: selectedUser,
                chatId: chatIdToUse
            });

            // Agregar respuesta del asistente
            addMessage('assistant', response.answer, response.sources);

            // Si es un nuevo chat (no estaba en la lista), disparar evento para actualizar la lista
            if (selectedChat && selectedChat.preview === 'Chat nuevo - Sin mensajes') {
                // Notificar al componente padre que el chat ha sido usado
                window.dispatchEvent(new CustomEvent('chatFirstMessage', {
                    detail: {
                        chatId: selectedChat.id,
                        userId: selectedUser,
                        vectorStore: vectorStoreToUse,
                        firstMessage: messageText.slice(0, 50) + (messageText.length > 50 ? '...' : '')
                    }
                }));
            }

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
                        Usuario: {selectedUser} | Chat: {selectedChat?.id?.slice(-8) || sessionId.slice(-8)} | Base: {getStoreDisplayName(selectedVectorStore)}
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