// Componente para renderizar mensajes individuales del chat
const ChatMessage = ({ message, timestamp }) => {
    const { type, content, sources } = message;

    const formatTimestamp = (date) => {
        return new Date(date).toLocaleTimeString('es-ES', {
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const renderSources = () => {
        if (!sources || sources.length === 0) return null;

        return (
            <div className="message-sources">
                <h4><i className="fas fa-file-alt"></i> Fuentes consultadas:</h4>
                <ul className="source-list">
                    {sources.map((source, index) => (
                        <li key={index} className="source-item">
                            {typeof source === 'string' ? source : source.metadata?.source || 'Documento desconocido'}
                        </li>
                    ))}
                </ul>
            </div>
        );
    };

    const getMessageIcon = () => {
        switch (type) {
            case 'user':
                return <i className="fas fa-user"></i>;
            case 'assistant':
                return <i className="fas fa-robot"></i>;
            case 'system':
                return <i className="fas fa-info-circle"></i>;
            case 'error':
                return <i className="fas fa-exclamation-triangle"></i>;
            default:
                return null;
        }
    };

    return (
        <div className={`message ${type}`}>
            <div className="message-content">
                <div className="message-text">
                    {content}
                </div>
                {renderSources()}
            </div>
            <div className="message-timestamp">
                {getMessageIcon()}
                <span>{formatTimestamp(timestamp)}</span>
            </div>
        </div>
    );
};

// Componente para el indicador de escritura
const TypingIndicator = () => {
    return (
        <div className="message assistant">
            <div className="message-content">
                <div className="typing-indicator">
                    <div className="typing-dot"></div>
                    <div className="typing-dot"></div>
                    <div className="typing-dot"></div>
                </div>
            </div>
            <div className="message-timestamp">
                <i className="fas fa-robot"></i>
                <span>Escribiendo...</span>
            </div>
        </div>
    );
};

// Componente para mensajes de error
const ErrorMessage = ({ error }) => {
    return (
        <div className="message system">
            <div className="message-content">
                <i className="fas fa-exclamation-triangle"></i>
                <strong>Error:</strong> {error}
            </div>
            <div className="message-timestamp">
                <i className="fas fa-exclamation-triangle"></i>
                <span>{new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
        </div>
    );
};

// Componente para mensajes del sistema
const SystemMessage = ({ content }) => {
    return (
        <div className="message system">
            <div className="message-content">
                <i className="fas fa-info-circle"></i>
                {content}
            </div>
            <div className="message-timestamp">
                <i className="fas fa-info-circle"></i>
                <span>{new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
        </div>
    );
};

window.ChatMessage = ChatMessage;
window.TypingIndicator = TypingIndicator;
window.ErrorMessage = ErrorMessage;
window.SystemMessage = SystemMessage; 