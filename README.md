# V-Nets Web Editor

Editor visual y generador automático de modelos V-net.

Esta aplicación web implementa un editor completo de V-Nets con ejecución en navegador web.

## Características Principales

### Editor Visual Interactivo
- Diseño visual de modelos V-net mediante arrastrar y soltar
- Tres tipos de eventos: Inicial, Intermedio, Final
- Conexiones temporales con restricciones [min, max]
- Restricciones bidireccionales con soporte completo para restricciones inversas
- Visualización gráfica con flechas curvas y etiquetas de intervalos temporales

### Sistema de Archivos
- Nuevo archivo (Ctrl+N): Crear modelo vacío
- Abrir (Ctrl+O): Cargar archivos `.vnet` del proyecto de escritorio
- Guardar (Ctrl+S): Guardar modelo actual
- Guardar como (Ctrl+Shift+S): Guardar con nuevo nombre
- Compatibilidad total con formatos web y de escritorio

### Generación de Secuencias
Implementa tres algoritmos principales:
- Exhaustivo: Genera todas las secuencias posibles
- Muestreo: Crea N secuencias aleatorias
- Adaptativo: Selecciona automáticamente el mejor algoritmo según complejidad del modelo
- Análisis de complejidad automática del grafo
- Exportación en formatos CSV, JSON, TXT

### Validación Avanzada
- Validación estructural: Verifica caminos INIT→END, conexiones, frecuencias
- Validación de caminos usando algoritmo BFS
- Detección de ciclos potencialmente problemáticos
- Validación de secuencias con múltiples formatos de entrada
- Métrica de porcentaje de conformidad

### Validación de Secuencias Manuales
- Soporte para múltiples formatos: con tiempos, sin tiempos, formato tabla
- Verificación automática de eventos, conexiones y restricciones temporales
- Métricas detalladas de conformidad, errores y advertencias

### Navegación y Zoom
- Zoom mediante rueda del ratón con límites configurables
- Pan mediante Shift+arrastre o botón central
- Función de ajuste automático a ventana
- Controles visuales de zoom con indicador numérico

### Sistema de Deshacer/Rehacer
- Historial de estados con límite de 50 operaciones
- Atajos de teclado estándar: Ctrl+Z / Ctrl+Y
- Indicadores visuales de estado de los botones

### Barra de Menús
- Archivo: Nuevo, Abrir, Guardar, Exportar imagen, Exportar JSON
- Edición: Deshacer, Rehacer, Eliminar selección, Limpiar canvas
- Validación: Validar V-Net, Generar secuencias, Validar secuencia manual
- Vista: Controles de zoom y navegación
- Ayuda: Atajos de teclado, Información del programa

### Exportación de Imágenes
- Formatos: PNG, JPEG con soporte de transparencia
- Escalas configurables: 1x, 2x, 3x, 4x
- Opciones de fondo: Blanco, Transparente, Con cuadrícula
- Vista previa antes de la exportación

### Generador Automático (VNDA)
- Procesamiento de secuencias desde archivos CSV/TXT
- Aplicación de restricciones temporales opcionales
- Evaluación de predicados de advertencia con lógica booleana
- Visualización gráfica usando Cytoscape.js

## Inicio Rápido

### Opción 1: Uso Directo

1. Descargar el archivo `index.html`
2. Abrir en cualquier navegador web moderno
3. La aplicación funciona completamente en el cliente

### Opción 2: Servidor Web

1. Subir el archivo `index.html` a un servidor web estático
2. Acceder mediante URL del servidor
3. Compatible con GitHub Pages, Netlify, Vercel u otros servicios de hosting estático

### Opción 3: Servidor Local de Desarrollo

**Requisitos**: Python 3.x

Ejecutar servidor HTTP simple:
```bash
cd vnets_editor/V-Nets-algorithm
python -m http.server 8000
```

Acceder en: http://localhost:8000

### Opción 4: Con Backend Flask

**Requisitos**: Python 3.x, Flask, pandas, networkx

1. Instalar dependencias:
   ```bash
   pip install -r requirements.txt
   ```

2. Ejecutar la aplicación:
   ```bash
   python app.py
   ```

