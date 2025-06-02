// Componente para gestión avanzada de documentos por usuario
const UserDocumentManager = ({ userId, onDocumentReady }) => {
    const [userFiles, setUserFiles] = React.useState([]);
    const [isLoadingFiles, setIsLoadingFiles] = React.useState(false);
    const [selectedFile, setSelectedFile] = React.useState(null);
    const [uploadStatus, setUploadStatus] = React.useState(null);
    const [isUploading, setIsUploading] = React.useState(false);
    const [isVectorizing, setIsVectorizing] = React.useState(false);
    const [vectorizingFile, setVectorizingFile] = React.useState(null);
    const [showUploadForm, setShowUploadForm] = React.useState(false);

    // Cargar archivos del usuario al cambiar userId
    React.useEffect(() => {
        if (userId) {
            loadUserFiles();
        } else {
            setUserFiles([]);
        }
    }, [userId]);

    const loadUserFiles = async () => {
        if (!userId) return;

        setIsLoadingFiles(true);
        try {
            const response = await window.apiClient.getUserFiles(userId);
            setUserFiles(response.files || []);
        } catch (error) {
            console.error('Error loading user files:', error);
            setUploadStatus({
                type: 'error',
                message: `Error cargando archivos: ${error.message}`
            });
        } finally {
            setIsLoadingFiles(false);
        }
    };

    const handleFileSelect = (event) => {
        const file = event.target.files[0];
        if (file) {
            // Validar tipo de archivo
            const allowedTypes = ['text/plain', 'text/markdown'];
            const allowedExtensions = ['.txt', '.md'];
            
            const hasValidType = allowedTypes.includes(file.type);
            const hasValidExtension = allowedExtensions.some(ext => 
                file.name.toLowerCase().endsWith(ext)
            );
            
            if (!hasValidType && !hasValidExtension) {
                setUploadStatus({
                    type: 'error',
                    message: 'Tipo de archivo no soportado. Use archivos .txt o .md'
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
        if (!selectedFile || !userId) {
            setUploadStatus({
                type: 'error',
                message: 'Por favor, selecciona un archivo y asegúrate de estar logueado.'
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
            
            // Subir el archivo (sin vectorización)
            const response = await window.apiClient.uploadFile(userId, selectedFile.name, content);
            
            setUploadStatus({
                type: 'success',
                message: `Archivo "${selectedFile.name}" subido exitosamente. Listo para vectorizar.`
            });

            // Limpiar selección
            setSelectedFile(null);
            setShowUploadForm(false);
            
            // Recargar lista de archivos
            await loadUserFiles();

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

    const handleVectorize = async (filename) => {
        if (!userId || !filename) return;

        setIsVectorizing(true);
        setVectorizingFile(filename);
        setUploadStatus({
            type: 'info',
            message: `Vectorizando archivo "${filename}"...`
        });

        try {
            const response = await window.apiClient.vectorizeFile(userId, filename);
            
            setUploadStatus({
                type: 'success',
                message: `Archivo "${filename}" vectorizado exitosamente. Listo para chat.`
            });

            // Recargar lista de archivos para actualizar el estado
            await loadUserFiles();

            // Notificar al componente padre que hay un documento listo
            if (onDocumentReady) {
                onDocumentReady({
                    userId,
                    filename,
                    vectorStoreId: response.vectorStoreId,
                    ready: true
                });
            }

        } catch (error) {
            console.error('Vectorization error:', error);
            setUploadStatus({
                type: 'error',
                message: `Error vectorizando archivo: ${error.message}`
            });
        } finally {
            setIsVectorizing(false);
            setVectorizingFile(null);
        }
    };

    const formatFileSize = (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const formatDate = (date) => {
        return new Date(date).toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    if (!userId) {
        return (
            <div className="user-document-manager">
                <div className="no-user-message">
                    <i className="fas fa-user-slash"></i>
                    <h3>Selecciona un usuario</h3>
                    <p>Para gestionar documentos, primero selecciona o crea un usuario</p>
                </div>
            </div>
        );
    }

    return (
        <div className="user-document-manager">
            <div className="manager-header">
                <h3>
                    <i className="fas fa-file-alt"></i>
                    Mis Documentos
                </h3>
                <button 
                    className="upload-toggle-btn"
                    onClick={() => setShowUploadForm(!showUploadForm)}
                >
                    <i className="fas fa-plus"></i>
                    Subir Documento
                </button>
            </div>

            {showUploadForm && (
                <div className="upload-form">
                    <div className="file-input-container">
                        <input
                            type="file"
                            accept=".txt,.md"
                            onChange={handleFileSelect}
                            disabled={isUploading}
                            id="user-file-input"
                        />
                        <label htmlFor="user-file-input" className="file-input-label">
                            <i className="fas fa-cloud-upload-alt"></i>
                            {selectedFile ? selectedFile.name : 'Seleccionar archivo (.txt, .md)'}
                        </label>
                    </div>

                    {selectedFile && (
                        <div className="file-actions">
                            <button
                                className="upload-button"
                                onClick={handleUpload}
                                disabled={isUploading}
                            >
                                {isUploading ? (
                                    <>
                                        <i className="fas fa-spinner fa-spin"></i>
                                        Subiendo...
                                    </>
                                ) : (
                                    <>
                                        <i className="fas fa-upload"></i>
                                        Subir
                                    </>
                                )}
                            </button>
                            <button
                                className="cancel-button"
                                onClick={() => {
                                    setSelectedFile(null);
                                    setShowUploadForm(false);
                                }}
                                disabled={isUploading}
                            >
                                <i className="fas fa-times"></i>
                                Cancelar
                            </button>
                        </div>
                    )}
                </div>
            )}

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

            <div className="files-list">
                {isLoadingFiles ? (
                    <div className="loading-files">
                        <i className="fas fa-spinner fa-spin"></i>
                        Cargando archivos...
                    </div>
                ) : userFiles.length === 0 ? (
                    <div className="no-files">
                        <i className="fas fa-folder-open"></i>
                        <p>No tienes documentos subidos</p>
                        <small>Sube tu primer documento para empezar a chatear con él</small>
                    </div>
                ) : (
                    <div className="files-grid">
                        {userFiles.map((file, index) => (
                            <div key={index} className={`file-card ${file.vectorized ? 'vectorized' : 'not-vectorized'}`}>
                                <div className="file-icon">
                                    <i className="fas fa-file-text"></i>
                                </div>
                                
                                <div className="file-info">
                                    <h4 className="file-name">{file.filename}</h4>
                                    <p className="file-size">{formatFileSize(file.size)}</p>
                                    <p className="file-date">{formatDate(file.created)}</p>
                                </div>

                                <div className="file-status">
                                    {file.vectorized ? (
                                        <span className="status-badge ready">
                                            <i className="fas fa-check-circle"></i>
                                            Listo para chat
                                        </span>
                                    ) : (
                                        <span className="status-badge pending">
                                            <i className="fas fa-clock"></i>
                                            Pendiente vectorización
                                        </span>
                                    )}
                                </div>

                                <div className="file-actions">
                                    {file.vectorized ? (
                                        <button
                                            className="chat-button"
                                            onClick={() => onDocumentReady && onDocumentReady({
                                                userId,
                                                filename: file.filename,
                                                ready: true
                                            })}
                                        >
                                            <i className="fas fa-comments"></i>
                                            Chatear
                                        </button>
                                    ) : (
                                        <button
                                            className="vectorize-button"
                                            onClick={() => handleVectorize(file.filename)}
                                            disabled={isVectorizing && vectorizingFile === file.filename}
                                        >
                                            {isVectorizing && vectorizingFile === file.filename ? (
                                                <>
                                                    <i className="fas fa-spinner fa-spin"></i>
                                                    Vectorizando...
                                                </>
                                            ) : (
                                                <>
                                                    <i className="fas fa-magic"></i>
                                                    Vectorizar
                                                </>
                                            )}
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="help-section">
                <h4><i className="fas fa-info-circle"></i> ¿Cómo funciona?</h4>
                <ol>
                    <li><strong>Subir:</strong> Sube tu documento (.txt o .md)</li>
                    <li><strong>Vectorizar:</strong> Procesa el documento para búsqueda</li>
                    <li><strong>Chatear:</strong> Haz preguntas específicas sobre tu documento</li>
                </ol>
            </div>
        </div>
    );
};

// Agregar estilos específicos para el componente
const userDocumentManagerStyles = `
    .user-document-manager {
        background: white;
        border-radius: 12px;
        padding: 24px;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        margin: 20px 0;
    }

    .manager-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;
        padding-bottom: 15px;
        border-bottom: 2px solid #f1f5f9;
    }

    .manager-header h3 {
        color: #2563eb;
        margin: 0;
        font-size: 1.25rem;
        display: flex;
        align-items: center;
        gap: 8px;
    }

    .upload-toggle-btn {
        background: #2563eb;
        color: white;
        border: none;
        padding: 10px 20px;
        border-radius: 8px;
        cursor: pointer;
        font-weight: 600;
        display: flex;
        align-items: center;
        gap: 8px;
        transition: background 0.2s;
    }

    .upload-toggle-btn:hover {
        background: #1d4ed8;
    }

    .upload-form {
        background: #f8fafc;
        padding: 20px;
        border-radius: 8px;
        margin-bottom: 20px;
        border: 2px dashed #cbd5e1;
    }

    .file-input-container input {
        display: none;
    }

    .file-input-label {
        display: block;
        padding: 15px;
        background: white;
        border: 2px solid #e2e8f0;
        border-radius: 8px;
        cursor: pointer;
        text-align: center;
        transition: all 0.2s;
        color: #64748b;
    }

    .file-input-label:hover {
        border-color: #2563eb;
        background: #f8fafc;
    }

    .file-actions {
        display: flex;
        gap: 10px;
        margin-top: 15px;
        justify-content: center;
    }

    .upload-button, .cancel-button {
        padding: 10px 20px;
        border-radius: 6px;
        border: none;
        cursor: pointer;
        font-weight: 600;
        display: flex;
        align-items: center;
        gap: 8px;
        transition: all 0.2s;
    }

    .upload-button {
        background: #10b981;
        color: white;
    }

    .upload-button:hover {
        background: #059669;
    }

    .cancel-button {
        background: #6b7280;
        color: white;
    }

    .cancel-button:hover {
        background: #4b5563;
    }

    .upload-status {
        padding: 12px 16px;
        border-radius: 8px;
        margin-bottom: 20px;
        display: flex;
        align-items: center;
        gap: 8px;
        font-weight: 500;
    }

    .upload-status.success {
        background: #d1fae5;
        color: #065f46;
        border: 1px solid #a7f3d0;
    }

    .upload-status.error {
        background: #fee2e2;
        color: #991b1b;
        border: 1px solid #fca5a5;
    }

    .upload-status.info {
        background: #dbeafe;
        color: #1e40af;
        border: 1px solid #93c5fd;
    }

    .no-user-message, .no-files {
        text-align: center;
        padding: 40px 20px;
        color: #64748b;
    }

    .no-user-message i, .no-files i {
        font-size: 48px;
        margin-bottom: 16px;
        color: #cbd5e1;
    }

    .files-grid {
        display: grid;
        gap: 16px;
        grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    }

    .file-card {
        background: #f8fafc;
        border: 2px solid #e2e8f0;
        border-radius: 8px;
        padding: 16px;
        transition: all 0.2s;
    }

    .file-card.vectorized {
        border-color: #10b981;
        background: #f0fdf4;
    }

    .file-card.not-vectorized {
        border-color: #f59e0b;
        background: #fffbeb;
    }

    .file-card:hover {
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }

    .file-icon {
        text-align: center;
        margin-bottom: 12px;
    }

    .file-icon i {
        font-size: 32px;
        color: #6b7280;
    }

    .file-info h4 {
        margin: 0 0 8px 0;
        color: #1f2937;
        font-size: 1rem;
        text-align: center;
        word-break: break-word;
    }

    .file-info p {
        margin: 4px 0;
        color: #6b7280;
        font-size: 0.875rem;
        text-align: center;
    }

    .file-status {
        margin: 12px 0;
        text-align: center;
    }

    .status-badge {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 6px 12px;
        border-radius: 20px;
        font-size: 0.75rem;
        font-weight: 600;
    }

    .status-badge.ready {
        background: #d1fae5;
        color: #065f46;
    }

    .status-badge.pending {
        background: #fef3c7;
        color: #92400e;
    }

    .file-actions {
        text-align: center;
        margin-top: 12px;
    }

    .chat-button, .vectorize-button {
        padding: 8px 16px;
        border-radius: 6px;
        border: none;
        cursor: pointer;
        font-weight: 600;
        font-size: 0.875rem;
        display: inline-flex;
        align-items: center;
        gap: 6px;
        transition: all 0.2s;
    }

    .chat-button {
        background: #2563eb;
        color: white;
    }

    .chat-button:hover {
        background: #1d4ed8;
    }

    .vectorize-button {
        background: #f59e0b;
        color: white;
    }

    .vectorize-button:hover {
        background: #d97706;
    }

    .help-section {
        margin-top: 30px;
        padding-top: 20px;
        border-top: 2px solid #f1f5f9;
    }

    .help-section h4 {
        color: #374151;
        margin-bottom: 12px;
        display: flex;
        align-items: center;
        gap: 8px;
    }

    .help-section ol {
        color: #6b7280;
        padding-left: 20px;
    }

    .help-section li {
        margin-bottom: 8px;
    }

    .loading-files {
        text-align: center;
        padding: 40px;
        color: #6b7280;
    }

    .loading-files i {
        font-size: 24px;
        margin-right: 8px;
    }
`;

// Agregar estilos al documento
if (!document.getElementById('user-document-manager-styles')) {
    const style = document.createElement('style');
    style.id = 'user-document-manager-styles';
    style.textContent = userDocumentManagerStyles;
    document.head.appendChild(style);
}

// Hacer disponible globalmente
window.UserDocumentManager = UserDocumentManager; 