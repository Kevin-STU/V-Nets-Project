/**
 * V-Nets Web Editor - Validador de Secuencias
 * Implementación basada en el paper de V-nets
 * 
 * Incluye:
 * - Algoritmo de Reconocimiento (Recognition Algorithm)
 * - Algoritmo de Diagnóstico de Fallos (Fault Diagnosis)
 */

// =====================================================
// TIPOS DE FALLOS (según el paper)
// =====================================================
const FaultType = {
    EVENT_FAULT: 'EVENT_FAULT',       // Evento no existe o no es el esperado
    TIME_FAULT: 'TIME_FAULT',         // Tiempo fuera de [min, max]
    LOGIC_FAULT: 'LOGIC_FAULT',       // No se cumple el predicado R
    TIMEOUT_FAULT: 'TIMEOUT_FAULT',   // Se excedió el tleval
    FREQUENCY_FAULT: 'FREQUENCY_FAULT', // Frecuencia excedida
    CAUSALITY_FAULT: 'CAUSALITY_FAULT'  // No existe conexión causal
};

// Subtipos para TIME_FAULT
const TimeFaultSubtype = {
    EARLY: 'EARLY',   // Evento llegó muy pronto (Δt < min)
    LATE: 'LATE'      // Evento llegó muy tarde (Δt > max)
};

// =====================================================
// CLASE DE DIAGNÓSTICO
// =====================================================
class FaultDiagnostic {
    constructor(type, eventIndex, eventName, details = {}) {
        this.type = type;
        this.eventIndex = eventIndex;
        this.eventName = eventName;
        this.timestamp = new Date().toISOString();
        this.details = details;
    }

    toString() {
        switch (this.type) {
            case FaultType.EVENT_FAULT:
                return `[EVENT_FAULT] Evento '${this.eventName}' en posición ${this.eventIndex}: ${this.details.message}`;
            case FaultType.TIME_FAULT:
                const subtype = this.details.subtype === TimeFaultSubtype.EARLY ? 'PRECOCIDAD' : 'RETRASO';
                return `[TIME_FAULT:${subtype}] Evento '${this.eventName}' en posición ${this.eventIndex}: Δt=${this.details.actualDelta.toFixed(3)}, esperado=[${this.details.expectedMin}, ${this.details.expectedMax}]`;
            case FaultType.CAUSALITY_FAULT:
                return `[CAUSALITY_FAULT] No existe conexión ${this.details.fromEvent} → ${this.eventName} en la V-net`;
            case FaultType.LOGIC_FAULT:
                return `[LOGIC_FAULT] Predicado R no cumplido para '${this.eventName}': ${this.details.predicate}`;
            case FaultType.TIMEOUT_FAULT:
                return `[TIMEOUT_FAULT] Tiempo global ${this.details.currentTime} excede tleval=${this.details.tleval}`;
            case FaultType.FREQUENCY_FAULT:
                return `[FREQUENCY_FAULT] Evento '${this.eventName}' excede frecuencia máxima: ${this.details.actual}/${this.details.max}`;
            default:
                return `[UNKNOWN_FAULT] ${this.eventName}: ${JSON.stringify(this.details)}`;
        }
    }

    toJSON() {
        return {
            type: this.type,
            eventIndex: this.eventIndex,
            eventName: this.eventName,
            timestamp: this.timestamp,
            details: this.details
        };
    }
}

// =====================================================
// ESTADO DEL RECONOCEDOR
// =====================================================
class RecognitionState {
    constructor(vnet) {
        this.vnet = vnet;
        this.currentEvents = [];      // Eventos procesados
        this.currentLevel = 0;        // Nivel actual en la V-net
        this.eventCounts = {};        // Contador de frecuencias por evento
        this.lastTimestamp = 0;       // Último timestamp procesado
        this.activeNodes = new Set(); // Nodos activos (posibles siguientes)
        
        // Inicializar contadores de frecuencia
        Object.values(vnet.events).forEach(e => {
            this.eventCounts[e.name] = 0;
        });
        
        // Inicializar nodos activos con eventos INIT
        Object.values(vnet.events)
            .filter(e => e.eventType === 'init')
            .forEach(e => this.activeNodes.add(e.name));
    }

