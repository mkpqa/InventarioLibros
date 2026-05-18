# CAMBIOS V2 — Sistema LibroStock
> Documento de modificaciones para implementar en Antigravity con Claude Sonnet.
> Leer completo antes de tocar cualquier archivo.

---

## RESUMEN EJECUTIVO DE CAMBIOS

| Qué cambia | Acción |
|---|---|
| Pantalla de Escaneo | ELIMINAR completamente |
| Módulo de Venta | CREAR nuevo (reemplaza Escaneo) |
| Pantalla Editar Producto | MODIFICAR — agregar gestión de stock |
| Módulo de Usuarios | ARREGLAR — no permite crear usuarios |
| Base de datos | AGREGAR 2 tablas nuevas |
| Kardex | MODIFICAR — vincular ventas |

---

## 1. CAMBIOS EN LA BASE DE DATOS

### 1A. Crear tabla `ventas`

```sql
CREATE TABLE ventas (
  id             SERIAL PRIMARY KEY,
  numero_venta   VARCHAR(20) UNIQUE NOT NULL,  -- generado automático: VTA-0001, VTA-0002...
  cliente_nombre VARCHAR(150),                  -- opcional, puede ser NULL
  precio_total   DECIMAL(10,2),                 -- opcional, puede ser NULL
  usuario_id     INTEGER NOT NULL REFERENCES usuarios(id),
  creado_en      TIMESTAMP NOT NULL DEFAULT NOW()
);
```

### 1B. Crear tabla `detalle_ventas`

```sql
CREATE TABLE detalle_ventas (
  id          SERIAL PRIMARY KEY,
  venta_id    INTEGER NOT NULL REFERENCES ventas(id),
  libro_id    INTEGER NOT NULL REFERENCES libros(id),
  cantidad    INTEGER NOT NULL,
  creado_en   TIMESTAMP NOT NULL DEFAULT NOW()
);
```

### 1C. Modificar tabla `kardex` — agregar columna opcional

```sql
ALTER TABLE kardex ADD COLUMN venta_id INTEGER REFERENCES ventas(id);
-- Si el movimiento viene de una venta, este campo tiene el ID de la venta
-- Si es un ajuste manual de stock, este campo es NULL
```

### Ejecutar en PostgreSQL en este orden exacto:

```sql
-- 1. Primero ventas (sin dependencias)
CREATE TABLE ventas (
  id             SERIAL PRIMARY KEY,
  numero_venta   VARCHAR(20) UNIQUE NOT NULL,
  cliente_nombre VARCHAR(150),
  precio_total   DECIMAL(10,2),
  usuario_id     INTEGER NOT NULL REFERENCES usuarios(id),
  creado_en      TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 2. Luego detalle_ventas (depende de ventas y libros)
CREATE TABLE detalle_ventas (
  id          SERIAL PRIMARY KEY,
  venta_id    INTEGER NOT NULL REFERENCES ventas(id),
  libro_id    INTEGER NOT NULL REFERENCES libros(id),
  cantidad    INTEGER NOT NULL,
  creado_en   TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 3. Modificar kardex
ALTER TABLE kardex ADD COLUMN venta_id INTEGER REFERENCES ventas(id);
```

---

## 2. ELIMINAR PANTALLA DE ESCANEO

- Eliminar el archivo `frontend/src/pages/Escaneo.jsx`
- Eliminar la ruta `/escaneo` del router en `App.jsx`
- Eliminar el link "Escaneo" del Sidebar
- En el sistema de roles: el Operario ahora accede a `/ventas` en lugar de `/escaneo`

---

## 3. NUEVO MÓDULO DE VENTA

### Ruta
`/ventas` — Administrador y Operario

### Descripción
Pantalla para registrar la salida de libros como una venta. Puede incluir múltiples títulos distintos en una sola operación. El cliente y el precio son opcionales.

### Comportamiento completo

#### Panel izquierdo — Buscador de libros

1. Un campo de búsqueda con autocompletado. El usuario escribe el título o código del libro.
2. La búsqueda hace GET a `/api/libros/buscar?q=texto` y muestra un dropdown con los resultados.
3. Cada resultado en el dropdown muestra: Título + stock disponible con su color semáforo (verde/amarillo/rojo).
4. Si el stock de un libro es 0, aparece en el dropdown pero deshabilitado con la etiqueta "Sin stock".
5. Al seleccionar un libro del dropdown, se agrega a la lista de items de la venta con cantidad 1.
6. El mismo libro no se puede agregar dos veces. Si ya está en la lista, incrementa la cantidad en 1.

#### Panel central — Lista de items de la venta

