/**
 * V-Nets Web Editor - Matrices de Ocurrencia
 * Implementación de las matrices de ocurrencia del artículo
 */

/**
 * Clase para manejar matrices de ocurrencia de V-Nets
 * Según la definición del artículo, las matrices representan secuencias de eventos
 * con filas INIT, Oc1, Oc2, ..., END y columnas para cada tipo de evento
 */
class OccurrenceMatrix {
    /**
     * Crear matriz de ocurrencia para una secuencia de eventos
     * @param {Array} sequence - Secuencia de eventos [{name, time}, ...]
     * @param {Array} eventTypes - Lista de todos los tipos de eventos posibles
     * @returns {Object} Matriz de ocurrencia
     */
    static createFromSequence(sequence, eventTypes) {
        const matrix = {};

        if (sequence.length === 0) {
            return matrix;
        }

        // INIT row - primer evento
        matrix['INIT'] = {};
        eventTypes.forEach(eventType => {
            matrix['INIT'][eventType] = (sequence[0].name === eventType) ? 1 : 0;
        });

        // Occurrence rows (Oc1, Oc2, ...) - eventos intermedios
        // Excluyendo el primero y el último
        for (let i = 1; i < sequence.length - 1; i++) {
            const event = sequence[i];
            const ocLabel = `Oc${i}`;
            matrix[ocLabel] = {};

            eventTypes.forEach(eventType => {
                matrix[ocLabel][eventType] = (event.name === eventType) ? 1 : 0;
            });
        }

        // END row - último evento
        matrix['END'] = {};
        eventTypes.forEach(eventType => {
            matrix['END'][eventType] = (sequence[sequence.length - 1].name === eventType) ? 1 : 0;
        });

        return matrix;
    }

    /**
     * Crear múltiples matrices para un conjunto de secuencias
     * @param {Array} sequences - Array de secuencias
     * @param {Array} eventTypes - Lista de tipos de eventos
     * @returns {Array} Array de matrices
     */
    static createMultiple(sequences, eventTypes) {
        return sequences.map(sequence =>
            this.createFromSequence(sequence, eventTypes)
        );
    }

    /**
     * Convertir matriz a formato de texto legible
     * @param {Object} matrix - Matriz de ocurrencia
     * @returns {string} Representación textual
     */
    static toText(matrix) {
        if (Object.keys(matrix).length === 0) {
            return "Matriz vacía";
        }

        const rows = Object.keys(matrix).sort(); // INIT, Oc1, Oc2, ..., END
        const eventTypes = Object.keys(matrix[rows[0]]).sort();

        let text = "Matriz de Ocurrencia:\n";
        text += " ".repeat(6) + eventTypes.join("  ") + "\n";
        text += " ".repeat(6) + "-".repeat(eventTypes.length * 3 - 1) + "\n";

        rows.forEach(rowName => {
            const values = eventTypes.map(eventType => matrix[rowName][eventType]);
            text += `${rowName.padEnd(6)}${values.join("  ")}\n`;
        });

        return text;
    }

    /**
     * Validar que una matriz cumpla con las reglas de V-Nets
     * - INIT debe tener exactamente un 1
     * - END debe tener exactamente un 1
     * - Cada fila Oc debe tener exactamente un 1
     * @param {Object} matrix - Matriz a validar
     * @returns {Object} Resultado de validación
     */
    static validate(matrix) {
        const errors = [];
        const warnings = [];

        const rows = Object.keys(matrix);

        // Verificar INIT
        if (rows.includes('INIT')) {
            const initRow = matrix['INIT'];
            const initSum = Object.values(initRow).reduce((sum, val) => sum + val, 0);
            if (initSum !== 1) {
                errors.push(`Fila INIT debe tener exactamente un 1, tiene ${initSum}`);
            }
        } else {
            errors.push("Falta fila INIT");
        }

        // Verificar END
        if (rows.includes('END')) {
            const endRow = matrix['END'];
            const endSum = Object.values(endRow).reduce((sum, val) => sum + val, 0);
            if (endSum !== 1) {
                errors.push(`Fila END debe tener exactamente un 1, tiene ${endSum}`);
            }
        } else {
            errors.push("Falta fila END");
        }

        // Verificar filas Oc (ocurrencias intermedias)
        const ocRows = rows.filter(row => row.startsWith('Oc')).sort();
        ocRows.forEach(ocRow => {
            const row = matrix[ocRow];
            const sum = Object.values(row).reduce((sum, val) => sum + val, 0);
            if (sum !== 1) {
                errors.push(`Fila ${ocRow} debe tener exactamente un 1, tiene ${sum}`);
            }
        });

        return {
            valid: errors.length === 0,
            errors,
            warnings
        };
    }

