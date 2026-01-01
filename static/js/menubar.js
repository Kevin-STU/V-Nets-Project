/**
 * V-Nets Web Editor - Barra de Menús
 * Menú profesional con dropdowns
 */

class VNetMenuBar {
    constructor(containerId, editor) {
        this.container = document.getElementById(containerId);
        this.editor = editor;
        this.activeMenu = null;
        this.init();
    }

    init() {
        this.render();
        this.setupEventListeners();
    }

    render() {
        this.container.innerHTML = `
            <div class="menubar">
                <div class="menu-item" data-menu="file">
                    <span class="menu-title">Archivo</span>
                    <div class="menu-dropdown" id="menu-file">
                        <div class="menu-option" data-action="new">
                            <span class="menu-icon">📄</span>
                            <span class="menu-label">Nuevo</span>
                            <span class="menu-shortcut">Ctrl+N</span>
                        </div>
                        <div class="menu-option" data-action="open">
                            <span class="menu-icon">📂</span>
                            <span class="menu-label">Abrir...</span>
                            <span class="menu-shortcut">Ctrl+O</span>
                        </div>
                        <div class="menu-separator"></div>
                        <div class="menu-option" data-action="save">
                            <span class="menu-icon">💾</span>
                            <span class="menu-label">Guardar</span>
                            <span class="menu-shortcut">Ctrl+S</span>
                        </div>
                        <div class="menu-option" data-action="saveAs">
                            <span class="menu-icon">📝</span>
                            <span class="menu-label">Guardar como...</span>
                            <span class="menu-shortcut">Ctrl+Shift+S</span>
                        </div>
                        <div class="menu-separator"></div>
                        <div class="menu-option" data-action="exportImage">
                            <span class="menu-icon">🖼️</span>
                            <span class="menu-label">Exportar imagen...</span>
                            <span class="menu-shortcut"></span>
                        </div>
                        <div class="menu-option" data-action="exportJson">
                            <span class="menu-icon">📋</span>
                            <span class="menu-label">Exportar JSON</span>
                            <span class="menu-shortcut"></span>
                        </div>
                    </div>
                </div>

                <div class="menu-item" data-menu="edit">
                    <span class="menu-title">Edición</span>
                    <div class="menu-dropdown" id="menu-edit">
                        <div class="menu-option" data-action="undo" id="menuUndo">
                            <span class="menu-icon">↩️</span>
                            <span class="menu-label">Deshacer</span>
                            <span class="menu-shortcut">Ctrl+Z</span>
                        </div>
                        <div class="menu-option" data-action="redo" id="menuRedo">
                            <span class="menu-icon">↪️</span>
                            <span class="menu-label">Rehacer</span>
                            <span class="menu-shortcut">Ctrl+Y</span>
                        </div>
                        <div class="menu-separator"></div>
                        <div class="menu-option" data-action="delete">
                            <span class="menu-icon">🗑️</span>
                            <span class="menu-label">Eliminar selección</span>
                            <span class="menu-shortcut">Delete</span>
                        </div>
                        <div class="menu-separator"></div>
                        <div class="menu-option" data-action="clear">
                            <span class="menu-icon">🧹</span>
                            <span class="menu-label">Limpiar canvas</span>
                            <span class="menu-shortcut"></span>
                        </div>
                    </div>
                </div>

                <div class="menu-item" data-menu="validation">
                    <span class="menu-title">Validación</span>
                    <div class="menu-dropdown" id="menu-validation">
                        <div class="menu-option" data-action="validate">
                            <span class="menu-icon">✅</span>
                            <span class="menu-label">Validar V-Net</span>
                            <span class="menu-shortcut">F5</span>
                        </div>
                        <div class="menu-separator"></div>
                        <div class="menu-option" data-action="generateSeq">
                            <span class="menu-icon">🔄</span>
                            <span class="menu-label">Generar secuencias...</span>
                            <span class="menu-shortcut"></span>
                        </div>
                        <div class="menu-option" data-action="validateSeq">
                            <span class="menu-icon">📋</span>
                            <span class="menu-label">Validar secuencia manual...</span>
                            <span class="menu-shortcut"></span>
                        </div>
                    </div>
                </div>

                <div class="menu-item" data-menu="view">
                    <span class="menu-title">Vista</span>
                    <div class="menu-dropdown" id="menu-view">
                        <div class="menu-option" data-action="zoomIn">
                            <span class="menu-icon">🔍</span>
                            <span class="menu-label">Acercar</span>
                            <span class="menu-shortcut">+</span>
                        </div>
                        <div class="menu-option" data-action="zoomOut">
                            <span class="menu-icon">🔍</span>
                            <span class="menu-label">Alejar</span>
                            <span class="menu-shortcut">-</span>
                        </div>
                        <div class="menu-option" data-action="resetZoom">
                            <span class="menu-icon">🔄</span>
                            <span class="menu-label">Restablecer zoom</span>
                            <span class="menu-shortcut">Ctrl+0</span>
                        </div>
                        <div class="menu-separator"></div>
                        <div class="menu-option" data-action="fitWindow">
                            <span class="menu-icon">📐</span>
                            <span class="menu-label">Ajustar a ventana</span>
                            <span class="menu-shortcut"></span>
                        </div>
                    </div>
                </div>

                <div class="menu-item" data-menu="help">
                    <span class="menu-title">Ayuda</span>
                    <div class="menu-dropdown" id="menu-help">
                        <div class="menu-option" data-action="shortcuts">
                            <span class="menu-icon">⌨️</span>
                            <span class="menu-label">Atajos de teclado</span>
                            <span class="menu-shortcut"></span>
                        </div>
                        <div class="menu-separator"></div>
                        <div class="menu-option" data-action="about">
                            <span class="menu-icon">ℹ️</span>
                            <span class="menu-label">Acerca de...</span>
                            <span class="menu-shortcut"></span>
                        </div>
                    </div>
                </div>

                <div class="menu-spacer"></div>

                <div class="menu-status">
                    <span id="menuFileName">Sin título</span>
                    <span id="menuModified" class="modified-indicator" style="display:none;">●</span>
                </div>
            </div>
        `;
    }

