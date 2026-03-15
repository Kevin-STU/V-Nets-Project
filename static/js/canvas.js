/**
 * V-Nets Web Editor - Canvas Module
 * Interactive canvas using Konva.js for rendering events and connections
 */

class VNetCanvas {
    constructor(containerId, vnetGraph) {
        this.containerId = containerId;
        this.vnet = vnetGraph;
        this.container = document.getElementById(containerId);

        // Current tool: 'select' or 'connect'
        this.currentTool = 'select';

        // Connection mode state
        this.isConnecting = false;
        this.connectionSource = null;
        this.tempLine = null;

        // Selection state
        this.selectedItem = null;

        // Zoom and pan state
        this.scale = 1;
        this.minScale = 0.2;
        this.maxScale = 3;
        this.isPanning = false;
        this.lastPanPos = { x: 0, y: 0 };

        // Initialize Konva stage
        this.initStage();

        // Initialize layers
        this.initLayers();

        // Setup event handlers
        this.setupEventHandlers();

        // Setup zoom and pan
        this.setupZoomPan();
    }

    initStage() {
        const containerRect = this.container.getBoundingClientRect();

        this.stage = new Konva.Stage({
            container: this.containerId,
            width: containerRect.width || 800,
            height: containerRect.height || 600,
            draggable: false
        });

        // Handle window resize
        window.addEventListener('resize', () => this.handleResize());
    }

    initLayers() {
        // Background layer for grid
        this.bgLayer = new Konva.Layer();
        this.stage.add(this.bgLayer);
        this.drawGrid();

        // Connections layer (behind events)
        this.connectionsLayer = new Konva.Layer();
        this.stage.add(this.connectionsLayer);

        // Events layer (on top)
        this.eventsLayer = new Konva.Layer();
        this.stage.add(this.eventsLayer);

        // Temp layer for connection preview
        this.tempLayer = new Konva.Layer();
        this.stage.add(this.tempLayer);
    }

    drawGrid() {
        const width = this.stage.width();
        const height = this.stage.height();
        const gridSize = 20;

        // Clear existing grid
        this.bgLayer.destroyChildren();

        // Draw vertical lines
        for (let x = 0; x < width; x += gridSize) {
            this.bgLayer.add(new Konva.Line({
                points: [x, 0, x, height],
                stroke: '#e8e8e8',
                strokeWidth: 1
            }));
        }

        // Draw horizontal lines
        for (let y = 0; y < height; y += gridSize) {
            this.bgLayer.add(new Konva.Line({
                points: [0, y, width, y],
                stroke: '#e8e8e8',
                strokeWidth: 1
            }));
        }

        this.bgLayer.draw();
    }

    handleResize() {
        const containerRect = this.container.getBoundingClientRect();
        this.stage.width(containerRect.width);
        this.stage.height(containerRect.height);
        this.drawGrid();
    }

    setupZoomPan() {
        // Zoom con rueda del ratón
        this.container.addEventListener('wheel', (e) => {
            e.preventDefault();
            
            const oldScale = this.scale;
            const pointer = this.stage.getPointerPosition();
            
            // Calcular nueva escala
            const scaleBy = 1.1;
            const direction = e.deltaY > 0 ? -1 : 1;
            const newScale = direction > 0 ? oldScale * scaleBy : oldScale / scaleBy;
            
            // Limitar escala
            this.scale = Math.max(this.minScale, Math.min(this.maxScale, newScale));
            
            // Calcular nueva posición para mantener el punto bajo el cursor
            const mousePointTo = {
                x: (pointer.x - this.stage.x()) / oldScale,
                y: (pointer.y - this.stage.y()) / oldScale
            };
            
            const newPos = {
                x: pointer.x - mousePointTo.x * this.scale,
                y: pointer.y - mousePointTo.y * this.scale
            };
            
            this.stage.scale({ x: this.scale, y: this.scale });
            this.stage.position(newPos);
            this.stage.batchDraw();
            
            // Actualizar info de zoom
            this.updateZoomInfo();
        });

        // Pan con clic central o Shift+arrastre
        this.stage.on('mousedown', (e) => {
            // Clic central (botón 1) o Shift+clic izquierdo
            if (e.evt.button === 1 || (e.evt.button === 0 && e.evt.shiftKey)) {
                e.evt.preventDefault();
                this.isPanning = true;
                this.lastPanPos = { x: e.evt.clientX, y: e.evt.clientY };
                this.container.style.cursor = 'grabbing';
            }
        });

        this.stage.on('mousemove', (e) => {
            if (this.isPanning) {
                const dx = e.evt.clientX - this.lastPanPos.x;
                const dy = e.evt.clientY - this.lastPanPos.y;
                
                this.stage.x(this.stage.x() + dx);
                this.stage.y(this.stage.y() + dy);
                
                this.lastPanPos = { x: e.evt.clientX, y: e.evt.clientY };
                this.stage.batchDraw();
            }
        });

        this.stage.on('mouseup', () => {
            if (this.isPanning) {
                this.isPanning = false;
                this.container.style.cursor = this.currentTool === 'connect' ? 'crosshair' : 'default';
            }
        });

        // También escuchar mouseleave para terminar pan si sale del canvas
        this.container.addEventListener('mouseleave', () => {
            if (this.isPanning) {
                this.isPanning = false;
                this.container.style.cursor = 'default';
            }
        });
    }

    // Zoom in/out programático
    zoomIn() {
        this.setZoom(this.scale * 1.2);
    }

    zoomOut() {
        this.setZoom(this.scale / 1.2);
    }

