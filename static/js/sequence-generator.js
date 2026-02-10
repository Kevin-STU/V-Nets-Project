/**
 * V-Nets Web Editor - Generador de Secuencias
 * Implementa algoritmos: Exhaustivo, Muestreo, Adaptativo
 */

const SequenceGenerator = {
    // Configuración por defecto
    config: {
        maxSequences: 100,
        maxTime: 30000, // 30 segundos
        maxLength: 1000
    },

    // Calcular análisis de complejidad del modelo
    analyzeComplexity(vnet) {
        const events = Object.values(vnet.events);
        const connections = Object.values(vnet.connections);
        
        const numEvents = events.length;
        const numConnections = connections.length;
        
        // Densidad del grafo
        const maxConnections = numEvents * (numEvents - 1);
        const density = maxConnections > 0 ? numConnections / maxConnections : 0;
        
        // Suma de frecuencias
        const totalFrequency = events.reduce((sum, e) => sum + e.frequency, 0);
        
        // Contar caminos desde INIT a END
        const initEvents = events.filter(e => e.eventType === 'init');
        const endEvents = events.filter(e => e.eventType === 'end');
        const pathCount = this.countPaths(initEvents, endEvents);
        
        // Calcular complejidad estimada
        let complexity = 'Baja';
        const complexityScore = numEvents * numConnections * totalFrequency / 10;
        
        if (complexityScore > 1000 || pathCount > 100) {
            complexity = 'Muy Alta';
        } else if (complexityScore > 100 || pathCount > 20) {
            complexity = 'Alta';
        } else if (complexityScore > 20 || pathCount > 5) {
            complexity = 'Media';
        }

        // Algoritmo recomendado
        let recommendedAlgorithm = 'exhaustive';
        if (complexity === 'Muy Alta') {
            recommendedAlgorithm = 'sampling';
        } else if (complexity === 'Alta') {
            recommendedAlgorithm = 'adaptive';
        }

        return {
            numEvents,
            numConnections,
            density: Math.round(density * 100) / 100,
            totalFrequency,
            pathCount,
            complexity,
            complexityScore: Math.round(complexityScore),
            recommendedAlgorithm
        };
    },

    // Contar caminos simples desde INIT a END
    countPaths(initEvents, endEvents) {
        const endIds = new Set(endEvents.map(e => e.id));
        let count = 0;
        const maxCount = 1000; // Límite para evitar bloqueos

        for (const initEvent of initEvents) {
            const visited = new Set();
            
            const dfs = (current) => {
                if (count >= maxCount) return;
                
                if (endIds.has(current.id)) {
                    count++;
                    return;
                }

                visited.add(current.id);
                
                for (const conn of current.outgoing) {
                    if (!visited.has(conn.target.id)) {
                        dfs(conn.target);
                    }
                }
                
                visited.delete(current.id);
            };

            dfs(initEvent);
        }

        return Math.min(count, maxCount);
    },

    // Algoritmo Exhaustivo: genera todas las secuencias posibles
    generateExhaustive(vnet, options = {}) {
        const maxSequences = options.maxSequences || this.config.maxSequences;
        const maxTime = options.maxTime || this.config.maxTime;
        const maxLength = options.maxLength || this.config.maxLength;
        const startTime = Date.now();

        const events = Object.values(vnet.events);
        const initEvents = events.filter(e => e.eventType === 'init');
        const endIds = new Set(events.filter(e => e.eventType === 'end').map(e => e.id));
        
        const sequences = [];
        const frequencyMap = {};
        events.forEach(e => { frequencyMap[e.id] = e.frequency; });

        const generateFromEvent = (current, path, time, freqCount) => {
            // Verificar límites
            if (sequences.length >= maxSequences) return;
            if (Date.now() - startTime > maxTime) return;
            if (path.length > maxLength) return;

            // Agregar evento actual al camino
            const newPath = [...path, { event: current, time }];
            const newFreqCount = { ...freqCount };
            newFreqCount[current.id] = (newFreqCount[current.id] || 0) + 1;

            // Si llegamos a un END y cumplimos frecuencias, guardar secuencia
            if (endIds.has(current.id)) {
                // Verificar que se cumplan las frecuencias mínimas
                let validFreq = true;
                for (const event of events) {
                    if ((newFreqCount[event.id] || 0) < event.frequency) {
                        validFreq = false;
                        break;
                    }
                }
                
                if (validFreq) {
                    sequences.push({
                        id: sequences.length + 1,
                        path: newPath.map(p => ({ name: p.event.name, time: p.time })),
                        length: newPath.length,
                        totalTime: time
                    });
                }
                return;
            }

            // Explorar conexiones salientes
            for (const conn of current.outgoing) {
                const target = conn.target;
                
                // Calcular nuevo tiempo
                const minDelta = conn.minTime;
                const maxDelta = conn.maxTime === Infinity ? conn.minTime + 10 : conn.maxTime;
                
                // Generar para tiempo mínimo y máximo (simplificación)
                const deltas = [minDelta];
                if (maxDelta !== minDelta) {
                    deltas.push(maxDelta);
                    // Agregar un punto medio
                    deltas.push(Math.round((minDelta + maxDelta) / 2 * 10) / 10);
                }

                for (const delta of deltas) {
                    generateFromEvent(target, newPath, time + delta, newFreqCount);
                    if (sequences.length >= maxSequences) return;
                }
            }
        };

        // Iniciar desde cada evento INIT
        for (const initEvent of initEvents) {
            generateFromEvent(initEvent, [], 0, {});
            if (sequences.length >= maxSequences) break;
        }

        return {
            sequences,
            algorithm: 'exhaustive',
            timeElapsed: Date.now() - startTime,
            limitReached: sequences.length >= maxSequences
        };
    },

    // Algoritmo de Muestreo: genera N secuencias aleatorias
    generateSampling(vnet, options = {}) {
        const targetCount = options.maxSequences || this.config.maxSequences;
        const maxTime = options.maxTime || this.config.maxTime;
        const maxLength = options.maxLength || this.config.maxLength;
        const startTime = Date.now();

        const events = Object.values(vnet.events);
        const initEvents = events.filter(e => e.eventType === 'init');
        const endIds = new Set(events.filter(e => e.eventType === 'end').map(e => e.id));

        const sequences = [];
        let attempts = 0;
        const maxAttempts = targetCount * 10;

        while (sequences.length < targetCount && attempts < maxAttempts) {
            if (Date.now() - startTime > maxTime) break;
            attempts++;

            // Seleccionar un INIT aleatorio
            const initEvent = initEvents[Math.floor(Math.random() * initEvents.length)];
            
            const path = [{ event: initEvent, time: 0 }];
            let current = initEvent;
            let time = 0;

            // Seguir camino aleatorio hasta END o límite
            while (!endIds.has(current.id) && path.length < maxLength) {
                if (current.outgoing.length === 0) break;

                // Seleccionar conexión aleatoria
                const conn = current.outgoing[Math.floor(Math.random() * current.outgoing.length)];
                
                // Calcular tiempo aleatorio en el rango
                const minDelta = conn.minTime;
                const maxDelta = conn.maxTime === Infinity ? conn.minTime + 10 : conn.maxTime;
                const delta = minDelta + Math.random() * (maxDelta - minDelta);
                time += Math.round(delta * 10) / 10;

                current = conn.target;
                path.push({ event: current, time });
            }

            // Solo guardar si llegamos a END
            if (endIds.has(current.id)) {
                sequences.push({
                    id: sequences.length + 1,
                    path: path.map(p => ({ name: p.event.name, time: p.time })),
                    length: path.length,
                    totalTime: time
                });
            }
        }

        return {
            sequences,
            algorithm: 'sampling',
            timeElapsed: Date.now() - startTime,
            attempts,
            limitReached: sequences.length >= targetCount
        };
    },

    // Algoritmo Adaptativo: combina según complejidad
    generateAdaptive(vnet, options = {}) {
        const analysis = this.analyzeComplexity(vnet);
        const maxSequences = options.maxSequences || this.config.maxSequences;
        
        // Decidir estrategia según complejidad
        if (analysis.complexity === 'Baja' || analysis.pathCount < 20) {
            // Usar exhaustivo para modelos simples
            const result = this.generateExhaustive(vnet, options);
            result.algorithm = 'adaptive (exhaustive)';
            return result;
        } else if (analysis.complexity === 'Muy Alta' || analysis.pathCount > 100) {
            // Usar muestreo para modelos muy complejos
            const result = this.generateSampling(vnet, options);
            result.algorithm = 'adaptive (sampling)';
            return result;
        } else {
            // Híbrido: intentar exhaustivo con límite bajo, luego completar con muestreo
            const exhaustiveLimit = Math.min(maxSequences / 2, 50);
            const exhaustiveResult = this.generateExhaustive(vnet, {
                ...options,
                maxSequences: exhaustiveLimit,
                maxTime: options.maxTime ? options.maxTime / 2 : 15000
            });

            if (exhaustiveResult.sequences.length < maxSequences) {
                const remaining = maxSequences - exhaustiveResult.sequences.length;
                const samplingResult = this.generateSampling(vnet, {
                    ...options,
                    maxSequences: remaining,
                    maxTime: options.maxTime ? options.maxTime / 2 : 15000
                });

                // Combinar resultados
                const existingPaths = new Set(exhaustiveResult.sequences.map(s => 
                    s.path.map(p => p.name).join('->')
                ));

                // Agregar secuencias de muestreo que no estén duplicadas
                let id = exhaustiveResult.sequences.length + 1;
                for (const seq of samplingResult.sequences) {
                    const pathKey = seq.path.map(p => p.name).join('->');
                    if (!existingPaths.has(pathKey)) {
                        seq.id = id++;
                        exhaustiveResult.sequences.push(seq);
                        existingPaths.add(pathKey);
                    }
                }

                exhaustiveResult.algorithm = 'adaptive (hybrid)';
                exhaustiveResult.timeElapsed += samplingResult.timeElapsed;
            }

            return exhaustiveResult;
        }
    },

    // Generar secuencias según algoritmo seleccionado
    generate(vnet, algorithm = 'adaptive', options = {}) {
        switch (algorithm) {
            case 'exhaustive':
                return this.generateExhaustive(vnet, options);
            case 'sampling':
                return this.generateSampling(vnet, options);
            case 'adaptive':
            default:
                return this.generateAdaptive(vnet, options);
        }
    },

    // Exportar secuencias a diferentes formatos
    exportToCSV(sequences) {
        const lines = ['ID,Longitud,Tiempo_Total,Secuencia'];
        sequences.forEach(seq => {
            const seqStr = seq.path.map(p => `${p.name}(${p.time})`).join(' -> ');
            lines.push(`${seq.id},${seq.length},${seq.totalTime},"${seqStr}"`);
        });
        return lines.join('\n');
    },

    exportToJSON(sequences) {
        return JSON.stringify(sequences, null, 2);
    },

    exportToTXT(sequences) {
        const lines = ['=== Secuencias Generadas ===\n'];
        sequences.forEach(seq => {
            lines.push(`Secuencia ${seq.id} (longitud: ${seq.length}, tiempo: ${seq.totalTime})`);
            lines.push(seq.path.map(p => `  ${p.name} (t=${p.time})`).join('\n'));
            lines.push('');
        });
        return lines.join('\n');
    }
};

