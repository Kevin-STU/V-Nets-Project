/**
 * V-Nets Web Editor - Validador de Secuencias
 * Valida secuencias manuales contra el modelo V-Net
 */

const SequenceValidator = {
    // Parsear secuencia desde texto
    parseSequence(text, eventNames) {
        const normalized = text.trim();
        const events = [];
        
        // Formato 1: EventName(time), EventName(time), ...
        // Formato 2: EventName, EventName, ...
        // Formato 3: EventName | time (por línea)

        // Detectar formato
        if (normalized.includes('|')) {
            // Formato tabla
            const lines = normalized.split('\n').filter(l => l.trim());
            for (const line of lines) {
                const parts = line.split('|').map(p => p.trim());
                if (parts.length >= 1) {
                    const name = parts[0];
                    const time = parts.length > 1 ? parseFloat(parts[1]) : null;
                    if (name) {
                        events.push({ name, time });
                    }
                }
            }
        } else if (normalized.includes('(') && normalized.includes(')')) {
            // Formato con timestamps
            const regex = /([a-zA-Z0-9_]+)\s*\(\s*([0-9.]+)\s*\)/g;
            let match;
            while ((match = regex.exec(normalized)) !== null) {
                events.push({
                    name: match[1],
                    time: parseFloat(match[2])
                });
            }
        } else {
            // Formato solo nombres
            const separators = /[,\-\>→]+/;
            const names = normalized.split(separators)
                .map(n => n.trim())
                .filter(n => n && /^[a-zA-Z0-9_]+$/.test(n));
            
            names.forEach(name => {
                events.push({ name, time: null });
            });
        }

        return events;
    },

    // Asignar tiempos automáticamente si no están especificados
    assignAutoTimes(events, vnet) {
        if (events.length === 0) return events;

        // Si ya tienen tiempos, solo verificar orden
        const allHaveTimes = events.every(e => e.time !== null);
        if (allHaveTimes) return events;

        // Asignar tiempos mínimos basados en restricciones
        const result = [...events];
        result[0].time = 0;

        for (let i = 1; i < result.length; i++) {
            const prevName = result[i - 1].name;
            const currName = result[i].name;
            
            // Buscar conexión entre eventos
            const conn = Object.values(vnet.connections).find(c => 
                c.source.name === prevName && c.target.name === currName
            );

            if (conn) {
                result[i].time = result[i - 1].time + conn.minTime;
            } else {
                // Sin conexión, usar tiempo arbitrario
                result[i].time = result[i - 1].time + 1;
            }
        }

        return result;
    },

    // Validar secuencia contra el modelo
    validate(sequence, vnet) {
        const results = {
            valid: true,
            conformity: 100,
            checks: [],
            errors: [],
            warnings: [],
            summary: {}
        };

        const events = Object.values(vnet.events);
        const connections = Object.values(vnet.connections);
        const eventByName = {};
        events.forEach(e => { eventByName[e.name] = e; });

        // 1. Verificar que la secuencia no esté vacía
        if (sequence.length === 0) {
            results.valid = false;
            results.errors.push('La secuencia está vacía');
            results.conformity = 0;
            return results;
        }

        let totalChecks = 0;
        let passedChecks = 0;

        // 2. Verificar existencia de eventos
        totalChecks++;
        const unknownEvents = sequence.filter(s => !eventByName[s.name]);
        if (unknownEvents.length > 0) {
            results.valid = false;
            results.errors.push(`Eventos no encontrados en el modelo: ${unknownEvents.map(e => e.name).join(', ')}`);
            results.checks.push({ name: 'Existencia de eventos', passed: false });
        } else {
            passedChecks++;
            results.checks.push({ name: 'Existencia de eventos', passed: true, detail: 'Todos los eventos existen en el modelo' });
        }

        // 3. Verificar que empieza con INIT
        totalChecks++;
        const firstEvent = eventByName[sequence[0].name];
        if (firstEvent && firstEvent.eventType !== 'init') {
            results.errors.push(`La secuencia debe comenzar con un evento INIT, pero comienza con '${sequence[0].name}' (tipo: ${firstEvent.eventType})`);
            results.checks.push({ name: 'Inicio con INIT', passed: false });
        } else if (firstEvent) {
            passedChecks++;
            results.checks.push({ name: 'Inicio con INIT', passed: true, detail: `Comienza con '${sequence[0].name}'` });
        }

        // 4. Verificar que termina con END
        totalChecks++;
        const lastEvent = eventByName[sequence[sequence.length - 1].name];
        if (lastEvent && lastEvent.eventType !== 'end') {
            results.errors.push(`La secuencia debe terminar con un evento END, pero termina con '${sequence[sequence.length - 1].name}' (tipo: ${lastEvent.eventType})`);
            results.checks.push({ name: 'Fin con END', passed: false });
        } else if (lastEvent) {
            passedChecks++;
            results.checks.push({ name: 'Fin con END', passed: true, detail: `Termina con '${sequence[sequence.length - 1].name}'` });
        }

        // 5. Verificar conexiones entre eventos consecutivos
        const connectionErrors = [];
        for (let i = 0; i < sequence.length - 1; i++) {
            const fromName = sequence[i].name;
            const toName = sequence[i + 1].name;
            
            const conn = connections.find(c => 
                c.source.name === fromName && c.target.name === toName
            );

            totalChecks++;
            if (!conn) {
                connectionErrors.push(`${fromName} → ${toName}`);
            } else {
                passedChecks++;
            }
        }

        if (connectionErrors.length > 0) {
            results.errors.push(`Conexiones no válidas: ${connectionErrors.join(', ')}`);
            results.checks.push({ 
                name: 'Conexiones válidas', 
                passed: false, 
                detail: `${connectionErrors.length} conexiones inválidas` 
            });
        } else if (sequence.length > 1) {
            results.checks.push({ 
                name: 'Conexiones válidas', 
                passed: true, 
                detail: `${sequence.length - 1} conexiones verificadas` 
            });
        }

        // 6. Verificar restricciones temporales
        const timeErrors = [];
        for (let i = 0; i < sequence.length - 1; i++) {
            const fromName = sequence[i].name;
            const toName = sequence[i + 1].name;
            const fromTime = sequence[i].time;
            const toTime = sequence[i + 1].time;

            const conn = connections.find(c => 
                c.source.name === fromName && c.target.name === toName
            );

            if (conn && fromTime !== null && toTime !== null) {
                totalChecks++;
                const delta = toTime - fromTime;
                const minTime = conn.minTime;
                const maxTime = conn.maxTime === Infinity ? Infinity : conn.maxTime;

                if (delta < minTime) {
                    timeErrors.push(`${fromName}→${toName}: δ=${delta.toFixed(2)} < min=${minTime}`);
                } else if (maxTime !== Infinity && delta > maxTime) {
                    timeErrors.push(`${fromName}→${toName}: δ=${delta.toFixed(2)} > max=${maxTime}`);
                } else {
                    passedChecks++;
                }
            }
        }

        if (timeErrors.length > 0) {
            results.errors.push(`Restricciones temporales violadas:\n  • ${timeErrors.join('\n  • ')}`);
            results.checks.push({ 
                name: 'Restricciones temporales', 
                passed: false, 
                detail: `${timeErrors.length} violaciones` 
            });
        } else if (sequence.length > 1) {
            results.checks.push({ 
                name: 'Restricciones temporales', 
                passed: true, 
                detail: 'Todos los intervalos cumplen' 
            });
        }

        // 7. Verificar frecuencias
        const eventCounts = {};
        sequence.forEach(s => {
            eventCounts[s.name] = (eventCounts[s.name] || 0) + 1;
        });

        const frequencyErrors = [];
        for (const event of events) {
            const count = eventCounts[event.name] || 0;
            if (count < event.frequency) {
                totalChecks++;
                frequencyErrors.push(`'${event.name}': aparece ${count} veces, requiere ${event.frequency}`);
            } else if (count > 0 || event.frequency > 0) {
                totalChecks++;
                passedChecks++;
            }
        }

        if (frequencyErrors.length > 0) {
            results.warnings.push(`Frecuencias insuficientes:\n  • ${frequencyErrors.join('\n  • ')}`);
            results.checks.push({ 
                name: 'Frecuencias de eventos', 
                passed: false, 
                detail: `${frequencyErrors.length} eventos con frecuencia insuficiente` 
            });
        } else {
            results.checks.push({ 
                name: 'Frecuencias de eventos', 
                passed: true, 
                detail: 'Todas las frecuencias cumplidas' 
            });
        }

        // 8. Verificar orden temporal
        totalChecks++;
        let temporalOrderOk = true;
        for (let i = 1; i < sequence.length; i++) {
            if (sequence[i].time !== null && sequence[i - 1].time !== null) {
                if (sequence[i].time < sequence[i - 1].time) {
                    temporalOrderOk = false;
                    results.errors.push(`Orden temporal violado: t(${sequence[i].name})=${sequence[i].time} < t(${sequence[i - 1].name})=${sequence[i - 1].time}`);
                    break;
                }
            }
        }

        if (temporalOrderOk) {
            passedChecks++;
            results.checks.push({ name: 'Orden temporal', passed: true, detail: 'Los tiempos están ordenados' });
        } else {
            results.checks.push({ name: 'Orden temporal', passed: false });
        }

        // Calcular conformidad
        results.conformity = totalChecks > 0 ? Math.round((passedChecks / totalChecks) * 100) : 0;
        results.valid = results.errors.length === 0;

        // Resumen
        results.summary = {
            totalEvents: sequence.length,
            uniqueEvents: Object.keys(eventCounts).length,
            totalTime: sequence[sequence.length - 1].time - sequence[0].time,
            passedChecks,
            totalChecks
        };

        return results;
    }
};

