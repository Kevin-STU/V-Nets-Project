/**
 * V-Nets Web Editor - Data Models
 * Equivalent to Python models.py
 */

// Generate unique IDs
function generateId() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

/**
 * Gestor de historial de Undo/Redo
 */
class UndoManager {
    constructor(maxHistory = 50) {
        this.undoStack = [];
        this.redoStack = [];
        this.maxHistory = maxHistory;
        this.isPerformingAction = false;
        this.onStateChange = null;
    }

    // Guardar estado para poder deshacerlo
    saveState(state, description = '') {
        if (this.isPerformingAction) return;

        // Limpiar redo stack cuando se hace una nueva acción
        this.redoStack = [];

        // Agregar estado al undo stack
        this.undoStack.push({
            state: JSON.stringify(state),
            description,
            timestamp: Date.now()
        });

        // Limitar tamaño del historial
        if (this.undoStack.length > this.maxHistory) {
            this.undoStack.shift();
        }

        this.notifyStateChange();
    }

    // Verificar si se puede deshacer
    canUndo() {
        return this.undoStack.length > 1; // Necesita al menos 2 estados para deshacer
    }

    // Verificar si se puede rehacer
    canRedo() {
        return this.redoStack.length > 0;
    }

    // Deshacer
    undo() {
        if (!this.canUndo()) return null;

        this.isPerformingAction = true;

        // Mover el estado actual al redo stack
        const currentState = this.undoStack.pop();
        this.redoStack.push(currentState);

        // Obtener el estado anterior
        const previousState = this.undoStack[this.undoStack.length - 1];

        this.isPerformingAction = false;
        this.notifyStateChange();

        return JSON.parse(previousState.state);
    }

    // Rehacer
    redo() {
        if (!this.canRedo()) return null;

        this.isPerformingAction = true;

        // Obtener el estado del redo stack
        const nextState = this.redoStack.pop();
        this.undoStack.push(nextState);

        this.isPerformingAction = false;
        this.notifyStateChange();

        return JSON.parse(nextState.state);
    }

    // Limpiar historial
    clear() {
        this.undoStack = [];
        this.redoStack = [];
        this.notifyStateChange();
    }

    // Obtener información del historial
    getInfo() {
        return {
            undoCount: this.undoStack.length - 1, // -1 porque el primer estado es el inicial
            redoCount: this.redoStack.length,
            canUndo: this.canUndo(),
            canRedo: this.canRedo()
        };
    }

    notifyStateChange() {
        if (this.onStateChange) {
            this.onStateChange(this.getInfo());
        }
    }
}

/**
 * Represents an event node in the V-Net
 */
class EventNode {
    constructor(eventType, position = { x: 100, y: 100 }) {
        this.id = generateId();
        this.eventType = eventType; // 'init', 'end', 'intermediate'
        this.name = this.generateDefaultName(eventType);
        this.position = { ...position };
        this.minTime = 0;
        this.maxTime = Infinity;
        this.frequency = 1;
        this.incoming = [];
        this.outgoing = [];
        this.graphicItem = null;
    }

    generateDefaultName(eventType) {
        const prefix = eventType.charAt(0).toUpperCase() + eventType.slice(1);
        return `${prefix}_${Date.now().toString(36)}`;
    }

    toDict() {
        return {
            id: this.id,
            eventType: this.eventType,
            name: this.name,
            position: this.position,
            minTime: this.minTime,
            maxTime: this.maxTime === Infinity ? null : this.maxTime,
            frequency: this.frequency
        };
    }

    static fromDict(data) {
        const node = new EventNode(data.eventType, data.position);
        node.id = data.id;
        node.name = data.name;
        node.minTime = data.minTime !== undefined && data.minTime !== null ? data.minTime : 0;
        node.maxTime = data.maxTime === null ? Infinity : data.maxTime;
        node.frequency = data.frequency || 1;
        return node;
    }
}

/**
 * Represents a connection between two event nodes with temporal constraints
 */
class Connection {
    constructor(source, target, minTime = 0, maxTime = Infinity) {
        this.id = generateId();
        this.source = source;
        this.target = target;
        this.minTime = minTime;
        this.maxTime = maxTime;
        
        // Frequencies for occurrences
        this.sourceFrequency = 1;
        this.targetFrequency = 1;
        
        // Inverse restriction (target -> source)
        this.hasInverse = false;
        this.inverseMinTime = 0;
        this.inverseMaxTime = Infinity;
        
        // Graphic reference
        this.graphicItem = null;
    }

