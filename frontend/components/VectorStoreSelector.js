// Componente para seleccionar el vector store
const VectorStoreSelector = ({ vectorStores, selectedStore, onStoreChange, isLoading }) => {
    const [storeInfo, setStoreInfo] = React.useState({});

    React.useEffect(() => {
        // Cargar información adicional de los stores si es necesario
        loadStoreInfo();
    }, [vectorStores]);

    const loadStoreInfo = async () => {
        try {
            // Asegurar que vectorStores es un array
            const storesArray = Array.isArray(vectorStores) ? vectorStores : [];
            
            // Aquí podrías cargar información adicional de cada store
            // Por ahora usamos información básica
            const info = {};
            storesArray.forEach(store => {
                info[store] = {
                    name: store,
                    displayName: getDisplayName(store),
                    description: getStoreDescription(store)
                };
            });
            setStoreInfo(info);
        } catch (error) {
            console.error('Error loading store info:', error);
        }
    };

    const getDisplayName = (storeName) => {
        switch (storeName) {
            case 'combined':
                return 'Todos los Documentos';
            default:
                return storeName.charAt(0).toUpperCase() + storeName.slice(1);
        }
    };

    const getStoreDescription = (storeName) => {
        switch (storeName) {
            case 'combined':
                return 'Buscar en todos los documentos disponibles';
            default:
                return `Documentos específicos de ${storeName}`;
        }
    };

    const getStoreIcon = (storeName) => {
        switch (storeName) {
            case 'combined':
                return 'fas fa-layer-group';
            default:
                return 'fas fa-file-alt';
        }
    };

    // Asegurar que vectorStores es un array
    const storesArray = Array.isArray(vectorStores) ? vectorStores : [];

    return (
        <div className="vector-store-selector">
            <h3>
                <i className="fas fa-database"></i>
                Base de Conocimiento
            </h3>
            
            <select 
                className="store-select"
                value={selectedStore}
                onChange={(e) => onStoreChange(e.target.value)}
                disabled={isLoading}
            >
                {storesArray.map(store => (
                    <option key={store} value={store}>
                        {getDisplayName(store)}
                    </option>
                ))}
            </select>

            {storeInfo[selectedStore] && (
                <div className="store-info">
                    <div className="store-details">
                        <i className={getStoreIcon(selectedStore)}></i>
                        <div>
                            <strong>{storeInfo[selectedStore].displayName}</strong>
                            <p>{storeInfo[selectedStore].description}</p>
                        </div>
                    </div>
                </div>
            )}

            <div className="store-stats">
                <small>
                    <i className="fas fa-info-circle"></i>
                    {storesArray.length} base{storesArray.length !== 1 ? 's' : ''} de conocimiento disponible{storesArray.length !== 1 ? 's' : ''}
                </small>
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

window.VectorStoreSelector = VectorStoreSelector;
window.ConnectionStatus = ConnectionStatus; 