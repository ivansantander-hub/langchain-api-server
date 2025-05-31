// Componente para subir documentos con soporte para PDF
const DocumentUploader = () => {
    const [isUploading, setIsUploading] = React.useState(false);
    const [uploadStatus, setUploadStatus] = React.useState('');
    const [selectedFile, setSelectedFile] = React.useState(null);

    const handleFileSelect = (event) => {
        const file = event.target.files[0];
        if (file) {
            setSelectedFile(file);
            setUploadStatus('');
        }
    };

    const uploadDocument = async () => {
        if (!selectedFile) {
            setUploadStatus('Por favor selecciona un archivo primero.');
            return;
        }

        setIsUploading(true);
        setUploadStatus('Subiendo documento...');

        try {
            let content;
            const filename = selectedFile.name;

            if (selectedFile.type === 'application/pdf') {
                // Para PDFs, necesitamos manejarlos de manera especial
                // Por ahora, vamos a convertir a base64 y luego procesarlo en el servidor
                const arrayBuffer = await selectedFile.arrayBuffer();
                const uint8Array = new Uint8Array(arrayBuffer);
                const binaryString = uint8Array.reduce((data, byte) => data + String.fromCharCode(byte), '');
                content = btoa(binaryString); // Base64 encoding
                
                setUploadStatus('Procesando PDF...');
            } else {
                // Para archivos de texto
                content = await window.apiClient.constructor.readFileAsText(selectedFile);
            }

            console.log(`Uploading ${filename} (${selectedFile.type})`);
            
            const response = await window.apiClient.uploadDocument(filename, content);
            
            setUploadStatus(`✅ ${response.message}`);
            setSelectedFile(null);
            
            // Limpiar el input
            const fileInput = document.getElementById('file-input');
            if (fileInput) fileInput.value = '';
            
            // Recargar la página después de unos segundos para ver los nuevos documentos
            setTimeout(() => {
                window.location.reload();
            }, 2000);
            
        } catch (error) {
            console.error('Error uploading document:', error);
            setUploadStatus(`❌ Error: ${error.message}`);
        } finally {
            setIsUploading(false);
        }
    };

    const getSupportedFormats = () => {
        return [
            { ext: '.pdf', desc: 'Documentos PDF' },
            { ext: '.txt', desc: 'Archivos de texto' }
        ];
    };

    return (
        <div className="document-uploader">
            <div className="uploader-header">
                <h3>
                    <i className="fas fa-upload"></i>
                    Subir Documento
                </h3>
                <p>Sube documentos PDF o TXT para agregar al knowledge base</p>
            </div>

            <div className="uploader-content">
                <div className="file-input-container">
                    <input
                        id="file-input"
                        type="file"
                        accept=".pdf,.txt"
                        onChange={handleFileSelect}
                        disabled={isUploading}
                        className="file-input"
                    />
                    <label htmlFor="file-input" className="file-input-label">
                        <i className="fas fa-folder-open"></i>
                        {selectedFile ? selectedFile.name : 'Seleccionar archivo'}
                    </label>
                </div>

                {selectedFile && (
                    <div className="file-info">
                        <div className="file-details">
                            <i className={`fas ${selectedFile.type === 'application/pdf' ? 'fa-file-pdf' : 'fa-file-text'}`}></i>
                            <span className="file-name">{selectedFile.name}</span>
                            <span className="file-size">({(selectedFile.size / 1024).toFixed(1)} KB)</span>
                        </div>
                        
                        <button
                            onClick={uploadDocument}
                            disabled={isUploading}
                            className="upload-button"
                        >
                            {isUploading ? (
                                <>
                                    <i className="fas fa-spinner fa-spin"></i>
                                    Procesando...
                                </>
                            ) : (
                                <>
                                    <i className="fas fa-upload"></i>
                                    Subir Documento
                                </>
                            )}
                        </button>
                    </div>
                )}

                {uploadStatus && (
                    <div className={`upload-status ${uploadStatus.includes('❌') ? 'error' : uploadStatus.includes('✅') ? 'success' : 'info'}`}>
                        {uploadStatus}
                    </div>
                )}

                <div className="supported-formats">
                    <h4>Formatos Soportados:</h4>
                    <ul>
                        {getSupportedFormats().map((format, index) => (
                            <li key={index}>
                                <strong>{format.ext}</strong> - {format.desc}
                            </li>
                        ))}
                    </ul>
                </div>

                <div className="upload-tips">
                    <h4>Tips:</h4>
                    <ul>
                        <li>Los PDFs se procesan automáticamente extrayendo todo el texto</li>
                        <li>Los archivos grandes pueden tomar más tiempo en procesarse</li>
                        <li>Después de subir, el documento estará disponible en el chat inmediatamente</li>
                        <li>Se crearán automáticamente dos vector stores: uno individual y uno combinado</li>
                    </ul>
                </div>
            </div>
        </div>
    );
};