Muestra todos los libros agregados a la venta actual. Para cada item:
- Título del libro
- Stock disponible (con color semáforo)
- Control de cantidad: botón (-) | número editable | botón (+)
- El botón (+) se deshabilita si la cantidad llega al stock disponible
- Botón (×) para eliminar ese item de la venta
- Si la lista está vacía, mostrar estado vacío: "Agrega libros desde el buscador"

#### Panel derecho — Resumen y datos de venta

- **Número de venta:** generado automáticamente (no editable). Formato: VTA-0001
- **Cliente:** campo de texto libre, completamente opcional. Placeholder: "Nombre del cliente (opcional)"
- **Precio total:** campo numérico opcional. Placeholder: "S/. 0.00" o la moneda que uses
- **Resumen:** lista de items con sus cantidades
- **Botón "Registrar Venta":** se habilita solo cuando hay al menos 1 item en la lista

#### Al registrar la venta

El frontend envía POST a `/api/ventas` con:
```json
{
  "cliente_nombre": "Juan Pérez",   // puede ser null
  "precio_total": 45.00,             // puede ser null
  "items": [
    { "libro_id": 1, "cantidad": 3 },
    { "libro_id": 5, "cantidad": 1 }
  ]
}
```

El backend ejecuta una transacción SQL que hace:
1. Generar número de venta correlativo (VTA-0001, VTA-0002...)
2. INSERT en tabla `ventas`
3. Para cada item:
   a. Verificar que el stock sea suficiente (si no → ROLLBACK completo)
   b. UPDATE `libros` SET stock_actual = stock_actual - cantidad
   c. INSERT en `kardex` con tipo_movimiento = 'SALIDA', venta_id = id de la venta
   d. INSERT en `detalle_ventas`
4. COMMIT
5. Responder con el número de venta generado

Si todo sale bien: mostrar modal de éxito con el número de venta y limpiar el formulario.
Si algún libro no tiene stock suficiente: mostrar error específico indicando qué libro falló.

### Lógica importante
- Cada libro vendido genera su propio registro en kardex con tipo 'SALIDA'
- Una venta de 3 libros distintos = 3 registros en kardex, todos con el mismo venta_id
- El kardex de trazabilidad sigue siendo inmutable — las ventas no se pueden deshacer desde la UI

### API nuevas necesarias

```
POST /api/ventas
Headers: Authorization: Bearer <token>
Body: { cliente_nombre?, precio_total?, items: [{libro_id, cantidad}] }
Response 200: { venta_id, numero_venta, mensaje: "Venta registrada correctamente" }
Response 400: { error: "Stock insuficiente para: [título del libro]" }

GET /api/ventas
Headers: Authorization: Bearer <token>
Response 200: [ { id, numero_venta, cliente_nombre, precio_total, creado_en, usuario_nombre, total_items } ]

GET /api/ventas/:id
Response 200: { venta completa con detalle de items }

GET /api/libros/buscar?q=texto
Response 200: [ { id, titulo, codigo_barras, stock_actual, foto_url } ]
```

---

## 4. MODIFICAR PANTALLA DE EDITAR PRODUCTO

### Qué agregar a la pantalla existente `/inventario/editar/:id`

Debajo de los campos actuales (Título, Descripción, Foto), agregar una sección nueva llamada **"Ajuste de Stock"**:

#### Sección Ajuste de Stock

```
┌─────────────────────────────────────────┐
│ AJUSTE DE STOCK                         │
│                                         │
│ Stock actual: [47] (badge con color)    │
│                                         │
│ Tipo de ajuste:                         │
│ ● Entrada (sumar unidades)              │
│ ○ Salida  (restar unidades)             │
│                                         │
│ Cantidad a ajustar: [____]              │
│                                         │
│ Motivo (opcional): [____________]       │
│                                         │
│ [Aplicar Ajuste de Stock]               │
└─────────────────────────────────────────┘
```

#### Comportamiento

- El ajuste de stock es independiente del guardado del formulario principal.
- El botón "Aplicar Ajuste de Stock" hace su propio POST a `/api/movimientos/ajuste`.
- Si tipo = "Entrada": suma la cantidad al stock y genera kardex tipo 'ENTRADA'.
- Si tipo = "Salida": resta la cantidad y genera kardex tipo 'AJUSTE' (para diferenciarlo de una venta).
- Si la salida supera el stock: mostrar error "Stock insuficiente".
- Después de aplicar el ajuste: actualizar el número de stock visible en pantalla sin recargar.
- El campo "Motivo" se guarda en la columna `observacion` del kardex.

#### API para el ajuste

```
POST /api/movimientos/ajuste
Headers: Authorization: Bearer <token>
Body: {
  libro_id: number,
  tipo: 'ENTRADA' | 'AJUSTE',
  cantidad: number,
  observacion?: string
}
Response 200: { stock_nuevo: number, kardex_id: number }
Response 400: { error: "Stock insuficiente" }
```

