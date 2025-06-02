// Componente simplificado solo para subir archivos
const SimpleDocumentUploader = ({ userId, onDocumentUploaded }) => {
    const [selectedFile, setSelectedFile] = React.useState(null);
    const [isUploading, setIsUploading] = React.useState(false);
    const [uploadStatus, setUploadStatus] = React.useState(null);
    const [isDragging, setIsDragging] = React.useState(false);

    const handleFileSelect = (event) => {
        const file = event.target.files[0];
        processSelectedFile(file);
    };

    const handleDrop = (event) => {
        event.preventDefault();
        setIsDragging(false);
        const file = event.dataTransfer.files[0];
        processSelectedFile(file);
    };

    const handleDragOver = (event) => {
        event.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (event) => {
        event.preventDefault();
        setIsDragging(false);
    };

    const processSelectedFile = (file) => {
        if (!file) return;

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
                message: 'Solo archivos .txt o .md'
            });
            return;
        }

        // Validar tamaño (max 10MB)
        const maxSize = 10 * 1024 * 1024;
        if (file.size > maxSize) {
            setUploadStatus({
                type: 'error',
                message: 'Archivo muy grande (máx. 10MB)'
            });
            return;
        }

        setSelectedFile(file);
        setUploadStatus(null);
    };

    const handleUpload = async () => {
        if (!selectedFile || !userId) {
            setUploadStatus({
                type: 'error',
                message: 'Selecciona un archivo'
            });
            return;
        }

        setIsUploading(true);
        setUploadStatus({
            type: 'info',
            message: 'Subiendo archivo...'
        });

        try {
            const content = await window.apiClient.constructor.readFileAsText(selectedFile);
            const response = await window.apiClient.uploadAndVectorizeFile(userId, selectedFile.name, content);
            
            setUploadStatus({
                type: 'success',
                message: '¡Archivo subido exitosamente!'
            });

            // Limpiar
            setSelectedFile(null);
            const fileInput = document.getElementById('simple-file-input');
            if (fileInput) fileInput.value = '';
            
            // Notificar al padre
            if (onDocumentUploaded) {
                onDocumentUploaded({
                    userId,
                    filename: selectedFile.name,
                    vectorStoreId: response.vectorStoreId,
                    ready: true
                });
            }

            // Auto-limpiar mensaje después de 3 segundos
            setTimeout(() => {
                setUploadStatus(null);
            }, 3000);

        } catch (error) {
            console.error('Upload error:', error);
            setUploadStatus({
                type: 'error',
                message: `Error: ${error.message}`
            });
        } finally {
            setIsUploading(false);
        }
    };

    const formatFileSize = (bytes) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    };

    if (!userId) {
        return (
            <div className="simple-uploader">
                <div className="uploader-disabled">
                    <i className="fas fa-user-slash"></i>
                    <p>Selecciona un usuario para subir archivos</p>
                </div>
            </div>
        );
    }

    return (
        <div className="simple-uploader">
            <div className="uploader-header">
                <h3>
                    <i className="fas fa-cloud-upload-alt"></i>
                    Subir Documento
                </h3>
            </div>

            <div 
                className={`drop-zone ${isDragging ? 'dragging' : ''} ${selectedFile ? 'has-file' : ''}`}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => document.getElementById('simple-file-input').click()}
            >
                <input
                    type="file"
                    id="simple-file-input"
                    accept=".txt,.md"
                    onChange={handleFileSelect}
                    disabled={isUploading}
                    style={{ display: 'none' }}
                />

                {selectedFile ? (
                    <div className="file-preview">
                        <div className="file-icon">
                            <i className="fas fa-file-text"></i>
                        </div>
                        <div className="file-details">
                            <div className="file-name">{selectedFile.name}</div>
                            <div className="file-size">{formatFileSize(selectedFile.size)}</div>
                        </div>
                    </div>
                ) : (
                    <div className="drop-prompt">
                        <i className="fas fa-cloud-upload-alt"></i>
                        <div className="drop-text">
                            <strong>Arrastra un archivo aquí</strong>
                            <span>o haz clic para seleccionar</span>
                        </div>
                        <div className="file-types">
                            Archivos: .txt, .md (máx. 10MB)
                        </div>
                    </div>
                )}
            </div>

            {selectedFile && (
                <div className="upload-actions">
                    <button
                        className="upload-btn"
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
                                Subir Archivo
                            </>
                        )}
                    </button>
                    <button
                        className="cancel-btn"
                        onClick={() => {
                            setSelectedFile(null);
                            setUploadStatus(null);
                            const fileInput = document.getElementById('simple-file-input');
                            if (fileInput) fileInput.value = '';
                        }}
                        disabled={isUploading}
                    >
                        <i className="fas fa-times"></i>
                        Cancelar
                    </button>
                </div>
            )}

            {uploadStatus && (
                <div className={`upload-status status-${uploadStatus.type}`}>
                    <i className={
                        uploadStatus.type === 'success' ? 'fas fa-check-circle' :
                        uploadStatus.type === 'error' ? 'fas fa-exclamation-circle' :
                        'fas fa-info-circle'
                    }></i>
                    <span>{uploadStatus.message}</span>
                </div>
            )}

            <div className="upload-help">
                <p>
                    <i className="fas fa-info-circle"></i>
                    Los documentos subidos aparecerán automáticamente en "Base de Conocimiento"
                </p>
            </div>
        </div>
    );
};

// Registrar el componente globalmente
window.SimpleDocumentUploader = SimpleDocumentUploader; 