    // Obtener eventos esperados según el estado actual
    getExpectedEvents() {
        return Array.from(this.activeNodes);
    }

    // Actualizar estado después de procesar un evento
    advance(eventName, timestamp) {
        this.currentEvents.push({ name: eventName, time: timestamp });
        this.eventCounts[eventName] = (this.eventCounts[eventName] || 0) + 1;
        this.lastTimestamp = timestamp;
        
        // Actualizar nodos activos: los que pueden seguir desde el evento actual
        const event = Object.values(this.vnet.events).find(e => e.name === eventName);
        if (event && event.outgoing) {
            this.activeNodes.clear();
            event.outgoing.forEach(conn => {
                this.activeNodes.add(conn.target.name);
            });
        }
        
        this.currentLevel++;
    }
}

// =====================================================
// ALGORITMO DE RECONOCIMIENTO (Recognition Algorithm)
// Basado en el paper de V-nets
// =====================================================
const RecognitionAlgorithm = {
    /**
     * Reconocer una secuencia de eventos contra una V-net
     * 
     * @param {Array} secuenciaInput - Lista de tuplas [evento, timestamp]
     *                                  Ej: [["B", 0], ["RPIi", 0.5], ["RPIf", 6], ...]
     * @param {Object} vnet - El modelo V-net a validar
     * @param {Object} options - Opciones adicionales
     *        - tleval: tiempo máximo global (default: Infinity)
     *        - strictMode: validación estricta (default: true)
     * @returns {Object} Resultado del reconocimiento
     */
    reconocerSecuencia(secuenciaInput, vnet, options = {}) {
        const tleval = options.tleval || Infinity;
        const strictMode = options.strictMode !== false;
        
        console.log('🔍 === ALGORITMO DE RECONOCIMIENTO ===');
        console.log(`   Secuencia de entrada: ${secuenciaInput.length} eventos`);
        console.log(`   tleval: ${tleval === Infinity ? '∞' : tleval}`);
        
        // Resultado del reconocimiento
        const result = {
            status: 'PROCESSING',
            recognized: false,
            conformity: 0,
            processedEvents: 0,
            totalEvents: secuenciaInput.length,
            diagnostics: [],
            timeline: [],
            summary: {}
        };

        // Validar entrada
        if (!secuenciaInput || secuenciaInput.length === 0) {
            result.status = 'FAULT_DETECTED';
            result.diagnostics.push(new FaultDiagnostic(
                FaultType.EVENT_FAULT, 0, 'N/A',
                { message: 'Secuencia vacía' }
            ));
            return this._finalizeResult(result, vnet);
        }

        // Crear estructuras de lookup
        const eventByName = {};
        Object.values(vnet.events).forEach(e => { eventByName[e.name] = e; });
        
        const connections = Object.values(vnet.connections);
        
        // Estado del reconocedor
        const state = new RecognitionState(vnet);
        
        // Procesar cada evento de la secuencia
        for (let i = 0; i < secuenciaInput.length; i++) {
            const [eventName, timestamp] = secuenciaInput[i];
            
            console.log(`   [${i}] Procesando: ${eventName} @ t=${timestamp}`);
            
            // VALIDACIÓN 1: Existencia del evento en E
            if (!eventByName[eventName]) {
                result.diagnostics.push(new FaultDiagnostic(
                    FaultType.EVENT_FAULT, i, eventName,
                    { message: `Evento '${eventName}' no pertenece al conjunto E de la V-net` }
                ));
                if (strictMode) {
                    result.status = 'FAULT_DETECTED';
                    return this._finalizeResult(result, vnet, state);
                }
                continue;
            }
            
            // VALIDACIÓN 2: Validación Global (timestamp <= tleval)
            if (timestamp > tleval) {
                result.diagnostics.push(new FaultDiagnostic(
                    FaultType.TIMEOUT_FAULT, i, eventName,
                    { currentTime: timestamp, tleval: tleval }
                ));
                result.status = 'FAULT_DETECTED';
                return this._finalizeResult(result, vnet, state);
            }
            
            // VALIDACIÓN 3: Causalidad (existe arco desde evento anterior)
            if (i > 0) {
                const prevEventName = secuenciaInput[i - 1][0];
                const prevTimestamp = secuenciaInput[i - 1][1];
                
                // Buscar conexión directa
                const connection = connections.find(c =>
                    c.source.name === prevEventName && c.target.name === eventName
                );
                
                if (!connection) {
                    result.diagnostics.push(new FaultDiagnostic(
                        FaultType.CAUSALITY_FAULT, i, eventName,
                        { 
                            fromEvent: prevEventName,
                            expectedTargets: this._getOutgoingEvents(eventByName[prevEventName])
                        }
                    ));
                    if (strictMode) {
                        result.status = 'FAULT_DETECTED';
                        return this._finalizeResult(result, vnet, state);
                    }
                    continue;
                }
                
                // VALIDACIÓN 4: Restricción Temporal (Δt ∈ [min, max])
                const deltaT = timestamp - prevTimestamp;
                const minTime = connection.minTime;
                const maxTime = connection.maxTime === Infinity ? Infinity : connection.maxTime;
                
                if (deltaT < minTime) {
                    result.diagnostics.push(new FaultDiagnostic(
                        FaultType.TIME_FAULT, i, eventName,
                        {
                            subtype: TimeFaultSubtype.EARLY,
                            actualDelta: deltaT,
                            expectedMin: minTime,
                            expectedMax: maxTime === Infinity ? '∞' : maxTime,
                            message: `Evento llegó muy PRONTO: Δt=${deltaT.toFixed(3)} < min=${minTime}`
                        }
                    ));
                    if (strictMode) {
                        result.status = 'FAULT_DETECTED';
                        return this._finalizeResult(result, vnet, state);
                    }
                } else if (maxTime !== Infinity && deltaT > maxTime) {
                    result.diagnostics.push(new FaultDiagnostic(
                        FaultType.TIME_FAULT, i, eventName,
                        {
                            subtype: TimeFaultSubtype.LATE,
                            actualDelta: deltaT,
                            expectedMin: minTime,
                            expectedMax: maxTime,
                            message: `Evento llegó muy TARDE: Δt=${deltaT.toFixed(3)} > max=${maxTime}`
                        }
                    ));
                    if (strictMode) {
                        result.status = 'FAULT_DETECTED';
                        return this._finalizeResult(result, vnet, state);
                    }
                }
                
                // VALIDACIÓN 5: Restricción Inversa (si existe)
                if (connection.hasInverse) {
                    // Verificar si hay un evento anterior al previo que sea el actual
                    // Esto es para validar B → A cuando existe A → B con inversa
                    // Se implementa en validación de secuencias completas
                }
            }
            
            // VALIDACIÓN 6: Frecuencia máxima
            const event = eventByName[eventName];
            const currentCount = state.eventCounts[eventName] || 0;
            const maxFreq = event.frequency || 1;
            
            // Nota: frequency en el modelo actual es mínimo requerido, 
            // pero podemos agregar maxFrequency si es necesario
            
            // Agregar al timeline
            result.timeline.push({
                index: i,
                event: eventName,
                timestamp: timestamp,
                status: 'OK'
            });
            
            // Avanzar estado
            state.advance(eventName, timestamp);
            result.processedEvents++;
        }
        
        // VALIDACIÓN 7: Verificar que empieza con INIT
        const firstEvent = eventByName[secuenciaInput[0][0]];
        if (firstEvent && firstEvent.eventType !== 'init') {
            result.diagnostics.push(new FaultDiagnostic(
                FaultType.LOGIC_FAULT, 0, secuenciaInput[0][0],
                { 
                    predicate: 'StartWithInit',
                    message: `La secuencia debe comenzar con un evento INIT, no con '${secuenciaInput[0][0]}' (tipo: ${firstEvent.eventType})`
                }
            ));
        }
        
        // VALIDACIÓN 8: Verificar que termina con END
        const lastEvent = eventByName[secuenciaInput[secuenciaInput.length - 1][0]];
        if (lastEvent && lastEvent.eventType !== 'end') {
            result.diagnostics.push(new FaultDiagnostic(
                FaultType.LOGIC_FAULT, secuenciaInput.length - 1, secuenciaInput[secuenciaInput.length - 1][0],
                { 
                    predicate: 'EndWithEnd',
                    message: `La secuencia debe terminar con un evento END, no con '${secuenciaInput[secuenciaInput.length - 1][0]}' (tipo: ${lastEvent.eventType})`
                }
            ));
        }
        
        // Finalizar resultado
        return this._finalizeResult(result, vnet, state);
    },
    
    /**
     * Obtener eventos salientes de un nodo
     */
    _getOutgoingEvents(event) {
        if (!event || !event.outgoing) return [];
        return event.outgoing.map(conn => conn.target.name);
    },
    
    /**
     * Finalizar y calcular métricas del resultado
     */
    _finalizeResult(result, vnet, state = null) {
        // Calcular conformidad
        const faultCount = result.diagnostics.length;
        const totalChecks = result.totalEvents * 4; // 4 validaciones por evento aproximadamente
        
        if (faultCount === 0) {
            result.status = '100% RECOGNIZED';
            result.recognized = true;
            result.conformity = 100;
        } else {
            result.status = 'FAULT_DETECTED';
            result.recognized = false;
            result.conformity = Math.max(0, Math.round((1 - faultCount / Math.max(totalChecks, 1)) * 100));
        }
        
        // Resumen
        result.summary = {
            totalEvents: result.totalEvents,
            processedEvents: result.processedEvents,
            faultsDetected: faultCount,
            faultsByType: this._groupFaultsByType(result.diagnostics),
            recognitionRate: result.conformity + '%'
        };
        
        console.log(`   ✅ Resultado: ${result.status}`);
        console.log(`   Conformidad: ${result.conformity}%`);
        console.log(`   Fallos detectados: ${faultCount}`);
        
        return result;
    },
    
    /**
     * Agrupar fallos por tipo
     */
    _groupFaultsByType(diagnostics) {
        const groups = {};
        diagnostics.forEach(d => {
            if (!groups[d.type]) groups[d.type] = [];
            groups[d.type].push(d);
        });
        return groups;
    }
};

