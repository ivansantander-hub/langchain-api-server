// Componente para seleccionar el vector store
const VectorStoreSelector = ({ vectorStores, selectedStore, onStoreChange, isLoading, selectedUser }) => {
    // Asegurar que vectorStores es un array
    const storesArray = Array.isArray(vectorStores) ? vectorStores : [];
    
    // Solo mostrar documentos del usuario
    const userStores = storesArray.filter(store => store.type === 'user');
    
    // Encontrar el store seleccionado (manejar casos especiales)
    let displaySelectedStore = selectedStore;
    if (selectedStore === 'combined') {
        // Si selectedStore es 'combined', podría ser "todos los documentos"
        displaySelectedStore = 'user-combined';
    }
    
    // Buscar por nombre sin extensión para documentos de usuario
    const selectedStoreObj = userStores.find(store => {
        const docName = store.name.replace(/\.[^/.]+$/, "");
        return docName === selectedStore || store.id === selectedStore;
    });

    const handleStoreChange = (e) => {
        const selectedValue = e.target.value;
        
        if (selectedValue === "user-combined") {
            // Todos los documentos del usuario - usar el store "combined" del sistema
            onStoreChange("combined", {
                filename: null, // No hay un archivo específico
                userId: selectedUser,
                allDocuments: true
            });
        } else {
            // Buscar el store por el nombre del documento (sin extensión)
            const store = userStores.find(s => {
                const docName = s.name.replace(/\.[^/.]+$/, "");
                return docName === selectedValue;
            });
            
            if (store) {
                // Enviar solo el nombre del documento (sin prefijo de usuario)
                // La API manejará internamente el prefijo cuando sea necesario
                const documentName = store.name.replace(/\.[^/.]+$/, "");
                onStoreChange(documentName, {
                    filename: store.name, // Filename original con extensión
                    userId: store.userId
                });
            } else {
                // Fallback para otros casos
                onStoreChange(selectedValue);
            }
        }
    };

    return (
        <div className="vector-store-selector">
            <div className="selector-header">
                <h3>
                    <i className="fas fa-database"></i>
                    Base de Conocimiento
                </h3>
                {selectedUser && (
                    <div className="user-badge">
                        <i className="fas fa-user"></i>
                        {selectedUser}
                    </div>
                )}
            </div>
            
            <select 
                className="store-select"
                value={displaySelectedStore}
                onChange={handleStoreChange}
                disabled={isLoading}
            >
                {/* Solo Documentos del Usuario */}
                {userStores.length > 0 && selectedUser ? (
                    <optgroup label="👤 Mis Documentos">
                        {/* Opción para todos los documentos si hay más de 1 */}
                        {userStores.length > 1 && (
                            <option value="user-combined">
                                📚 Todos mis documentos ({userStores.length})
                            </option>
                        )}
                        {/* Documentos individuales */}
                        {userStores.map(store => {
                            const docName = store.name.replace(/\.[^/.]+$/, "");
                            return (
                                <option key={store.id} value={docName}>
                                    📄 {store.displayName}
                                </option>
                            );
                        })}
                    </optgroup>
                ) : selectedUser ? (
                    <optgroup label="👤 Mis Documentos">
                        <option disabled value="">
                            Sube documentos para verlos aquí
                        </option>
                    </optgroup>
                ) : (
                    <option disabled value="">
                        Selecciona un usuario para ver sus documentos
                    </option>
                )}
            </select>

            {/* Información del store seleccionado */}
            {selectedStoreObj && (
                <div className="store-info">
                    <div className="store-details">
                        <div className="store-icon">
                            <i className={selectedStoreObj.icon}></i>
                        </div>
                        <div className="store-content">
                            <strong className="store-name">{selectedStoreObj.displayName}</strong>
                            <p className="store-description">{selectedStoreObj.description}</p>
                            {selectedStoreObj.type === 'user' && (
                                <div className="store-badges">
                                    <span className="badge badge-user">Personal</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Estadísticas */}
            <div className="store-stats">
                <div className="stats-grid">
                    {selectedUser && (
                        <div className="stat-item">
                            <i className="fas fa-user"></i>
                            <span>{userStores.length} Documentos</span>
                        </div>
                    )}
                    {!selectedUser && (
                        <div className="stat-item">
                            <i className="fas fa-info-circle"></i>
                            <span>Selecciona un usuario</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

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
        background: white;
        border-radius: 12px;
        padding: 20px;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        margin-bottom: 20px;
        border: 1px solid #e2e8f0;
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

window.VectorStoreSelector = VectorStoreSelector;
window.ConnectionStatus = ConnectionStatus; 