---

## 5. ARREGLAR MÓDULO DE USUARIOS

### El problema actual
El módulo de usuarios no permite crear nuevos usuarios. Esto puede ser por:
- El endpoint `POST /api/usuarios` no está implementado o tiene un bug
- El formulario del frontend no envía los datos correctamente
- Falta el hash de contraseña al crear

### Lo que debe funcionar

#### Pantalla `/usuarios` — solo Administrador

Lista de usuarios con columnas: Nombre | Email | Rol | Estado (Activo/Inactivo) | Acciones

Botón **"+ Nuevo Usuario"** abre un modal (no una página nueva) con el formulario:

```
Nombre:      [_______________]  (requerido)
Email:       [_______________]  (requerido, único)
Contraseña:  [_______________]  (requerido, mínimo 6 caracteres)
Rol:         [Admin ▼ / Operario ▼]  (requerido)
```

Botones del modal: "Cancelar" y "Crear Usuario"

#### Comportamiento al crear

```javascript
// El frontend envía:
POST /api/usuarios
Body: { nombre, email, password, rol }

// El backend debe:
// 1. Validar que el email no exista ya en la BD
// 2. Hacer hash de la contraseña con bcrypt (saltRounds: 10)
// 3. INSERT en tabla usuarios
// 4. Responder con el usuario creado (sin el password)
```

#### Editar usuario
- Mismo modal pero pre-llenado
- El campo contraseña dice "Dejar vacío para no cambiar"
- Si se envía con contraseña: hashear y actualizar
- Si se envía sin contraseña: solo actualizar nombre, email, rol

#### Desactivar usuario
- No se elimina físicamente (soft delete igual que libros)
- UPDATE usuarios SET activo = false
- El usuario desactivado no puede iniciar sesión

#### Validaciones de error que mostrar en el modal
- Email ya registrado → "Este email ya está en uso"
- Contraseña muy corta → "Mínimo 6 caracteres"
- Intentar desactivar el propio usuario admin → "No puedes desactivarte a ti mismo"

### API completa de usuarios

```
GET    /api/usuarios          → lista todos los usuarios (activos e inactivos)
POST   /api/usuarios          → crear usuario nuevo
PUT    /api/usuarios/:id      → editar usuario
DELETE /api/usuarios/:id      → soft delete (activo = false)
```

---

## 6. ACTUALIZAR EL SIDEBAR

El menú lateral debe quedar así:

| Ícono | Label | Ruta | Rol |
|---|---|---|---|
| 📊 | Dashboard | /dashboard | Admin |
| 📚 | Inventario | /inventario | Admin |
| 🛒 | Ventas | /ventas | Admin + Operario |
| 📋 | Trazabilidad | /trazabilidad | Admin |
| 👥 | Usuarios | /usuarios | Admin |

El Operario solo ve: Ventas (y puede ir a la galería del inventario solo para consulta)

---

## 7. ACTUALIZAR TRAZABILIDAD

En el módulo de Trazabilidad (Kardex), cuando un movimiento tiene `venta_id`, mostrar en la columna de observación un link o badge: **"Venta #VTA-0001"**. Al hacer clic muestra el detalle de esa venta (modal o página).

Esto permite que desde el Kardex puedas rastrear exactamente qué venta generó cada salida.

---

## 8. INSTRUCCIONES PARA ANTIGRAVITY

### Prompt exacto para darle a Claude Sonnet en Antigravity

```
@CAMBIOS_V2_PARA_ANTIGRAVITY.md

Lee este documento completo de cambios V2. Antes de escribir 
cualquier código necesito que:

1. Confirmes que entendiste los 7 cambios principales
2. Me digas en qué orden vas a implementarlos
3. Empieces por el PASO 1: los cambios de base de datos
   (ejecutar el SQL de las nuevas tablas en PostgreSQL)

Cuando termines el paso 1 y confirmes que las tablas 
existen, espera mi confirmación para continuar.

No toques el frontend hasta que el backend de ventas 
esté completo y probado.
```

### Orden recomendado de implementación

1. **Base de datos** — crear tablas ventas y detalle_ventas, modificar kardex
2. **Backend ventas** — rutas, controlador, transacción SQL completa
3. **Backend usuarios** — arreglar el bug de creación
4. **Backend ajuste de stock** — endpoint /api/movimientos/ajuste
5. **Frontend — Módulo de Ventas** — pantalla completa nueva
6. **Frontend — Editar Producto** — agregar sección de ajuste de stock
7. **Frontend — Usuarios** — arreglar el modal de creación
8. **Frontend — Sidebar** — actualizar links y eliminar Escaneo
9. **Frontend — Trazabilidad** — mostrar link a venta en kardex

---

*Fin del documento V2.*