// Diálogo de generación de secuencias
const SequenceGeneratorDialog = {
    show(vnet) {
        const analysis = SequenceGenerator.analyzeComplexity(vnet);

        const html = `
            <div class="modal-overlay" id="sequenceGeneratorModal">
                <div class="modal-dialog modal-xl">
                    <div class="modal-header">
                        <h3>Generación de Secuencias</h3>
                        <button class="modal-close" onclick="VNetDialogs.closeModal('sequenceGeneratorModal')">&times;</button>
                    </div>
                    <div class="modal-body">
                        <!-- Pestañas -->
                        <div class="restriction-tabs">
                            <button class="restriction-tab active" onclick="SequenceGeneratorDialog.switchTab('analysis')">
                                Análisis de Complejidad
                            </button>
                            <button class="restriction-tab" onclick="SequenceGeneratorDialog.switchTab('config')">
                                Configuración
                            </button>
                            <button class="restriction-tab" onclick="SequenceGeneratorDialog.switchTab('results')" id="resultsTab" disabled>
                                Resultados
                            </button>
                        </div>

                        <!-- Panel Análisis -->
                        <div id="analysisPanel" class="restriction-panel active">
                            <div class="analysis-grid">
                                <div class="analysis-card">
                                    <h4>Métricas del Modelo</h4>
                                    <div class="analysis-row">
                                        <span>Número de eventos:</span>
                                        <strong>${analysis.numEvents}</strong>
                                    </div>
                                    <div class="analysis-row">
                                        <span>Número de conexiones:</span>
                                        <strong>${analysis.numConnections}</strong>
                                    </div>
                                    <div class="analysis-row">
                                        <span>Densidad del grafo:</span>
                                        <strong>${(analysis.density * 100).toFixed(1)}%</strong>
                                    </div>
                                    <div class="analysis-row">
                                        <span>Suma de frecuencias:</span>
                                        <strong>${analysis.totalFrequency}</strong>
                                    </div>
                                    <div class="analysis-row">
                                        <span>Caminos posibles (est.):</span>
                                        <strong>${analysis.pathCount}${analysis.pathCount >= 1000 ? '+' : ''}</strong>
                                    </div>
                                </div>
                                <div class="analysis-card">
                                    <h4>Evaluación de Complejidad</h4>
                                    <div class="complexity-badge ${analysis.complexity.toLowerCase().replace(' ', '-')}">
                                        ${analysis.complexity}
                                    </div>
                                    <p class="complexity-desc">
                                        ${this.getComplexityDescription(analysis.complexity)}
                                    </p>
                                    <div class="recommendation-box">
                                        <strong>Algoritmo recomendado:</strong>
                                        <span>${this.getAlgorithmName(analysis.recommendedAlgorithm)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Panel Configuración -->
                        <div id="configPanel" class="restriction-panel">
                            <div class="form-group">
                                <label for="algorithmSelect">Algoritmo de generación:</label>
                                <select id="algorithmSelect" class="form-control">
                                    <option value="adaptive" ${analysis.recommendedAlgorithm === 'adaptive' ? 'selected' : ''}>
                                        Adaptativo (recomendado para complejidad variable)
                                    </option>
                                    <option value="exhaustive" ${analysis.recommendedAlgorithm === 'exhaustive' ? 'selected' : ''}>
                                        Exhaustivo (todas las secuencias posibles)
                                    </option>
                                    <option value="sampling" ${analysis.recommendedAlgorithm === 'sampling' ? 'selected' : ''}>
                                        Muestreo (N secuencias aleatorias)
                                    </option>
                                </select>
                            </div>
                            <div class="form-row">
                                <div class="form-group">
                                    <label for="maxSequences">Límite de secuencias:</label>
                                    <input type="number" id="maxSequences" value="100" min="1" max="10000" class="form-control">
                                </div>
                                <div class="form-group">
                                    <label for="maxTime">Tiempo máximo (segundos):</label>
                                    <input type="number" id="maxTime" value="30" min="1" max="300" class="form-control">
                                </div>
                            </div>
                            <div class="form-group">
                                <label for="maxLength">Longitud máxima de secuencia:</label>
                                <input type="number" id="maxLength" value="100" min="5" max="1000" class="form-control">
                                <p class="help-text">0 = sin límite</p>
                            </div>
                            <button class="btn btn-primary" id="generateBtn" onclick="SequenceGeneratorDialog.generate()">
                                <span id="generateBtnText">Generar Secuencias</span>
                                <span id="generateBtnLoading" style="display:none;">Generando...</span>
                            </button>
                        </div>

                        <!-- Panel Resultados -->
                        <div id="resultsPanel" class="restriction-panel">
                            <div id="resultsContent">
                                <p class="placeholder-text">Los resultados aparecerán aquí después de generar.</p>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" onclick="VNetDialogs.closeModal('sequenceGeneratorModal')">Cerrar</button>
                    </div>
                </div>
            </div>
        `;

        document.getElementById('vnet-modal-container').innerHTML = html;
        this._vnet = vnet;
        
        // 🔐 Marcar modal como abierto para prevenir eliminación accidental
        if (window.VNetDialogs) {
            window.VNetDialogs.isModalOpen = true;
        }
    },

    switchTab(tab) {
        document.querySelectorAll('#sequenceGeneratorModal .restriction-tab').forEach(btn => {
            btn.classList.remove('active');
        });
        event.target.classList.add('active');

        document.querySelectorAll('#sequenceGeneratorModal .restriction-panel').forEach(panel => {
            panel.classList.remove('active');
        });
        document.getElementById(tab + 'Panel').classList.add('active');
    },

    getComplexityDescription(complexity) {
        switch (complexity) {
            case 'Baja':
                return 'El modelo es simple. El algoritmo exhaustivo puede generar todas las secuencias rápidamente.';
            case 'Media':
                return 'El modelo tiene complejidad moderada. Se recomienda el algoritmo adaptativo.';
            case 'Alta':
                return 'El modelo es complejo. Considere usar muestreo o limitar el número de secuencias.';
            case 'Muy Alta':
                return 'El modelo es muy complejo. Se recomienda muestreo con límites estrictos.';
            default:
                return '';
        }
    },

    getAlgorithmName(algorithm) {
        switch (algorithm) {
            case 'exhaustive': return 'Exhaustivo';
            case 'sampling': return 'Muestreo';
            case 'adaptive': return 'Adaptativo';
            default: return algorithm;
        }
    },

    generate() {
        const algorithm = document.getElementById('algorithmSelect').value;
        const maxSequences = parseInt(document.getElementById('maxSequences').value) || 100;
        const maxTime = (parseInt(document.getElementById('maxTime').value) || 30) * 1000;
        const maxLength = parseInt(document.getElementById('maxLength').value) || 1000;

        // Mostrar loading
        document.getElementById('generateBtnText').style.display = 'none';
        document.getElementById('generateBtnLoading').style.display = 'inline';
        document.getElementById('generateBtn').disabled = true;

        // Ejecutar en setTimeout para permitir actualización de UI
        setTimeout(() => {
            try {
                const result = SequenceGenerator.generate(this._vnet, algorithm, {
                    maxSequences,
                    maxTime,
                    maxLength
                });

                this.showResults(result);
            } catch (error) {
                console.error('Error generating sequences:', error);
                document.getElementById('resultsContent').innerHTML = `
                    <div class="error">Error al generar secuencias: ${error.message}</div>
                `;
            }

            // Ocultar loading
            document.getElementById('generateBtnText').style.display = 'inline';
            document.getElementById('generateBtnLoading').style.display = 'none';
            document.getElementById('generateBtn').disabled = false;

            // Habilitar y mostrar pestaña de resultados
            document.getElementById('resultsTab').disabled = false;
            document.querySelectorAll('#sequenceGeneratorModal .restriction-tab').forEach(btn => {
                btn.classList.remove('active');
            });
            document.getElementById('resultsTab').classList.add('active');
            document.querySelectorAll('#sequenceGeneratorModal .restriction-panel').forEach(panel => {
                panel.classList.remove('active');
            });
            document.getElementById('resultsPanel').classList.add('active');
        }, 50);
    },

    showResults(result) {
        const { sequences, algorithm, timeElapsed, limitReached } = result;

        // Calcular estadísticas
        const lengths = sequences.map(s => s.length);
        const times = sequences.map(s => s.totalTime);
        const avgLength = lengths.length > 0 ? (lengths.reduce((a, b) => a + b, 0) / lengths.length).toFixed(1) : 0;
        const minLength = lengths.length > 0 ? Math.min(...lengths) : 0;
        const maxLengthVal = lengths.length > 0 ? Math.max(...lengths) : 0;
        const avgTime = times.length > 0 ? (times.reduce((a, b) => a + b, 0) / times.length).toFixed(2) : 0;

        let html = `
            <div class="results-stats" style="display: flex; gap: 12px; margin-bottom: 16px; font-size: 0.85em; color: #666;">
                <span><strong>${sequences.length}</strong> secuencias</span>
                <span>•</span>
                <span>${(timeElapsed / 1000).toFixed(2)}s</span>
                <span>•</span>
                <span>${algorithm}</span>
                <span>•</span>
                <span>Promedio: ${avgLength} eventos, ${avgTime}s</span>
            </div>
            ${limitReached ? '<p style="color: #999; font-size: 0.8em; margin-bottom: 12px;">Límite alcanzado</p>' : ''}
        `;

        if (sequences.length === 0) {
            html += '<p class="error">No se encontraron secuencias válidas. Verifica que el modelo tenga caminos válidos desde INIT hasta END.</p>';
        } else {
            html += `
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                    <div class="view-toggle">
                        <button class="toggle-btn active" onclick="SequenceGeneratorDialog.toggleView('compact')">Tabla</button>
                        <button class="toggle-btn" onclick="SequenceGeneratorDialog.toggleView('detailed')">Detalle</button>
                    </div>
                    <div style="display: flex; gap: 6px;">
                        <button class="btn btn-secondary" style="padding: 6px 10px; font-size: 0.8em;" onclick="SequenceGeneratorDialog.exportResults('csv')">CSV</button>
                        <button class="btn btn-secondary" style="padding: 6px 10px; font-size: 0.8em;" onclick="SequenceGeneratorDialog.exportResults('json')">JSON</button>
                        <button class="btn btn-secondary" style="padding: 6px 10px; font-size: 0.8em;" onclick="SequenceGeneratorDialog.exportResults('txt')">TXT</button>
                    </div>
                </div>
                
                <div class="sequences-filter">
                    <input type="text" id="sequenceFilter" placeholder="Buscar evento..." onkeyup="SequenceGeneratorDialog.filterSequences()">
                    <select id="lengthFilter" onchange="SequenceGeneratorDialog.filterSequences()">
                        <option value="">Todas las longitudes</option>
                        ${[...new Set(lengths)].sort((a,b) => a-b).map(len => `<option value="${len}">${len} eventos</option>`).join('')}
                    </select>
                </div>
                
                <div id="compactView" class="sequences-view active">
                    <div class="sequences-table-container">
                        <table class="sequences-table">
                            <thead>
                                <tr>
                                    <th style="width: 5%;">#</th>
                                    <th style="width: 8%;">Eventos</th>
                                    <th style="width: 10%;">Tiempo</th>
                                    <th style="width: 77%;">Secuencia</th>
                                </tr>
                            </thead>
                            <tbody id="sequenceTableBody">
                                ${sequences.slice(0, 100).map(seq => `
                                    <tr class="sequence-row" data-length="${seq.length}" onclick="SequenceGeneratorDialog.expandSequence(${seq.id})">
                                        <td>${seq.id}</td>
                                        <td>${seq.length}</td>
                                        <td>${seq.totalTime.toFixed(2)}s</td>
                                        <td class="sequence-cell">${seq.path.map(p => p.name).join(' → ')}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                        ${sequences.length > 100 ? `<p style="color: #999; font-size: 0.8em; margin-top: 12px;">Mostrando 100 de ${sequences.length}. Exporta para ver todas.</p>` : ''}
                    </div>
                </div>
                
                <div id="detailedView" class="sequences-view">
                    <div class="sequences-detail-list">
                        ${sequences.slice(0, 50).map(seq => `
                            <div class="sequence-detail-card">
                                <div class="sequence-header" onclick="SequenceGeneratorDialog.toggleSequenceDetail(${seq.id})">
                                    <span class="sequence-id">#${seq.id}</span>
                                    <span class="sequence-summary">
                                        ${seq.path.map(p => p.name).join(' → ')} (${seq.length} eventos, ${seq.totalTime.toFixed(2)}s)
                                    </span>
                                    <span class="expand-icon">▼</span>
                                </div>
                                <div class="sequence-detail" id="detail-${seq.id}" style="display: none;">
                                    <div class="sequence-timeline">
                                        ${seq.path.map((event, idx) => `
                                            <div class="timeline-item">
                                                <div class="timeline-marker">${idx + 1}</div>
                                                <div class="timeline-content">
                                                    <h4>${event.name}</h4>
                                                    <p class="event-time">t = <strong>${event.time.toFixed(2)}s</strong></p>
                                                    ${idx > 0 ? `<p class="event-delta">Δt = <strong>${(event.time - seq.path[idx-1].time).toFixed(2)}s</strong></p>` : ''}
                                                </div>
                                            </div>
                                        `).join('')}
                                    </div>
                                    <div class="sequence-stats">
                                        <div class="stat-mini">
                                            <span class="label">Total</span>
                                            <span class="value">${seq.totalTime.toFixed(2)}s</span>
                                        </div>
                                        <div class="stat-mini">
                                            <span class="label">Eventos</span>
                                            <span class="value">${seq.length}</span>
                                        </div>
                                        <div class="stat-mini">
                                            <span class="label">Promedio</span>
                                            <span class="value">${(seq.totalTime / seq.length).toFixed(2)}s</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                        ${sequences.length > 50 ? `<p style="color: #999; font-size: 0.8em; margin-top: 12px;">Mostrando 50 de ${sequences.length}. Exporta para ver todas.</p>` : ''}
                    </div>
                </div>
            `;
        }

        document.getElementById('resultsContent').innerHTML = html;
        this._lastResult = result;
        this._currentView = 'compact';
    },
    
    toggleView(view) {
        // Cambiar vista (comprimida vs detallada)
        const compactView = document.getElementById('compactView');
        const detailedView = document.getElementById('detailedView');
        const toggleBtns = document.querySelectorAll('.view-toggle .toggle-btn');
        
        toggleBtns.forEach(btn => btn.classList.remove('active'));
        event.target.classList.add('active');
        
        if (view === 'compact') {
            compactView.classList.add('active');
            detailedView.classList.remove('active');
        } else {
            compactView.classList.remove('active');
            detailedView.classList.add('active');
        }
        
        this._currentView = view;
    },
    
    toggleSequenceDetail(seqId) {
        // Expandir/contraer detalle de una secuencia
        const detail = document.getElementById(`detail-${seqId}`);
        const header = detail.previousElementSibling;
        const icon = header.querySelector('.expand-icon');
        
        if (detail.style.display === 'none') {
            detail.style.display = 'block';
            icon.textContent = '▲';
        } else {
            detail.style.display = 'none';
            icon.textContent = '▼';
        }
    },
    
    filterSequences() {
        // Filtrar secuencias por búsqueda y longitud
        const filterText = document.getElementById('sequenceFilter')?.value.toLowerCase() || '';
        const lengthFilter = document.getElementById('lengthFilter')?.value || '';
        
        if (this._currentView === 'compact') {
            const rows = document.querySelectorAll('.sequence-row');
            rows.forEach(row => {
                const sequenceText = row.textContent.toLowerCase();
                const rowLength = row.dataset.length;
                const matchesText = sequenceText.includes(filterText);
                const matchesLength = lengthFilter === '' || rowLength === lengthFilter;
                
                row.style.display = (matchesText && matchesLength) ? '' : 'none';
            });
        }
    },
    
    expandSequence(seqId) {
        // Expandir secuencia desde la vista comprimida
        if (this._currentView === 'compact') {
            // Cambiar a vista detallada y expandir esa secuencia
            this.toggleView('detailed');
            setTimeout(() => {
                this.toggleSequenceDetail(seqId);
                const card = document.getElementById(`detail-${seqId}`).closest('.sequence-detail-card');
                card?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 100);
        }
    },

    exportResults(format) {
        if (!this._lastResult || this._lastResult.sequences.length === 0) {
            alert('No hay secuencias para exportar.');
            return;
        }

        let content, filename, mimeType;

        switch (format) {
            case 'csv':
                content = SequenceGenerator.exportToCSV(this._lastResult.sequences);
                filename = 'secuencias.csv';
                mimeType = 'text/csv';
                break;
            case 'json':
                content = SequenceGenerator.exportToJSON(this._lastResult.sequences);
                filename = 'secuencias.json';
                mimeType = 'application/json';
                break;
            case 'txt':
            default:
                content = SequenceGenerator.exportToTXT(this._lastResult.sequences);
                filename = 'secuencias.txt';
                mimeType = 'text/plain';
                break;
        }

        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    }
};

// Exportar
window.SequenceGenerator = SequenceGenerator;
window.SequenceGeneratorDialog = SequenceGeneratorDialog;