    setZoom(newScale) {
        const centerX = this.stage.width() / 2;
        const centerY = this.stage.height() / 2;
        
        const oldScale = this.scale;
        this.scale = Math.max(this.minScale, Math.min(this.maxScale, newScale));
        
        // Mantener el centro
        const oldCenterX = (centerX - this.stage.x()) / oldScale;
        const oldCenterY = (centerY - this.stage.y()) / oldScale;
        
        const newX = centerX - oldCenterX * this.scale;
        const newY = centerY - oldCenterY * this.scale;
        
        this.stage.scale({ x: this.scale, y: this.scale });
        this.stage.position({ x: newX, y: newY });
        this.stage.batchDraw();
        
        this.updateZoomInfo();
    }

    resetZoom() {
        this.scale = 1;
        this.stage.scale({ x: 1, y: 1 });
        this.stage.position({ x: 0, y: 0 });
        this.stage.batchDraw();
        this.updateZoomInfo();
    }

    fitToWindow() {
        const events = Object.values(this.vnet.events);
        if (events.length === 0) {
            this.resetZoom();
            return;
        }

        // Calcular bounding box
        let minX = Infinity, minY = Infinity;
        let maxX = -Infinity, maxY = -Infinity;

        events.forEach(event => {
            minX = Math.min(minX, event.position.x);
            minY = Math.min(minY, event.position.y);
            maxX = Math.max(maxX, event.position.x + 80);
            maxY = Math.max(maxY, event.position.y + 60);
        });

        const padding = 50;
        const modelWidth = maxX - minX + padding * 2;
        const modelHeight = maxY - minY + padding * 2;

        const canvasWidth = this.stage.width();
        const canvasHeight = this.stage.height();

        // Calcular escala
        const scaleX = canvasWidth / modelWidth;
        const scaleY = canvasHeight / modelHeight;
        this.scale = Math.min(scaleX, scaleY, 1.5);
        this.scale = Math.max(this.minScale, Math.min(this.maxScale, this.scale));

        // Calcular posición para centrar
        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2;

        const newX = canvasWidth / 2 - centerX * this.scale;
        const newY = canvasHeight / 2 - centerY * this.scale;

        this.stage.scale({ x: this.scale, y: this.scale });
        this.stage.position({ x: newX, y: newY });
        this.stage.batchDraw();
        
        this.updateZoomInfo();
    }

    updateZoomInfo() {
        // Actualizar indicador de zoom si existe
        const zoomIndicator = document.getElementById('zoomIndicator');
        if (zoomIndicator) {
            zoomIndicator.textContent = `${Math.round(this.scale * 100)}%`;
        }
    }

    setupEventHandlers() {
        // Stage click handler
        this.stage.on('click', (e) => {
            if (e.target === this.stage) {
                this.deselectAll();
                if (this.isConnecting) {
                    this.cancelConnection();
                }
            }
        });

        // Stage mouseup handler - para detectar clics cuando el sistema de eventos normal falla
        // Nota: El manejo de mouseup en modo conexión se hace en setupEventGraphicHandlers
        // para cada grupo de evento, NO aquí en el stage

        // Mouse move for connection preview (todo en coordenadas de capa para que coincida con zoom)
        this.stage.on('mousemove', (e) => {
            if (this.isConnecting && this.tempLine) {
                const pos = this.stage.getPointerPosition();
                if (!pos) return;
                // Convertir puntero (pantalla) a coordenadas de contenido del stage
                const scaleX = this.stage.scaleX();
                const scaleY = this.stage.scaleY();
                const stageX = (pos.x - this.stage.x()) / scaleX;
                const stageY = (pos.y - this.stage.y()) / scaleY;
                const sourceCenter = {
                    x: this.connectionSource.x() + 40,
                    y: this.connectionSource.y() + 30
                };
                this.tempLine.points([sourceCenter.x, sourceCenter.y, stageX, stageY]);
                this.tempLayer.batchDraw();
            }
        });

        // Keyboard handler
        document.addEventListener('keydown', (e) => {
            // 🔐 NO ejecutar acciones de teclado si un modal está abierto
            if (window.VNetDialogs && window.VNetDialogs.isModalOpen) {
                return;
            }
            
            if (e.key === 'Delete' || e.key === 'Backspace') {
                this.deleteSelected();
            }
            if (e.key === 'Escape') {
                this.cancelConnection();
                this.deselectAll();
            }
        });
    }

    setTool(tool) {
        this.currentTool = tool;
        
        // Cambiar cursor según herramienta
        if (tool === 'connect') {
            this.container.style.cursor = 'crosshair';
        } else {
            this.container.style.cursor = 'default';
        }
        
        // Si cambio a otra herramienta, cancelar cualquier conexión en progreso
        if (tool !== 'connect') {
            this.cancelConnection();
        }

        console.log(`Herramienta cambiada a: ${tool}`);
        console.log(`🔍 Estado actual de vnet.connections: ${Object.keys(this.vnet.connections).length} conexiones`);
        if (Object.keys(this.vnet.connections).length > 0) {
            const connSummary = Object.values(this.vnet.connections)
                .map(c => `${typeof c.source === 'object' ? c.source.name : c.source} → ${typeof c.target === 'object' ? c.target.name : c.target}`)
                .join(', ');
            console.log(`   Conexiones: [${connSummary}]`);
        }
    }

    // Add event to canvas
    addEvent(eventType, x, y) {
        const event = new window.VNetModels.EventNode(eventType, { x, y });
        this.vnet.addEvent(event);

        const graphicItem = this.createEventGraphic(event);
        event.graphicItem = graphicItem;
        this.eventsLayer.add(graphicItem);
        this.eventsLayer.batchDraw();

        return event;
    }