    getLabel() {
        const maxTimeStr = this.maxTime === Infinity ? '∞' : this.maxTime.toFixed(2);
        return `${this.source.name}^${this.sourceFrequency}[${this.minTime.toFixed(2)},${maxTimeStr}]^${this.targetFrequency}${this.target.name}`;
    }

    toDict() {
        return {
            id: this.id,
            sourceId: this.source.id,
            targetId: this.target.id,
            minTime: this.minTime,
            maxTime: this.maxTime === Infinity ? null : this.maxTime,
            sourceFrequency: this.sourceFrequency,
            targetFrequency: this.targetFrequency,
            hasInverse: this.hasInverse,
            inverseMinTime: this.inverseMinTime,
            inverseMaxTime: this.inverseMaxTime === Infinity ? null : this.inverseMaxTime
        };
    }

    static fromDict(data, events) {
        const source = events[data.sourceId];
        const target = events[data.targetId];
        if (!source || !target) return null;
        
        const conn = new Connection(
            source, 
            target, 
            data.minTime, 
            data.maxTime === null ? Infinity : data.maxTime
        );
        conn.id = data.id;
        conn.sourceFrequency = data.sourceFrequency || 1;
        conn.targetFrequency = data.targetFrequency || 1;
        conn.hasInverse = data.hasInverse || false;
        conn.inverseMinTime = data.inverseMinTime || 0;
        conn.inverseMaxTime = data.inverseMaxTime === null ? Infinity : data.inverseMaxTime;
        return conn;
    }
}

/**
 * Complete V-Net graph model
 */
class VNetGraph {
    constructor() {
        this.events = {};
        this.connections = {};
        this.changed = false;
        this.onValidationError = null;
        this.onGraphChanged = null;

        // Sistema de Undo/Redo
        this.undoManager = new UndoManager();
        this._isRestoringState = false;

        // tleval: tiempo máximo de evaluación de secuencias (del artículo)
        this.tleval = 0;
    }

    // Guardar estado actual para undo
    saveUndoState(description = '') {
        // DESHABILITADO: causaba que se perdieran conexiones
        return;
        if (this._isRestoringState) return;

        const state = {
            events: Object.values(this.events).map(e => e.toDict()),
            connections: Object.values(this.connections).map(c => c.toDict())
        };
        this.undoManager.saveState(state, description);

        // Actualizar tleval cuando cambia el estado
        this.updateTleval();
    }

    // Calcular tleval: tiempo máximo de evaluación (del artículo)
    updateTleval() {
        // tleval es el tiempo máximo de evaluación de una secuencia
        // Se calcula como el máximo tiempo posible en una secuencia completa INIT->END

        const initEvents = Object.values(this.events).filter(e => e.eventType === 'init');
        const endEvents = Object.values(this.events).filter(e => e.eventType === 'end');

        if (initEvents.length === 0 || endEvents.length === 0) {
            this.tleval = 0;
            return;
        }

        let maxTime = 0;

        // Para cada par INIT->END, calcular el tiempo máximo posible
        for (const init of initEvents) {
            for (const end of endEvents) {
                const pathTime = this.calculateMaxPathTime(init, end);
                maxTime = Math.max(maxTime, pathTime);
            }
        }

        this.tleval = maxTime;
    }

    // Calcular tiempo máximo en el camino más largo entre dos eventos
    calculateMaxPathTime(startEvent, endEvent) {
        // Algoritmo simplificado: suma las restricciones temporales máximas
        // en el camino más largo desde start hasta end

        const visited = new Set();
        const maxTime = this._dfsMaxTime(startEvent, endEvent, visited);
        return maxTime;
    }

    _dfsMaxTime(current, target, visited) {
        if (current.id === target.id) {
            return 0; // Llegamos al destino
        }

        if (visited.has(current.id)) {
            return 0; // Evitar ciclos
        }

        visited.add(current.id);
        let maxPathTime = 0;

        // Explorar todas las conexiones salientes
        for (const conn of current.outgoing) {
            const nextEvent = conn.target;
            const edgeTime = conn.maxTime === Infinity ? 1000 : conn.maxTime; // Usar 1000 como límite superior razonable
            const remainingTime = this._dfsMaxTime(nextEvent, target, visited);

            if (remainingTime >= 0) { // Si hay camino válido
                maxPathTime = Math.max(maxPathTime, edgeTime + remainingTime);
            }
        }

        visited.delete(current.id);
        return maxPathTime;
    }