    setupEventListeners() {
        // Click en títulos de menú
        this.container.querySelectorAll('.menu-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleMenu(item.dataset.menu);
            });

            item.addEventListener('mouseenter', () => {
                if (this.activeMenu && this.activeMenu !== item.dataset.menu) {
                    this.toggleMenu(item.dataset.menu);
                }
            });
        });

        // Click en opciones de menú
        this.container.querySelectorAll('.menu-option').forEach(option => {
            option.addEventListener('click', (e) => {
                e.stopPropagation();
                if (!option.classList.contains('disabled')) {
                    this.executeAction(option.dataset.action);
                    this.closeAllMenus();
                }
            });
        });

        // Cerrar menús al hacer clic fuera
        document.addEventListener('click', () => {
            this.closeAllMenus();
        });

        // Tecla Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeAllMenus();
            }
            // F5 para validar
            if (e.key === 'F5') {
                e.preventDefault();
                this.executeAction('validate');
            }
        });
    }

    toggleMenu(menuName) {
        const dropdown = document.getElementById(`menu-${menuName}`);
        const wasOpen = dropdown.classList.contains('open');

        this.closeAllMenus();

        if (!wasOpen) {
            dropdown.classList.add('open');
            this.activeMenu = menuName;
            this.updateMenuStates();
        }
    }

    closeAllMenus() {
        this.container.querySelectorAll('.menu-dropdown').forEach(dropdown => {
            dropdown.classList.remove('open');
        });
        this.activeMenu = null;
    }

    updateMenuStates() {
        // Actualizar estado de Undo/Redo
        const menuUndo = document.getElementById('menuUndo');
        const menuRedo = document.getElementById('menuRedo');

        if (this.editor && this.editor.vnet) {
            if (menuUndo) {
                menuUndo.classList.toggle('disabled', !this.editor.vnet.canUndo());
            }
            if (menuRedo) {
                menuRedo.classList.toggle('disabled', !this.editor.vnet.canRedo());
            }
        }
    }

    executeAction(action) {
        if (!this.editor) return;

        switch (action) {
            case 'new':
                this.editor.newFile();
                break;
            case 'open':
                this.editor.openFile();
                break;
            case 'save':
                this.editor.saveFile();
                break;
            case 'saveAs':
                this.editor.saveFileAs();
                break;
            case 'exportImage':
                this.exportImage();
                break;
            case 'exportJson':
                if (this.editor.palette) this.editor.palette.exportJson();
                break;
            case 'undo':
                this.editor.undo();
                break;
            case 'redo':
                this.editor.redo();
                break;
            case 'delete':
                if (this.editor.canvas) this.editor.canvas.deleteSelected();
                break;
            case 'clear':
                if (this.editor.palette) this.editor.palette.clearCanvas();
                break;
            case 'validate':
                if (this.editor.palette) this.editor.palette.validateVNet();
                break;
            case 'generateSeq':
                if (this.editor.palette) this.editor.palette.generateSequences();
                break;
            case 'validateSeq':
                if (this.editor.palette) this.editor.palette.validateSequence();
                break;
            case 'zoomIn':
                if (this.editor.canvas) this.editor.canvas.zoomIn();
                break;
            case 'zoomOut':
                if (this.editor.canvas) this.editor.canvas.zoomOut();
                break;
            case 'resetZoom':
                if (this.editor.canvas) this.editor.canvas.resetZoom();
                break;
            case 'fitWindow':
                if (this.editor.canvas) this.editor.canvas.fitToWindow();
                break;
            case 'shortcuts':
                this.showShortcuts();
                break;
            case 'about':
                this.showAbout();
                break;
        }
    }

    exportImage() {
        if (window.ImageExporter) {
            window.ImageExporter.show(this.editor.canvas);
        } else {
            window.VNetDialogs.showAlert('Información', 'La exportación de imagen no está disponible.', 'info');
        }
    }

    showShortcuts() {
        const html = `
            <h4>Atajos de Teclado</h4>
            <table class="shortcuts-table">
                <tr><td><kbd>Ctrl+N</kbd></td><td>Nuevo archivo</td></tr>
                <tr><td><kbd>Ctrl+O</kbd></td><td>Abrir archivo</td></tr>
                <tr><td><kbd>Ctrl+S</kbd></td><td>Guardar</td></tr>
                <tr><td><kbd>Ctrl+Shift+S</kbd></td><td>Guardar como</td></tr>
                <tr><td><kbd>Ctrl+Z</kbd></td><td>Deshacer</td></tr>
                <tr><td><kbd>Ctrl+Y</kbd></td><td>Rehacer</td></tr>
                <tr><td><kbd>Delete</kbd></td><td>Eliminar selección</td></tr>
                <tr><td><kbd>V</kbd></td><td>Herramienta Seleccionar</td></tr>
                <tr><td><kbd>C</kbd></td><td>Herramienta Conectar</td></tr>
                <tr><td><kbd>Escape</kbd></td><td>Cancelar acción</td></tr>
                <tr><td><kbd>+</kbd> / <kbd>-</kbd></td><td>Zoom In/Out</td></tr>
                <tr><td><kbd>Ctrl+0</kbd></td><td>Restablecer zoom</td></tr>
                <tr><td><kbd>F5</kbd></td><td>Validar V-Net</td></tr>
                <tr><td><kbd>Rueda ratón</kbd></td><td>Zoom</td></tr>
                <tr><td><kbd>Shift+Arrastre</kbd></td><td>Pan/Mover canvas</td></tr>
            </table>
        `;
        window.VNetDialogs.showAlert('Atajos de Teclado', html, 'info');
    }

    showAbout() {
        const html = `
            <div style="text-align: center;">
                <h2 style="color: #3498db; margin-bottom: 15px;">V-Net Tool</h2>
                <p style="font-size: 14px; color: #666;">Editor Visual y Generador Automático de modelos V-net</p>
                <p style="font-size: 12px; color: #999; margin-top: 20px;">
                    Basado en el paper "The Power of V-nets"<br>
                    Implementación web del editor de escritorio
                </p>
                <hr style="margin: 20px 0; border-color: #eee;">
                <p style="font-size: 11px; color: #aaa;">
                    Tecnologías: Konva.js, Cytoscape.js, Flask<br>
                    © 2024 - Versión Web
                </p>
            </div>
        `;
        window.VNetDialogs.showAlert('', html, 'info');
    }

    updateFileName(fileName, isModified) {
        const nameEl = document.getElementById('menuFileName');
        const modEl = document.getElementById('menuModified');

        if (nameEl) {
            nameEl.textContent = fileName || 'Sin título';
        }
        if (modEl) {
            modEl.style.display = isModified ? 'inline' : 'none';
        }
    }
}

// Exportar
window.VNetMenuBar = VNetMenuBar;