    /**
     * Comparar dos matrices de ocurrencia
     * @param {Object} matrix1 - Primera matriz
     * @param {Object} matrix2 - Segunda matriz
     * @returns {boolean} True si son idénticas
     */
    static areEqual(matrix1, matrix2) {
        const rows1 = Object.keys(matrix1).sort();
        const rows2 = Object.keys(matrix2).sort();

        if (rows1.length !== rows2.length) {
            return false;
        }

        for (let i = 0; i < rows1.length; i++) {
            const row1 = matrix1[rows1[i]];
            const row2 = matrix2[rows2[i]];

            const cols1 = Object.keys(row1).sort();
            const cols2 = Object.keys(row2).sort();

            if (cols1.length !== cols2.length) {
                return false;
            }

            for (let j = 0; j < cols1.length; j++) {
                if (row1[cols1[j]] !== row2[cols2[j]]) {
                    return false;
                }
            }
        }

        return true;
    }
}

/**
 * Gestor de matrices de ocurrencia para V-Nets completos
 */
class OccurrenceMatrixManager {
    constructor(vnet) {
        this.vnet = vnet;
        this.matrices = [];
    }

    /**
     * Generar matrices para todas las secuencias representativas del V-Net
     * @returns {Array} Array de matrices
     */
    generateAllMatrices() {
        // Obtener todos los tipos de eventos
        const eventTypes = Object.values(this.vnet.events).map(e => e.name);

        // Generar secuencias representativas (simplificado)
        const sequences = this.generateRepresentativeSequences();

        // Crear matrices para cada secuencia
        this.matrices = OccurrenceMatrix.createMultiple(sequences, eventTypes);

        return this.matrices;
    }

    /**
     * Generar secuencias representativas del V-Net (versión simplificada)
     * En un V-Net completo, estas vendrían de las secuencias representativas
     * @returns {Array} Secuencias representativas
     */
    generateRepresentativeSequences() {
        const sequences = [];
        const initEvents = Object.values(this.vnet.events).filter(e => e.eventType === 'init');

        // Para cada evento INIT, encontrar caminos a END
        initEvents.forEach(initEvent => {
            const paths = this.findAllPathsToEnd(initEvent);
            paths.forEach(path => {
                // Convertir path de eventos a secuencia con tiempos
                const sequence = path.map((event, index) => ({
                    name: event.name,
                    time: index * 10 // Tiempo simplificado
                }));
                sequences.push(sequence);
            });
        });

        return sequences;
    }

    /**
     * Encontrar todos los caminos desde un evento INIT hasta END
     * @param {EventNode} startEvent - Evento inicial
     * @returns {Array} Array de caminos (arrays de eventos)
     */
    findAllPathsToEnd(startEvent) {
        const paths = [];
        const visited = new Set();

        this._dfsPaths(startEvent, [], paths, visited);

        return paths;
    }

    _dfsPaths(current, currentPath, allPaths, visited) {
        currentPath.push(current);
        visited.add(current.id);

        if (current.eventType === 'end') {
            // Encontramos un END, guardar el camino
            allPaths.push([...currentPath]);
        } else {
            // Continuar explorando conexiones salientes
            for (const conn of current.outgoing) {
                const nextEvent = conn.target;
                if (!visited.has(nextEvent.id)) {
                    this._dfsPaths(nextEvent, currentPath, allPaths, visited);
                }
            }
        }

        // Backtrack
        currentPath.pop();
        visited.delete(current.id);
    }

    /**
     * Obtener estadísticas de las matrices
     * @returns {Object} Estadísticas
     */
    getStatistics() {
        if (this.matrices.length === 0) {
            return { count: 0 };
        }

        return {
            count: this.matrices.length,
            avgRows: this.matrices.reduce((sum, m) => sum + Object.keys(m).length, 0) / this.matrices.length,
            uniqueMatrices: this.getUniqueMatricesCount()
        };
    }

    /**
     * Contar matrices únicas
     * @returns {number} Número de matrices únicas
     */
    getUniqueMatricesCount() {
        const unique = new Set();
        this.matrices.forEach(matrix => {
            const key = JSON.stringify(matrix);
            unique.add(key);
        });
        return unique.size;
    }
}

// Exportar
window.OccurrenceMatrix = OccurrenceMatrix;
window.OccurrenceMatrixManager = OccurrenceMatrixManager;