// =====================================================
// ALGORITMO DE DIAGNÓSTICO DE FALLOS
// =====================================================
const DiagnosticAlgorithm = {
    /**
     * Analizar fallos y generar reporte detallado
     */
    analyzeFaults(diagnostics) {
        const report = {
            totalFaults: diagnostics.length,
            criticalFaults: 0,
            warnings: 0,
            byType: {},
            recommendations: []
        };
        
        diagnostics.forEach(fault => {
            // Clasificar severidad
            if (fault.type === FaultType.TIMEOUT_FAULT || 
                fault.type === FaultType.CAUSALITY_FAULT) {
                report.criticalFaults++;
            } else {
                report.warnings++;
            }
            
            // Agrupar por tipo
            if (!report.byType[fault.type]) {
                report.byType[fault.type] = {
                    count: 0,
                    instances: []
                };
            }
            report.byType[fault.type].count++;
            report.byType[fault.type].instances.push(fault);
        });
        
        // Generar recomendaciones
        if (report.byType[FaultType.TIME_FAULT]) {
            const timeFaults = report.byType[FaultType.TIME_FAULT].instances;
            const earlyCount = timeFaults.filter(f => f.details.subtype === TimeFaultSubtype.EARLY).length;
            const lateCount = timeFaults.filter(f => f.details.subtype === TimeFaultSubtype.LATE).length;
            
            if (earlyCount > lateCount) {
                report.recommendations.push('Considerar aumentar los tiempos mínimos de las restricciones');
            } else if (lateCount > earlyCount) {
                report.recommendations.push('Considerar aumentar los tiempos máximos de las restricciones');
            }
        }
        
        if (report.byType[FaultType.CAUSALITY_FAULT]) {
            report.recommendations.push('Verificar que existan todas las conexiones necesarias en la V-net');
        }
        
        return report;
    },
    
    /**
     * Generar diagnóstico legible
     */
    generateReadableReport(diagnostics) {
        if (diagnostics.length === 0) {
            return '✅ No se detectaron fallos. Secuencia 100% reconocida.';
        }
        
        let report = '❌ DIAGNÓSTICO DE FALLOS\n';
        report += '═'.repeat(50) + '\n\n';
        
        diagnostics.forEach((fault, index) => {
            report += `[${index + 1}] ${fault.toString()}\n\n`;
        });
        
        return report;
    }
};

