/**
 * V-Nets Web Editor - Dialogs Module
 * Modal dialogs for event properties, connection restrictions, and alerts
 */

const VNetDialogs = {
    // Currently open context menu
    currentContextMenu: null,
    
    // Track if a modal is currently open
    isModalOpen: false,

    init() {
        // Close context menu on click outside
        document.addEventListener('click', () => {
            this.closeContextMenu();
        });

        // Create modal container if not exists
        if (!document.getElementById('vnet-modal-container')) {
            const container = document.createElement('div');
            container.id = 'vnet-modal-container';
            document.body.appendChild(container);
        }
    },

    // Show event properties dialog
    showEventDialog(event, onSave) {
        const html = `
            <div class="modal-overlay" id="eventModal">
                <div class="modal-dialog">
                    <div class="modal-header">
                        <h3>Propiedades del Evento</h3>
                        <button class="modal-close" onclick="VNetDialogs.closeModal('eventModal')">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div class="form-group">
                            <label for="eventName">Nombre del evento:</label>
                            <input type="text" id="eventName" value="${event.name}" class="form-control">
                        </div>
                        <div class="form-group">
                            <label for="eventFrequency">Frecuencia:</label>
                            <input type="number" id="eventFrequency" value="${event.frequency}" min="1" class="form-control">
                        </div>
                        <div class="form-group">
                            <label>Tipo de evento:</label>
                            <div class="event-type-badge ${event.eventType}">
                                ${this.getEventTypeName(event.eventType)}
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" onclick="VNetDialogs.closeModal('eventModal')">Cancelar</button>
                        <button class="btn btn-primary" onclick="VNetDialogs.saveEventDialog('${event.id}')">Guardar</button>
                    </div>
                </div>
            </div>
        `;

        document.getElementById('vnet-modal-container').innerHTML = html;

        // Store callback
        this._eventSaveCallback = onSave;
        this._currentEvent = event;

        // 🔐 Marcar modal como abierto para prevenir eliminación accidental
        this.isModalOpen = true;

        // Focus on name input
        setTimeout(() => document.getElementById('eventName').focus(), 100);
    },

    saveEventDialog(eventId) {
        const name = document.getElementById('eventName').value.trim();
        const frequency = parseInt(document.getElementById('eventFrequency').value) || 1;

        if (!name) {
            this.showAlert('Error', 'El nombre del evento no puede estar vacío.', 'error');
            return;
        }

        if (this._currentEvent) {
            // Aplicar los cambios
            this._currentEvent.name = name;
            this._currentEvent.frequency = Math.max(1, frequency);
            
            // NO guardar undo state - estaba causando problemas
            console.log('Evento modificado:', this._currentEvent.name);
        }

        this.closeModal('eventModal');
        
        // Desseleccionar el evento después de cerrar el modal
        if (window.vnetEditor && window.vnetEditor.canvas) {
            window.vnetEditor.canvas.deselectAll();
        }

        if (this._eventSaveCallback) {
            this._eventSaveCallback();
        }
    },

    // Show connection restrictions dialog
    showConnectionDialog(connection, onSave) {
        const maxTimeValue = connection.maxTime === Infinity ? '' : connection.maxTime;
        const maxTimeChecked = connection.maxTime !== Infinity;
        const inverseMaxTimeValue = connection.inverseMaxTime === Infinity ? '' : connection.inverseMaxTime;
        const inverseMaxTimeChecked = connection.inverseMaxTime !== Infinity;

        const html = `
            <div class="modal-overlay" id="connectionModal">
                <div class="modal-dialog modal-lg">
                    <div class="modal-header">
                        <h3>Restricciones Temporales</h3>
                        <button class="modal-close" onclick="VNetDialogs.closeModal('connectionModal')">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div class="connection-info">
                            <span class="event-badge source">${connection.source.name}</span>
                            <span class="arrow">⇄</span>
                            <span class="event-badge target">${connection.target.name}</span>
                        </div>
                        
                        <!-- Pestañas -->
                        <div class="restriction-tabs">
                            <button class="restriction-tab active" onclick="VNetDialogs.switchRestrictionTab('direct')">
                                Directa (${connection.source.name} → ${connection.target.name})
                            </button>
                            <button class="restriction-tab" onclick="VNetDialogs.switchRestrictionTab('inverse')">
                                Inversa (${connection.target.name} → ${connection.source.name})
                            </button>
                        </div>

                        <!-- Panel Restricción Directa -->
                        <div id="directPanel" class="restriction-panel active">
                            <div class="restriction-section">
                                <h4>Restricción Directa: ${connection.source.name} → ${connection.target.name}</h4>
                                <p class="restriction-desc">Define el tiempo que debe transcurrir desde el evento origen hasta el destino.</p>
                                <div class="form-row">
                                    <div class="form-group">
                                        <label for="minTime">Tiempo mínimo:</label>
                                        <input type="number" id="minTime" value="${connection.minTime}" 
                                               min="0" step="0.1" class="form-control">
                                    </div>
                                    <div class="form-group">
                                        <label for="maxTime">Tiempo máximo:</label>
                                        <div class="input-with-checkbox">
                                            <input type="number" id="maxTime" value="${maxTimeValue}" 
                                                   min="0" step="0.1" class="form-control" 
                                                   ${!maxTimeChecked ? 'disabled' : ''}>
                                            <label class="checkbox-label">
                                                <input type="checkbox" id="hasMaxTime" ${maxTimeChecked ? 'checked' : ''}
                                                       onchange="VNetDialogs.toggleMaxTime()">
                                                Limitar
                                            </label>
                                        </div>
                                    </div>
                                </div>
                                <div class="form-row">
                                    <div class="form-group">
                                        <label for="sourceFreq">Frecuencia origen (ocurrencias de ${connection.source.name}):</label>
                                        <input type="number" id="sourceFreq" value="${connection.sourceFrequency}" 
                                               min="1" class="form-control">
                                    </div>
                                    <div class="form-group">
                                        <label for="targetFreq">Frecuencia destino (ocurrencias de ${connection.target.name}):</label>
                                        <input type="number" id="targetFreq" value="${connection.targetFrequency}" 
                                               min="1" class="form-control">
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Panel Restricción Inversa -->
                        <div id="inversePanel" class="restriction-panel">
                            <div class="restriction-section">
                                <h4>Restricción Inversa: ${connection.target.name} → ${connection.source.name}</h4>
                                <p class="restriction-desc">Define restricciones temporales para la dirección opuesta (bidireccional).</p>
                                
                                <div class="form-group">
                                    <label class="checkbox-label-block">
                                        <input type="checkbox" id="hasInverse" ${connection.hasInverse ? 'checked' : ''}
                                               onchange="VNetDialogs.toggleInverseFields()">
                                        <span>Habilitar restricción inversa</span>
                                    </label>
                                    <p class="help-text">Cuando está habilitada, se valida la restricción temporal en ambas direcciones.</p>
                                </div>

                                <div id="inverseFields" class="${connection.hasInverse ? '' : 'disabled-section'}">
                                    <div class="form-row">
                                        <div class="form-group">
                                            <label for="inverseMinTime">Tiempo mínimo inverso:</label>
                                            <input type="number" id="inverseMinTime" value="${connection.inverseMinTime}" 
                                                   min="0" step="0.1" class="form-control"
                                                   ${!connection.hasInverse ? 'disabled' : ''}>
                                        </div>
                                        <div class="form-group">
                                            <label for="inverseMaxTime">Tiempo máximo inverso:</label>
                                            <div class="input-with-checkbox">
                                                <input type="number" id="inverseMaxTime" value="${inverseMaxTimeValue}" 
                                                       min="0" step="0.1" class="form-control" 
                                                       ${!connection.hasInverse || !inverseMaxTimeChecked ? 'disabled' : ''}>
                                                <label class="checkbox-label">
                                                    <input type="checkbox" id="hasInverseMaxTime" 
                                                           ${inverseMaxTimeChecked ? 'checked' : ''}
                                                           ${!connection.hasInverse ? 'disabled' : ''}
                                                           onchange="VNetDialogs.toggleInverseMaxTime()">
                                                    Limitar
                                                </label>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div class="info-box">
                                    <strong>Ejemplo de uso:</strong><br>
                                    Si A→B tiene restricción [1,5] y B→A tiene restricción inversa [2,4],<br>
                                    significa que la respuesta debe llegar entre 1-5 unidades después del envío,
                                    y si hay retroceso temporal, debe estar entre 2-4 unidades.
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" onclick="VNetDialogs.closeModal('connectionModal')">Cancelar</button>
                        <button class="btn btn-primary" onclick="VNetDialogs.saveConnectionDialog()">Guardar</button>
                    </div>
                </div>
            </div>
        `;

        document.getElementById('vnet-modal-container').innerHTML = html;

        this._connectionSaveCallback = onSave;
        this._currentConnection = connection;
        
        // 🔐 Marcar modal como abierto para prevenir eliminación accidental
        this.isModalOpen = true;
    },

    switchRestrictionTab(tab) {
        // Actualizar botones de pestañas
        document.querySelectorAll('.restriction-tab').forEach(btn => {
            btn.classList.remove('active');
        });
        event.target.classList.add('active');

        // Mostrar panel correspondiente
        document.querySelectorAll('.restriction-panel').forEach(panel => {
            panel.classList.remove('active');
        });

        if (tab === 'direct') {
            document.getElementById('directPanel').classList.add('active');
        } else {
            document.getElementById('inversePanel').classList.add('active');
        }
    },

    toggleInverseFields() {
        const hasInverse = document.getElementById('hasInverse').checked;
        const inverseFields = document.getElementById('inverseFields');
        const inverseMinTime = document.getElementById('inverseMinTime');
        const inverseMaxTime = document.getElementById('inverseMaxTime');
        const hasInverseMaxTime = document.getElementById('hasInverseMaxTime');

        if (hasInverse) {
            inverseFields.classList.remove('disabled-section');
            inverseMinTime.disabled = false;
            hasInverseMaxTime.disabled = false;
            if (hasInverseMaxTime.checked) {
                inverseMaxTime.disabled = false;
            }
        } else {
            inverseFields.classList.add('disabled-section');
            inverseMinTime.disabled = true;
            inverseMaxTime.disabled = true;
            hasInverseMaxTime.disabled = true;
        }
    },

    toggleInverseMaxTime() {
        const checkbox = document.getElementById('hasInverseMaxTime');
        const input = document.getElementById('inverseMaxTime');
        input.disabled = !checkbox.checked;
        if (!checkbox.checked) {
            input.value = '';
        }
    },

    toggleMaxTime() {
        const checkbox = document.getElementById('hasMaxTime');
        const input = document.getElementById('maxTime');
        input.disabled = !checkbox.checked;
        if (!checkbox.checked) {
            input.value = '';
        }
    },

    saveConnectionDialog() {
        console.log('🟡 Guardando conexión - Inicio');
        
        // Restricción directa
        const minTimeInput = document.getElementById('minTime').value;
        const minTime = minTimeInput !== '' ? parseFloat(minTimeInput) : 0;
        const hasMaxTime = document.getElementById('hasMaxTime').checked;
        const maxTimeInput = document.getElementById('maxTime').value;
        const maxTime = hasMaxTime ? (maxTimeInput !== '' ? parseFloat(maxTimeInput) : Infinity) : Infinity;
        const sourceFreq = parseInt(document.getElementById('sourceFreq').value) || 1;
        const targetFreq = parseInt(document.getElementById('targetFreq').value) || 1;

        // Restricción inversa
        const hasInverse = document.getElementById('hasInverse').checked;
        const inverseMinTimeInput = document.getElementById('inverseMinTime').value;
        const inverseMinTime = inverseMinTimeInput !== '' ? parseFloat(inverseMinTimeInput) : 0;
        const hasInverseMaxTime = document.getElementById('hasInverseMaxTime').checked;
        const inverseMaxTimeInput = document.getElementById('inverseMaxTime').value;
        const inverseMaxTime = hasInverseMaxTime ? (inverseMaxTimeInput !== '' ? parseFloat(inverseMaxTimeInput) : Infinity) : Infinity;

        console.log('🟡 Valores parseados:', {
            minTime, maxTime, hasMaxTime, sourceFreq, targetFreq,
            hasInverse, inverseMinTime, inverseMaxTime
        });

        // Validaciones
        if (hasMaxTime && minTime > maxTime) {
            this.showAlert('Error', 'El tiempo mínimo no puede ser mayor que el tiempo máximo.', 'error');
            return;
        }

        if (hasInverse && hasInverseMaxTime && inverseMinTime > inverseMaxTime) {
            this.showAlert('Error', 'El tiempo mínimo inverso no puede ser mayor que el tiempo máximo inverso.', 'error');
            return;
        }

        if (this._currentConnection) {
            console.log('🟡 Conexión encontrada, aplicando cambios...');
            // Aplicar los cambios
            this._currentConnection.minTime = Math.max(0, minTime);
            this._currentConnection.maxTime = maxTime;
            this._currentConnection.sourceFrequency = Math.max(1, sourceFreq);
            this._currentConnection.targetFrequency = Math.max(1, targetFreq);

            // Guardar restricción inversa
            this._currentConnection.hasInverse = hasInverse;
            this._currentConnection.inverseMinTime = Math.max(0, inverseMinTime);
            this._currentConnection.inverseMaxTime = inverseMaxTime;
            
            console.log('🟡 Cambios aplicados a:', this._currentConnection);
            console.log('🟡 Conexión modificada:', this._currentConnection.source.name, '→', this._currentConnection.target.name);
        } else {
            console.error('❌ ERROR: No hay conexión actual (_currentConnection es null)');
        }

        // ✅ ARREGLO CRÍTICO: Ejecutar callback ANTES de cerrar el modal
        console.log('🟡 Ejecutando callback (ANTES de cerrar modal)...');
        if (this._connectionSaveCallback) {
            console.log('🟡 Callback encontrado');
            this._connectionSaveCallback();
            console.log('✅ Callback ejecutado');
        } else {
            console.error('❌ ERROR: Callback no existe');
        }

        // Ahora sí cerrar el modal DESPUÉS del callback
        console.log('🟡 Cerrando modal...');
        this.closeModal('connectionModal');
    },

    // Show context menu
    showContextMenu(event, items) {
        this.closeContextMenu();

        const menu = document.createElement('div');
        menu.className = 'context-menu';
        menu.style.left = `${event.clientX}px`;
        menu.style.top = `${event.clientY}px`;

        items.forEach(item => {
            const menuItem = document.createElement('div');
            menuItem.className = 'context-menu-item';
            menuItem.textContent = item.label;
            menuItem.addEventListener('click', (e) => {
                e.stopPropagation();
                this.closeContextMenu();
                item.action();
            });
            menu.appendChild(menuItem);
        });

        document.body.appendChild(menu);
        this.currentContextMenu = menu;

        // Prevent menu from going off screen
        const rect = menu.getBoundingClientRect();
        if (rect.right > window.innerWidth) {
            menu.style.left = `${window.innerWidth - rect.width - 10}px`;
        }
        if (rect.bottom > window.innerHeight) {
            menu.style.top = `${window.innerHeight - rect.height - 10}px`;
        }
    },

    closeContextMenu() {
        if (this.currentContextMenu) {
            this.currentContextMenu.remove();
            this.currentContextMenu = null;
        }
    },

    // Show alert dialog
    showAlert(title, message, type = 'info') {
        const iconSvg = type === 'success'
            ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17L4 12"/></svg>'
            : type === 'error'
                ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>'
                : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>';

        const html = `
            <div class="modal-overlay" id="alertModal">
                <div class="modal-dialog modal-sm">
                    <div class="modal-body alert-body ${type}">
                        <div class="alert-icon">${iconSvg}</div>
                        <h4>${title}</h4>
                        <p>${message.replace(/\n/g, '<br>')}</p>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-primary" onclick="VNetDialogs.closeModal('alertModal')">Aceptar</button>
                    </div>
                </div>
            </div>
        `;

        document.getElementById('vnet-modal-container').innerHTML = html;
    },

    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.remove();
        }
        
        // 🔐 Marcar modal como cerrado
        this.isModalOpen = false;
        
        // ✅ ARREGLO: Solo desseleccionar para eventModal, NO para connectionModal
        // El connectionModal no necesita desseleccionar porque solo se editan restricciones
        if (modalId === 'eventModal' && 
            window.vnetEditor && window.vnetEditor.canvas) {
            window.vnetEditor.canvas.deselectAll();
        }
    },

    getEventTypeName(type) {
        switch (type) {
            case 'init': return 'Evento Inicial';
            case 'end': return 'Evento Final';
            case 'intermediate': return 'Evento Intermedio';
            default: return type;
        }
    }
};

// Initialize on load
document.addEventListener('DOMContentLoaded', () => VNetDialogs.init());

// Export
window.VNetDialogs = VNetDialogs;