// Diálogo de validación de secuencias
const SequenceValidatorDialog = {
    show(vnet) {
        // Obtener nombres de eventos para autocompletado
        const eventNames = Object.values(vnet.events).map(e => e.name);

        const html = `
            <div class="modal-overlay" id="sequenceValidatorModal">
                <div class="modal-dialog modal-lg">
                    <div class="modal-header">
                        <h3>Validar Secuencia Manual</h3>
                        <button class="modal-close" onclick="VNetDialogs.closeModal('sequenceValidatorModal')">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div class="form-group">
                            <label for="sequenceInput">Ingrese la secuencia a validar:</label>
                            <textarea id="sequenceInput" class="form-control sequence-input" rows="5" 
                                placeholder="Formatos aceptados:&#10;&#10;1. Con tiempos: Init(0), ProcessA(3), End(10)&#10;2. Sin tiempos: Init, ProcessA, End&#10;3. Con flechas: Init → ProcessA → End&#10;4. Tabla (una por línea):&#10;   Init | 0&#10;   ProcessA | 3&#10;   End | 10"></textarea>
                        </div>

                        <div class="events-hint">
                            <strong>Eventos disponibles:</strong>
                            <div class="event-chips">
                                ${eventNames.map(name => `<span class="event-chip clickable" onclick="SequenceValidatorDialog.insertEvent('${name}')">${name}</span>`).join(' ')}
                            </div>
                        </div>

                        <button class="btn btn-primary" onclick="SequenceValidatorDialog.validate()">Validar Secuencia</button>

                        <div id="validationResults" style="margin-top: 20px;"></div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" onclick="VNetDialogs.closeModal('sequenceValidatorModal')">Cerrar</button>
                    </div>
                </div>
            </div>
        `;

        document.getElementById('vnet-modal-container').innerHTML = html;
        this._vnet = vnet;
    },

    insertEvent(name) {
        const textarea = document.getElementById('sequenceInput');
        const currentValue = textarea.value.trim();
        
        if (currentValue) {
            textarea.value = currentValue + ', ' + name;
        } else {
            textarea.value = name;
        }
        
        textarea.focus();
    },

    validate() {
        const input = document.getElementById('sequenceInput').value;
        const eventNames = Object.values(this._vnet.events).map(e => e.name);

        // Parsear secuencia
        let sequence = SequenceValidator.parseSequence(input, eventNames);

        if (sequence.length === 0) {
            document.getElementById('validationResults').innerHTML = `
                <div class="validation-result error">
                    <h4>Error de Formato</h4>
                    <p>No se pudo interpretar la secuencia. Verifique el formato.</p>
                </div>
            `;
            return;
        }

        // Asignar tiempos automáticos si es necesario
        sequence = SequenceValidator.assignAutoTimes(sequence, this._vnet);

        // Validar
        const result = SequenceValidator.validate(sequence, this._vnet);

        this.showResults(result, sequence);
    },

    showResults(result, sequence) {
        const conformityClass = result.conformity >= 80 ? 'high' : (result.conformity >= 50 ? 'medium' : 'low');

        let html = `
            <div class="validation-result ${result.valid ? 'success' : 'error'}">
                <div class="validation-header">
                    <div class="validation-status">
                        ${result.valid ? 'Secuencia VÁLIDA' : 'Secuencia INVÁLIDA'}
                    </div>
                    <div class="conformity-meter ${conformityClass}">
                        <div class="conformity-fill" style="width: ${result.conformity}%"></div>
                        <span class="conformity-value">${result.conformity}% conformidad</span>
                    </div>
                </div>

                <div class="parsed-sequence">
                    <h5>Secuencia interpretada:</h5>
                    <div class="sequence-display">
                        ${sequence.map(s => `<span class="seq-event">${s.name}<small>t=${s.time !== null ? s.time.toFixed(2) : '?'}</small></span>`).join(' → ')}
                    </div>
                </div>

                <div class="validation-checks">
                    <h5>Verificaciones realizadas:</h5>
                    <ul>
                        ${result.checks.map(check => `
                            <li class="${check.passed ? 'passed' : 'failed'}">
                                <span class="check-icon">${check.passed ? 'OK' : 'ERROR'}</span>
                                <span class="check-name">${check.name}</span>
                                ${check.detail ? `<span class="check-detail">${check.detail}</span>` : ''}
                            </li>
                        `).join('')}
                    </ul>
                </div>
        `;

        if (result.errors.length > 0) {
            html += `
                <div class="validation-errors">
                    <h5>Errores encontrados:</h5>
                    <ul>
                        ${result.errors.map(e => `<li>${e}</li>`).join('')}
                    </ul>
                </div>
            `;
        }

        if (result.warnings.length > 0) {
            html += `
                <div class="validation-warnings">
                    <h5>Advertencias:</h5>
                    <ul>
                        ${result.warnings.map(w => `<li>${w}</li>`).join('')}
                    </ul>
                </div>
            `;
        }

        html += `
                <div class="validation-summary">
                    <h5>Resumen:</h5>
                    <div class="summary-grid">
                        <div class="summary-item">
                            <span class="summary-value">${result.summary.totalEvents}</span>
                            <span class="summary-label">Eventos totales</span>
                        </div>
                        <div class="summary-item">
                            <span class="summary-value">${result.summary.uniqueEvents}</span>
                            <span class="summary-label">Eventos únicos</span>
                        </div>
                        <div class="summary-item">
                            <span class="summary-value">${result.summary.totalTime !== null ? result.summary.totalTime.toFixed(2) : '?'}</span>
                            <span class="summary-label">Tiempo total</span>
                        </div>
                        <div class="summary-item">
                            <span class="summary-value">${result.summary.passedChecks}/${result.summary.totalChecks}</span>
                            <span class="summary-label">Validaciones OK</span>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.getElementById('validationResults').innerHTML = html;
    }
};

// Exportar
window.SequenceValidator = SequenceValidator;
window.SequenceValidatorDialog = SequenceValidatorDialog;

