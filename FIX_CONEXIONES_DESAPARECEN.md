# 🔧 FIX: Conexiones Desaparecen al Guardar Restricciones

## Problema Identificado

Cuando editabas las restricciones temporales de una conexión (double-click), la conexión desaparecía visualmente después de guardar. El problema estaba en cómo se actualizaba el gráfico.

---

## Causas Raíz

### 1. **Missing `batchDraw()` en `updateConnectionGraphic()`**
**Archivo:** `canvas.js` línea 898-908

**ANTES:**
```javascript
updateConnectionGraphic(connection) {
    const oldGroup = connection.graphicItem;
    if (!oldGroup) return;

    oldGroup.destroy();
    const newGroup = this.createConnectionGraphic(connection);
    connection.graphicItem = newGroup;
    this.connectionsLayer.add(newGroup);
    // ❌ NO hay batchDraw() aquí - capa no se redibuja
}
```

**Problema:** La capa se agregaba pero nunca se redibujaba, por lo que el elemento nuevo no era visible.

**SOLUCIÓN:** Agregar `this.connectionsLayer.batchDraw()` después de agregar el nuevo grupo.

---

### 2. **Doble `batchDraw()` en el callback**
**Archivo:** `canvas.js` línea 1026-1041

**ANTES:**
```javascript
showConnectionProperties(connection) {
    if (window.VNetDialogs) {
        window.VNetDialogs.showConnectionDialog(connection, () => {
            if (this.vnet.connections[connection.id]) {
                this.updateConnectionGraphic(connection);
                this.connectionsLayer.batchDraw();  // ❌ Duplicado
            }
        });
    }
}
```

**Problema:** Se llamaba `batchDraw()` aquí Y dentro de `updateConnectionGraphic()`, causando conflictos de sincronización.

**SOLUCIÓN:** Eliminar el `batchDraw()` del callback, dejarlo solo en `updateConnectionGraphic()`.

---

### 3. **Label elements escuchando eventos innecesariamente**
**Archivo:** `canvas.js` línea 776-820

**ANTES:**
```javascript
const labelBg = new Konva.Rect({
    // ... propiedades
    // ❌ listening no está definido, por defecto es true
});

const labelText = new Konva.Text({
    // ... propiedades
    // ❌ listening no está definido, por defecto es true
});
```

**Problema:** Los labels podían interceptar eventos del ratón, causando comportamiento inesperado.

**SOLUCIÓN:** Agregar `listening: false` a todos los elementos que no necesitan interacción.

---

## 🔧 Cambios Aplicados

### Cambio 1: `updateConnectionGraphic()` (línea 898-912)
```javascript
updateConnectionGraphic(connection) {
    const oldGroup = connection.graphicItem;
    if (!oldGroup) return;

    console.log(`Actualizando conexión: ${connection.source.name} → ${connection.target.name}`);

    oldGroup.destroy();
    const newGroup = this.createConnectionGraphic(connection);
    connection.graphicItem = newGroup;
    this.connectionsLayer.add(newGroup);
    
    // ✅ AHORA: Redibujar la capa
    this.connectionsLayer.batchDraw();
    
    console.log(`✓ Conexión actualizada correctamente`);
}
```

### Cambio 2: `showConnectionProperties()` (línea 1026-1041)
```javascript
showConnectionProperties(connection) {
    if (window.VNetDialogs) {
        window.VNetDialogs.showConnectionDialog(connection, () => {
            if (this.vnet.connections[connection.id]) {
                console.log(`Guardando cambios de conexión...`);
                this.updateConnectionGraphic(connection);
                // ✅ Sin batchDraw() aquí - ya está en updateConnectionGraphic()
            } else {
                console.error('Conexión perdida del modelo:', connection.id);
                this.loadFromVNet(this.vnet);
            }
        });
    }
}
```

### Cambio 3: Label elements (línea 776-820)
```javascript
const labelBg = new Konva.Rect({
    x: midX - 55,
    y: labelY,
    width: 110,
    height: labelHeight,
    fill: 'white',
    stroke: connection.hasInverse ? '#9b59b6' : '#ccc',
    strokeWidth: connection.hasInverse ? 2 : 1,
    cornerRadius: 4,
    listening: false  // ✅ No escucha eventos
});

const labelText = new Konva.Text({
    x: midX - 53,
    y: labelY + 4,
    width: 106,
    text: `[${connection.minTime.toFixed(1)}, ${maxTimeStr}]`,
    fontSize: 11,
    fontFamily: 'Arial',
    fill: '#333',
    align: 'center',
    listening: false  // ✅ No escucha eventos
});
```

---

## 🧪 Cómo Verificar que Funciona

1. **Crea 2 eventos** y conecta uno al otro
2. **Double-click en la conexión** para abrir el diálogo de restricciones
3. **Modifica valores** (ej: minTime = 1.5, maxTime = 5.0)
4. **Haz click en "Guardar"**
5. **Resultado esperado:** La conexión debe permanecer visible con las nuevas restricciones
6. **Abre la consola** (F12) y verás:
   - `Actualizando conexión: Event A → Event B`
   - `✓ Conexión actualizada correctamente`

---

## ✅ Cambios Resumidos

| Archivo | Línea | Cambio |
|---------|-------|--------|
| canvas.js | 898-912 | Agregar `batchDraw()` en `updateConnectionGraphic()` |
| canvas.js | 1026-1041 | Eliminar `batchDraw()` duplicado del callback |
| canvas.js | 776-820 | Agregar `listening: false` a labels |

---

## 📊 Antes vs Después

| Situación | ANTES | AHORA |
|-----------|-------|-------|
| Editar restricciones | Conexión desaparece ❌ | Conexión permanece ✅ |
| Guardar cambios | Sin feedback | Log en consola ✅ |
| Hacer clic en labels | Puede seleccionar label | Solo la flecha/conexión ✅ |
