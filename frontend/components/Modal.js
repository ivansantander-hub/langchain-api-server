// Componente Modal reutilizable
const { useState, useEffect } = React;

const Modal = ({ isOpen, onClose, title, children, size = 'medium' }) => {
    // Cerrar modal con tecla Escape
    useEffect(() => {
        const handleEscape = (event) => {
            if (event.key === 'Escape' && isOpen) {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
            document.body.style.overflow = 'hidden'; // Prevenir scroll del body
        }

        return () => {
            document.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = 'unset';
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const sizeClasses = {
        small: 'modal-small',
        medium: 'modal-medium',
        large: 'modal-large'
    };

    const handleOverlayClick = (e) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    return (
        <div className="modal-overlay" onClick={handleOverlayClick}>
            <div className={`modal-content ${sizeClasses[size]}`}>
                <div className="modal-header">
                    <h3 className="modal-title">{title}</h3>
                    <button
                        className="modal-close-button"
                        onClick={onClose}
                        title="Cerrar"
                    >
                        <i className="fas fa-times"></i>
                    </button>
                </div>
                <div className="modal-body">
                    {children}
                </div>
            </div>
        </div>
    );
};

// Componente Modal de confirmación
const ConfirmModal = ({ isOpen, onClose, onConfirm, title, message, confirmText = 'Confirmar', cancelText = 'Cancelar', type = 'warning' }) => {
    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title} size="small">
            <div className="confirm-modal-content">
                <div className={`confirm-icon ${type}`}>
                    <i className={
                        type === 'danger' ? 'fas fa-exclamation-triangle' :
                        type === 'success' ? 'fas fa-check-circle' :
                        type === 'info' ? 'fas fa-info-circle' :
                        'fas fa-question-circle'
                    }></i>
                </div>
                
                <p className="confirm-message">{message}</p>
                
                <div className="confirm-actions">
                    <button 
                        className={`confirm-button primary ${type}`}
                        onClick={onConfirm}
                    >
                        {confirmText}
                    </button>
                    <button 
                        className="confirm-button secondary"
                        onClick={onClose}
                    >
                        {cancelText}
                    </button>
                </div>
            </div>
        </Modal>
    );
};

// Registrar el componente globalmente
window.Modal = Modal;
window.ConfirmModal = ConfirmModal; 