    createEventGraphic(event) {
        const group = new Konva.Group({
            x: event.position.x,
            y: event.position.y,
            draggable: true,
            dragDistance: 0, // Sin dragDistance para máxima compatibilidad
            id: event.id,
            name: 'eventGroup'
        });

        // Event shape based on type
        const width = 80;
        const height = 60;
        let bgColor, shapeColor, shape;

        // Crear área de hit ampliada para facilitar clics en modo conexión
        // Cuando hay muchas conexiones, necesitamos área grande para ser clickeable
        const hitPadding = 40; // Aumentado para mejor experiencia
        const hitRect = new Konva.Rect({
            x: -hitPadding,
            y: -hitPadding,
            width: width + hitPadding * 2,
            height: height + hitPadding * 2,
            fill: 'rgba(0,0,0,0.001)', // Casi invisible pero detectable
            stroke: null,
            listening: true,
            hitStrokeWidth: 0
        });
        group.add(hitRect);

        switch (event.eventType) {
            case 'init':
                bgColor = '#e6ffe6';
                shapeColor = '#32963c';
                // Background rectangle
                group.add(new Konva.Rect({
                    width, height,
                    fill: bgColor,
                    stroke: '#3c3c3c',
                    strokeWidth: 2,
                    cornerRadius: 5,
                    listening: false
                }));
                // Triangle (init symbol)
                group.add(new Konva.RegularPolygon({
                    x: width / 2,
                    y: height / 2 - 3,
                    sides: 3,
                    radius: 18,
                    fill: shapeColor,
                    stroke: '#2c5a2e',
                    strokeWidth: 1,
                    listening: false
                }));
                break;

            case 'end':
                bgColor = '#ffe6e6';
                shapeColor = '#963232';
                // Background rectangle
                group.add(new Konva.Rect({
                    width, height,
                    fill: bgColor,
                    stroke: '#3c3c3c',
                    strokeWidth: 2,
                    cornerRadius: 5,
                    listening: false
                }));
                // Circle (end symbol)
                group.add(new Konva.Circle({
                    x: width / 2,
                    y: height / 2 - 3,
                    radius: 15,
                    fill: shapeColor,
                    stroke: '#5a2c2c',
                    strokeWidth: 1,
                    listening: false
                }));
                break;

            case 'intermediate':
            default:
                bgColor = '#e6e6ff';
                shapeColor = '#3232c8';
                // Background rectangle
                group.add(new Konva.Rect({
                    width, height,
                    fill: bgColor,
                    stroke: '#3c3c3c',
                    strokeWidth: 2,
                    cornerRadius: 5,
                    listening: false
                }));
                // Diamond (intermediate symbol)
                group.add(new Konva.RegularPolygon({
                    x: width / 2,
                    y: height / 2 - 3,
                    sides: 4,
                    radius: 16,
                    fill: shapeColor,
                    stroke: '#2c2c5a',
                    strokeWidth: 1,
                    rotation: 45,
                    listening: false
                }));
                break;
        }

        // Event name label
        const label = new Konva.Text({
            x: 0,
            y: height - 15,
            width: width,
            text: event.name,
            fontSize: 10,
            fontFamily: 'Arial',
            fill: '#333',
            align: 'center',
            listening: false
        });
        group.add(label);

        // Store reference to event and label
        group.eventData = event;
        group.labelNode = label;

        // Setup event handlers
        this.setupEventGraphicHandlers(group, event);

        return group;
    }

    setupEventGraphicHandlers(group, event) {
        // Variables para rastrear posición del ratón
        let mouseDownPos = null;
        let wasDragged = false;

        // Mousedown - rastrear posición inicial
        group.on('mousedown', (e) => {
            e.cancelBubble = true;
            const pos = this.stage.getPointerPosition();
            mouseDownPos = { x: pos.x, y: pos.y };
            wasDragged = false;

            // En modo conexión, deshabilitar drag
            if (this.currentTool === 'connect') {
                group.draggable(false);
            }
        });

        // Drag handlers - solo si NO estamos en modo conexión
        group.on('dragmove', () => {
            if (this.currentTool !== 'connect') {
                wasDragged = true;
                event.position.x = group.x();
                event.position.y = group.y();
                this.updateConnectionsForEvent(event);
            }
        });

        group.on('dragend', () => {
            if (this.currentTool !== 'connect') {
                this.vnet.changed = true;
                // Rehabilitar drag para futuras operaciones
                group.draggable(true);
            }
        });

        // Mouseup - es donde detectamos el "click"
        group.on('mouseup', (e) => {
            e.cancelBubble = true;
            
            // Verificar si fue realmente un clic (no un drag)
            if (mouseDownPos) {
                const pos = this.stage.getPointerPosition();
                const distance = Math.sqrt(
                    Math.pow(pos.x - mouseDownPos.x, 2) + 
                    Math.pow(pos.y - mouseDownPos.y, 2)
                );
                mouseDownPos = null;

                // Si la distancia es pequeña (< 10px), considerarlo un click
                if (distance < 10 && !wasDragged) {
                    if (this.currentTool === 'connect') {
                        if (!this.isConnecting) {
                            console.log(`✓ Iniciando conexión desde: ${event.name}`);
                            this.startConnection(group);
                        } else if (this.connectionSource !== group) {
                            console.log(`✓ Completando conexión a: ${event.name}`);
                            this.finishConnection(group);
                        } else {
                            console.log('Mismo evento, cancelando');
                            this.cancelConnection();
                        }
                    } else {
                        this.selectItem(group);
                    }
                }
            }

            // Rehabilitar drag después del mouseup
            group.draggable(true);
        });

        // Double click for properties
        group.on('dblclick', (e) => {
            e.cancelBubble = true;
            this.showEventProperties(event);
        });

        // Context menu
        group.on('contextmenu', (e) => {
            e.evt.preventDefault();
            this.showEventContextMenu(e, event, group);
        });

        // Hover effect
        group.on('mouseenter', () => {
            if (this.currentTool === 'connect') {
                document.body.style.cursor = 'pointer';
                const bgRect = group.children[1];
                if (bgRect && bgRect.className === 'Rect') {
                    bgRect.strokeWidth(4);
                    bgRect.stroke('#2196F3');
                }
            } else {
                document.body.style.cursor = 'pointer';
            }
            group.opacity(0.85);
            this.eventsLayer.batchDraw();
        });

        group.on('mouseleave', () => {
            document.body.style.cursor = this.currentTool === 'connect' ? 'crosshair' : 'default';
            group.opacity(1);
            const bgRect = group.children[1];
            if (bgRect && bgRect.className === 'Rect') {
                if (this.isConnecting && this.connectionSource === group) {
                    bgRect.strokeWidth(4);
                    bgRect.stroke('#4CAF50');
                } else {
                    bgRect.strokeWidth(2);
                    bgRect.stroke('#3c3c3c');
                }
            }
            this.eventsLayer.batchDraw();
        });
    }