3. Acceder en: http://localhost:5000

**Nota**: Esta opción ejecuta los algoritmos VNDA en el servidor Python en lugar del navegador. Proporciona las mismas funcionalidades que la versión web pero requiere instalación de dependencias Python.

## Uso del Editor Visual

### Construcción de Modelos
1. Seleccionar herramienta de edición o conexión
2. Agregar eventos arrastrando componentes desde la paleta lateral
3. Conectar eventos seleccionando herramienta de conexión y haciendo clic origen→destino
4. Editar propiedades mediante doble clic en eventos o conexiones

### Restricciones Temporales
- Directa: Intervalos de tiempo [min, max] entre eventos consecutivos
- Inversa: Restricciones bidireccionales opcionales
- Frecuencias: Número mínimo de ocurrencias por evento

### Atajos de Teclado
- `Ctrl+N`: Nuevo archivo
- `Ctrl+O`: Abrir archivo
- `Ctrl+S`: Guardar
- `Ctrl+Shift+S`: Guardar como
- `Ctrl+Z`: Deshacer
- `Ctrl+Y`: Rehacer
- `Delete`: Eliminar selección
- `V`: Herramienta Seleccionar
- `C`: Herramienta Conectar
- `Escape`: Cancelar acción
- `+`/`-`: Zoom In/Out
- `Ctrl+0`: Restablecer zoom
- `F5`: Validar V-Net
- `Rueda del ratón`: Zoom
- `Shift+Arrastre`: Pan/Mover canvas

## Generador Automático (VNDA)

### Formato de Datos de Entrada
```
SequenceID,EventType,Timestamp
Seq1,E1,1.049432
Seq1,E2,1.606904
Seq2,E1,0.800123
```

### Restricciones Temporales (Opcional)
```
Event1ID,Event2ID,MinTime,MaxTime
E1,E2,1.0,2.0
```

### Predicados de Advertencia (Opcional)
```
Frec(a)=2
b->c before d
Frec(a)>=1 ∧ Frec(b)=0
```

## Estructura del Proyecto

```
vnets_editor/V-Nets-algorithm/
├── index.html                    # Aplicación web completa
├── app.py                        # Backend Flask opcional
├── requirements.txt              # Dependencias Python
├── docker-compose.yml            # Configuración Docker Compose
├── Dockerfile                    # Configuración Docker
├── static/
│   ├── js/
│   │   ├── models.js             # Modelos de datos y sistema Undo/Redo
│   │   ├── dialogs.js            # Diálogos modales
│   │   ├── canvas.js             # Canvas interactivo con Konva.js
│   │   ├── palette.js            # Paleta de componentes
│   │   ├── editor.js             # Lógica principal del editor
│   │   ├── sequence-generator.js # Generador de secuencias
│   │   ├── sequence-validator.js # Validador de secuencias
│   │   ├── menubar.js            # Barra de menús
│   │   └── image-export.js       # Exportador de imágenes
│   └── css/
│       └── editor.css            # Estilos del editor
├── inputs.txt                    # Datos de ejemplo para VNDA
├── ejemplo_secuencias.txt        # Archivo de ejemplo de secuencias
├── ejemplo_restricciones.csv     # Archivo de ejemplo de restricciones
├── ejemplo_predicados.csv       # Archivo de ejemplo de predicados
├── "The power of V-nets .pdf"    # Documento técnico de referencia
└── README.md                     # Documentación
```

## Tecnologías Utilizadas

**Frontend**:
- HTML5, CSS3, JavaScript ES6+
- Konva.js para gráficos interactivos del canvas
- Cytoscape.js para visualización de grafos

**Backend opcional**:
- Python Flask
- Pandas para análisis de datos
- NetworkX para manipulación de grafos

**Estilos**:
- CSS moderno con variables CSS
- Diseño responsive

## Notas de Desarrollo

- **Ejecución cliente**: Procesamiento completo en navegador (excepto modo Flask)
- **Independencia**: No requiere dependencias externas
- **Responsive**: Compatible con desktop y dispositivos móviles
- **Performance**: Optimizado para modelos V-net complejos
- **Modularidad**: Arquitectura basada en módulos JavaScript independientes
