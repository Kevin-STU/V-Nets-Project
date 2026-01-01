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
                            <span class="menu-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14,2 14,8 20,8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10,9 9,9 8,9"/></svg></span>
                            <span class="menu-label">Nuevo</span>
                            <span class="menu-shortcut">Ctrl+N</span>
                        </div>
                        <div class="menu-option" data-action="open">
                            <span class="menu-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg></span>
                            <span class="menu-label">Abrir...</span>
                            <span class="menu-shortcut">Ctrl+O</span>
                        </div>
                        <div class="menu-separator"></div>
                        <div class="menu-option" data-action="save">
                            <span class="menu-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><polyline points="17,21 17,13 7,13 7,21"/><polyline points="7,3 7,8 15,8"/></svg></span>
                            <span class="menu-label">Guardar</span>
                            <span class="menu-shortcut">Ctrl+S</span>
                        </div>
                        <div class="menu-option" data-action="saveAs">
                            <span class="menu-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 3a2.828 2.828 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg></span>
                            <span class="menu-label">Guardar como...</span>
                            <span class="menu-shortcut">Ctrl+Shift+S</span>
                        </div>
                        <div class="menu-separator"></div>
                        <div class="menu-option" data-action="exportImage">
                            <span class="menu-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 00-2.828 0L6 21"/></svg></span>
                            <span class="menu-label">Exportar imagen...</span>
                            <span class="menu-shortcut"></span>
                        </div>
                        <div class="menu-option" data-action="exportJson">
                            <span class="menu-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14,2 14,8 20,8"/><path d="M16 13H8"/><path d="M16 17H8"/><path d="M10 9H8"/></svg></span>
                            <span class="menu-label">Exportar JSON</span>
                            <span class="menu-shortcut"></span>
                        </div>
                    </div>
                </div>

                <div class="menu-item" data-menu="edit">
                    <span class="menu-title">Edición</span>
                    <div class="menu-dropdown" id="menu-edit">
                        <div class="menu-option" data-action="undo" id="menuUndo">
                            <span class="menu-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 7v6h6"/><path d="M21 17a9 9 0 00-9-9 9 9 0 00-6 2.3L3 13"/></svg></span>
                            <span class="menu-label">Deshacer</span>
                            <span class="menu-shortcut">Ctrl+Z</span>
                        </div>
                        <div class="menu-option" data-action="redo" id="menuRedo">
                            <span class="menu-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 7v6h-6"/><path d="M3 17a9 9 0 019-9 9 9 0 016 2.3l3 2.7"/></svg></span>
                            <span class="menu-label">Rehacer</span>
                            <span class="menu-shortcut">Ctrl+Y</span>
                        </div>
                        <div class="menu-separator"></div>
                        <div class="menu-option" data-action="delete">
                            <span class="menu-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg></span>
                            <span class="menu-label">Eliminar selección</span>
                            <span class="menu-shortcut">Delete</span>
                        </div>
                        <div class="menu-separator"></div>
                        <div class="menu-option" data-action="clear">
                            <span class="menu-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1.586a1 1 0 01.707.293l.707.707A1 1 0 0012.414 11H15m2 0h1.586a1 1 0 01.707.293l.707.707A1 1 0 0021 12.414V15m0 2h-1.586a1 1 0 01-.707-.293l-.707-.707A1 1 0 0117.586 16H15m-2 0H9"/><path d="M4.018 4.018a11.963 11.963 0 010 16.964 11.963 11.963 0 0116.964 0"/></svg></span>
                            <span class="menu-label">Limpiar canvas</span>
                            <span class="menu-shortcut"></span>
                        </div>
                    </div>
                </div>

                <div class="menu-item" data-menu="validation">
                    <span class="menu-title">Validación</span>
                    <div class="menu-dropdown" id="menu-validation">
                        <div class="menu-option" data-action="validate">
                            <span class="menu-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22,4 12,14.01 9,11.01"/></svg></span>
                            <span class="menu-label">Validar V-Net</span>
                            <span class="menu-shortcut">F5</span>
                        </div>
                        <div class="menu-separator"></div>
                        <div class="menu-option" data-action="generateSeq">
                            <span class="menu-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 4v6h-6M1 20v-6h6"/><path d="M20.49 9A9 9 0 105.64 5.64L23 10M14 10l-4.5 4.5"/></svg></span>
                            <span class="menu-label">Generar secuencias...</span>
                            <span class="menu-shortcut"></span>
                        </div>
                        <div class="menu-option" data-action="validateSeq">
                            <span class="menu-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14,2 14,8 20,8"/><path d="M16 13H8"/><path d="M16 17H8"/><path d="M10 9H8"/></svg></span>
                            <span class="menu-label">Validar secuencia manual...</span>
                            <span class="menu-shortcut"></span>
                        </div>
                    </div>
                </div>

                <div class="menu-item" data-menu="view">
                    <span class="menu-title">Vista</span>
                    <div class="menu-dropdown" id="menu-view">
                        <div class="menu-option" data-action="zoomIn">
                            <span class="menu-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg></span>
                            <span class="menu-label">Acercar</span>
                            <span class="menu-shortcut">+</span>
                        </div>
                        <div class="menu-option" data-action="zoomOut">
                            <span class="menu-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="8" y1="11" x2="14" y2="11"/></svg></span>
                            <span class="menu-label">Alejar</span>
                            <span class="menu-shortcut">-</span>
                        </div>
                        <div class="menu-option" data-action="resetZoom">
                            <span class="menu-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12a9 9 0 0115-6.7L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 01-15 6.7L3 16"/><path d="M3 21v-5h5"/></svg></span>
                            <span class="menu-label">Restablecer zoom</span>
                            <span class="menu-shortcut">Ctrl+0</span>
                        </div>
                        <div class="menu-separator"></div>
                        <div class="menu-option" data-action="fitWindow">
                            <span class="menu-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><path d="M9 9l6 6M15 9l-6 6"/></svg></span>
                            <span class="menu-label">Ajustar a ventana</span>
                            <span class="menu-shortcut"></span>
                        </div>
                    </div>
                </div>

                <div class="menu-item" data-menu="help">
                    <span class="menu-title">Ayuda</span>
                    <div class="menu-dropdown" id="menu-help">
                        <div class="menu-option" data-action="shortcuts">
                            <span class="menu-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg></span>
                            <span class="menu-label">Atajos de teclado</span>
                            <span class="menu-shortcut"></span>
                        </div>
                        <div class="menu-separator"></div>
                        <div class="menu-option" data-action="about">
                            <span class="menu-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg></span>
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