    startConnection(sourceGroup) {
        const sourceEvent = sourceGroup.eventData;
        
        console.log(`🟢 startConnection() iniciada`);
        console.log(`   Fuente: ${sourceEvent.name} (${sourceEvent.id})`);
        console.log(`   Conexiones disponibles en vnet: ${Object.keys(this.vnet.connections).length}`);
        
        // Validación: no puedo conectar desde un END
        if (sourceEvent.eventType === 'end') {
            window.VNetDialogs.showAlert(
                'Conexión no válida',
                'Los eventos END no pueden tener conexiones salientes.',
                'error'
            );
            return;
        }

        // Marcar que estamos conectando
        this.isConnecting = true;
        this.connectionSource = sourceGroup;

        // Resaltar visualmente el origen
        const bgRect = sourceGroup.children[1];
        if (bgRect && bgRect.className === 'Rect') {
            bgRect.strokeWidth(4);
            bgRect.stroke('#4CAF50');
        }
        this.eventsLayer.batchDraw();

        // Crear línea temporal desde el centro del evento (coordenadas de capa)
        const centerX = sourceGroup.x() + 40;
        const centerY = sourceGroup.y() + 30;

        this.tempLine = new Konva.Arrow({
            points: [centerX, centerY, centerX, centerY],
            stroke: '#666',
            strokeWidth: 2,
            pointerLength: 10,
            pointerWidth: 8,
            dash: [5, 5],
            listening: false  // No debe interceptar eventos
        });

        this.tempLayer.add(this.tempLine);
        this.tempLayer.batchDraw();

        console.log(`✓ Conexión iniciada desde: ${sourceEvent.name} (${sourceEvent.eventType})`);
    }

    finishConnection(targetGroup) {
        // Validación básica
        if (!this.connectionSource) {
            this.cancelConnection();
            return;
        }

        if (this.connectionSource === targetGroup) {
            return;
        }

        const sourceEvent = this.connectionSource.eventData;
        const targetEvent = targetGroup.eventData;

        console.log(`🟠 finishConnection() iniciada`);
        console.log(`   Origen: ${sourceEvent.name} (${sourceEvent.id}) → Destino: ${targetEvent.name} (${targetEvent.id})`);
        console.log(`   Conexiones en vnet.connections antes de verificar: ${Object.keys(this.vnet.connections).length}`);

        // Validar restricciones de V-Net
        if (sourceEvent.eventType === 'end') {
            window.VNetDialogs.showAlert(
                'Conexión no válida',
                'Un evento END no puede tener conexiones salientes.',
                'error'
            );
            this.cancelConnection();
            return;
        }

        // ✅ ARREGLO CRÍTICO: Verificar si YA EXISTE una conexión entre estos eventos
        // Manejar ambos casos: source como objeto EventNode O como string ID
        const getConnectionSourceId = (conn) => {
            return typeof conn.source === 'object' ? conn.source.id : conn.source;
        };
        const getConnectionTargetId = (conn) => {
            return typeof conn.target === 'object' ? conn.target.id : conn.target;
        };

        console.log(`   📋 Verificando duplicados...`);
        console.log(`   Conexiones en el modelo: ${Object.keys(this.vnet.connections).length}`);
        
        const allConnections = Object.values(this.vnet.connections);
        console.log(`   Comparando: ${sourceEvent.id} → ${targetEvent.id}`);
        
        allConnections.forEach(conn => {
            const srcId = getConnectionSourceId(conn);
            const tgtId = getConnectionTargetId(conn);
            console.log(`   - Existente: ${srcId} → ${tgtId}`);
        });

        const existingConnection = allConnections.find(
            conn => getConnectionSourceId(conn) === sourceEvent.id && 
                    getConnectionTargetId(conn) === targetEvent.id
        );

        if (existingConnection) {
            console.warn('❌ Ya existe una conexión entre estos eventos', existingConnection);
            console.warn(`   IDs: ${getConnectionSourceId(existingConnection)} → ${getConnectionTargetId(existingConnection)}`);
            console.warn(`   Solicitada: ${sourceEvent.id} → ${targetEvent.id}`);
            window.VNetDialogs.showAlert(
                'Conexión duplicada',
                `Ya existe una conexión entre ${sourceEvent.name} y ${targetEvent.name}.\nEdítala con doble-clic en la conexión.`,
                'error'
            );
            this.cancelConnection();
            return;
        }

        // Crear la conexión en el modelo
        const connection = new window.VNetModels.Connection(sourceEvent, targetEvent);
        const added = this.vnet.addConnection(connection);

        if (added) {
            console.log(`✓ Conexión creada: ${sourceEvent.name} → ${targetEvent.name}`);
            
            // Crear la representación gráfica
            const connectionGraphic = this.createConnectionGraphic(connection);
            connection.graphicItem = connectionGraphic;
            this.connectionsLayer.add(connectionGraphic);
            this.connectionsLayer.batchDraw();
        } else {
            window.VNetDialogs.showAlert(
                'Error',
                'No se pudo crear la conexión. Verifica que no exista ya.',
                'error'
            );
        }

        this.cancelConnection();
    }

