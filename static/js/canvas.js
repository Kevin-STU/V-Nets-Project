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

        // Mouse move for connection preview
        this.stage.on('mousemove', (e) => {
            if (this.isConnecting && this.tempLine) {
                const pos = this.stage.getPointerPosition();
                const sourcePos = this.connectionSource.getAbsolutePosition();
                const sourceCenter = {
                    x: sourcePos.x + 40,
                    y: sourcePos.y + 30
                };
                this.tempLine.points([sourceCenter.x, sourceCenter.y, pos.x, pos.y]);
                this.tempLayer.batchDraw();
            }
        });

        // Keyboard handler
        document.addEventListener('keydown', (e) => {
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
        this.container.style.cursor = tool === 'connect' ? 'crosshair' : 'default';
        if (tool !== 'connect') {
            this.cancelConnection();
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
            id: event.id,
            name: 'eventGroup'
        });

        // Event shape based on type
        const width = 80;
        const height = 60;
        let bgColor, shapeColor, shape;

        // Create a hit region for the entire group
        const hitRect = new Konva.Rect({
            width: width,
            height: height,
            fill: 'transparent',
            listening: true
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
        // Drag handlers
        group.on('dragmove', () => {
            event.position.x = group.x();
            event.position.y = group.y();
            this.updateConnectionsForEvent(event);
        });

        group.on('dragend', () => {
            this.vnet.changed = true;
        });

        // Click handler
        group.on('click', (e) => {
            e.cancelBubble = true;

            if (this.currentTool === 'connect') {
                if (!this.isConnecting) {
                    this.startConnection(group);
                } else if (this.connectionSource !== group) {
                    this.finishConnection(group);
                }
            } else {
                this.selectItem(group);
            }
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
            document.body.style.cursor = 'pointer';
            group.opacity(0.9);
            this.eventsLayer.batchDraw();
        });

        group.on('mouseleave', () => {
            document.body.style.cursor = this.currentTool === 'connect' ? 'crosshair' : 'default';
            group.opacity(1);
            this.eventsLayer.batchDraw();
        });
    }

    startConnection(sourceGroup) {
        this.isConnecting = true;
        this.connectionSource = sourceGroup;

        const pos = sourceGroup.getAbsolutePosition();
        const centerX = pos.x + 40;
        const centerY = pos.y + 30;

        this.tempLine = new Konva.Arrow({
            points: [centerX, centerY, centerX, centerY],
            stroke: '#666',
            strokeWidth: 2,
            pointerLength: 8,
            pointerWidth: 6,
            dash: [5, 5]
        });

        this.tempLayer.add(this.tempLine);
        this.tempLayer.batchDraw();
    }

    finishConnection(targetGroup) {
        if (!this.connectionSource || this.connectionSource === targetGroup) {
            this.cancelConnection();
            return;
        }

        const sourceEvent = this.connectionSource.eventData;
        const targetEvent = targetGroup.eventData;

        // Create connection in model
        const connection = new window.VNetModels.Connection(sourceEvent, targetEvent);
        const added = this.vnet.addConnection(connection);

        if (added) {
            // Create graphic
            const connectionGraphic = this.createConnectionGraphic(connection);
            connection.graphicItem = connectionGraphic;
            this.connectionsLayer.add(connectionGraphic);
            this.connectionsLayer.batchDraw();
        }

        this.cancelConnection();
    }

    cancelConnection() {
        this.isConnecting = false;
        this.connectionSource = null;
        if (this.tempLine) {
            this.tempLine.destroy();
            this.tempLine = null;
            this.tempLayer.batchDraw();
        }
    }

    createConnectionGraphic(connection) {
        const group = new Konva.Group({ id: connection.id });

        // Get positions
        const sourcePos = connection.source.graphicItem.getAbsolutePosition();
        const targetPos = connection.target.graphicItem.getAbsolutePosition();

        const startX = sourcePos.x + 40;
        const startY = sourcePos.y + 30;
        const endX = targetPos.x + 40;
        const endY = targetPos.y + 30;

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
        const labelHeight = connection.hasInverse ? 38 : 24;
        const labelY = midY - labelHeight / 2;

        // Label background
        const labelBg = new Konva.Rect({
            x: midX - 55,
            y: labelY,
            width: 110,
            height: labelHeight,
            fill: 'white',
            stroke: connection.hasInverse ? '#9b59b6' : '#ccc',
            strokeWidth: connection.hasInverse ? 2 : 1,
            cornerRadius: 4
        });
        group.add(labelBg);

        // Label text - restricción directa
        const maxTimeStr = connection.maxTime === Infinity ? '∞' : connection.maxTime.toFixed(1);
        const labelText = new Konva.Text({
            x: midX - 53,
            y: labelY + 4,
            width: 106,
            text: `[${connection.minTime.toFixed(1)}, ${maxTimeStr}]`,
            fontSize: 11,
            fontFamily: 'Arial',
            fill: '#333',
            align: 'center'
        });
        group.add(labelText);

        // Label text - restricción inversa
        let inverseLabelText = null;
        if (connection.hasInverse) {
            const invMaxTimeStr = connection.inverseMaxTime === Infinity ? '∞' : connection.inverseMaxTime.toFixed(1);
            inverseLabelText = new Konva.Text({
                x: midX - 53,
                y: labelY + 20,
                width: 106,
                text: `⟲ [${connection.inverseMinTime.toFixed(1)}, ${invMaxTimeStr}]`,
                fontSize: 10,
                fontFamily: 'Arial',
                fill: '#e67e22',
                align: 'center',
                fontStyle: 'italic'
            });
            group.add(inverseLabelText);
        }

        // Store references
        group.connectionData = connection;
        group.arrowNode = arrow;
        group.labelBg = labelBg;
        group.labelText = labelText;
        group.inverseLabelText = inverseLabelText;

        // Event handlers
        this.setupConnectionGraphicHandlers(group, connection);

        return group;
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
        const oldGroup = connection.graphicItem;
        if (!oldGroup) return;

        // Destruir el gráfico antiguo
        oldGroup.destroy();

        // Crear uno nuevo con los datos actualizados
        const newGroup = this.createConnectionGraphic(connection);
        connection.graphicItem = newGroup;
        this.connectionsLayer.add(newGroup);
    }

    // Actualizar solo posiciones (cuando se arrastra un evento)
    updateConnectionPosition(connection) {
        const group = connection.graphicItem;
        if (!group) return;

        const sourcePos = connection.source.graphicItem.getAbsolutePosition();
        const targetPos = connection.target.graphicItem.getAbsolutePosition();

        const startX = sourcePos.x + 40;
        const startY = sourcePos.y + 30;
        const endX = targetPos.x + 40;
        const endY = targetPos.y + 30;

        // Update arrow points
        group.arrowNode.points(this.calculateCurvePoints(startX, startY, endX, endY));

        // Update inverse arrow if exists
        if (group.inverseArrowNode) {
            group.inverseArrowNode.points(this.calculateCurvePoints(endX, endY, startX, startY, true));
        }

        // Calcular posición del label
        const midX = (startX + endX) / 2;
        const midY = (startY + endY) / 2;
        const labelHeight = connection.hasInverse ? 38 : 24;
        const labelY = midY - labelHeight / 2;

        // Update label position
        group.labelBg.x(midX - 55);
        group.labelBg.y(labelY);
        group.labelText.x(midX - 53);
        group.labelText.y(labelY + 4);

        // Update inverse label if exists
        if (group.inverseLabelText) {
            group.inverseLabelText.x(midX - 53);
            group.inverseLabelText.y(labelY + 20);
        }
    }

    selectItem(item) {
        this.deselectAll();
        this.selectedItem = item;

        // Add selection highlight
        if (item.eventData) {
            // It's an event
            const rect = item.findOne('Rect');
            if (rect) {
                rect.stroke('#3498db');
                rect.strokeWidth(3);
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
                const rect = this.selectedItem.findOne('Rect');
                if (rect) {
                    rect.stroke('#3c3c3c');
                    rect.strokeWidth(2);
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
        if (window.VNetDialogs) {
            window.VNetDialogs.showConnectionDialog(connection, () => {
                this.updateConnectionGraphic(connection);
                this.connectionsLayer.batchDraw();
            });
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
