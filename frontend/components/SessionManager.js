// Componente para gestionar información de sesión y localStorage
const SessionManager = () => {
    const [lastUser, setLastUser] = useState(null);
    const [lastChat, setLastChat] = useState(null);
    const [isExpanded, setIsExpanded] = useState(false);

    useEffect(() => {
        loadSessionInfo();
        
        // Actualizar información cada 5 segundos
        const interval = setInterval(loadSessionInfo, 5000);
        return () => clearInterval(interval);
    }, []);

    const loadSessionInfo = () => {
        const user = window.StorageUtils.getLastUser();
        const chat = window.StorageUtils.getLastChat();
        setLastUser(user);
        setLastChat(chat);
    };

    const clearAllData = () => {
        if (confirm('¿Estás seguro de que quieres eliminar todos los datos guardados? Esta acción no se puede deshacer.')) {
            window.StorageUtils.clearAll();
            setLastUser(null);
            setLastChat(null);
            alert('Todos los datos han sido eliminados');
            // Recargar la página para resetear el estado
            window.location.reload();
        }
    };

    const exportData = () => {
        try {
            const data = window.StorageUtils.exportData();
            const dataStr = JSON.stringify(data, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            
            const link = document.createElement('a');
            link.href = URL.createObjectURL(dataBlob);
            link.download = `langchain_backup_${new Date().toISOString().split('T')[0]}.json`;
            link.click();
            
            alert('Configuración exportada exitosamente');
        } catch (error) {
            console.error('Error exportando datos:', error);
            alert('Error al exportar los datos');
        }
    };

    const importData = (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                const success = window.StorageUtils.importData(data);
                if (success) {
                    alert('Configuración importada exitosamente. La página se recargará.');
                    window.location.reload();
                } else {
                    alert('Error al importar los datos');
                }
            } catch (error) {
                console.error('Error importando datos:', error);
                alert('Error al importar los datos: archivo inválido');
            }
        };
        reader.readAsText(file);
        event.target.value = ''; // Reset input
    };

    const formatTimestamp = (timestamp) => {
        if (!timestamp) return 'N/A';
        try {
            return new Date(timestamp).toLocaleString();
        } catch {
            return 'N/A';
        }
    };

    return (
        <div className="session-manager">
            <div className="section-header" onClick={() => setIsExpanded(!isExpanded)}>
                <h3>
                    <i className="fas fa-save"></i>
                    Sesión Guardada
                </h3>
                <button className="expand-button">
                    <i className={`fas fa-chevron-${isExpanded ? 'up' : 'down'}`}></i>
                </button>
            </div>

            {isExpanded && (
                <div className="session-content">
                    <div className="session-info">
                        <div className="info-item">
                            <label>
                                <i className="fas fa-user"></i>
                                Usuario:
                            </label>
                            <span className={lastUser ? 'has-data' : 'no-data'}>
                                {lastUser || 'Ninguno'}
                            </span>
                        </div>

                        <div className="info-item">
                            <label>
                                <i className="fas fa-comments"></i>
                                Chat:
                            </label>
                            <span className={lastChat ? 'has-data' : 'no-data'}>
                                {lastChat ? lastChat.id : 'Ninguno'}
                            </span>
                        </div>

                        {lastChat && (
                            <div className="info-item">
                                <label>
                                    <i className="fas fa-database"></i>
                                    Store:
                                </label>
                                <span className="has-data">
                                    {lastChat.vectorStore}
                                </span>
                            </div>
                        )}

                        {lastChat && lastChat.timestamp && (
                            <div className="info-item">
                                <label>
                                    <i className="fas fa-clock"></i>
                                    Guardado:
                                </label>
                                <span className="timestamp">
                                    {formatTimestamp(lastChat.timestamp)}
                                </span>
                            </div>
                        )}
                    </div>

                    <div className="session-actions">
                        <button 
                            className="action-btn export-btn"
                            onClick={exportData}
                            title="Exportar configuración"
                        >
                            <i className="fas fa-download"></i>
                            Exportar
                        </button>

                        <label className="action-btn import-btn" title="Importar configuración">
                            <i className="fas fa-upload"></i>
                            Importar
                            <input 
                                type="file"
                                accept=".json"
                                onChange={importData}
                                style={{ display: 'none' }}
                            />
                        </label>

                        <button 
                            className="action-btn clear-btn"
                            onClick={clearAllData}
                            title="Limpiar todos los datos"
                        >
                            <i className="fas fa-trash"></i>
                            Limpiar
                        </button>
                    </div>
                </div>
            )}

            <style jsx>{`
                .session-manager {
                    border: 1px solid var(--border-color);
                    border-radius: var(--border-radius);
                    overflow: hidden;
                }

                .section-header {
                    padding: 0.75rem;
                    background: var(--surface-color);
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    transition: var(--transition);
                }

                .section-header:hover {
                    background: var(--bg-color);
                }

                .section-header h3 {
                    margin: 0;
                    font-size: 0.9rem;
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    color: var(--text-color);
                }

                .section-header h3 i {
                    color: var(--accent-color);
                }

                .expand-button {
                    background: none;
                    border: none;
                    color: var(--text-muted);
                    cursor: pointer;
                    padding: 0.25rem;
                    border-radius: var(--border-radius);
                    transition: var(--transition);
                }

                .expand-button:hover {
                    background: var(--bg-color);
                    color: var(--text-color);
                }

                .session-content {
                    padding: 0.75rem;
                    background: var(--bg-color);
                    border-top: 1px solid var(--border-color);
                }

                .session-info {
                    margin-bottom: 0.75rem;
                }

                .info-item {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 0.5rem;
                    font-size: 0.8rem;
                }

                .info-item:last-child {
                    margin-bottom: 0;
                }

                .info-item label {
                    display: flex;
                    align-items: center;
                    gap: 0.25rem;
                    color: var(--text-muted);
                    font-weight: 500;
                }

                .info-item label i {
                    width: 12px;
                    text-align: center;
                }

                .has-data {
                    color: var(--success-color);
                    font-weight: 500;
                }

                .no-data {
                    color: var(--text-muted);
                    font-style: italic;
                }

                .timestamp {
                    color: var(--text-color);
                    font-size: 0.75rem;
                }

                .session-actions {
                    display: flex;
                    gap: 0.5rem;
                    flex-wrap: wrap;
                }

                .action-btn {
                    padding: 0.4rem 0.6rem;
                    border: 1px solid var(--border-color);
                    border-radius: var(--border-radius);
                    background: var(--surface-color);
                    color: var(--text-color);
                    cursor: pointer;
                    font-size: 0.75rem;
                    display: flex;
                    align-items: center;
                    gap: 0.25rem;
                    transition: var(--transition);
                    text-decoration: none;
                    flex: 1;
                    justify-content: center;
                }

                .action-btn:hover {
                    background: var(--bg-color);
                    border-color: var(--accent-color);
                }

                .export-btn:hover {
                    border-color: var(--success-color);
                    color: var(--success-color);
                }

                .import-btn:hover {
                    border-color: var(--info-color);
                    color: var(--info-color);
                }

                .clear-btn:hover {
                    border-color: var(--error-color);
                    color: var(--error-color);
                }
            `}</style>
        </div>
    );
};

// Hacer el componente disponible globalmente
window.SessionManager = SessionManager; 