    cancelConnection() {
        // Restaurar visual del evento source
        if (this.connectionSource) {
            const bgRect = this.connectionSource.children[1];
            if (bgRect && bgRect.className === 'Rect') {
                bgRect.strokeWidth(2);
                bgRect.stroke('#3c3c3c');
            }
            this.connectionSource.opacity(1);
        }

        this.isConnecting = false;
        this.connectionSource = null;
        
        if (this.tempLine) {
            this.tempLine.destroy();
            this.tempLine = null;
        }
        
        this.tempLayer.batchDraw();
        this.eventsLayer.batchDraw();
    }

    createConnectionGraphic(connection) {
        try {
            console.log('🟣 createConnectionGraphic() - Inicio');
            console.log('📊 Conexión:', {
                id: connection.id,
                source: connection.source?.name || 'NO EXISTE',
                target: connection.target?.name || 'NO EXISTE',
                hasGraphics: !!connection.source?.graphicItem && !!connection.target?.graphicItem
            });

            const group = new Konva.Group({ id: connection.id });

            // Get positions
            const sourceGraphic = connection.source.graphicItem;
            const targetGraphic = connection.target.graphicItem;

            if (!sourceGraphic || !targetGraphic) {
                console.error('❌ Gráficos de eventos no existen:', {
                    sourceGraphic: !!sourceGraphic,
                    targetGraphic: !!targetGraphic
                });
                return group;
            }

            // Posición en la capa (no getAbsolutePosition) para que zoom/pan no desalinee las flechas
            const centerOffsetX = 40;
            const centerOffsetY = 30;
            const startX = sourceGraphic.x() + centerOffsetX;
            const startY = sourceGraphic.y() + centerOffsetY;
            const endX = targetGraphic.x() + centerOffsetX;
            const endY = targetGraphic.y() + centerOffsetY;

            console.log('📊 Posiciones:', { startX, startY, endX, endY });

        // Calculate control points for curved line
        const midX = (startX + endX) / 2;
        const midY = (startY + endY) / 2;
        const dx = endX - startX;
        const dy = endY - startY;
        const offset = Math.min(50, Math.sqrt(dx * dx + dy * dy) / 4);

        // Color según si tiene restricción inversa
        const strokeColor = connection.hasInverse ? '#9b59b6' : '#555';

        // Arrow
        const arrow = new Konva.Arrow({
            points: this.calculateCurvePoints(startX, startY, endX, endY),
            stroke: strokeColor,
            strokeWidth: connection.hasInverse ? 3 : 2,
            pointerLength: 10,
            pointerWidth: 8,
            fill: strokeColor,
            tension: 0.3,
            hitStrokeWidth: 15
        });
        group.add(arrow);

        // Flecha inversa si tiene restricción bidireccional
        if (connection.hasInverse) {
            const inverseArrow = new Konva.Arrow({
                points: this.calculateCurvePoints(endX, endY, startX, startY, true),
                stroke: '#e67e22',
                strokeWidth: 2,
                pointerLength: 8,
                pointerWidth: 6,
                fill: '#e67e22',
                tension: 0.3,
                dash: [5, 3],
                opacity: 0.8
            });
            group.add(inverseArrow);
            group.inverseArrowNode = inverseArrow;
        }

        // Calcular altura del label según si tiene inversa
        const labelHeight = 24;  // Altura de CADA rectángulo
        const labelGap = 4;      // Gap entre rectángulos

        if (connection.hasInverse) {
            // Dos rectángulos separados cuando hay inversa
            const rectHeight = labelHeight + labelGap + labelHeight;
            const labelY = midY - rectHeight / 2;

            // RECTÁNGULO 1: Restricción directa (arriba)
            const labelBg1 = new Konva.Rect({
                x: midX - 60,
                y: labelY,
                width: 120,
                height: labelHeight,
                fill: 'white',
                stroke: '#3498db',
                strokeWidth: 2,
                cornerRadius: 4,
                listening: false
            });
            group.add(labelBg1);

            // Texto de restricción directa
            const maxTimeStr = connection.maxTime === Infinity ? '∞' : connection.maxTime.toFixed(1);
            const labelText = new Konva.Text({
                x: midX - 58,
                y: labelY + 4,
                width: 116,
                text: `[${connection.minTime.toFixed(1)}, ${maxTimeStr}]`,
                fontSize: 11,
                fontFamily: 'Arial',
                fill: '#333',
                align: 'center',
                listening: false
            });
            group.add(labelText);

            // RECTÁNGULO 2: Restricción inversa (abajo)
            const labelBg2 = new Konva.Rect({
                x: midX - 60,
                y: labelY + labelHeight + labelGap,
                width: 120,
                height: labelHeight,
                fill: 'white',
                stroke: '#9b59b6',
                strokeWidth: 2,
                cornerRadius: 4,
                listening: false
            });
            group.add(labelBg2);

            // Texto de restricción inversa
            const invMaxTimeStr = connection.inverseMaxTime === Infinity ? '∞' : connection.inverseMaxTime.toFixed(1);
            const inverseLabelText = new Konva.Text({
                x: midX - 58,
                y: labelY + labelHeight + labelGap + 4,
                width: 116,
                text: `⟲ [${connection.inverseMinTime.toFixed(1)}, ${invMaxTimeStr}]`,
                fontSize: 10,
                fontFamily: 'Arial',
                fill: '#9b59b6',
                align: 'center',
                fontStyle: 'italic',
                fontWeight: 'bold',
                listening: false
            });
            group.add(inverseLabelText);

            // Store references
            group.labelBg = labelBg1;
            group.labelBg2 = labelBg2;
            group.labelText = labelText;
            group.inverseLabelText = inverseLabelText;

        } else {
            // Un solo rectángulo cuando no hay inversa
            const labelY = midY - labelHeight / 2;

            // Rectángulo de fondo
            const labelBg = new Konva.Rect({
                x: midX - 60,
                y: labelY,
                width: 120,
                height: labelHeight,
                fill: 'white',
                stroke: '#ccc',
                strokeWidth: 1,
                cornerRadius: 4,
                listening: false
            });
            group.add(labelBg);

            // Texto de restricción directa
            const maxTimeStr = connection.maxTime === Infinity ? '∞' : connection.maxTime.toFixed(1);
            const labelText = new Konva.Text({
                x: midX - 58,
                y: labelY + 4,
                width: 116,
                text: `[${connection.minTime.toFixed(1)}, ${maxTimeStr}]`,
                fontSize: 11,
                fontFamily: 'Arial',
                fill: '#333',
                align: 'center',
                listening: false
            });
            group.add(labelText);

            // Store references
            group.labelBg = labelBg;
            group.labelBg2 = null;
            group.labelText = labelText;
            group.inverseLabelText = null;
        }

        // Store references
        group.connectionData = connection;
        group.arrowNode = arrow;

        // Event handlers
        this.setupConnectionGraphicHandlers(group, connection);

        console.log('🟣 createConnectionGraphic() - Completado exitosamente');
        return group;
        } catch (error) {
            console.error('❌ ERROR en createConnectionGraphic:', error);
            console.error('Stack:', error.stack);
            return group;  // Retornar grupo vacío para evitar crash
        }
    }