// =====================================================
// VALIDADOR DE SECUENCIAS (Wrapper para UI)
// =====================================================
const SequenceValidator = {
    /**
     * Parsear secuencia desde diferentes formatos de texto
     */
    parseSequence(text, eventNames) {
        const normalized = text.trim();
        const events = [];
        
        // Formato 1: EventName(time), EventName(time), ...
        // Formato 2: EventName, EventName, ...
        // Formato 3: EventName | time (por línea)
        // Formato 4: [("EventName", time), ("EventName", time), ...]

        // Detectar formato Python/tuplas
        if (normalized.startsWith('[') && normalized.includes('(')) {
            // Formato Python: [("B", 0), ("RPIi", 0.5), ...]
            const regex = /\(\s*["']([^"']+)["']\s*,\s*([0-9.]+)\s*\)/g;
            let match;
            while ((match = regex.exec(normalized)) !== null) {
                events.push({
                    name: match[1],
                    time: parseFloat(match[2])
                });
            }
            return events;
        }
        
        // Detectar formato tabla
        if (normalized.includes('|')) {
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
            return events;
        }
        
        // Detectar formato con timestamps: A(0), B(3), ...
        if (normalized.includes('(') && normalized.includes(')')) {
            const regex = /([a-zA-Z0-9_]+)\s*\(\s*([0-9.]+)\s*\)/g;
            let match;
            while ((match = regex.exec(normalized)) !== null) {
                events.push({
                    name: match[1],
                    time: parseFloat(match[2])
                });
            }
            return events;
        }
        
        // Formato solo nombres
        const separators = /[\s,\-\>→;]+/;
        const names = normalized.split(separators)
            .map(n => n.trim())
            .filter(n => n && /^[a-zA-Z0-9_]+$/.test(n));
        
        console.log('   🔍 Parsing formato "solo nombres":');
        console.log('      Input normalizado:', normalized);
        console.log('      Nombres extraídos:', names);
        
        names.forEach(name => {
            events.push({ name, time: null });
        });
        
        return events;
    },

    /**
     * Asignar tiempos automáticamente si no están especificados
     */
    assignAutoTimes(events, vnet) {
        if (events.length === 0) return events;

        const allHaveTimes = events.every(e => e.time !== null);
        if (allHaveTimes) return events;

        const result = [...events];
        result[0].time = 0;

        for (let i = 1; i < result.length; i++) {
            const prevName = result[i - 1].name;
            const currName = result[i].name;
            
            const conn = Object.values(vnet.connections).find(c => 
                c.source.name === prevName && c.target.name === currName
            );

            if (conn) {
                result[i].time = result[i - 1].time + conn.minTime;
            } else {
                result[i].time = result[i - 1].time + 1;
            }
        }

        return result;
    },

    /**
     * Validar secuencia usando el Algoritmo de Reconocimiento
     * Compatible con la UI existente
     */
    validate(sequence, vnet, options = {}) {
        // Convertir formato UI a formato del algoritmo
        const secuenciaInput = sequence.map(s => [s.name, s.time]);
        
        // Ejecutar algoritmo de reconocimiento
        const recognitionResult = RecognitionAlgorithm.reconocerSecuencia(secuenciaInput, vnet, {
            ...options,
            strictMode: false  // Para UI, mostrar todos los errores
        });
        
        // Convertir resultado al formato esperado por la UI
        return this._convertToUIFormat(recognitionResult, sequence, vnet);
    },
    
    /**
     * Convertir resultado del algoritmo al formato de UI
     */
    _convertToUIFormat(recognitionResult, sequence, vnet) {
        const result = {
            valid: recognitionResult.recognized,
            conformity: recognitionResult.conformity,
            checks: [],
            errors: [],
            warnings: [],
            summary: {},
            diagnostics: recognitionResult.diagnostics  // Incluir diagnósticos completos
        };
        
        // Convertir diagnósticos a checks y errores
        const faultsByType = recognitionResult.summary.faultsByType || {};
        
        // Check: Existencia de eventos
        const eventFaults = faultsByType[FaultType.EVENT_FAULT] || [];
        if (eventFaults.length === 0) {
            result.checks.push({ name: 'Existencia de eventos', passed: true, detail: 'Todos los eventos existen en E' });
        } else {
            result.checks.push({ name: 'Existencia de eventos', passed: false, detail: `${eventFaults.length} eventos no encontrados` });
            eventFaults.forEach(f => result.errors.push(f.toString()));
        }
        
        // Check: Causalidad
        const causalityFaults = faultsByType[FaultType.CAUSALITY_FAULT] || [];
        if (causalityFaults.length === 0 && sequence.length > 1) {
            result.checks.push({ name: 'Causalidad (conexiones)', passed: true, detail: 'Todas las conexiones existen' });
        } else if (causalityFaults.length > 0) {
            result.checks.push({ name: 'Causalidad (conexiones)', passed: false, detail: `${causalityFaults.length} conexiones faltantes` });
            causalityFaults.forEach(f => result.errors.push(f.toString()));
        }
        
        // Check: Restricciones temporales
        const timeFaults = faultsByType[FaultType.TIME_FAULT] || [];
        if (timeFaults.length === 0 && sequence.length > 1) {
            result.checks.push({ name: 'Restricciones temporales', passed: true, detail: 'Δt ∈ [min, max] para todas las transiciones' });
        } else if (timeFaults.length > 0) {
            const earlyCount = timeFaults.filter(f => f.details.subtype === TimeFaultSubtype.EARLY).length;
            const lateCount = timeFaults.filter(f => f.details.subtype === TimeFaultSubtype.LATE).length;
            result.checks.push({ 
                name: 'Restricciones temporales', 
                passed: false, 
                detail: `${earlyCount} precoces, ${lateCount} tardíos` 
            });
            timeFaults.forEach(f => result.errors.push(f.toString()));
        }
        
        // Check: Validación global (tleval)
        const timeoutFaults = faultsByType[FaultType.TIMEOUT_FAULT] || [];
        if (timeoutFaults.length === 0) {
            result.checks.push({ name: 'Validación global (tleval)', passed: true, detail: 'Dentro del tiempo límite' });
        } else {
            result.checks.push({ name: 'Validación global (tleval)', passed: false, detail: 'Excedió tiempo límite' });
            timeoutFaults.forEach(f => result.errors.push(f.toString()));
        }
        
        // Check: Predicados lógicos
        const logicFaults = faultsByType[FaultType.LOGIC_FAULT] || [];
        if (logicFaults.length === 0) {
            result.checks.push({ name: 'Predicados lógicos', passed: true, detail: 'Init→...→End válido' });
        } else {
            result.checks.push({ name: 'Predicados lógicos', passed: false, detail: `${logicFaults.length} predicados fallidos` });
            logicFaults.forEach(f => result.errors.push(f.toString()));
        }
        
        // Resumen
        const events = Object.values(vnet.events);
        const eventCounts = {};
        sequence.forEach(s => {
            eventCounts[s.name] = (eventCounts[s.name] || 0) + 1;
        });
        
        result.summary = {
            totalEvents: sequence.length,
            uniqueEvents: Object.keys(eventCounts).length,
            totalTime: sequence.length > 0 ? sequence[sequence.length - 1].time - sequence[0].time : 0,
            passedChecks: result.checks.filter(c => c.passed).length,
            totalChecks: result.checks.length,
            status: recognitionResult.status
        };
        
        return result;
    },
    
    /**
     * Método directo para usar formato de tuplas
     * Ej: reconocerSecuencia([["B", 0], ["RPIi", 0.5], ["RPIf", 6]], vnet)
     */
    reconocerSecuencia(secuenciaInput, vnet, options = {}) {
        return RecognitionAlgorithm.reconocerSecuencia(secuenciaInput, vnet, options);
    }
};