    // Deshacer última acción
    undo() {
        const previousState = this.undoManager.undo();
        if (previousState) {
            this.restoreFromState(previousState);
            return true;
        }
        return false;
    }

    // Rehacer acción deshecha
    redo() {
        const nextState = this.undoManager.redo();
        if (nextState) {
            this.restoreFromState(nextState);
            return true;
        }
        return false;
    }

    // Restaurar estado desde un snapshot
    restoreFromState(state) {
        this._isRestoringState = true;

        // Limpiar estado actual
        this.events = {};
        this.connections = {};

        // Restaurar eventos
        for (const eventData of state.events) {
            const event = EventNode.fromDict(eventData);
            this.events[event.id] = event;
        }

        // Restaurar conexiones
        for (const connData of state.connections) {
            const conn = Connection.fromDict(connData, this.events);
            if (conn) {
                this.connections[conn.id] = conn;
                conn.source.outgoing.push(conn);
                conn.target.incoming.push(conn);
            }
        }

        this._isRestoringState = false;
        this.changed = true;
        
        // Notificar que el grafo cambió
        if (this.onGraphChanged) this.onGraphChanged();
    }

    canUndo() {
        return this.undoManager.canUndo();
    }

    canRedo() {
        return this.undoManager.canRedo();
    }

    addEvent(event, saveUndo = true) {
        this.events[event.id] = event;
        this.changed = true;
        if (this.onGraphChanged) this.onGraphChanged();
        
        // NO guardar undo state automáticamente
        return event;
    }

    removeEvent(eventId, saveUndo = true) {
        const event = this.events[eventId];
        if (!event) return;

        // Remove connections associated with this event
        const connectionsToRemove = [
            ...event.incoming.map(c => c.id),
            ...event.outgoing.map(c => c.id)
        ];
        connectionsToRemove.forEach(connId => this.removeConnection(connId, false));

        delete this.events[eventId];
        this.changed = true;
        if (this.onGraphChanged) this.onGraphChanged();
        
        // Guardar el undo state DESPUÉS de remover el evento
        if (saveUndo) this.saveUndoState('Eliminar evento');
    }

    addConnection(connection, saveUndo = true) {
        console.log(`addConnection llamado: ${connection.source.name} → ${connection.target.name}`);

        if (connection.source.eventType === 'end') {
            console.warn('Un evento END no puede tener conexiones salientes');
            return null;
        }

        const existing = Object.values(this.connections).find(
            c => c.source.id === connection.source.id && c.target.id === connection.target.id
        );
        if (existing) {
            console.warn('Connection already exists');
            return null;
        }

        console.log('Conexión válida, agregando al modelo');

        this.connections[connection.id] = connection;
        connection.source.outgoing.push(connection);
        connection.target.incoming.push(connection);
        this.changed = true;
        if (this.onGraphChanged) this.onGraphChanged();
        
        console.log(`Conexión agregada. Total: ${Object.keys(this.connections).length}`);

        return connection;
    }

    removeConnection(connectionId, saveUndo = true) {
        const connection = this.connections[connectionId];
        if (!connection) return;

        // Remover la conexión PRIMERO
        // Remove from source's outgoing
        const sourceIdx = connection.source.outgoing.findIndex(c => c.id === connectionId);
        if (sourceIdx !== -1) connection.source.outgoing.splice(sourceIdx, 1);

        // Remove from target's incoming
        const targetIdx = connection.target.incoming.findIndex(c => c.id === connectionId);
        if (targetIdx !== -1) connection.target.incoming.splice(targetIdx, 1);

        delete this.connections[connectionId];
        this.changed = true;
        if (this.onGraphChanged) this.onGraphChanged();
        
        // DESPUÉS guardar el undo state con la conexión ya removida
        if (saveUndo) this.saveUndoState('Eliminar conexión');
    }

    // Guardar estado antes de modificar propiedades
    savePropertiesState(description = 'Modificar propiedades') {
        this.saveUndoState(description);
    }

