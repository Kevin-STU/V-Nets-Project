/**
 * V-Nets Web Editor - Exportador de Imagen
 * Exporta el canvas a PNG o SVG
 */

const ImageExporter = {
    show(canvas) {
        const html = `
            <div class="modal-overlay" id="imageExportModal">
                <div class="modal-dialog">
                    <div class="modal-header">
                        <h3>Exportar Imagen</h3>
                        <button class="modal-close" onclick="VNetDialogs.closeModal('imageExportModal')">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div class="form-group">
                            <label for="exportFormat">Formato:</label>
                            <select id="exportFormat" class="form-control" onchange="ImageExporter.updatePreview()">
                                <option value="png">PNG (Imagen raster)</option>
                                <option value="jpeg">JPEG (Imagen comprimida)</option>
                            </select>
                        </div>

                        <div class="form-group">
                            <label for="exportScale">Escala:</label>
                            <select id="exportScale" class="form-control" onchange="ImageExporter.updatePreview()">
                                <option value="1">1x (${canvas.stage.width()}x${canvas.stage.height()})</option>
                                <option value="2" selected>2x (${canvas.stage.width() * 2}x${canvas.stage.height() * 2})</option>
                                <option value="3">3x (${canvas.stage.width() * 3}x${canvas.stage.height() * 3})</option>
                                <option value="4">4x (${canvas.stage.width() * 4}x${canvas.stage.height() * 4})</option>
                            </select>
                        </div>

                        <div class="form-group">
                            <label for="exportBg">Fondo:</label>
                            <select id="exportBg" class="form-control" onchange="ImageExporter.updatePreview()">
                                <option value="white">Blanco</option>
                                <option value="transparent">Transparente (solo PNG)</option>
                                <option value="grid">Con cuadrícula</option>
                            </select>
                        </div>

                        <div class="form-group">
                            <label for="exportFilename">Nombre del archivo:</label>
                            <input type="text" id="exportFilename" class="form-control" value="mi-vnet">
                        </div>

                        <div class="export-preview">
                            <h5>Vista previa:</h5>
                            <div id="exportPreviewContainer" class="preview-container">
                                <img id="exportPreviewImg" src="" alt="Preview">
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" onclick="VNetDialogs.closeModal('imageExportModal')">Cancelar</button>
                        <button class="btn btn-primary" onclick="ImageExporter.exportImage()">Exportar</button>
                    </div>
                </div>
            </div>
        `;

        document.getElementById('vnet-modal-container').innerHTML = html;
        this._canvas = canvas;
        this.updatePreview();
    },

    updatePreview() {
        if (!this._canvas) return;

        const format = document.getElementById('exportFormat').value;
        const scale = parseInt(document.getElementById('exportScale').value);
        const bg = document.getElementById('exportBg').value;

        // Generar preview
        const dataUrl = this.generateImage(format, scale > 2 ? 1 : scale, bg);
        document.getElementById('exportPreviewImg').src = dataUrl;
    },

    generateImage(format, scale, bgType) {
        if (!this._canvas) return '';

        const stage = this._canvas.stage;
        const originalScale = { x: stage.scaleX(), y: stage.scaleY() };
        const originalPos = stage.position();

        // Resetear escala y posición para captura completa
        stage.scale({ x: 1, y: 1 });
        stage.position({ x: 0, y: 0 });

        // Configurar fondo
        let bgColor;
        if (bgType === 'transparent' && format === 'png') {
            bgColor = 'transparent';
        } else if (bgType === 'grid') {
            bgColor = '#f5f7fa';
        } else {
            bgColor = 'white';
        }

        // Generar imagen
        const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png';
        const dataUrl = stage.toDataURL({
            mimeType: mimeType,
            quality: 0.95,
            pixelRatio: scale,
            backgroundColor: bgColor === 'transparent' ? undefined : bgColor
        });

        // Restaurar escala y posición
        stage.scale(originalScale);
        stage.position(originalPos);
        stage.batchDraw();

        return dataUrl;
    },

    exportImage() {
        const format = document.getElementById('exportFormat').value;
        const scale = parseInt(document.getElementById('exportScale').value);
        const bg = document.getElementById('exportBg').value;
        const filename = document.getElementById('exportFilename').value.trim() || 'mi-vnet';

        const dataUrl = this.generateImage(format, scale, bg);
        
        // Crear link de descarga
        const link = document.createElement('a');
        link.download = `${filename}.${format}`;
        link.href = dataUrl;
        link.click();

        VNetDialogs.closeModal('imageExportModal');
        VNetDialogs.showAlert('Éxito', `Imagen exportada como: ${filename}.${format}`, 'success');
    },

    // Exportar rápido sin diálogo
    quickExport(canvas, format = 'png', filename = 'vnet-export') {
        this._canvas = canvas;
        const dataUrl = this.generateImage(format, 2, 'white');
        
        const link = document.createElement('a');
        link.download = `${filename}.${format}`;
        link.href = dataUrl;
        link.click();
    }
};

// Exportar
window.ImageExporter = ImageExporter;

