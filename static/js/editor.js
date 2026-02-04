/**
 * V-Nets Web Editor - Main Editor Module
 * Initializes and coordinates all components
 */

class VNetsEditor {
    constructor(options = {}) {
        this.options = {
            canvasId: 'vnet-canvas',
            paletteId: 'vnet-palette',
            ...options
        };

        this.vnet = new window.VNetModels.VNetGraph();
        this.canvas = null;
        this.palette = null;

        this.init();
    }

    init() {
        // Wait for DOM
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setup());
        } else {
            this.setup();
        }
    }

    setup() {
        // Initialize canvas
        this.canvas = new window.VNetCanvas(this.options.canvasId, this.vnet);

        // Initialize palette
        this.palette = new window.VNetPalette(this.options.paletteId, this.canvas);

        // Setup drag-drop from palette to canvas
        this.setupDragDrop();

        // Setup keyboard shortcuts
        this.setupKeyboardShortcuts();

        // Setup graph change listener
        this.vnet.onGraphChanged = () => {
            this.palette.updateInfo();
        };

        // Setup validation error listener
        this.vnet.onValidationError = (message) => {
            window.VNetDialogs.showAlert('Error de Validación', message, 'error');
        };

        console.log('V-Nets Editor initialized');
    }

    setupDragDrop() {
        const canvasContainer = document.getElementById(this.options.canvasId);

        canvasContainer.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
        });

        canvasContainer.addEventListener('drop', (e) => {
            e.preventDefault();
            const eventType = e.dataTransfer.getData('text/plain');

            if (['init', 'end', 'intermediate'].includes(eventType)) {
                // Get position relative to canvas
                const rect = canvasContainer.getBoundingClientRect();
                const x = e.clientX - rect.left - 40; // Center the event
                const y = e.clientY - rect.top - 30;

                this.canvas.addEvent(eventType, Math.max(0, x), Math.max(0, y));
                this.palette.updateInfo();
            }
        });
    }

    // Load V-Net from JSON
    loadFromJson(json) {
        try {
            const data = typeof json === 'string' ? JSON.parse(json) : json;
            this.vnet = window.VNetModels.VNetGraph.fromDict(data);
            this.canvas.loadFromVNet(this.vnet);
            this.palette.updateInfo();
            return true;
        } catch (error) {
            console.error('Error loading V-Net:', error);
            window.VNetDialogs.showAlert('Error', 'No se pudo cargar el archivo JSON.', 'error');
            return false;
        }
    }

    // Export V-Net as JSON
    exportToJson() {
        return JSON.stringify(this.vnet.toDict(), null, 2);
    }

    // Validate current V-Net
    validate() {
        return this.vnet.validate();
    }

    // Clear canvas
    clear() {
        this.vnet.clear();
        this.canvas.clear();
        this.palette.updateInfo();
    }

    // Nuevo archivo
    newFile() {
        this.palette.newFile();
    }

    // Abrir archivo
    openFile() {
        this.palette.openFile();
    }

    // Guardar archivo
    saveFile() {
        this.palette.saveFile();
    }

    // Guardar como
    saveFileAs() {
        this.palette.saveFileAs();
    }

    // Setup keyboard shortcuts
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ignorar si estamos en un input/textarea
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

            // Ctrl+N: Nuevo
            if (e.ctrlKey && e.key === 'n') {
                e.preventDefault();
                this.newFile();
            }
            // Ctrl+O: Abrir
            if (e.ctrlKey && e.key === 'o') {
                e.preventDefault();
                this.openFile();
            }
            // Ctrl+S: Guardar
            if (e.ctrlKey && e.key === 's') {
                e.preventDefault();
                if (e.shiftKey) {
                    this.saveFileAs();
                } else {
                    this.saveFile();
                }
            }
            // Ctrl+Z: Deshacer
            if (e.ctrlKey && e.key === 'z' && !e.shiftKey) {
                e.preventDefault();
                this.undo();
            }
            // Ctrl+Y o Ctrl+Shift+Z: Rehacer
            if ((e.ctrlKey && e.key === 'y') || (e.ctrlKey && e.shiftKey && e.key === 'Z')) {
                e.preventDefault();
                this.redo();
            }
            // +/-: Zoom
            if (e.key === '+' || e.key === '=') {
                e.preventDefault();
                this.canvas.zoomIn();
            }
            if (e.key === '-' || e.key === '_') {
                e.preventDefault();
                this.canvas.zoomOut();
            }
            // 0: Reset zoom
            if (e.key === '0' && e.ctrlKey) {
                e.preventDefault();
                this.canvas.resetZoom();
            }
        });
    }

    // Deshacer
    undo() {
        if (this.vnet.undo()) {
            // Re-renderizar el canvas
            this.canvas.loadFromVNet(this.vnet);
            this.palette.updateInfo();
            this.palette.updateUndoRedoButtons();
        }
    }

    // Rehacer
    redo() {
        if (this.vnet.redo()) {
            // Re-renderizar el canvas
            this.canvas.loadFromVNet(this.vnet);
            this.palette.updateInfo();
            this.palette.updateUndoRedoButtons();
        }
    }
}

// Export
window.VNetsEditor = VNetsEditor;