    validate() {
        const errors = [];
        const warnings = [];
        const events = Object.values(this.events);

        // Check for at least one INIT event
        const initEvents = events.filter(e => e.eventType === 'init');
        if (initEvents.length === 0) {
            errors.push('La V-Net debe tener al menos un evento INIT');
        }

        // Check for at least one END event
        const endEvents = events.filter(e => e.eventType === 'end');
        if (endEvents.length === 0) {
            errors.push('La V-Net debe tener al menos un evento END');
        }

        // Check temporal constraint consistency
        for (const conn of Object.values(this.connections)) {
            if (conn.minTime > conn.maxTime && conn.maxTime !== Infinity) {
                errors.push(`Restricción temporal inválida en ${conn.source.name} → ${conn.target.name}: min (${conn.minTime}) > max (${conn.maxTime})`);
            }

            // Validar coherencia de restricciones inversas
            if (conn.hasInverse) {
                if (conn.inverseMinTime > conn.inverseMaxTime && conn.inverseMaxTime !== Infinity) {
                    errors.push(`Restricción inversa inválida en ${conn.target.name} → ${conn.source.name}: min (${conn.inverseMinTime}) > max (${conn.inverseMaxTime})`);
                }
            }
        }

        // Check that all events are connected
        for (const event of events) {
            if (event.eventType === 'init' && event.outgoing.length === 0) {
                errors.push(`Evento INIT '${event.name}' no tiene conexiones salientes`);
            }
            if (event.eventType === 'end' && event.incoming.length === 0) {
                errors.push(`Evento END '${event.name}' no tiene conexiones entrantes`);
            }
            if (event.eventType === 'intermediate') {
                if (event.incoming.length === 0 && event.outgoing.length === 0) {
                    errors.push(`Evento intermedio '${event.name}' no está conectado`);
                } else if (event.incoming.length === 0) {
                    warnings.push(`Evento intermedio '${event.name}' no tiene conexiones entrantes`);
                } else if (event.outgoing.length === 0) {
                    warnings.push(`Evento intermedio '${event.name}' no tiene conexiones salientes`);
                }
            }
        }

        // Verificar caminos desde INIT hacia END (BFS)
        if (initEvents.length > 0 && endEvents.length > 0) {
            const pathCheckResult = this.checkPathsFromInitToEnd(initEvents, endEvents);
            
            if (!pathCheckResult.hasPath) {
                errors.push('No existe un camino desde ningún evento INIT hacia un evento END');
            }

            // Eventos INIT sin camino a END
            pathCheckResult.initWithoutPath.forEach(initEvent => {
                warnings.push(`El evento INIT '${initEvent.name}' no tiene camino hacia ningún evento END`);
            });

            // Eventos END sin camino desde INIT
            pathCheckResult.endWithoutPath.forEach(endEvent => {
                warnings.push(`El evento END '${endEvent.name}' no es alcanzable desde ningún evento INIT`);
            });

            // Eventos intermedios aislados
            pathCheckResult.unreachableEvents.forEach(event => {
                if (event.eventType === 'intermediate') {
                    warnings.push(`Evento intermedio '${event.name}' no está en ningún camino válido INIT→END`);
                }
            });
        }

        // Detectar ciclos sin salida
        const cycleCheck = this.detectProblematicCycles();
        if (cycleCheck.hasProblematicCycle) {
            cycleCheck.cycles.forEach(cycle => {
                warnings.push(`Posible ciclo sin salida detectado: ${cycle.join(' → ')}`);
            });
        }

        // Validar frecuencias
        for (const event of events) {
            if (event.frequency < 1) {
                errors.push(`Evento '${event.name}' tiene frecuencia inválida: ${event.frequency}`);
            }
        }

        const result = {
            valid: errors.length === 0,
            errors,
            warnings
        };

        if (errors.length > 0 && this.onValidationError) {
            let message = errors.join('\n');
            if (warnings.length > 0) {
                message += '\n\nAdvertencias:\n' + warnings.join('\n');
            }
            this.onValidationError(message);
        }

        return result;
    }