// =====================================================
// DIÁLOGO DE VALIDACIÓN (UI)
// =====================================================
const SequenceValidatorDialog = {
    show(vnet) {
        const eventNames = Object.values(vnet.events).map(e => e.name);

        console.log('🔍 SequenceValidatorDialog.show() iniciado');
        console.log('   Eventos:', eventNames);

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
                                placeholder="Formatos aceptados:&#10;&#10;1. Con tiempos: A(0), B(3), D(10)&#10;2. Sin tiempos: A, B, D&#10;3. Formato Python: [(&quot;B&quot;, 0), (&quot;RPIi&quot;, 0.5), ...]&#10;4. Tabla:&#10;   A | 0&#10;   B | 3"></textarea>
                        </div>
                        
                        <div class="form-row">
                            <div class="form-group">
                                <label for="tlevalInput">tleval (tiempo máximo global):</label>
                                <input type="number" id="tlevalInput" class="form-control" value="59" step="0.1" min="0">
                                <span class="help-text">Dejar vacío o 0 para sin límite</span>
                            </div>
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
        
        // 🔐 Marcar modal como abierto para prevenir eliminación accidental
        if (window.VNetDialogs) {
            window.VNetDialogs.isModalOpen = true;
        }
        
        console.log('   ✅ Modal creado e inyectado en el DOM');
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
        const tlevalInput = document.getElementById('tlevalInput').value;
        const tleval = tlevalInput && parseFloat(tlevalInput) > 0 ? parseFloat(tlevalInput) : Infinity;
        
        const eventNames = Object.values(this._vnet.events).map(e => e.name);

        console.log('🔍 SequenceValidator.validate() iniciado');
        console.log('   Input:', input);
        console.log('   tleval:', tleval);
        console.log('   Eventos disponibles:', eventNames);

        // Parsear secuencia
        let sequence = SequenceValidator.parseSequence(input, eventNames);

        console.log('   Secuencia parseada:', sequence);

        if (sequence.length === 0) {
            console.error('❌ No se pudo interpretar la secuencia');
            document.getElementById('validationResults').innerHTML = `
                <div class="validation-result error">
                    <h4>Error de Formato</h4>
                    <p>No se pudo interpretar la secuencia. Verifique el formato.</p>
                    <p>Intentó parsear: "${input}"</p>
                    <p>Eventos disponibles: ${eventNames.join(', ')}</p>
                </div>
            `;
            return;
        }

        console.log('   Asignando tiempos automáticos...');
        sequence = SequenceValidator.assignAutoTimes(sequence, this._vnet);
        
        console.log('   Secuencia con tiempos:', sequence);

        console.log('   Validando con Algoritmo de Reconocimiento...');
        const result = SequenceValidator.validate(sequence, this._vnet, { tleval });

        console.log('   Resultado de validación:', result);
        this.showResults(result, sequence);
    },

    showResults(result, sequence) {
        const conformityClass = result.conformity >= 80 ? 'high' : (result.conformity >= 50 ? 'medium' : 'low');
        const statusText = result.summary.status || (result.valid ? '100% RECOGNIZED' : 'FAULT_DETECTED');

        let html = `
            <div class="validation-result ${result.valid ? 'success' : 'error'}">
                <div class="validation-header">
                    <div class="validation-status">
                        ${statusText}
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

        // Diagnósticos detallados
        if (result.diagnostics && result.diagnostics.length > 0) {
            html += `
                <div class="validation-errors">
                    <h5>🔍 Diagnóstico de Fallos:</h5>
                    <div class="diagnostics-list">
                        ${result.diagnostics.map((d, i) => `
                            <div class="diagnostic-item ${d.type.toLowerCase().replace('_', '-')}">
                                <span class="diagnostic-type">[${d.type}]</span>
                                <span class="diagnostic-event">Evento ${d.eventIndex}: '${d.eventName}'</span>
                                <span class="diagnostic-detail">${d.details.message || JSON.stringify(d.details)}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }

        if (result.errors.length > 0 && (!result.diagnostics || result.diagnostics.length === 0)) {
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

// =====================================================
// EXPORTAR
// =====================================================
window.FaultType = FaultType;
window.TimeFaultSubtype = TimeFaultSubtype;
window.FaultDiagnostic = FaultDiagnostic;
window.RecognitionAlgorithm = RecognitionAlgorithm;
window.DiagnosticAlgorithm = DiagnosticAlgorithm;
window.SequenceValidator = SequenceValidator;
window.SequenceValidatorDialog = SequenceValidatorDialog;
