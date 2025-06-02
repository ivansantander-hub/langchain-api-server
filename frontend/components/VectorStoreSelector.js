// Vector Store Selector Component - Simplificado y Coherente
const VectorStoreSelector = ({ vectorStores, selectedStore, onStoreChange, isLoading, selectedUser }) => {
    console.log('VectorStoreSelector props:', {
        vectorStores: vectorStores?.length || 0,
        selectedStore,
        isLoading,
        selectedUser
    });

    // Filtrar solo los vector stores del usuario actual
    const userVectorStores = React.useMemo(() => {
        if (!vectorStores || !selectedUser) return [];
        
        // Si vectorStores es un array de objetos (nuevo formato)
        if (vectorStores.length > 0 && typeof vectorStores[0] === 'object') {
            return vectorStores.filter(store => {
                return store.userId === selectedUser;
            }).map(store => {
                return {
                    value: store.id,
                    label: store.displayName || store.name
                };
            });
        }
        
        // Si vectorStores es un array de strings (formato anterior)
        return vectorStores.filter(store => {
            if (store === 'combined') return false; // Excluir combined de la lista
            return store.startsWith(`${selectedUser}_`);
        }).map(store => {
            // Remover el prefijo del usuario para mostrar solo el nombre del documento
            return {
                value: store,
                label: store.replace(new RegExp(`^${selectedUser}_`), '').replace(/_/g, ' ')
            };
        });
    }, [vectorStores, selectedUser]);

    console.log('Filtered user vector stores:', userVectorStores);

    const handleStoreChange = (e) => {
        const newStore = e.target.value;
        console.log('Store selection changed to:', newStore);
        onStoreChange(newStore);
    };

    // Si no hay usuario seleccionado
    if (!selectedUser) {
        return (
            <div className="vector-store-selector">
                <div className="selector-empty">
                    <i className="fas fa-user-circle"></i>
                    <p>Selecciona un usuario primero</p>
                </div>
            </div>
        );
    }

    // Si está cargando
    if (isLoading) {
        return (
            <div className="vector-store-selector">
                <div className="selector-loading">
                    <i className="fas fa-spinner fa-spin"></i>
                    <span>Cargando documentos...</span>
                </div>
            </div>
        );
    }

    // Si no hay documentos disponibles
    if (userVectorStores.length === 0) {
        return (
            <div className="vector-store-selector">
                <div className="selector-empty">
                    <i className="fas fa-folder-open"></i>
                    <p>No hay documentos disponibles</p>
                    <small>Sube documentos usando la sección de arriba</small>
                </div>
            </div>
        );
    }

    return (
        <div className="vector-store-selector">
            <div className="document-selector">
                <select 
                    id="store-select"
                    className="modern-select" 
                    value={selectedStore || ''} 
                    onChange={handleStoreChange}
                    disabled={isLoading}
                >
                    <option value="">Seleccionar documento</option>
                    {userVectorStores.map(store => (
                        <option key={store.value} value={store.value}>
                            {store.label}
                        </option>
                    ))}
                </select>
            </div>
        </div>
    );
};

// Exportar al objeto window
window.VectorStoreSelector = VectorStoreSelector;

// Componente para mostrar el estado de conexión
const ConnectionStatus = ({ isConnected, isLoading }) => {
    const getStatusClass = () => {
        if (isLoading) return 'connecting';
        return isConnected ? 'connected' : 'disconnected';
    };

    const getStatusIcon = () => {
        if (isLoading) return 'fas fa-spinner fa-spin';
        return isConnected ? 'fas fa-wifi' : 'fas fa-wifi-off';
    };

    const getStatusText = () => {
        if (isLoading) return 'Conectando...';
        return isConnected ? 'Conectado' : 'Desconectado';
    };

    return (
        <div className={`connection-status ${getStatusClass()}`}>
            <i className={getStatusIcon()}></i>
            <span>{getStatusText()}</span>
        </div>
    );
};