    // Verificar caminos desde INIT hacia END usando BFS
    checkPathsFromInitToEnd(initEvents, endEvents) {
        const allEvents = Object.values(this.events);
        const endIds = new Set(endEvents.map(e => e.id));
        
        // Eventos alcanzables desde cualquier INIT (forward reachability)
        const reachableFromAnyInit = new Set();
        const initsThatReachEnd = new Set();
        const endsReachedFromInit = new Set();

        for (const initEvent of initEvents) {
            const visited = new Set();
            const queue = [initEvent];
            visited.add(initEvent.id);
            reachableFromAnyInit.add(initEvent.id);
            let reachesEnd = false;

            while (queue.length > 0) {
                const current = queue.shift();

                // Si llegamos a un END, marcar éxito
                if (endIds.has(current.id)) {
                    reachesEnd = true;
                    endsReachedFromInit.add(current.id);
                }

                // Agregar vecinos no visitados
                for (const conn of current.outgoing) {
                    if (!visited.has(conn.target.id)) {
                        visited.add(conn.target.id);
                        reachableFromAnyInit.add(conn.target.id);
                        queue.push(conn.target);
                    }
                }
            }
            
            if (reachesEnd) {
                initsThatReachEnd.add(initEvent.id);
            }
        }

        // Eventos que pueden alcanzar algún END (backward reachability)
        const canReachEnd = new Set();
        for (const endEvent of endEvents) {
            const visited = new Set();
            const queue = [endEvent];
            visited.add(endEvent.id);
            canReachEnd.add(endEvent.id);

            while (queue.length > 0) {
                const current = queue.shift();

                for (const conn of current.incoming) {
                    if (!visited.has(conn.source.id)) {
                        visited.add(conn.source.id);
                        canReachEnd.add(conn.source.id);
                        queue.push(conn.source);
                    }
                }
            }
        }

        // Encontrar eventos no alcanzables en ningún camino válido
        // Un evento está desconectado si: NO es alcanzable desde INIT O NO puede alcanzar END
        const unreachableEvents = allEvents.filter(e => 
            !reachableFromAnyInit.has(e.id) || !canReachEnd.has(e.id)
        );

        return {
            hasPath: initsThatReachEnd.size > 0,
            initWithoutPath: initEvents.filter(e => !initsThatReachEnd.has(e.id)),
            endWithoutPath: endEvents.filter(e => !endsReachedFromInit.has(e.id)),
            unreachableEvents
        };
    }

    // Detectar ciclos que podrían causar problemas
    detectProblematicCycles() {
        const events = Object.values(this.events);
        const endIds = new Set(events.filter(e => e.eventType === 'end').map(e => e.id));
        const cycles = [];

        // Buscar ciclos donde ningún nodo del ciclo puede salir hacia END
        for (const startEvent of events) {
            if (startEvent.eventType === 'end') continue;

            const visited = new Map(); // eventId -> índice en el camino
            const path = [];

            const dfs = (current, index) => {
                if (visited.has(current.id)) {
                    // Encontramos un ciclo
                    const cycleStart = visited.get(current.id);
                    const cycle = path.slice(cycleStart).map(e => e.name);
                    cycle.push(current.name);
                    
                    // Verificar si algún nodo del ciclo puede salir hacia END
                    const cycleEvents = path.slice(cycleStart);
                    let canEscapeToEnd = false;
                    
                    for (const cycleEvent of cycleEvents) {
                        for (const conn of cycleEvent.outgoing) {
                            if (!path.slice(cycleStart).some(e => e.id === conn.target.id)) {
                                // Esta conexión sale del ciclo
                                canEscapeToEnd = true;
                                break;
                            }
                        }
                        if (canEscapeToEnd) break;
                    }

                    if (!canEscapeToEnd && cycle.length > 1) {
                        // Solo agregar si no es un ciclo ya reportado
                        const cycleKey = [...cycle].sort().join(',');
                        if (!cycles.some(c => [...c].sort().join(',') === cycleKey)) {
                            cycles.push(cycle);
                        }
                    }
                    return;
                }

                visited.set(current.id, index);
                path.push(current);

                for (const conn of current.outgoing) {
                    dfs(conn.target, index + 1);
                }

                path.pop();
                visited.delete(current.id);
            };

            dfs(startEvent, 0);
        }

        return {
            hasProblematicCycle: cycles.length > 0,
            cycles
        };
    }

    toDict() {
        return {
            events: Object.values(this.events).map(e => e.toDict()),
            connections: Object.values(this.connections).map(c => c.toDict())
        };
    }

