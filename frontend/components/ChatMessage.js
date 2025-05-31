// Función para parsear markdown básico a HTML
const parseMarkdown = (text) => {
    if (!text || typeof text !== 'string') return text;
    
    // Convertir markdown a HTML
    let html = text
        // Headers
        .replace(/^### (.*$)/gim, '<h3>$1</h3>')
        .replace(/^## (.*$)/gim, '<h2>$1</h2>')
        .replace(/^# (.*$)/gim, '<h1>$1</h1>')
        
        // Bold
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/__(.*?)__/g, '<strong>$1</strong>')
        
        // Italic
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/_(.*?)_/g, '<em>$1</em>')
        
        // Code blocks (```code```)
        .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
        
        // Inline code (`code`)
        .replace(/`([^`]+)`/g, '<code>$1</code>')
        
        // Links [text](url) - before line breaks to avoid conflicts
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
        
        // Line breaks - handle paragraphs first
        .replace(/\n\n/g, '||PARAGRAPH||')
        .replace(/\n/g, '<br>');
    
    // Handle lists after line break processing
    const lines = html.split('||PARAGRAPH||');
    html = lines.map(paragraph => {
        // Check if paragraph contains list items
        if (paragraph.includes('<br>* ') || paragraph.includes('<br>- ') || /\d+\. /.test(paragraph)) {
            // Process list items
            let processedParagraph = paragraph
                .replace(/(^|<br>)\* (.*?)(?=<br>|$)/g, '$1<li>$2</li>')
                .replace(/(^|<br>)- (.*?)(?=<br>|$)/g, '$1<li>$2</li>')
                .replace(/(^|<br>)\d+\. (.*?)(?=<br>|$)/g, '$1<li>$2</li>');
            
            // Wrap consecutive list items in ul tags
            processedParagraph = processedParagraph.replace(/(<li>.*?<\/li>(?:<br><li>.*?<\/li>)*)/g, '<ul>$1</ul>');
            // Clean up br tags inside lists
            processedParagraph = processedParagraph.replace(/<ul>(<li>.*?<\/li>)(<br><li>.*?<\/li>)*<\/ul>/g, (match, first, rest) => {
                const cleanList = match.replace(/<br>(?=<li>)/g, '');
                return cleanList;
            });
            
            return processedParagraph;
        }
        return paragraph;
    }).join('</p><p>');
    
    // Wrap content in paragraphs if it doesn't start with a block element
    if (!html.match(/^<(h[1-6]|p|div|ul|ol|pre)/)) {
        html = `<p>${html}</p>`;
    }
    
    return html;
};

// Componente para renderizar contenido con markdown
const MarkdownContent = ({ content }) => {
    const parsedContent = parseMarkdown(content);
    
    return (
        <div 
            className="markdown-content"
            dangerouslySetInnerHTML={{ __html: parsedContent }}
        />
    );
};

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
                    {type === 'assistant' ? (
                        <MarkdownContent content={content} />
                    ) : (
                        content
                    )}
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
window.MarkdownContent = MarkdownContent;
window.parseMarkdown = parseMarkdown; 