// Estilos mejorados para el VectorStoreSelector
const vectorStoreSelectorStyles = `
    .vector-store-selector {
        border-radius: 12px;
        padding: 20px;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        margin-bottom: 20px;
    }

    .selector-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 16px;
    }

    .selector-header h3 {
        color: #2563eb;
        margin: 0;
        font-size: 1.1rem;
        display: flex;
        align-items: center;
        gap: 8px;
    }

    .user-badge {
        background: #f1f5f9;
        color: #475569;
        padding: 4px 8px;
        border-radius: 20px;
        font-size: 0.75rem;
        font-weight: 600;
        display: flex;
        align-items: center;
        gap: 4px;
    }

    .store-select {
        width: 100%;
        padding: 12px 16px;
        border: 2px solid #e2e8f0;
        border-radius: 8px;
        background: white;
        font-size: 0.9rem;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s;
        margin-bottom: 16px;
    }

    .store-select:focus {
        outline: none;
        border-color: #2563eb;
        box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
    }

    .store-select:hover {
        border-color: #cbd5e1;
    }

    .store-select optgroup {
        font-weight: 600;
        color: #374151;
        background: #f8fafc;
        padding: 8px;
    }

    .store-select option {
        padding: 8px;
        background: white;
        color: #374151;
    }

    .store-select option:disabled {
        color: #9ca3af;
        font-style: italic;
    }

    .store-info {
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        padding: 16px;
        margin-bottom: 16px;
    }

    .store-details {
        display: flex;
        align-items: flex-start;
        gap: 12px;
    }

    .store-icon {
        background: #2563eb;
        color: white;
        width: 40px;
        height: 40px;
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.2rem;
        flex-shrink: 0;
    }

    .store-content {
        flex: 1;
        min-width: 0;
    }

    .store-name {
        color: #1f2937;
        font-size: 1rem;
        font-weight: 600;
        margin: 0 0 4px 0;
        word-break: break-word;
    }

    .store-description {
        color: #6b7280;
        font-size: 0.875rem;
        margin: 0 0 8px 0;
        line-height: 1.4;
    }

    .store-badges {
        display: flex;
        gap: 6px;
        flex-wrap: wrap;
    }

    .badge {
        padding: 2px 8px;
        border-radius: 12px;
        font-size: 0.75rem;
        font-weight: 600;
    }

    .badge-user {
        background: #dbeafe;
        color: #1e40af;
    }

    .store-stats {
        border-top: 1px solid #e2e8f0;
        padding-top: 12px;
    }

    .stats-grid {
        display: flex;
        gap: 16px;
        justify-content: space-around;
    }

    .stat-item {
        display: flex;
        align-items: center;
        gap: 6px;
        color: #6b7280;
        font-size: 0.875rem;
        font-weight: 500;
    }

    .stat-item i {
        color: #9ca3af;
    }

    /* Dark theme support */
    .dark .vector-store-selector {
        background: #1f2937;
        border-color: #374151;
    }

    .dark .selector-header h3 {
        color: #60a5fa;
    }

    .dark .user-badge {
        background: #374151;
        color: #d1d5db;
    }

    .dark .store-select {
        background: #374151;
        border-color: #4b5563;
        color: #f9fafb;
    }

    .dark .store-select:focus {
        border-color: #60a5fa;
        box-shadow: 0 0 0 3px rgba(96, 165, 250, 0.1);
    }

    .dark .store-info {
        background: #374151;
        border-color: #4b5563;
    }

    .dark .store-icon {
        background: #60a5fa;
    }

    .dark .store-name {
        color: #f9fafb;
    }

    .dark .store-description {
        color: #d1d5db;
    }

    .dark .badge-user {
        background: #1e3a8a;
        color: #93c5fd;
    }

    .dark .store-stats {
        border-color: #4b5563;
    }

    .dark .stat-item {
        color: #d1d5db;
    }

    .dark .stat-item i {
        color: #9ca3af;
    }
`;

// Agregar estilos al documento
if (!document.getElementById('vector-store-selector-styles')) {
    const style = document.createElement('style');
    style.id = 'vector-store-selector-styles';
    style.textContent = vectorStoreSelectorStyles;
    document.head.appendChild(style);
}

window.ConnectionStatus = ConnectionStatus; 