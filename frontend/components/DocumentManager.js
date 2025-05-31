// Componente para gestionar la subida de documentos
const DocumentManager = ({ onDocumentUploaded, isLoading }) => {
    const [selectedFile, setSelectedFile] = React.useState(null);
    const [uploadStatus, setUploadStatus] = React.useState(null);
    const [isUploading, setIsUploading] = React.useState(false);

    const handleFileSelect = (event) => {
        const file = event.target.files[0];
        if (file) {
            // Validar tipo de archivo
            const allowedTypes = ['text/plain', 'text/markdown', 'application/pdf'];
            const allowedExtensions = ['.txt', '.md', '.pdf'];
            
            const hasValidType = allowedTypes.includes(file.type);
            const hasValidExtension = allowedExtensions.some(ext => 
                file.name.toLowerCase().endsWith(ext)
            );
            
            if (!hasValidType && !hasValidExtension) {
                setUploadStatus({
                    type: 'error',
                    message: 'Tipo de archivo no soportado. Use archivos .txt, .md o .pdf'
                });
                return;
            }

            // Validar tamaño (max 10MB)
            const maxSize = 10 * 1024 * 1024; // 10MB
            if (file.size > maxSize) {
                setUploadStatus({
                    type: 'error',
                    message: 'El archivo es demasiado grande. Máximo 10MB.'
                });
                return;
            }

            setSelectedFile(file);
            setUploadStatus(null);
        }
    };

    const handleUpload = async () => {
        if (!selectedFile) {
            setUploadStatus({
                type: 'error',
                message: 'Por favor, selecciona un archivo primero.'
            });
            return;
        }

        setIsUploading(true);
        setUploadStatus({
            type: 'info',
            message: 'Subiendo archivo...'
        });

        try {
            // Leer el contenido del archivo
            const content = await window.apiClient.constructor.readFileAsText(selectedFile);
            
            // Subir el documento
            const response = await window.apiClient.uploadDocument(selectedFile.name, content);
            
            // Asegurar que vectorStores sea un array para join()
            const vectorStoresArray = Array.isArray(response.vectorStores) ? response.vectorStores : [];
            
            setUploadStatus({
                type: 'success',
                message: `Archivo "${selectedFile.name}" subido exitosamente. Agregado a: ${vectorStoresArray.join(', ')}`
            });

            // Limpiar selección
            setSelectedFile(null);
            
            // Notificar al componente padre
            if (onDocumentUploaded) {
                onDocumentUploaded(response);
            }

        } catch (error) {
            console.error('Upload error:', error);
            setUploadStatus({
                type: 'error',
                message: `Error subiendo archivo: ${error.message}`
            });
        } finally {
            setIsUploading(false);
        }
    };

    const clearSelection = () => {
        setSelectedFile(null);
        setUploadStatus(null);
    };

    const formatFileSize = (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    return (
        <div className="document-upload">
            <h3>
                <i className="fas fa-upload"></i>
                Subir Documento
            </h3>

            <div className="file-input-container">
                <div className="file-input">
                    <input
                        type="file"
                        accept=".txt,.md,.pdf"
                        onChange={handleFileSelect}
                        disabled={isLoading || isUploading}
                    />
                    <div className="file-input-content">
                        {selectedFile ? (
                            <>
                                <i className="fas fa-file-alt"></i>
                                <div>
                                    <strong>{selectedFile.name}</strong>
                                    <br />
                                    <small>{formatFileSize(selectedFile.size)}</small>
                                </div>
                            </>
                        ) : (
                            <>
                                <i className="fas fa-cloud-upload-alt"></i>
                                <div>
                                    <strong>Seleccionar archivo</strong>
                                    <br />
                                    <small>Archivos .txt, .md, .pdf (máx. 10MB)</small>
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {selectedFile && (
                    <div className="file-actions">
                        <button
                            className="upload-button"
                            onClick={handleUpload}
                            disabled={isLoading || isUploading}
                        >
                            {isUploading ? (
                                <>
                                    <i className="fas fa-spinner fa-spin"></i>
                                    Subiendo...
                                </>
                            ) : (
                                <>
                                    <i className="fas fa-upload"></i>
                                    Subir Documento
                                </>
                            )}
                        </button>

                        <button
                            className="clear-button"
                            onClick={clearSelection}
                            disabled={isUploading}
                        >
                            <i className="fas fa-times"></i>
                            Cancelar
                        </button>
                    </div>
                )}
            </div>

            {uploadStatus && (
                <div className={`upload-status ${uploadStatus.type}`}>
                    <i className={
                        uploadStatus.type === 'success' ? 'fas fa-check-circle' :
                        uploadStatus.type === 'error' ? 'fas fa-exclamation-circle' :
                        'fas fa-info-circle'
                    }></i>
                    {uploadStatus.message}
                </div>
            )}

            <div className="upload-help">
                <small>
                    <i className="fas fa-lightbulb"></i>
                    <strong>Consejo:</strong> Los documentos subidos estarán disponibles inmediatamente para consultas.
                </small>
            </div>
        </div>
    );
};

// Componente para mostrar estadísticas de documentos
const DocumentStats = ({ vectorStores }) => {
    const [stats, setStats] = React.useState({
        totalStores: 0,
        combinedStore: false,
        individualStores: 0,
        lastUpdate: new Date().toLocaleString()
    });

    React.useEffect(() => {
        updateStats();
    }, [vectorStores]);

    const updateStats = () => {
        // Asegurar que vectorStores es un array
        const storesArray = Array.isArray(vectorStores) ? vectorStores : [];
        
        // Verificar si existe el almacén combinado
        const hasCombined = storesArray.includes('combined');
        const individualStores = hasCombined ? storesArray.length - 1 : storesArray.length;
        
        setStats({
            totalStores: storesArray.length,
            combinedStore: hasCombined,
            individualStores: individualStores,
            lastUpdate: new Date().toLocaleString()
        });
    };

    return (
        <div className="document-stats">
            <h3>
                <i className="fas fa-chart-bar"></i>
                Estadísticas
            </h3>
            
            <div className="stats-grid">
                <div className="stat-item">
                    <div className="stat-value">{stats.totalStores}</div>
                    <div className="stat-label">Bases de Conocimiento</div>
                </div>
                
                <div className="stat-item">
                    <div className="stat-value">{stats.individualStores}</div>
                    <div className="stat-label">Documentos Individuales</div>
                </div>
                
                {stats.combinedStore && (
                    <div className="stat-item combined">
                        <div className="stat-value">
                            <i className="fas fa-layer-group"></i>
                        </div>
                        <div className="stat-label">Base Combinada</div>
                    </div>
                )}
            </div>

            <div className="stats-info">
                <div className="stat-description">
                    <small>
                        <i className="fas fa-info-circle"></i>
                        <strong>Bases de Conocimiento:</strong> Cada documento subido crea una base individual 
                        y se agrega a la base combinada para búsquedas globales.
                    </small>
                </div>
            </div>

            <div className="stats-footer">
                <small>
                    <i className="fas fa-clock"></i>
                    Última actualización: {stats.lastUpdate}
                </small>
            </div>
        </div>
    );
};

window.DocumentManager = DocumentManager;
window.DocumentStats = DocumentStats; 