// Componente para mostrar estadísticas de documentos
const DocumentStats = ({ vectorStores }) => {
    const [isExpanded, setIsExpanded] = React.useState(false);

    if (!vectorStores || vectorStores.length === 0) {
        return (
            <div className="document-stats">
                <div className="section-header" onClick={() => setIsExpanded(!isExpanded)}>
                    <h3>
                        <i className="fas fa-chart-bar"></i>
                        Estadísticas
                    </h3>
                    <button className="expand-button">
                        <i className={`fas fa-chevron-${isExpanded ? 'up' : 'down'}`}></i>
                    </button>
                </div>
                
                {isExpanded && (
                    <div className="stats-content">
                        <div className="no-stats">
                            <i className="fas fa-chart-bar"></i>
                            <p>No hay datos de documentos disponibles</p>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    const totalStores = vectorStores.length;
    const combinedStore = vectorStores.find(store => store === 'combined');
    const individualStores = vectorStores.filter(store => store !== 'combined');

    return (
        <div className="document-stats">
            <div className="section-header" onClick={() => setIsExpanded(!isExpanded)}>
                <h3>
                    <i className="fas fa-chart-bar"></i>
                    Estadísticas
                </h3>
                <button className="expand-button">
                    <i className={`fas fa-chevron-${isExpanded ? 'up' : 'down'}`}></i>
                </button>
            </div>
            
            {isExpanded && (
                <div className="stats-content">
                    <div className="stats-grid">
                        <div className="stat-item">
                            <div className="stat-value">{totalStores}</div>
                            <div className="stat-label">Vector Stores</div>
                        </div>
                        
                        <div className="stat-item">
                            <div className="stat-value">{individualStores.length}</div>
                            <div className="stat-label">Documentos</div>
                        </div>
                        
                        {combinedStore && (
                            <div className="stat-item combined">
                                <div className="stat-value">
                                    <i className="fas fa-layer-group"></i>
                                </div>
                                <div className="stat-label">Combinado</div>
                            </div>
                        )}
                    </div>
                    
                    {individualStores.length > 0 && (
                        <div className="stats-info">
                            <div className="stat-description">
                                <strong>Documentos disponibles:</strong>
                                <ul className="document-list">
                                    {individualStores.map((store, index) => (
                                        <li key={index} className="document-item">
                                            <i className="fas fa-file-alt"></i>
                                            {store.charAt(0).toUpperCase() + store.slice(1)}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    )}
                    
                    <div className="stats-footer">
                        <small>
                            <i className="fas fa-info-circle"></i>
                            Última actualización: {new Date().toLocaleTimeString()}
                        </small>
                    </div>
                </div>
            )}
        </div>
    );
};

// Hacer el componente disponible globalmente
window.DocumentStats = DocumentStats; 