// Estilos CSS para el componente
const uploaderStyles = `
    .document-uploader {
        background: white;
        border-radius: 12px;
        padding: 24px;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        margin: 20px 0;
    }

    .uploader-header h3 {
        color: #2563eb;
        margin: 0 0 8px 0;
        font-size: 1.25rem;
        display: flex;
        align-items: center;
        gap: 8px;
    }

    .uploader-header p {
        color: #64748b;
        margin: 0 0 20px 0;
        font-size: 0.9rem;
    }

    .file-input {
        display: none;
    }

    .file-input-label {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 12px 20px;
        background: #f8fafc;
        border: 2px dashed #cbd5e1;
        border-radius: 8px;
        cursor: pointer;
        color: #475569;
        font-weight: 500;
        transition: all 0.2s;
        width: 100%;
        justify-content: center;
    }

    .file-input-label:hover {
        background: #f1f5f9;
        border-color: #2563eb;
        color: #2563eb;
    }

    .file-info {
        margin-top: 16px;
        padding: 16px;
        background: #f8fafc;
        border-radius: 8px;
    }

    .file-details {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 12px;
        color: #475569;
    }

    .file-name {
        font-weight: 500;
        flex: 1;
    }

    .file-size {
        color: #64748b;
        font-size: 0.85rem;
    }

    .upload-button {
        background: #2563eb;
        color: white;
        border: none;
        padding: 10px 20px;
        border-radius: 6px;
        cursor: pointer;
        font-weight: 500;
        display: flex;
        align-items: center;
        gap: 8px;
        transition: background 0.2s;
        width: 100%;
        justify-content: center;
    }

    .upload-button:hover:not(:disabled) {
        background: #1d4ed8;
    }

    .upload-button:disabled {
        background: #94a3b8;
        cursor: not-allowed;
    }

    .upload-status {
        margin-top: 12px;
        padding: 12px;
        border-radius: 6px;
        font-weight: 500;
    }

    .upload-status.success {
        background: #dcfce7;
        color: #16a34a;
        border: 1px solid #bbf7d0;
    }

    .upload-status.error {
        background: #fef2f2;
        color: #dc2626;
        border: 1px solid #fecaca;
    }

    .upload-status.info {
        background: #dbeafe;
        color: #2563eb;
        border: 1px solid #bfdbfe;
    }

    .supported-formats,
    .upload-tips {
        margin-top: 20px;
        padding-top: 16px;
        border-top: 1px solid #e2e8f0;
    }

    .supported-formats h4,
    .upload-tips h4 {
        color: #374151;
        margin: 0 0 8px 0;
        font-size: 0.9rem;
        font-weight: 600;
    }

    .supported-formats ul,
    .upload-tips ul {
        margin: 0;
        padding-left: 20px;
        color: #64748b;
        font-size: 0.85rem;
    }

    .supported-formats li {
        margin-bottom: 4px;
    }

    .upload-tips li {
        margin-bottom: 6px;
        line-height: 1.4;
    }
`;

// Inyectar estilos
if (!document.getElementById('uploader-styles')) {
    const styleSheet = document.createElement('style');
    styleSheet.id = 'uploader-styles';
    styleSheet.textContent = uploaderStyles;
    document.head.appendChild(styleSheet);
}

window.DocumentUploader = DocumentUploader; 