    // Formato compatible con archivos .vnet del proyecto de escritorio
    toVNetFormat() {
        const events = {};
        const connections = {};

        Object.values(this.events).forEach(e => {
            events[e.id] = {
                id: e.id,
                type: e.eventType,
                name: e.name,
                position: [e.position.x, e.position.y],
                min_time: e.minTime,
                max_time: e.maxTime === Infinity ? null : e.maxTime,
                frequency: e.frequency
            };
        });

        Object.values(this.connections).forEach(c => {
            connections[c.id] = {
                id: c.id,
                source: c.source.id,
                target: c.target.id,
                min_time: c.minTime,
                max_time: c.maxTime === Infinity ? null : c.maxTime,
                source_frequency: c.sourceFrequency,
                target_frequency: c.targetFrequency,
                has_inverse: c.hasInverse,
                inverse_min_time: c.inverseMinTime,
                inverse_max_time: c.inverseMaxTime === Infinity ? null : c.inverseMaxTime
            };
        });

        return { events, connections };
    }

    static fromDict(data) {
        const graph = new VNetGraph();
        
        // Load events
        for (const eventData of data.events) {
            const event = EventNode.fromDict(eventData);
            graph.events[event.id] = event;
        }

        // Load connections
        for (const connData of data.connections) {
            const conn = Connection.fromDict(connData, graph.events);
            if (conn) {
                graph.connections[conn.id] = conn;
                conn.source.outgoing.push(conn);
                conn.target.incoming.push(conn);
            }
        }

        return graph;
    }

    // Cargar desde formato .vnet del proyecto de escritorio
    static fromVNetFormat(data) {
        const graph = new VNetGraph();

        // Cargar eventos (formato objeto con IDs como claves)
        const eventsData = data.events || {};
        for (const [id, eventData] of Object.entries(eventsData)) {
            const position = Array.isArray(eventData.position) 
                ? { x: eventData.position[0], y: eventData.position[1] }
                : eventData.position || { x: 100, y: 100 };
            
            const event = new EventNode(eventData.type || eventData.eventType, position);
            event.id = eventData.id || id;
            event.name = eventData.name;
            event.minTime = eventData.min_time !== undefined && eventData.min_time !== null ? eventData.min_time : 0;
            event.maxTime = eventData.max_time === null || eventData.max_time === undefined 
                ? Infinity : eventData.max_time;
            event.frequency = eventData.frequency || 1;
            graph.events[event.id] = event;
        }

        // Cargar conexiones
        const connectionsData = data.connections || {};
        for (const [id, connData] of Object.entries(connectionsData)) {
            const source = graph.events[connData.source];
            const target = graph.events[connData.target];
            
            if (source && target) {
                const minTimeVal = connData.min_time !== undefined && connData.min_time !== null ? connData.min_time : 0;
                const maxTimeVal = connData.max_time === null || connData.max_time === undefined 
                    ? Infinity : connData.max_time;
                const conn = new Connection(source, target, minTimeVal, maxTimeVal);
                conn.id = connData.id || id;
                conn.sourceFrequency = connData.source_frequency || 1;
                conn.targetFrequency = connData.target_frequency || 1;
                conn.hasInverse = connData.has_inverse || false;
                conn.inverseMinTime = connData.inverse_min_time || 0;
                conn.inverseMaxTime = connData.inverse_max_time === null 
                    ? Infinity : (connData.inverse_max_time || Infinity);
                
                graph.connections[conn.id] = conn;
                source.outgoing.push(conn);
                target.incoming.push(conn);
            }
        }

        return graph;
    }

    clear() {
        this.events = {};
        this.connections = {};
        this.changed = true;
        if (this.onGraphChanged) this.onGraphChanged();
    }

    // Convert to format compatible with existing VNDA algorithm
    toSequenceFormat() {
        const events = Object.values(this.events);
        const connections = Object.values(this.connections);
        
        return {
            E: events.map(e => e.name),
            INIT: events.filter(e => e.eventType === 'init').map(e => e.name),
            END: events.filter(e => e.eventType === 'end').map(e => e.name),
            T: connections.map(c => ({
                from: c.source.name,
                to: c.target.name,
                interval: [c.minTime, c.maxTime === Infinity ? 999999 : c.maxTime]
            })),
            Frec: events.reduce((acc, e) => { acc[e.name] = e.frequency; return acc; }, {})
        };
    }
}

// Export for use in other modules
window.VNetModels = {
    EventNode,
    Connection,
    VNetGraph,
    UndoManager,
    generateId
};
