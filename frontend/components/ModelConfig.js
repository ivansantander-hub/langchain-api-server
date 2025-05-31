class ModelConfig {
    constructor() {
        this.isVisible = false;
        this.config = {
            modelName: 'gpt-3.5-turbo',
            temperature: 0.7,
            systemPrompt: '',
            maxTokens: 1000,
            topP: 1,
            streaming: true
        };
        this.availableModels = [];
        this.onConfigChange = null;
        this.init();
    }

    async init() {
        await this.loadConfig();
        await this.loadAvailableModels();
        this.render();
        this.attachEventListeners();
    }

    async loadConfig() {
        try {
            const response = await window.api.request('/api/config/model');
            this.config = { ...response.config };
        } catch (error) {
            console.error('Error loading model config:', error);
        }
    }

    async loadAvailableModels() {
        try {
            // Try to get live models from OpenAI first
            const response = await window.api.request('/api/models/openai');
            if (response.models && response.models.length > 0) {
                this.availableModels = response.models.map(model => ({
                    name: model.id,
                    displayName: model.name || model.id,
                    description: model.description || 'Modelo OpenAI'
                }));
            } else {
                // Fallback to default models
                this.availableModels = [
                    { 
                        name: 'gpt-3.5-turbo', 
                        displayName: 'GPT-3.5 Turbo', 
                        description: 'Rápido y eficiente para la mayoría de tareas conversacionales' 
                    },
                    { 
                        name: 'gpt-4', 
                        displayName: 'GPT-4', 
                        description: 'Más preciso y capaz para tareas complejas de razonamiento' 
                    },
                    { 
                        name: 'gpt-4o-mini', 
                        displayName: 'GPT-4o Mini', 
                        description: 'Versión optimizada de GPT-4 para respuestas rápidas' 
                    }
                ];
            }
        } catch (error) {
            console.error('Error loading models:', error);
            // Use default models as fallback
            this.availableModels = [
                { 
                    name: 'gpt-3.5-turbo', 
                    displayName: 'GPT-3.5 Turbo', 
                    description: 'Rápido y eficiente para la mayoría de tareas conversacionales' 
                },
                { 
                    name: 'gpt-4', 
                    displayName: 'GPT-4', 
                    description: 'Más preciso y capaz para tareas complejas de razonamiento' 
                },
                { 
                    name: 'gpt-4o-mini', 
                    displayName: 'GPT-4o Mini', 
                    description: 'Versión optimizada de GPT-4 para respuestas rápidas' 
                }
            ];
        }
    }

    render() {
        const container = document.getElementById('model-config-container');
        if (!container) {
            const newContainer = document.createElement('div');
            newContainer.id = 'model-config-container';
            newContainer.className = 'model-config-container';
            document.body.appendChild(newContainer);
        }

        document.getElementById('model-config-container').innerHTML = `
            <div class="model-config-overlay ${this.isVisible ? 'visible' : ''}" id="model-config-overlay">
                <div class="modern-modal">
                    <!-- Header moderno -->
                    <div class="modern-header">
                        <div class="header-content">
                            <div class="header-icon">
                                <i class="fas fa-robot"></i>
                            </div>
                            <div class="header-text">
                                <h3>Configuración del Modelo</h3>
                                <p>Personaliza los parámetros de IA para optimizar las respuestas</p>
                            </div>
                        </div>
                        <button class="modern-close" id="model-config-close">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>

                    <!-- Contenido moderno -->
                    <div class="modern-content">
                        <!-- Modelo Selection -->
                        <div class="config-card">
                            <div class="card-header">
                                <div class="card-icon">
                                    <i class="fas fa-brain"></i>
                                </div>
                                <div class="card-title">
                                    <h4>Selección de Modelo</h4>
                                    <span>Elige el modelo de IA más adecuado para tu tarea</span>
                                </div>
                            </div>
                            <div class="card-content">
                                <select class="modern-select" id="model-select">
                                    ${this.availableModels.map(model => 
                                        `<option value="${model.name}" ${model.name === this.config.modelName ? 'selected' : ''}>${model.displayName}</option>`
                                    ).join('')}
                                </select>
                                <div class="model-info">
                                    <i class="fas fa-info-circle"></i>
                                    <span id="model-description">Selecciona un modelo para ver su descripción</span>
                                </div>
                            </div>
                        </div>

                        <!-- Temperature -->
                        <div class="config-card">
                            <div class="card-header">
                                <div class="card-icon temperature-icon">
                                    <i class="fas fa-thermometer-half"></i>
                                </div>
                                <div class="card-title">
                                    <h4>Temperatura: <span id="temperature-value">${this.config.temperature}</span></h4>
                                    <span>Controla la creatividad y aleatoriedad de las respuestas</span>
                                </div>
                            </div>
                            <div class="card-content">
                                <div class="slider-container">
                                    <input type="range" 
                                           class="modern-slider temperature-slider" 
                                           id="temperature-input" 
                                           min="0" 
                                           max="2" 
                                           step="0.1" 
                                           value="${this.config.temperature}">
                                </div>
                                <div class="slider-labels">
                                    <div class="label">
                                        <i class="fas fa-snowflake"></i>
                                        <span>Preciso</span>
                                    </div>
                                    <div class="label">
                                        <i class="fas fa-balance-scale"></i>
                                        <span>Equilibrado</span>
                                    </div>
                                    <div class="label">
                                        <i class="fas fa-fire"></i>
                                        <span>Creativo</span>
                                    </div>
                                </div>
                                <div class="temperature-description" id="temperature-desc">
                                    ${this.getTemperatureDescription()}
                                </div>
                            </div>
                        </div>

                        <!-- Advanced Settings -->
                        <div class="config-card">
                            <div class="card-header">
                                <div class="card-icon tokens-icon">
                                    <i class="fas fa-layer-group"></i>
                                </div>
                                <div class="card-title">
                                    <h4>Configuración Avanzada</h4>
                                    <span>Ajustes técnicos para control fino de las respuestas</span>
                                </div>
                            </div>
                            <div class="card-content">
                                <div class="advanced-grid">
                                    <div class="advanced-item">
                                        <label>
                                            <i class="fas fa-coins"></i>
                                            Tokens Máximos: <span id="max-tokens-value">${this.config.maxTokens}</span>
                                        </label>
                                        <div class="slider-container">
                                            <input type="range" 
                                                   class="modern-slider tokens-slider" 
                                                   id="max-tokens-input" 
                                                   min="100" 
                                                   max="4000" 
                                                   step="50" 
                                                   value="${this.config.maxTokens}">
                                        </div>
                                        <div class="slider-labels compact">
                                            <div class="label">Breve</div>
                                            <div class="label">Detallado</div>
                                        </div>
                                    </div>
                                    
                                    <div class="advanced-item">
                                        <label>
                                            <i class="fas fa-random"></i>
                                            Diversidad (Top P): <span id="top-p-value">${this.config.topP}</span>
                                        </label>
                                        <div class="slider-container">
                                            <input type="range" 
                                                   class="modern-slider diversity-slider" 
                                                   id="top-p-input" 
                                                   min="0.1" 
                                                   max="1.0" 
                                                   step="0.1" 
                                                   value="${this.config.topP}">
                                        </div>
                                        <div class="slider-labels compact">
                                            <div class="label">Enfocado</div>
                                            <div class="label">Diverso</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Streaming Toggle -->
                        <div class="config-card">
                            <div class="card-header">
                                <div class="card-icon streaming-icon">
                                    <i class="fas fa-stream"></i>
                                </div>
                                <div class="card-title">
                                    <h4>Respuesta en Tiempo Real</h4>
                                    <span>Recibe respuestas mientras se generan para una experiencia fluida</span>
                                </div>
                            </div>
                            <div class="card-content">
                                <div class="streaming-toggle">
                                    <label class="toggle-switch">
                                        <input type="checkbox" id="streaming-toggle" ${this.config.streaming ? 'checked' : ''}>
                                        <span class="toggle-slider"></span>
                                    </label>
                                    <div class="toggle-info">
                                        <strong>Streaming ${this.config.streaming ? 'Activado' : 'Desactivado'}</strong>
                                        <p id="streaming-description">
                                            ${this.config.streaming 
                                                ? 'Las respuestas aparecerán progresivamente mientras se generan'
                                                : 'Las respuestas aparecerán completas al finalizar la generación'
                                            }
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- System Prompt -->
                        <div class="config-card">
                            <div class="card-header">
                                <div class="card-icon prompt-icon">
                                    <i class="fas fa-edit"></i>
                                </div>
                                <div class="card-title">
                                    <h4>Prompt del Sistema</h4>
                                    <span>Define las instrucciones básicas para el comportamiento del asistente</span>
                                </div>
                            </div>
                            <div class="card-content">
                                <div class="prompt-container">
                                    <textarea class="modern-textarea" 
                                              id="system-prompt-input" 
                                              placeholder="Eres un asistente útil y amigable...">${this.config.systemPrompt}</textarea>
                                    <div class="prompt-counter">
                                        <span id="prompt-counter">${(this.config.systemPrompt || '').length}</span> caracteres
                                    </div>
                                </div>
                                <div class="prompt-actions">
                                    <button class="action-btn secondary" id="reset-prompt-btn">
                                        <i class="fas fa-undo"></i>
                                        Restablecer
                                    </button>
                                    <button class="action-btn secondary" id="preset-prompts-btn">
                                        <i class="fas fa-list"></i>
                                        Plantillas
                                    </button>
                                </div>
                            </div>
                        </div>

                        <!-- Preview -->
                        <div class="config-card">
                            <div class="card-header">
                                <div class="card-icon">
                                    <i class="fas fa-eye"></i>
                                </div>
                                <div class="card-title">
                                    <h4>Vista Previa de Configuración</h4>
                                    <span>Resumen de los ajustes actuales</span>
                                </div>
                            </div>
                            <div class="card-content">
                                <div class="preview-grid" id="config-preview">
                                    ${this.getConfigPreview()}
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Footer moderno -->
                    <div class="modern-footer">
                        <div class="footer-info">
                            <i class="fas fa-save"></i>
                            <span>Los cambios se guardan automáticamente</span>
                        </div>
                        <div class="footer-actions">
                            <button class="action-btn secondary" id="reset-config-btn">
                                <i class="fas fa-refresh"></i>
                                Valores por Defecto
                            </button>
                            <button class="action-btn primary" id="save-config-btn">
                                <i class="fas fa-check"></i>
                                Aplicar Configuración
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        this.attachEventListeners();
        this.updateModelDescription();
    }

    getConfigPreview() {
        return `
            <div class="preview-item">
                <div class="preview-icon"><i class="fas fa-robot"></i></div>
                <div class="preview-content">
                    <strong>Modelo:</strong> 
                    <span class="preview-value">${this.config.modelName}</span>
                </div>
            </div>
            <div class="preview-item">
                <div class="preview-icon"><i class="fas fa-thermometer-half"></i></div>
                <div class="preview-content">
                    <strong>Temperatura:</strong> 
                    <span class="preview-value">${this.config.temperature} (${this.getTemperatureDescription()})</span>
                </div>
            </div>
            <div class="preview-item">
                <div class="preview-icon"><i class="fas fa-text-width"></i></div>
                <div class="preview-content">
                    <strong>Tokens Máximos:</strong> 
                    <span class="preview-value">${this.config.maxTokens}</span>
                </div>
            </div>
            <div class="preview-item">
                <div class="preview-icon"><i class="fas fa-filter"></i></div>
                <div class="preview-content">
                    <strong>Top P:</strong> 
                    <span class="preview-value">${this.config.topP}</span>
                </div>
            </div>
            <div class="preview-item">
                <div class="preview-icon"><i class="fas fa-comment-dots"></i></div>
                <div class="preview-content">
                    <strong>Prompt del Sistema:</strong> 
                    <span class="preview-value">${this.config.systemPrompt ? 'Personalizado' : 'Por Defecto'}</span>
                </div>
            </div>
            <div class="preview-item">
                <div class="preview-icon"><i class="fas fa-stream"></i></div>
                <div class="preview-content">
                    <strong>Streaming:</strong> 
                    <span class="preview-value ${this.config.streaming !== false ? 'enabled' : 'disabled'}">
                        ${this.config.streaming !== false ? 'Activado' : 'Desactivado'}
                    </span>
                </div>
            </div>
        `;
    }

    getTemperatureDescription() {
        const temp = parseFloat(this.config.temperature);
        if (temp <= 0.3) return 'Very Conservative';
        if (temp <= 0.7) return 'Balanced';
        if (temp <= 1.2) return 'Creative';
        return 'Very Creative';
    }

    attachEventListeners() {
        // Toggle visibility
        document.addEventListener('click', (e) => {
            if (e.target.id === 'model-config-overlay') {
                this.hide();
            }
        });

        // Close button
        const closeBtn = document.getElementById('model-config-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.hide());
        }

        // Model selection
        const modelSelect = document.getElementById('model-select');
        if (modelSelect) {
            modelSelect.addEventListener('change', (e) => {
                this.config.modelName = e.target.value;
                this.updateModelDescription();
                this.updatePreview();
                this.showToast(`Modelo cambiado a ${e.target.selectedOptions[0].text}`, 'info');
            });
        }

        // Temperature slider
        const temperatureInput = document.getElementById('temperature-input');
        if (temperatureInput) {
            temperatureInput.addEventListener('input', (e) => {
                this.config.temperature = parseFloat(e.target.value);
                document.getElementById('temperature-value').textContent = this.config.temperature;
                // Update temperature description
                const descElement = document.querySelector('.temperature-description');
                if (descElement) {
                    descElement.textContent = this.getTemperatureDescription();
                }
                this.updatePreview();
            });
        }

        // Max tokens slider
        const maxTokensInput = document.getElementById('max-tokens-input');
        if (maxTokensInput) {
            maxTokensInput.addEventListener('input', (e) => {
                this.config.maxTokens = parseInt(e.target.value);
                document.getElementById('max-tokens-value').textContent = this.config.maxTokens;
                this.updatePreview();
            });
        }

        // Top P slider
        const topPInput = document.getElementById('top-p-input');
        if (topPInput) {
            topPInput.addEventListener('input', (e) => {
                this.config.topP = parseFloat(e.target.value);
                document.getElementById('top-p-value').textContent = this.config.topP;
                this.updatePreview();
            });
        }

        // System prompt textarea
        const systemPromptInput = document.getElementById('system-prompt-input');
        if (systemPromptInput) {
            systemPromptInput.addEventListener('input', (e) => {
                this.config.systemPrompt = e.target.value;
                // Update character count
                const lengthElement = document.getElementById('prompt-counter');
                if (lengthElement) {
                    lengthElement.textContent = this.config.systemPrompt.length;
                }
                this.updatePreview();
            });
        }

        // Streaming toggle
        const streamingToggle = document.getElementById('streaming-toggle');
        if (streamingToggle) {
            streamingToggle.addEventListener('change', (e) => {
                this.config.streaming = e.target.checked;
                
                // Update the toggle info text dynamically
                const streamingDescription = document.getElementById('streaming-description');
                const toggleInfo = document.querySelector('.toggle-info strong');
                
                if (streamingDescription && toggleInfo) {
                    toggleInfo.textContent = `Streaming ${this.config.streaming ? 'Activado' : 'Desactivado'}`;
                    streamingDescription.textContent = this.config.streaming 
                        ? 'Las respuestas aparecerán progresivamente mientras se generan'
                        : 'Las respuestas aparecerán completas al finalizar la generación';
                }
                
                this.updatePreview();
                this.showToast(`Streaming ${this.config.streaming ? 'activado' : 'desactivado'}`, 'info');
            });
        }

        // Reset prompt button
        const resetPromptBtn = document.getElementById('reset-prompt-btn');
        if (resetPromptBtn) {
            resetPromptBtn.addEventListener('click', () => {
                this.config.systemPrompt = '';
                document.getElementById('system-prompt-input').value = '';
                document.getElementById('prompt-counter').textContent = '0';
                this.updatePreview();
                this.showToast('Prompt restablecido', 'success');
            });
        }

        // Load presets button
        const loadPresetsBtn = document.getElementById('preset-prompts-btn');
        if (loadPresetsBtn) {
            loadPresetsBtn.addEventListener('click', () => {
                this.showPresetMenu();
            });
        }

        // Reset all config button
        const resetConfigBtn = document.getElementById('reset-config-btn');
        if (resetConfigBtn) {
            resetConfigBtn.addEventListener('click', () => {
                this.resetToDefaults();
            });
        }

        // Save config button
        const saveConfigBtn = document.getElementById('save-config-btn');
        if (saveConfigBtn) {
            saveConfigBtn.addEventListener('click', () => {
                this.saveConfig();
            });
        }
    }

    updatePreview() {
        const previewElement = document.getElementById('config-preview');
        if (previewElement) {
            previewElement.innerHTML = this.getConfigPreview();
        }
    }

    saveConfig() {
        // Store in localStorage for persistence
        localStorage.setItem('modelConfig', JSON.stringify(this.config));
        
        // Notify parent component
        if (this.onConfigChange) {
            this.onConfigChange(this.config);
        }

        // Show confirmation
        this.showToast('¡Configuración guardada exitosamente!', 'success');
        this.hide();
    }

    resetToDefaults() {
        this.config = {
            modelName: 'gpt-3.5-turbo',
            temperature: 0.7,
            systemPrompt: '',
            maxTokens: 1000,
            topP: 1,
            streaming: true
        };
        
        // Re-render with defaults
        this.render();
        this.attachEventListeners();
        this.showToast('Configuración restablecida a valores por defecto', 'info');
    }

    showPresetMenu() {
        const presets = {
            'creative': {
                name: 'Creativo',
                description: 'Para respuestas más imaginativas y variadas',
                config: {
                    temperature: 1.2,
                    topP: 0.9,
                    systemPrompt: 'Eres un asistente creativo y útil. Proporciona respuestas imaginativas y detalladas, explorando diferentes perspectivas y posibilidades.'
                }
            },
            'precise': {
                name: 'Preciso',
                description: 'Para respuestas exactas y conservadoras',
                config: {
                    temperature: 0.2,
                    topP: 0.5,
                    systemPrompt: 'Eres un asistente preciso y meticuloso. Proporciona respuestas exactas, bien estructuradas y basadas únicamente en la información disponible.'
                }
            },
            'balanced': {
                name: 'Equilibrado',
                description: 'Balance entre creatividad y precisión',
                config: {
                    temperature: 0.7,
                    topP: 0.8,
                    systemPrompt: 'Eres un asistente equilibrado y útil. Proporciona respuestas claras, informativas y útiles, combinando precisión con creatividad cuando sea apropiado.'
                }
            },
            'technical': {
                name: 'Técnico',
                description: 'Para documentación técnica y código',
                config: {
                    temperature: 0.3,
                    topP: 0.6,
                    systemPrompt: 'Eres un asistente técnico especializado. Proporciona respuestas técnicas precisas, incluye ejemplos de código cuando sea relevante y explica conceptos complejos de manera clara.'
                }
            }
        };

        const presetHtml = Object.keys(presets).map(key => {
            const preset = presets[key];
            return `
                <div class="preset-item" data-preset="${key}">
                    <div class="preset-header">
                        <strong>${preset.name}</strong>
                        <span class="preset-temp">T: ${preset.config.temperature}</span>
                    </div>
                    <div class="preset-description">${preset.description}</div>
                </div>
            `;
        }).join('');

        // Create temporary preset menu
        const presetMenu = document.createElement('div');
        presetMenu.className = 'preset-menu';
        presetMenu.innerHTML = `
            <div class="preset-menu-content">
                <h4><i class="fas fa-magic"></i> Presets de Configuración</h4>
                ${presetHtml}
                <button class="preset-close">Cerrar</button>
            </div>
        `;

        document.body.appendChild(presetMenu);

        // Add event listeners for presets
        presetMenu.addEventListener('click', (e) => {
            if (e.target.dataset.preset) {
                const preset = presets[e.target.dataset.preset];
                Object.assign(this.config, preset.config);
                this.render();
                this.attachEventListeners();
                this.showToast(`Preset "${preset.name}" aplicado`, 'success');
                document.body.removeChild(presetMenu);
            } else if (e.target.classList.contains('preset-close')) {
                document.body.removeChild(presetMenu);
            }
        });
    }

    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        document.body.appendChild(toast);

        setTimeout(() => {
            toast.classList.add('show');
        }, 100);

        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => document.body.removeChild(toast), 300);
        }, 3000);
    }

    show() {
        this.isVisible = true;
        const overlay = document.getElementById('model-config-overlay');
        if (overlay) {
            overlay.classList.add('visible');
        }
        
        // Focus on first input
        setTimeout(() => {
            const firstInput = document.getElementById('model-select');
            if (firstInput) firstInput.focus();
        }, 100);
    }

    hide() {
        this.isVisible = false;
        const overlay = document.getElementById('model-config-overlay');
        if (overlay) {
            overlay.classList.remove('visible');
        }
    }

    getConfig() {
        // Try to get from localStorage first
        const saved = localStorage.getItem('modelConfig');
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch (error) {
                console.error('Error parsing saved config:', error);
            }
        }
        return this.config;
    }

    setOnConfigChange(callback) {
        this.onConfigChange = callback;
    }

    updateModelDescription() {
        const modelSelect = document.getElementById('model-select');
        if (modelSelect) {
            const selectedModel = this.availableModels.find(m => m.name === this.config.modelName);
            if (selectedModel) {
                document.getElementById('model-description').textContent = selectedModel.description;
            } else {
                document.getElementById('model-description').textContent = 'Selecciona un modelo para ver su descripción';
            }
        }
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ModelConfig;
} else {
    window.ModelConfig = ModelConfig;
} 