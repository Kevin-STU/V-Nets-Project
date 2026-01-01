/**
 * V-Nets Web Editor - Component Palette
 * Sidebar with draggable components
 */

class VNetPalette {
    constructor(containerId, canvas) {
        this.container = document.getElementById(containerId);
        this.canvas = canvas;
        this.init();
    }

    init() {
        this.container.innerHTML = `
            <div class="palette-section">
                <h3 class="palette-title">Componentes</h3>
                <div class="palette-items">
                    <div class="palette-item" data-type="init" draggable="true">
                        <div class="palette-icon init-icon">
                            <svg viewBox="0 0 40 40">
                                <polygon points="20,5 35,35 5,35" fill="#32963c" stroke="#2c5a2e" stroke-width="2"/>
                            </svg>
                        </div>
                        <span>Evento Inicial</span>
                    </div>
                    <div class="palette-item" data-type="intermediate" draggable="true">
                        <div class="palette-icon intermediate-icon">
                            <svg viewBox="0 0 40 40">
                                <polygon points="20,5 35,20 20,35 5,20" fill="#3232c8" stroke="#2c2c5a" stroke-width="2"/>
                            </svg>
                        </div>
                        <span>Evento Intermedio</span>
                    </div>
                    <div class="palette-item" data-type="end" draggable="true">
                        <div class="palette-icon end-icon">
                            <svg viewBox="0 0 40 40">
                                <circle cx="20" cy="20" r="15" fill="#963232" stroke="#5a2c2c" stroke-width="2"/>
                            </svg>
                        </div>
                        <span>Evento Final</span>
                    </div>
                </div>
            </div>
            
            <div class="palette-section">
                <h3 class="palette-title">Herramientas</h3>
                <div class="tool-buttons">
                    <button class="tool-btn active" data-tool="select" title="Seleccionar (V)">
                        <svg viewBox="0 0 24 24" fill="currentColor">
                            <path d="M3,3L21,12L12,14L10,21L3,3Z"/>
                        </svg>
                        Seleccionar
                    </button>
                    <button class="tool-btn" data-tool="connect" title="Conectar (C)">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="5" y1="12" x2="19" y2="12"/>
                            <polyline points="15,8 19,12 15,16"/>
                        </svg>
                        Conectar
                    </button>
                </div>
                <div class="undo-redo-buttons">
                    <button class="undo-btn" id="undoBtn" title="Deshacer (Ctrl+Z)" disabled>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M3 7v6h6"/>
                            <path d="M21 17a9 9 0 00-9-9 9 9 0 00-6 2.3L3 13"/>
                        </svg>
                    </button>
                    <button class="redo-btn" id="redoBtn" title="Rehacer (Ctrl+Y)" disabled>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M21 7v6h-6"/>
                            <path d="M3 17a9 9 0 019-9 9 9 0 016 2.3l3 2.7"/>
                        </svg>
                    </button>
                </div>
            </div>

            <div class="palette-section">
                <h3 class="palette-title">Archivo</h3>
                <div class="action-buttons">
                    <button class="action-btn" id="newFileBtn">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                            <polyline points="14,2 14,8 20,8"/>
                            <line x1="12" y1="18" x2="12" y2="12"/>
                            <line x1="9" y1="15" x2="15" y2="15"/>
                        </svg>
                        Nuevo
                    </button>
                    <button class="action-btn" id="openFileBtn">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/>
                        </svg>
                        Abrir .vnet
                    </button>
                    <input type="file" id="fileInputHidden" accept=".vnet,.json" style="display: none;">
                    <button class="action-btn primary-btn" id="saveFileBtn">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/>
                            <polyline points="17,21 17,13 7,13 7,21"/>
                            <polyline points="7,3 7,8 15,8"/>
                        </svg>
                        Guardar
                    </button>
                    <button class="action-btn" id="saveAsBtn">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M17 3a2.828 2.828 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>
                        </svg>
                        Guardar Como
                    </button>
                </div>
            </div>

            <div class="palette-section">
                <h3 class="palette-title">Acciones</h3>
                <div class="action-buttons">
                    <button class="action-btn validate-btn" id="validateBtn">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M20 6L9 17L4 12"/>
                        </svg>
                        Validar V-Net
                    </button>
                    <button class="action-btn generate-btn" id="generateSeqBtn">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                        </svg>
                        Generar Secuencias
                    </button>
                    <button class="action-btn validate-seq-btn" id="validateSeqBtn">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M9 11l3 3L22 4"/>
                            <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
                        </svg>
                        Validar Secuencia
                    </button>
                    <button class="action-btn" id="clearBtn">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                        </svg>
                        Limpiar Canvas
                    </button>
                    <button class="action-btn" id="exportBtn">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/>
                        </svg>
                        Exportar JSON
                    </button>
                    <button class="action-btn" id="exportImageBtn">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                            <circle cx="8.5" cy="8.5" r="1.5"/>
                            <polyline points="21,15 16,10 5,21"/>
                        </svg>
                        Exportar Imagen
                    </button>
                </div>
            </div>

            <div class="palette-section">
                <h3 class="palette-title">Vista</h3>
                <div class="zoom-controls">
                    <button class="zoom-btn" id="zoomOutBtn" title="Alejar (-)">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="11" cy="11" r="8"/>
                            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                            <line x1="8" y1="11" x2="14" y2="11"/>
                        </svg>
                    </button>
                    <span class="zoom-indicator" id="zoomIndicator">100%</span>
                    <button class="zoom-btn" id="zoomInBtn" title="Acercar (+)">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="11" cy="11" r="8"/>
                            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                            <line x1="11" y1="8" x2="11" y2="14"/>
                            <line x1="8" y1="11" x2="14" y2="11"/>
                        </svg>
                    </button>
                </div>
                <div class="zoom-actions">
                    <button class="action-btn" id="resetZoomBtn">Restablecer Zoom</button>
                    <button class="action-btn" id="fitWindowBtn">Ajustar a Ventana</button>
                </div>
            </div>

            <div class="palette-section">
                <h3 class="palette-title">V-Net Info</h3>
                <div class="vnet-info" id="vnetInfo">
                    <div class="info-item">
                        <span class="info-label">Eventos:</span>
                        <span class="info-value" id="eventCount">0</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Conexiones:</span>
                        <span class="info-value" id="connectionCount">0</span>
                    </div>
                </div>
            </div>
        `;

        this.setupEventHandlers();
    }

