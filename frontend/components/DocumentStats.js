// Componente de estadísticas de documentos
const { useState, useEffect } = React;

const DocumentStats = ({ vectorStores = [] }) => {
    const [stats, setStats] = useState({
        totalDocuments: 0,
        totalVectorStores: 0,
        lastActivity: null,
        isLoading: true,
        error: null
    });
    const [isExpanded, setIsExpanded] = useState(false);
    const [detailedStats, setDetailedStats] = useState({});

    useEffect(() => {
        loadStats();
    }, [vectorStores]);

    const loadStats = async () => {
        try {
            setStats(prev => ({ ...prev, isLoading: true, error: null }));
            
            let totalDocuments = 0;
            const storeDetails = {};
            
            // Contar documentos por vector store
            for (const store of vectorStores) {
                try {
                    // Intentar obtener información del vector store
                    // Como no tenemos una API específica, estimamos basado en los nombres
                    const documentCount = 1; // Placeholder - en una implementación real habría una API
                    totalDocuments += documentCount;
                    
                    storeDetails[store] = {
                        documents: documentCount,
                        lastModified: new Date().toISOString(),
                        size: 'Desconocido'
                    };
                } catch (error) {
                    console.warn(`Error loading stats for store ${store}:`, error);
                }
            }

            setStats({
                totalDocuments,
                totalVectorStores: vectorStores.length,
                lastActivity: new Date().toISOString(),
                isLoading: false,
                error: null
            });
            
            setDetailedStats(storeDetails);
            
        } catch (error) {
            console.error('Error loading document stats:', error);
            setStats(prev => ({
                ...prev,
                isLoading: false,
                error: 'Error cargando estadísticas'
            }));
        }
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return 'N/A';
        try {
            return new Date(dateStr).toLocaleString('es-ES', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch {
            return 'N/A';
        }
    };

    const handleToggleExpand = () => {
        setIsExpanded(!isExpanded);
    };

    if (stats.isLoading) {
        return (
            <div className="document-stats">
                <div className="document-stats-header">
                    <h3>
                        <i className="fas fa-chart-bar"></i>
                        Estadísticas
                    </h3>
                </div>
                <div className="stats-loading">
                    <i className="fas fa-spinner fa-spin"></i>
                    Cargando estadísticas...
                </div>
            </div>
        );
    }

    if (stats.error) {
        return (
            <div className="document-stats">
                <div className="document-stats-header">
                    <h3>
                        <i className="fas fa-chart-bar"></i>
                        Estadísticas
                    </h3>
                </div>
                <div className="stats-error">
                    <i className="fas fa-exclamation-triangle"></i>
                    {stats.error}
                </div>
            </div>
        );
    }

    return (
        <div className="document-stats">
            <div className="document-stats-header">
                <h3>
                    <i className="fas fa-chart-bar"></i>
                    Estadísticas de Documentos
                </h3>
                <button
                    className="expand-button"
                    onClick={handleToggleExpand}
                    title={isExpanded ? 'Colapsar' : 'Expandir'}
                >
                    <i className={`fas fa-chevron-${isExpanded ? 'up' : 'down'}`}></i>
                </button>
            </div>
            
            <div className="stats-summary">
                <div className="stats-grid">
                    <div className="stat-item">
                        <div className="stat-value">{stats.totalVectorStores}</div>
                        <div className="stat-label">Bases de Conocimiento</div>
                    </div>
                    <div className="stat-item">
                        <div className="stat-value">{stats.totalDocuments}</div>
                        <div className="stat-label">Documentos</div>
                    </div>
                </div>
                
                {stats.lastActivity && (
                    <div className="stats-footer">
                        <small>
                            <i className="fas fa-clock"></i>
                            Última actividad: {formatDate(stats.lastActivity)}
                        </small>
                    </div>
                )}
            </div>

            {isExpanded && (
                <div className="stats-details">
                    <h4>Detalles por Base de Conocimiento</h4>
                    {Object.keys(detailedStats).length > 0 ? (
                        <div className="stores-list">
                            {Object.entries(detailedStats).map(([store, details]) => (
                                <div key={store} className="store-item">
                                    <div className="store-name">
                                        <i className="fas fa-database"></i>
                                        {store}
                                    </div>
                                    <div className="store-details">
                                        <div className="store-stat">
                                            <span className="stat-key">Documentos:</span>
                                            <span className="stat-value">{details.documents}</span>
                                        </div>
                                        <div className="store-stat">
                                            <span className="stat-key">Modificado:</span>
                                            <span className="stat-value">{formatDate(details.lastModified)}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="no-stores">
                            <i className="fas fa-info-circle"></i>
                            No hay bases de conocimiento disponibles
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

window.DocumentStats = DocumentStats; 