    calculateCurvePoints(startX, startY, endX, endY, isInverse = false) {
        // Simple curved line using quadratic bezier approximation
        const dx = endX - startX;
        const dy = endY - startY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist === 0) return [startX, startY, endX, endY];

        // Offset for curve (invertido para la flecha inversa)
        const baseOffset = Math.min(30, dist / 4);
        const offset = isInverse ? -baseOffset * 1.5 : baseOffset;
        const perpX = -dy / dist * offset;
        const perpY = dx / dist * offset;

        const midX = (startX + endX) / 2 + perpX;
        const midY = (startY + endY) / 2 + perpY;

        return [startX, startY, midX, midY, endX, endY];
    }

    setupConnectionGraphicHandlers(group, connection) {
        // Click handler
        group.on('click', (e) => {
            e.cancelBubble = true;
            this.selectItem(group);
        });

        // Double click for properties
        group.on('dblclick', (e) => {
            e.cancelBubble = true;
            this.showConnectionProperties(connection);
        });

        // Context menu
        group.on('contextmenu', (e) => {
            e.evt.preventDefault();
            this.showConnectionContextMenu(e, connection, group);
        });

        // Hover effect
        group.on('mouseenter', () => {
            document.body.style.cursor = 'pointer';
            group.arrowNode.stroke('#3498db');
            group.arrowNode.fill('#3498db');
            this.connectionsLayer.batchDraw();
        });

        group.on('mouseleave', () => {
            document.body.style.cursor = 'default';
            group.arrowNode.stroke('#555');
            group.arrowNode.fill('#555');
            this.connectionsLayer.batchDraw();
        });
    }

    updateConnectionsForEvent(event) {
        // Update all connections involving this event (solo posiciones)
        [...event.incoming, ...event.outgoing].forEach(conn => {
            if (conn.graphicItem) {
                this.updateConnectionPosition(conn);
            }
        });
        this.connectionsLayer.batchDraw();
    }

    updateConnectionGraphic(connection) {
        try {
            console.log(`📍 Actualizando conexión: ${connection.source.name} → ${connection.target.name}`);
            console.log(`📍 Nuevos valores:`, {
                minTime: connection.minTime,
                maxTime: connection.maxTime,
                hasInverse: connection.hasInverse
            });

            const group = connection.graphicItem;
            if (!group) {
                console.error('❌ No hay grupo gráfico para actualizar');
                return;
            }

            const labelHeight = 24;
            const labelGap = 4;

            if (connection.hasInverse) {
                // Necesitamos dos rectángulos
                // Actualizar o crear rectángulo 1 (directo)
                if (group.labelBg) {
                    group.labelBg.stroke('#3498db');
                    group.labelBg.strokeWidth(2);
                }

                // Crear o actualizar rectángulo 2 (inverso) si no existe
                if (!group.labelBg2) {
                    const labelBg1 = group.labelBg;
                    const y1 = labelBg1.y();
                    const x = labelBg1.x();

                    const labelBg2 = new Konva.Rect({
                        x: x,
                        y: y1 + labelHeight + labelGap,
                        width: 120,
                        height: labelHeight,
                        fill: 'white',
                        stroke: '#9b59b6',
                        strokeWidth: 2,
                        cornerRadius: 4,
                        listening: false
                    });
                    group.add(labelBg2);
                    group.labelBg2 = labelBg2;
                }

                // Actualizar color del rectángulo 2
                if (group.labelBg2) {
                    group.labelBg2.stroke('#9b59b6');
                    group.labelBg2.strokeWidth(2);
                }

                // Actualizar texto directo
                const maxTimeStr = connection.maxTime === Infinity ? '∞' : connection.maxTime.toFixed(1);
                group.labelText.text(`[${connection.minTime.toFixed(1)}, ${maxTimeStr}]`);
                group.labelText.fill('#333');

                // Crear o actualizar texto inverso
                if (!group.inverseLabelText) {
                    const labelBg1 = group.labelBg;
                    const y1 = labelBg1.y();
                    const x = labelBg1.x();

                    const invMaxTimeStr = connection.inverseMaxTime === Infinity ? '∞' : connection.inverseMaxTime.toFixed(1);
                    const inverseLabelText = new Konva.Text({
                        x: x + 2,
                        y: y1 + labelHeight + labelGap + 4,
                        width: 116,
                        text: `⟲ [${connection.inverseMinTime.toFixed(1)}, ${invMaxTimeStr}]`,
                        fontSize: 10,
                        fontFamily: 'Arial',
                        fill: '#9b59b6',
                        align: 'center',
                        fontStyle: 'italic',
                        fontWeight: 'bold',
                        listening: false
                    });
                    group.add(inverseLabelText);
                    group.inverseLabelText = inverseLabelText;
                } else {
                    // Solo actualizar el texto
                    const invMaxTimeStr = connection.inverseMaxTime === Infinity ? '∞' : connection.inverseMaxTime.toFixed(1);
                    group.inverseLabelText.text(`⟲ [${connection.inverseMinTime.toFixed(1)}, ${invMaxTimeStr}]`);
                    group.inverseLabelText.fill('#9b59b6');
                }
            } else {
                // No hay inversa, solo un rectángulo
                if (group.labelBg) {
                    group.labelBg.stroke('#ccc');
                    group.labelBg.strokeWidth(1);
                }

                // Remover rectángulo 2 si existe
                if (group.labelBg2) {
                    group.labelBg2.destroy();
                    group.labelBg2 = null;
                }

                // Remover texto inverso si existe
                if (group.inverseLabelText) {
                    group.inverseLabelText.destroy();
                    group.inverseLabelText = null;
                }

                // Actualizar texto directo
                const maxTimeStr = connection.maxTime === Infinity ? '∞' : connection.maxTime.toFixed(1);
                group.labelText.text(`[${connection.minTime.toFixed(1)}, ${maxTimeStr}]`);
                group.labelText.fill('#333');
            }

            // Redibujar la capa
            this.connectionsLayer.batchDraw();
            
            console.log(`✅ Conexión actualizada correctamente`);
        } catch (error) {
            console.error('❌ ERROR al actualizar conexión:', error);
            console.error('Stack:', error.stack);
        }
    }

    // Actualizar solo posiciones (cuando se arrastra un evento)
    // Usar posición en la capa (.x()/.y()) para evitar desfase con zoom/pan del stage
    updateConnectionPosition(connection) {
        const group = connection.graphicItem;
        if (!group) return;

        const sourceG = connection.source.graphicItem;
        const targetG = connection.target.graphicItem;
        const centerOffsetX = 40;
        const centerOffsetY = 30;

        const startX = sourceG.x() + centerOffsetX;
        const startY = sourceG.y() + centerOffsetY;
        const endX = targetG.x() + centerOffsetX;
        const endY = targetG.y() + centerOffsetY;

        // Update arrow points
        group.arrowNode.points(this.calculateCurvePoints(startX, startY, endX, endY));

        // Update inverse arrow if exists
        if (group.inverseArrowNode) {
            group.inverseArrowNode.points(this.calculateCurvePoints(endX, endY, startX, startY, true));
        }

        // Calcular posición del label
        const midX = (startX + endX) / 2;
        const midY = (startY + endY) / 2;
        const labelHeight = 24;
        const labelGap = 4;

        if (connection.hasInverse) {
            // Dos rectángulos separados
            const rectHeight = labelHeight + labelGap + labelHeight;
            const labelY = midY - rectHeight / 2;

            // Actualizar rectángulo 1 (directo)
            group.labelBg.x(midX - 60);
            group.labelBg.y(labelY);

            // Actualizar rectángulo 2 (inverso)
            if (group.labelBg2) {
                group.labelBg2.x(midX - 60);
                group.labelBg2.y(labelY + labelHeight + labelGap);
            }

            // Actualizar texto directo
            group.labelText.x(midX - 58);
            group.labelText.y(labelY + 4);
            const maxTimeStr = connection.maxTime === Infinity ? '∞' : connection.maxTime.toFixed(1);
            group.labelText.text(`[${connection.minTime.toFixed(1)}, ${maxTimeStr}]`);

            // Actualizar texto inverso
            if (group.inverseLabelText) {
                group.inverseLabelText.x(midX - 58);
                group.inverseLabelText.y(labelY + labelHeight + labelGap + 4);
                const invMaxTimeStr = connection.inverseMaxTime === Infinity ? '∞' : connection.inverseMaxTime.toFixed(1);
                group.inverseLabelText.text(`⟲ [${connection.inverseMinTime.toFixed(1)}, ${invMaxTimeStr}]`);
            }
        } else {
            // Un solo rectángulo
            const labelY = midY - labelHeight / 2;

            group.labelBg.x(midX - 60);
            group.labelBg.y(labelY);

            group.labelText.x(midX - 58);
            group.labelText.y(labelY + 4);
            const maxTimeStr = connection.maxTime === Infinity ? '∞' : connection.maxTime.toFixed(1);
            group.labelText.text(`[${connection.minTime.toFixed(1)}, ${maxTimeStr}]`);
        }
    }

    selectItem(item) {
        this.deselectAll();
        this.selectedItem = item;

        // Add selection highlight
        if (item.eventData) {
            // It's an event - obtener el rectángulo visual (children[1])
            const bgRect = item.children[1];
            if (bgRect && bgRect.className === 'Rect') {
                bgRect.stroke('#3498db');
                bgRect.strokeWidth(3);
            }
            this.eventsLayer.batchDraw();
        } else if (item.connectionData) {
            // It's a connection
            item.arrowNode.strokeWidth(4);
            this.connectionsLayer.batchDraw();
        }
    }

    deselectAll() {
        if (this.selectedItem) {
            if (this.selectedItem.eventData) {
                // Restaurar el rectángulo visual (children[1])
                const bgRect = this.selectedItem.children[1];
                if (bgRect && bgRect.className === 'Rect') {
                    bgRect.stroke('#3c3c3c');
                    bgRect.strokeWidth(2);
                }
                this.eventsLayer.batchDraw();
            } else if (this.selectedItem.connectionData) {
                this.selectedItem.arrowNode.strokeWidth(2);
                this.connectionsLayer.batchDraw();
            }
        }
        this.selectedItem = null;
    }

    deleteSelected() {
        if (!this.selectedItem) return;

        if (this.selectedItem.eventData) {
            const event = this.selectedItem.eventData;
            // Remove connections first
            [...event.incoming, ...event.outgoing].forEach(conn => {
                if (conn.graphicItem) {
                    conn.graphicItem.destroy();
                }
            });
            // Remove event
            this.vnet.removeEvent(event.id);
            this.selectedItem.destroy();
        } else if (this.selectedItem.connectionData) {
            const connection = this.selectedItem.connectionData;
            this.vnet.removeConnection(connection.id);
            this.selectedItem.destroy();
        }

        this.selectedItem = null;
        this.eventsLayer.batchDraw();
        this.connectionsLayer.batchDraw();
    }

    showEventProperties(event) {
        if (window.VNetDialogs) {
            window.VNetDialogs.showEventDialog(event, () => {
                // Update label
                if (event.graphicItem) {
                    event.graphicItem.labelNode.text(event.name);
                    this.eventsLayer.batchDraw();
                }
            });
        }
    }

    showConnectionProperties(connection) {
        console.log('🔵 showConnectionProperties() - Inicio');
        console.log('📊 Conexión recibida:', {
            id: connection.id,
            source: connection.source.name,
            target: connection.target.name,
            minTime: connection.minTime,
            maxTime: connection.maxTime
        });
        
        // ✅ ARREGLO CRÍTICO: Desseleccionar la conexión ANTES de abrir el modal
        // Esto previene que si el usuario presiona Delete accidentalmente, se borre la conexión
        this.deselectAll();
        
        // ✅ VERIFICACIÓN CRÍTICA: Asegurarse que la conexión existe en vnet.connections ANTES
        console.log('🔴 VERIFICACIÓN PREVIA: conexiones en vnet:', Object.keys(this.vnet.connections));
        if (!this.vnet.connections[connection.id]) {
            console.error('❌ ¡CRÍTICO! Conexión NO está en vnet ANTES de abrir el diálogo:', connection.id);
        }

        if (window.VNetDialogs) {
            window.VNetDialogs.showConnectionDialog(connection, () => {
                console.log('🔵 Callback ejecutado');
                console.log('📊 Valores actualizados en la conexión:',{
                    minTime: connection.minTime,
                    maxTime: connection.maxTime,
                    hasInverse: connection.hasInverse
                });
                
                // ✅ ARREGLO CRÍTICO: Simplemente actualizar el gráfico, sin verificar
                // El objeto connection YA tiene los valores actualizados desde dialogs.js
                console.log('📍 Actualizando gráfico de conexión...');
                this.updateConnectionGraphic(connection);
                console.log('✅ Gráfico actualizado correctamente');
            });
        } else {
            console.error('❌ window.VNetDialogs no está disponible');
        }
    }

    showEventContextMenu(e, event, group) {
        if (window.VNetDialogs) {
            window.VNetDialogs.showContextMenu(e.evt, [
                { label: 'Propiedades', action: () => this.showEventProperties(event) },
                {
                    label: 'Eliminar', action: () => {
                        this.selectItem(group);
                        this.deleteSelected();
                    }
                }
            ]);
        }
    }

    showConnectionContextMenu(e, connection, group) {
        if (window.VNetDialogs) {
            window.VNetDialogs.showContextMenu(e.evt, [
                { label: 'Editar Restricciones', action: () => this.showConnectionProperties(connection) },
                {
                    label: 'Eliminar', action: () => {
                        this.selectItem(group);
                        this.deleteSelected();
                    }
                }
            ]);
        }
    }

    // Load V-Net from model
    loadFromVNet(vnet) {
        this.clear();
        this.vnet = vnet;

        // Calcular bounding box de todos los eventos
        const events = Object.values(vnet.events);
        if (events.length === 0) return;

        let minX = Infinity, minY = Infinity;
        let maxX = -Infinity, maxY = -Infinity;

        events.forEach(event => {
            minX = Math.min(minX, event.position.x);
            minY = Math.min(minY, event.position.y);
            maxX = Math.max(maxX, event.position.x);
            maxY = Math.max(maxY, event.position.y);
        });

        // Calcular offset para centrar en el canvas
        const canvasWidth = this.stage.width();
        const canvasHeight = this.stage.height();
        const modelWidth = maxX - minX + 100;
        const modelHeight = maxY - minY + 100;

        // Si el modelo es muy grande o está fuera del canvas, ajustar posiciones
        let offsetX = 0;
        let offsetY = 0;

        if (minX > canvasWidth || minY > canvasHeight || minX < -100 || minY < -100 
            || modelWidth > canvasWidth * 2 || modelHeight > canvasHeight * 2) {
            // Calcular factor de escala si es necesario
            const scaleX = (canvasWidth - 100) / modelWidth;
            const scaleY = (canvasHeight - 100) / modelHeight;
            const scale = Math.min(scaleX, scaleY, 1); // No ampliar, solo reducir si es necesario

            // Ajustar posiciones de eventos
            events.forEach(event => {
                event.position.x = (event.position.x - minX) * scale + 50;
                event.position.y = (event.position.y - minY) * scale + 50;
            });
        }

        // Create event graphics
        for (const event of events) {
            const graphicItem = this.createEventGraphic(event);
            event.graphicItem = graphicItem;
            this.eventsLayer.add(graphicItem);
        }

        // Create connection graphics
        for (const connection of Object.values(vnet.connections)) {
            const graphicItem = this.createConnectionGraphic(connection);
            connection.graphicItem = graphicItem;
            this.connectionsLayer.add(graphicItem);
        }

        this.eventsLayer.batchDraw();
        this.connectionsLayer.batchDraw();
    }

    clear() {
        this.eventsLayer.destroyChildren();
        this.connectionsLayer.destroyChildren();
        this.tempLayer.destroyChildren();
        this.deselectAll();
        this.cancelConnection();
        this.stage.batchDraw();
    }
}

// Export
window.VNetCanvas = VNetCanvas;