    setupEventHandlers() {
        // Drag and drop for palette items
        const items = this.container.querySelectorAll('.palette-item');
        items.forEach(item => {
            item.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('text/plain', item.dataset.type);
                e.dataTransfer.effectAllowed = 'copy';
            });
        });

        // Tool buttons
        const toolBtns = this.container.querySelectorAll('.tool-btn');
        toolBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                toolBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.canvas.setTool(btn.dataset.tool);
            });
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

            if (e.key === 'v' || e.key === 'V') {
                this.selectTool('select');
            } else if (e.key === 'c' || e.key === 'C') {
                this.selectTool('connect');
            }
        });

        // File buttons
        document.getElementById('newFileBtn').addEventListener('click', () => this.newFile());
        document.getElementById('openFileBtn').addEventListener('click', () => this.openFile());
        document.getElementById('saveFileBtn').addEventListener('click', () => this.saveFile());
        document.getElementById('saveAsBtn').addEventListener('click', () => this.saveFileAs());
        document.getElementById('fileInputHidden').addEventListener('change', (e) => this.handleFileOpen(e));

        // Action buttons
        document.getElementById('validateBtn').addEventListener('click', () => this.validateVNet());
        document.getElementById('generateSeqBtn').addEventListener('click', () => this.generateSequences());
        document.getElementById('validateSeqBtn').addEventListener('click', () => this.validateSequence());
        document.getElementById('clearBtn').addEventListener('click', () => this.clearCanvas());
        document.getElementById('exportBtn').addEventListener('click', () => this.exportJson());
        document.getElementById('exportImageBtn').addEventListener('click', () => this.exportImage());

        // Zoom buttons
        document.getElementById('zoomInBtn').addEventListener('click', () => this.canvas.zoomIn());
        document.getElementById('zoomOutBtn').addEventListener('click', () => this.canvas.zoomOut());
        document.getElementById('resetZoomBtn').addEventListener('click', () => this.canvas.resetZoom());
        document.getElementById('fitWindowBtn').addEventListener('click', () => this.canvas.fitToWindow());

        // Undo/Redo buttons
        document.getElementById('undoBtn').addEventListener('click', () => {
            if (window.vnetEditor) window.vnetEditor.undo();
        });
        document.getElementById('redoBtn').addEventListener('click', () => {
            if (window.vnetEditor) window.vnetEditor.redo();
        });

        // Escuchar cambios en el historial de undo
        this.canvas.vnet.undoManager.onStateChange = () => this.updateUndoRedoButtons();

        // Update info when graph changes
        if (this.canvas.vnet) {
            this.canvas.vnet.onGraphChanged = () => this.updateInfo();
        }

        // Track current file name
        this.currentFileName = null;
        this.hasUnsavedChanges = false;

        // Track changes
        const originalOnGraphChanged = this.canvas.vnet.onGraphChanged;
        this.canvas.vnet.onGraphChanged = () => {
            this.hasUnsavedChanges = true;
            this.updateTitle();
            if (originalOnGraphChanged) originalOnGraphChanged();
            this.updateInfo();
        };
    }

    updateTitle() {
        const title = this.currentFileName 
            ? `V-net Tool - ${this.currentFileName}${this.hasUnsavedChanges ? ' *' : ''}`
            : `V-net Tool${this.hasUnsavedChanges ? ' *' : ''}`;
        document.title = title;
    }

    newFile() {
        if (this.hasUnsavedChanges) {
            if (!confirm('Hay cambios sin guardar. ¿Deseas continuar y perder los cambios?')) {
                return;
            }
        }
        this.canvas.vnet.clear();
        this.canvas.clear();
        this.currentFileName = null;
        this.hasUnsavedChanges = false;
        this.updateTitle();
        this.updateInfo();
        window.VNetDialogs.showAlert('Nuevo Archivo', 'Se ha creado un nuevo modelo V-Net vacío.', 'success');
    }

    openFile() {
        if (this.hasUnsavedChanges) {
            if (!confirm('Hay cambios sin guardar. ¿Deseas continuar y perder los cambios?')) {
                return;
            }
        }
        document.getElementById('fileInputHidden').click();
    }

    handleFileOpen(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const content = e.target.result;
                // Reemplazar Infinity en el JSON para que sea parseable
                const sanitizedContent = content.replace(/:\s*Infinity/g, ': null');
                const data = JSON.parse(sanitizedContent);
                
                // Detectar formato y cargar
                let newVNet;
                if (data.events && typeof data.events === 'object' && !Array.isArray(data.events)) {
                    // Formato .vnet del proyecto de escritorio (objeto)
                    newVNet = window.VNetModels.VNetGraph.fromVNetFormat(data);
                } else if (data.events && Array.isArray(data.events)) {
                    // Formato array (export JSON del editor web)
                    newVNet = window.VNetModels.VNetGraph.fromDict(data);
                } else {
                    throw new Error('Formato de archivo no reconocido');
                }

                // Limpiar canvas y cargar nuevo modelo
                this.canvas.vnet.clear();
                this.canvas.clear();
                this.canvas.loadFromVNet(newVNet);
                this.canvas.vnet = newVNet;
                
                this.currentFileName = file.name;
                this.hasUnsavedChanges = false;
                this.updateTitle();
                this.updateInfo();

                window.VNetDialogs.showAlert('Archivo Abierto', 
                    `Se cargó correctamente: ${file.name}`, 'success');
            } catch (error) {
                console.error('Error loading file:', error);
                window.VNetDialogs.showAlert('Error', 
                    `No se pudo cargar el archivo: ${error.message}`, 'error');
            }
        };
        reader.readAsText(file);
        
        // Reset input para permitir abrir el mismo archivo de nuevo
        event.target.value = '';
    }

    saveFile() {
        if (this.currentFileName) {
            this.downloadVNetFile(this.currentFileName);
        } else {
            this.saveFileAs();
        }
    }

    saveFileAs() {
        const defaultName = this.currentFileName || 'mi-vnet.vnet';
        const fileName = prompt('Nombre del archivo:', defaultName);
        if (fileName) {
            const finalName = fileName.endsWith('.vnet') ? fileName : fileName + '.vnet';
            this.downloadVNetFile(finalName);
            this.currentFileName = finalName;
            this.hasUnsavedChanges = false;
            this.updateTitle();
        }
    }

    downloadVNetFile(fileName) {
        const data = this.canvas.vnet.toVNetFormat();
        const json = JSON.stringify(data, null, 4);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.click();

        URL.revokeObjectURL(url);
        
        this.hasUnsavedChanges = false;
        this.updateTitle();
        window.VNetDialogs.showAlert('Guardado', 
            `Archivo guardado como: ${fileName}`, 'success');
    }

    selectTool(tool) {
        const toolBtns = this.container.querySelectorAll('.tool-btn');
        toolBtns.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tool === tool);
        });
        this.canvas.setTool(tool);
    }

    validateVNet() {
        const result = this.canvas.vnet.validate();
        if (result.valid) {
            let message = 'La V-Net es válida.';
            if (result.warnings && result.warnings.length > 0) {
                message += '\n\nAdvertencias:\n• ' + result.warnings.join('\n• ');
                window.VNetDialogs.showAlert('Validación Exitosa (con advertencias)', message, 'info');
            } else {
                window.VNetDialogs.showAlert('Validación Exitosa', message, 'success');
            }
        } else {
            let message = 'Errores:\n• ' + result.errors.join('\n• ');
            if (result.warnings && result.warnings.length > 0) {
                message += '\n\nAdvertencias:\n• ' + result.warnings.join('\n• ');
            }
            window.VNetDialogs.showAlert('Errores de Validación', message, 'error');
        }
    }

    generateSequences() {
        // Validar primero
        const validation = this.canvas.vnet.validate();
        if (!validation.valid) {
            window.VNetDialogs.showAlert('Error', 'El modelo tiene errores. Corríjalos antes de generar secuencias.', 'error');
            return;
        }

        // Abrir diálogo de generación
        if (window.SequenceGeneratorDialog) {
            window.SequenceGeneratorDialog.show(this.canvas.vnet);
        } else {
            window.VNetDialogs.showAlert('Error', 'El módulo de generación de secuencias no está disponible.', 'error');
        }
    }

    validateSequence() {
        // Abrir diálogo de validación de secuencia
        if (window.SequenceValidatorDialog) {
            window.SequenceValidatorDialog.show(this.canvas.vnet);
        } else {
            window.VNetDialogs.showAlert('Error', 'El módulo de validación de secuencias no está disponible.', 'error');
        }
    }

    clearCanvas() {
        if (confirm('¿Estás seguro de que deseas limpiar el canvas? Se perderán todos los cambios.')) {
            this.canvas.vnet.clear();
            this.canvas.clear();
            this.updateInfo();
        }
    }

    exportJson() {
        const data = this.canvas.vnet.toDict();
        const json = JSON.stringify(data, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = 'vnet-export.json';
        a.click();

        URL.revokeObjectURL(url);
    }

    exportImage() {
        if (window.ImageExporter) {
            window.ImageExporter.show(this.canvas);
        } else {
            window.VNetDialogs.showAlert('Error', 'El exportador de imagen no está disponible.', 'error');
        }
    }

    updateInfo() {
        const eventCount = Object.keys(this.canvas.vnet.events).length;
        const connectionCount = Object.keys(this.canvas.vnet.connections).length;

        document.getElementById('eventCount').textContent = eventCount;
        document.getElementById('connectionCount').textContent = connectionCount;
    }

    updateUndoRedoButtons() {
        const undoBtn = document.getElementById('undoBtn');
        const redoBtn = document.getElementById('redoBtn');

        if (undoBtn) {
            undoBtn.disabled = !this.canvas.vnet.canUndo();
        }
        if (redoBtn) {
            redoBtn.disabled = !this.canvas.vnet.canRedo();
        }
    }
}

// Export
window.VNetPalette = VNetPalette;
