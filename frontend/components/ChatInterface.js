// Componente principal de la interfaz de chat
const ChatInterface = ({ selectedVectorStore, selectedUser, selectedChat, isConnected, selectedDocument }) => {
    const [messages, setMessages] = React.useState([]);
    const [inputValue, setInputValue] = React.useState('');
    const [isLoading, setIsLoading] = React.useState(false);
    const [sessionId] = React.useState(() => window.apiClient.constructor.generateId());
    const messagesEndRef = React.useRef(null);
    const chatInputRef = React.useRef(null);

    // Estado para quick actions dinámicas
    const [quickActions, setQuickActions] = React.useState([]);
    const [isGeneratingActions, setIsGeneratingActions] = React.useState(false);

    // Estado para configuración del modelo
    const [modelConfig, setModelConfig] = React.useState(null);
    const [modelConfigComponent, setModelConfigComponent] = React.useState(null);

    // Estado para documento específico seleccionado
    const [currentDocument, setCurrentDocument] = React.useState(selectedDocument || null);

    React.useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Efecto para mantener el foco en el input
    React.useEffect(() => {
        const focusInput = () => {
            if (chatInputRef.current && !isLoading) {
                setTimeout(() => {
                    chatInputRef.current.focus();
                }, 100);
            }
        };

        // Foco inicial
        focusInput();

        // Foco después de cargar
        if (!isLoading) {
            focusInput();
        }
    }, [isLoading, selectedUser, selectedChat]);

    React.useEffect(() => {
        // Mensaje de bienvenida cuando cambia el vector store
        if (selectedVectorStore) {
            console.log(`Vector store cambiado a: ${selectedVectorStore}`);
            addSystemMessage(`Conectado a: ${getStoreDisplayName(selectedVectorStore)}`);
        }
    }, [selectedVectorStore]);

    // Efecto para actualizar documento seleccionado
    React.useEffect(() => {
        setCurrentDocument(selectedDocument || null);
        if (selectedDocument) {
            console.log(`Documento específico seleccionado: ${selectedDocument.filename}`);
            addSystemMessage(`Documento específico cargado: ${selectedDocument.filename}`);
        }
    }, [selectedDocument]);

    // Efecto para generar quick actions cuando cambia el vector store
    React.useEffect(() => {
        if (selectedVectorStore) {
            generateContextualActions();
        }
    }, [selectedVectorStore, generateContextualActions]);

    // Efecto para actualizar quick actions cuando cambian los mensajes
    React.useEffect(() => {
        // Solo regenerar después de respuestas del asistente
        const lastMessage = messages[messages.length - 1];
        if (lastMessage && lastMessage.type === 'assistant') {
            // Debounce para evitar demasiadas regeneraciones
            const timer = setTimeout(() => {
                generateContextualActions();
            }, 1000);
            
            return () => clearTimeout(timer);
        }
    }, [messages, generateContextualActions]);

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
                                        timestamp: new Date(msg.answerTimestamp || msg.timestamp || Date.now())
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

    // Inicializar configuración del modelo al cargar el componente
    React.useEffect(() => {
        const initModelConfig = async () => {
            try {
                // Cargar configuración guardada o usar por defecto
                const saved = localStorage.getItem('modelConfig');
                if (saved) {
                    const savedConfig = JSON.parse(saved);
                    setModelConfig(savedConfig);
                } else {
                    // Obtener configuración por defecto del servidor
                    const response = await window.api.request('/api/config/model');
                    setModelConfig(response.config);
                }

                // Inicializar componente de configuración
                const configComponent = new window.ModelConfig();
                configComponent.setOnConfigChange((newConfig) => {
                    setModelConfig(newConfig);
                });
                setModelConfigComponent(configComponent);
            } catch (error) {
                console.error('Error initializing model config:', error);
            }
        };

        initModelConfig();
    }, []);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    const getStoreDisplayName = (storeName) => {
        // Si hay un documento específico seleccionado, mostrarlo
        if (currentDocument && currentDocument.filename) {
            return `Documento: ${currentDocument.filename}`;
        }
        
        switch (storeName) {
            case 'combined':
                return 'Todos los Documentos';
            default:
                return storeName.charAt(0).toUpperCase() + storeName.slice(1);
        }
    };

    // Función para generar quick actions basadas en el contexto
    const generateContextualActions = React.useCallback(async () => {
        if (!selectedVectorStore || isGeneratingActions) return;

        try {
            setIsGeneratingActions(true);
            
            // Todas las acciones serán dinámicas basadas en el contexto
            const contextualActions = [];
            
            // Generar sugerencias basadas en el contexto actual
            if (messages.length > 0) {
                // Hay conversación previa - generar sugerencias contextuales
                const lastUserMessages = messages
                    .filter(msg => msg.type === 'user')
                    .slice(-3) // Últimos 3 mensajes del usuario
                    .map(msg => msg.content);

                const lastAssistantMessages = messages
                    .filter(msg => msg.type === 'assistant' && msg.sources)
                    .slice(-2); // Últimas 2 respuestas con fuentes

                // Generar acciones de seguimiento basadas en temas
                if (lastUserMessages.length > 0) {
                    const lastMessage = lastUserMessages[lastUserMessages.length - 1];
                    const topics = extractTopicsFromMessage(lastMessage);
                    
                    topics.forEach(topic => {
                        contextualActions.push(
                            `¿Hay más información sobre ${topic}?`,
                            `¿Qué ejemplos específicos hay de ${topic}?`,
                            `¿Cómo se aplica ${topic} en la práctica?`
                        );
                    });
                }

                // Acciones basadas en fuentes mencionadas en respuestas previas
                if (lastAssistantMessages.length > 0) {
                    const uniqueSources = new Set();
                    lastAssistantMessages.forEach(msg => {
                        if (msg.sources) {
                            msg.sources.forEach(source => {
                                if (source.document) {
                                    uniqueSources.add(source.document);
                                }
                            });
                        }
                    });

                    Array.from(uniqueSources).slice(0, 2).forEach(document => {
                        contextualActions.push(
                            `¿Qué más información hay en ${document}?`,
                            `¿Hay otros temas en ${document}?`
                        );
                    });
                }

                // Acciones de profundización inteligentes
                const conversationContext = analyzeConversationContext(messages);
                contextualActions.push(...generateDeepDiveActions(conversationContext));

            } else {
                // Nueva conversación - generar sugerencias de inicio basadas en el vector store
                const storeSpecificActions = generateInitialActions(selectedVectorStore);
                contextualActions.push(...storeSpecificActions);
            }

            // Filtrar duplicados y limitar a 5 sugerencias máximo
            const uniqueActions = [...new Set(contextualActions)]
                .slice(0, 5);

            setQuickActions(uniqueActions);

        } catch (error) {
            console.error('Error generating contextual actions:', error);
            // Fallback dinámico basado en el vector store
            const fallbackActions = generateInitialActions(selectedVectorStore || 'combined');
            setQuickActions(fallbackActions.slice(0, 4));
        } finally {
            setIsGeneratingActions(false);
        }
    }, [selectedVectorStore, messages, isGeneratingActions]);

    // Función auxiliar para extraer múltiples temas de los mensajes
    const extractTopicsFromMessage = (message) => {
        // Buscar palabras clave importantes y extraer múltiples temas
        const keywords = message.toLowerCase().match(/\b(política|procedimiento|configurar|sistema|proceso|documento|archivo|ejemplo|información|datos|usuario|acceso|permiso|manual|guía|instalación|configuración|uso|funcionalidad|característica|pasos|instrucciones|tutorial|seguridad|backup|mantenimiento|actualización|error|problema|solución)\w*/gi);
        return keywords ? [...new Set(keywords.slice(0, 3))] : []; // Máximo 3 temas únicos
    };

    // Analizar el contexto general de la conversación
    const analyzeConversationContext = (messages) => {
        const userMessages = messages.filter(msg => msg.type === 'user');
        const assistantMessages = messages.filter(msg => msg.type === 'assistant');
        
        // Detectar patrones en la conversación
        const context = {
            isQuestioningBasics: userMessages.some(msg => 
                /\b(qué es|cómo|cuál|dónde|por qué|para qué)\b/i.test(msg.content)
            ),
            isSeekingExamples: userMessages.some(msg => 
                /\b(ejemplo|muestra|ilustra|caso|práctica|aplicación)\b/i.test(msg.content)
            ),
            isSeekingProcedures: userMessages.some(msg => 
                /\b(pasos|proceso|procedimiento|cómo hacer|tutorial|guía)\b/i.test(msg.content)
            ),
            hasTechnicalFocus: userMessages.some(msg => 
                /\b(configurar|instalar|sistema|técnico|error|problema)\b/i.test(msg.content)
            ),
            hasDocumentReferences: assistantMessages.some(msg => msg.sources && msg.sources.length > 0)
        };
        
        return context;
    };

    // Generar acciones de profundización basadas en el contexto
    const generateDeepDiveActions = (context) => {
        const actions = [];
        
        if (context.isQuestioningBasics) {
            actions.push("¿Puedes explicarlo de manera más simple?", "¿Hay conceptos previos que deba conocer?");
        }
        
        if (context.isSeekingExamples) {
            actions.push("¿Tienes más ejemplos similares?", "¿Hay casos de uso reales?");
        }
        
        if (context.isSeekingProcedures) {
            actions.push("¿Cuáles son los siguientes pasos?", "¿Hay alguna precaución que deba tomar?");
        }
        
        if (context.hasTechnicalFocus) {
            actions.push("¿Qué errores comunes debo evitar?", "¿Hay requisitos técnicos específicos?");
        }
        
        if (context.hasDocumentReferences) {
            actions.push("¿Hay información relacionada en otros documentos?", "¿Esto se conecta con otros temas?");
        }
        
        // Acciones genéricas de profundización
        actions.push("¿Puedes dar más detalles?", "¿Hay información adicional importante?");
        
        return actions.slice(0, 3); // Máximo 3 acciones de profundización
    };

    // Generar acciones iniciales específicas del vector store
    const generateInitialActions = (vectorStore) => {
        if (vectorStore === 'combined') {
            return [
                "¿Qué tipos de documentos están disponibles?",
                "¿Cuáles son los temas principales que puedes consultar?",
                "¿Cómo puedo navegar por toda la información?",
                "¿Qué documentos son más útiles para empezar?",
                "¿Hay algún orden recomendado para revisar la información?"
            ];
        } else {
            // Para documentos específicos, usar el mapeo inteligente
            const specificActions = getDocumentSpecificActions(vectorStore);
            const storeName = getStoreDisplayName(vectorStore);
            
            return [
                ...specificActions,
                `¿Cuál es la estructura de ${storeName}?`,
                `¿Qué temas cubre ${storeName}?`,
                `¿Para qué audiencia está dirigido ${storeName}?`
            ];
        }
    };

    // Función para obtener acciones específicas del documento
    const getDocumentSpecificActions = (storeName) => {
        const storeNameLower = storeName.toLowerCase();
        
        // Mapeo de documentos conocidos a preguntas específicas
        const documentMappings = {
            'manual': [
                "¿Cómo se instala el sistema?",
                "¿Cuáles son los requisitos del sistema?",
                "¿Cómo se configuran las opciones básicas?"
            ],
            'política': [
                "¿Cuáles son las reglas de uso?",
                "¿Qué está permitido y qué no?",
                "¿Cuáles son las sanciones por incumplimiento?"
            ],
            'procedimiento': [
                "¿Cuáles son los pasos a seguir?",
                "¿Quién es responsable de cada tarea?",
                "¿Qué documentos se necesitan?"
            ],
            'tutorial': [
                "¿Cómo empiezo?",
                "¿Cuáles son los ejemplos paso a paso?",
                "¿Dónde puedo practicar?"
            ],
            'faq': [
                "¿Cuáles son las preguntas más frecuentes?",
                "¿Dónde encontrar soluciones a problemas comunes?",
                "¿Cómo contactar soporte técnico?"
            ]
        };

        // Buscar coincidencias en el nombre del documento
        for (const [key, actions] of Object.entries(documentMappings)) {
            if (storeNameLower.includes(key)) {
                return actions;
            }
        }

        // Acciones genéricas si no se encuentra un mapeo específico
        return [
            "¿Cuál es el contenido principal?",
            "¿Qué información importante contiene?",
            "¿Hay ejemplos prácticos?"
        ];
    };

    const addMessage = (type, content, sources = null, customId = null, realTimestamp = null) => {
        const message = {
            id: customId || window.apiClient.constructor.generateId(),
            type,
            content,
            sources,
            timestamp: realTimestamp || new Date()
        };
        setMessages(prev => [...prev, message]);
        return message;
    };

    const addSystemMessage = (content) => {
        return addMessage('system', content, null, null, new Date());
    };

    const sendMessage = async (messageText) => {
        if (!messageText.trim() || !isConnected || !selectedUser) return;

        // Capturar timestamp real del momento del envío
        const userMessageTimestamp = new Date();
        
        // Agregar mensaje del usuario con timestamp real
        addMessage('user', messageText, null, null, userMessageTimestamp);
        setInputValue('');
        setIsLoading(true);

        // Mantener referencia al input para restaurar foco
        const inputElement = chatInputRef.current;

        try {
            // Usar el vector store seleccionado actualmente por el usuario (prioritario)
            // Solo usar el del chat si no hay uno seleccionado explícitamente
            const vectorStoreToUse = selectedVectorStore || selectedChat?.vectorStore || 'combined';
            const chatIdToUse = selectedChat?.id || sessionId;

            console.log(`Enviando mensaje con vector store: ${vectorStoreToUse}`);
            console.log(`selectedVectorStore: ${selectedVectorStore}, selectedChat?.vectorStore: ${selectedChat?.vectorStore}`);

            // Preparar opciones para la API incluyendo configuración del modelo
            const apiOptions = {
                vectorStore: vectorStoreToUse,
                userId: selectedUser,
                chatId: chatIdToUse
            };

            // Si hay un documento específico seleccionado, usarlo
            if (currentDocument && currentDocument.filename) {
                apiOptions.filename = currentDocument.filename;
                console.log(`Enviando mensaje con documento específico: ${currentDocument.filename}`);
            }

            // Incluir configuración del modelo si está disponible
            if (modelConfig) {
                apiOptions.modelConfig = modelConfig;
            }

            // Usar método de chat regular (sin streaming)
            const response = await window.apiClient.sendMessage(messageText, apiOptions);
            
            // Capturar timestamp real de la respuesta
            const assistantMessageTimestamp = new Date();
            
            // Agregar mensaje del asistente con timestamp real
            addMessage('assistant', response.answer, response.sources, null, assistantMessageTimestamp);

            // Después de enviar el mensaje, recargar el historial del servidor para obtener timestamps exactos
            setTimeout(async () => {
                try {
                    const historyResponse = await window.apiClient.getChatMessages(
                        selectedUser,
                        vectorStoreToUse,
                        chatIdToUse
                    );
                    
                    if (historyResponse.messages && historyResponse.messages.length > 0) {
                        // Obtener los dos últimos mensajes (pregunta y respuesta)
                        const serverMessages = historyResponse.messages.slice(-1)[0]; // Último intercambio
                        
                        if (serverMessages && serverMessages.question && serverMessages.answer) {
                            // Actualizar solo los timestamps de los mensajes más recientes
                            setMessages(prevMessages => {
                                const updatedMessages = [...prevMessages];
                                const userMsgIndex = updatedMessages.length - 2; // Penúltimo mensaje (usuario)
                                const assistantMsgIndex = updatedMessages.length - 1; // Último mensaje (asistente)
                                
                                if (userMsgIndex >= 0 && updatedMessages[userMsgIndex].type === 'user') {
                                    updatedMessages[userMsgIndex] = {
                                        ...updatedMessages[userMsgIndex],
                                        timestamp: new Date(serverMessages.timestamp)
                                    };
                                }
                                
                                if (assistantMsgIndex >= 0 && updatedMessages[assistantMsgIndex].type === 'assistant') {
                                    updatedMessages[assistantMsgIndex] = {
                                        ...updatedMessages[assistantMsgIndex],
                                        timestamp: new Date(serverMessages.answerTimestamp || serverMessages.timestamp)
                                    };
                                }
                                
                                return updatedMessages;
                            });
                        }
                    }
                } catch (err) {
                    console.warn('No se pudieron actualizar los timestamps del servidor:', err);
                }
            }, 500); // Esperar un poco para que el servidor procese completamente

            // Si es un nuevo chat, notificar al componente padre
            if (selectedChat && selectedChat.preview === 'Chat nuevo - Sin mensajes') {
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
            
            // Restaurar foco al input después del envío
            setTimeout(() => {
                if (inputElement) {
                    inputElement.focus();
                }
            }, 100);
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
            // Enfocar el input después de usar quick action
            setTimeout(() => {
                if (chatInputRef.current) {
                    chatInputRef.current.focus();
                }
            }, 150);
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
                        Usuario: {selectedUser} | Chat: {selectedChat?.id?.slice(-8) || sessionId.slice(-8)} | 
                        <span className="vector-store-info" style={{color: '#2563eb', fontWeight: 'bold'}}>
                            Base: {getStoreDisplayName(selectedVectorStore)}
                        </span>
                        {modelConfig && (
                            <span className="model-info">
                                | Modelo: {modelConfig.modelName} (T: {modelConfig.temperature})
                            </span>
                        )}
                    </span>
                </div>
                
                <div className="chat-actions">
                    <button
                        className="model-config-btn"
                        onClick={() => modelConfigComponent?.show()}
                        title="Configurar Modelo"
                        disabled={isLoading}
                    >
                        <i className="fas fa-cog"></i>
                        <span>Modelo</span>
                    </button>
                    
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
                        ref={chatInputRef}
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
                        autoFocus
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
                    {isGeneratingActions ? (
                        <div className="quick-actions-loading">
                            <i className="fas fa-spinner fa-spin"></i>
                            <span>Generando sugerencias...</span>
                        </div>
                    ) : (
                        quickActions.map((action, index) => (
                            <button
                                key={index}
                                className="quick-action-button"
                                onClick={() => handleQuickAction(action)}
                                disabled={isLoading || !isConnected}
                                title={`Pregunta sugerida: ${action}`}
                            >
                                {action}
                            </button>
                        ))
                    )}
                    
                    {quickActions.length === 0 && !isGeneratingActions && (
                        <div className="quick-actions-empty">
                            <i className="fas fa-lightbulb"></i>
                            <span>Las sugerencias aparecerán aquí basadas en tu conversación</span>
                        </div>
                    )}
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