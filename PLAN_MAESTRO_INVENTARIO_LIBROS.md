# PLAN MAESTRO — Sistema de Control de Inventario de Libros
> Documento técnico completo para implementación con IA en IDE.
> Stack: React + Node.js + PostgreSQL + Cloudinary | Auth: JWT

---

## ÍNDICE

1. [Resumen del Sistema](#1-resumen-del-sistema)
2. [Arquitectura General](#2-arquitectura-general)
3. [Esquema de Base de Datos](#3-esquema-de-base-de-datos)
4. [Estructura de Carpetas del Proyecto](#4-estructura-de-carpetas-del-proyecto)
5. [Pantalla: Login](#5-pantalla-login)
6. [Pantalla: Dashboard](#6-pantalla-dashboard)
7. [Pantalla: Inventario / Catálogo](#7-pantalla-inventario--catálogo)
8. [Pantalla: Registro de Nuevo Producto](#8-pantalla-registro-de-nuevo-producto)
9. [Pantalla: Escaneo — Entrada / Salida](#9-pantalla-escaneo--entrada--salida)
10. [Pantalla: Trazabilidad (Kardex)](#10-pantalla-trazabilidad-kardex)
11. [Sistema de Roles y Guards](#11-sistema-de-roles-y-guards)
12. [API Endpoints — Node.js](#12-api-endpoints--nodejs)
13. [Lógica de Semáforo de Stock](#13-lógica-de-semáforo-de-stock)
14. [Exportación a Excel y PDF](#14-exportación-a-excel-y-pdf)
15. [Componentes Compartidos](#15-componentes-compartidos)
16. [Variables de Entorno](#16-variables-de-entorno)
17. [Orden de Implementación Recomendado](#17-orden-de-implementación-recomendado)

---

## 1. RESUMEN DEL SISTEMA

**Tipo:** Aplicación web SPA (Single Page Application).
**Propósito:** Control de inventario físico de libros. Cero facturación, cero precios, cero clientes. Solo entradas, salidas y existencias.
**Usuarios:** Administrador y Operario.
**Regla de oro:** Cada cambio de stock genera un registro de trazabilidad inmutable en la tabla `kardex`. Nunca se modifica el stock directamente sin pasar por este registro.

---

## 2. ARQUITECTURA GENERAL

```
CLIENTE (React)
│
├── /src/pages/         ← Pantallas principales
├── /src/components/    ← Componentes reutilizables
├── /src/context/       ← AuthContext (JWT, rol del usuario)
├── /src/hooks/         ← useScanner, useStockColor, useExport
└── /src/api/           ← Funciones fetch hacia el backend
        │
        │ HTTP/JSON (JWT en header Authorization: Bearer <token>)
        │
SERVIDOR (Node.js + Express)
│
├── /routes/            ← auth, libros, movimientos, usuarios, reportes
├── /middleware/        ← verifyToken, checkRole
├── /controllers/       ← lógica de negocio
└── /db/                ← pool de conexión a PostgreSQL
        │
        │ SQL (pg pool)
        │
BASE DE DATOS (PostgreSQL)
│
├── tabla: usuarios
├── tabla: libros
└── tabla: kardex
        │
CLOUDINARY (externo)
└── Almacena fotos de portadas → devuelve URL → se guarda en tabla libros
```

---

## 3. ESQUEMA DE BASE DE DATOS

### Tabla: `usuarios`

```sql
CREATE TABLE usuarios (
  id          SERIAL PRIMARY KEY,
  nombre      VARCHAR(100) NOT NULL,
  email       VARCHAR(150) UNIQUE NOT NULL,
  password    VARCHAR(255) NOT NULL,        -- bcrypt hash
  rol         VARCHAR(20)  NOT NULL DEFAULT 'operario',  -- 'admin' | 'operario'
  activo      BOOLEAN      NOT NULL DEFAULT TRUE,
  creado_en   TIMESTAMP    NOT NULL DEFAULT NOW()
);
```

### Tabla: `libros`

```sql
CREATE TABLE libros (
  id             SERIAL PRIMARY KEY,
  codigo_barras  VARCHAR(50)  UNIQUE NOT NULL,   -- ISBN o código interno
  titulo         VARCHAR(255) NOT NULL,
  descripcion    TEXT,
  foto_url       VARCHAR(500),                   -- URL de Cloudinary
  stock_actual   INTEGER      NOT NULL DEFAULT 0,
  estado_activo  BOOLEAN      NOT NULL DEFAULT TRUE,  -- soft delete
  creado_en      TIMESTAMP    NOT NULL DEFAULT NOW(),
  actualizado_en TIMESTAMP    NOT NULL DEFAULT NOW()
);
```

### Tabla: `kardex`

```sql
CREATE TABLE kardex (
  id               SERIAL PRIMARY KEY,
  libro_id         INTEGER     NOT NULL REFERENCES libros(id),
  usuario_id       INTEGER     NOT NULL REFERENCES usuarios(id),
  tipo_movimiento  VARCHAR(20) NOT NULL,  -- 'ENTRADA' | 'SALIDA' | 'AJUSTE'
  cantidad         INTEGER     NOT NULL,  -- siempre positivo
  saldo_anterior   INTEGER     NOT NULL,
  saldo_resultante INTEGER     NOT NULL,
  observacion      TEXT,                  -- campo libre opcional
  creado_en        TIMESTAMP   NOT NULL DEFAULT NOW()
);
-- Este registro es INMUTABLE. Nunca se actualiza ni elimina.
```

### Índices recomendados

```sql
CREATE INDEX idx_kardex_libro_id   ON kardex(libro_id);
CREATE INDEX idx_kardex_creado_en  ON kardex(creado_en);
CREATE INDEX idx_libros_codigo     ON libros(codigo_barras);
```

---

## 4. ESTRUCTURA DE CARPETAS DEL PROYECTO

```
inventario-libros/
│
├── backend/
│   ├── package.json
│   ├── .env
│   ├── server.js                  ← Punto de entrada, configura Express
│   ├── db/
│   │   └── pool.js                ← Pool de conexión PostgreSQL (pg)
│   ├── middleware/
│   │   ├── verifyToken.js         ← Valida JWT en headers
│   │   └── checkRole.js           ← Verifica rol ('admin' | 'operario')
│   ├── routes/
│   │   ├── auth.routes.js
│   │   ├── libros.routes.js
│   │   ├── movimientos.routes.js
│   │   ├── usuarios.routes.js
│   │   └── reportes.routes.js
│   └── controllers/
│       ├── auth.controller.js
│       ├── libros.controller.js
│       ├── movimientos.controller.js
│       ├── usuarios.controller.js
│       └── reportes.controller.js
│
└── frontend/
    ├── package.json
    ├── .env
    ├── public/
    └── src/
        ├── main.jsx               ← Punto de entrada React
        ├── App.jsx                ← Router principal + AuthProvider
        ├── context/
        │   └── AuthContext.jsx    ← Token, usuario, rol, login(), logout()
        ├── api/
        │   ├── auth.api.js
        │   ├── libros.api.js
        │   ├── movimientos.api.js
        │   └── reportes.api.js
        ├── hooks/
        │   ├── useScanner.js      ← Escucha eventos de teclado (pistola USB)
        │   ├── useStockColor.js   ← Devuelve clase CSS según stock
        │   └── useExport.js       ← xlsx y jspdf
        ├── components/
        │   ├── Navbar.jsx
        │   ├── StockBadge.jsx     ← Semáforo de colores
        │   ├── ToggleView.jsx     ← Botón Tabla / Galería
        │   ├── BookCard.jsx       ← Tarjeta visual en vista galería
        │   ├── BookTable.jsx      ← Tabla de inventario
        │   ├── KardexTable.jsx    ← Tabla técnica del Kardex
        │   ├── Timeline.jsx       ← Vista simple cronológica
        │   └── ProtectedRoute.jsx ← Guard de autenticación y rol
        └── pages/
            ├── Login.jsx
            ├── Dashboard.jsx
            ├── Inventario.jsx
            ├── NuevoProducto.jsx
            ├── EditarProducto.jsx
            ├── Escaneo.jsx
            └── Trazabilidad.jsx
```

---

## 5. PANTALLA: LOGIN

### Ruta
`/login` — pública (no requiere autenticación)

### Comportamiento

1. Si el usuario ya tiene un JWT válido en `localStorage`, redirigir automáticamente al Dashboard. No mostrar el login.
2. Formulario con dos campos: **Email** y **Contraseña**.
3. Al hacer submit:
   - POST a `/api/auth/login` con `{ email, password }`.
   - Si respuesta es 200: guardar el token JWT en `localStorage`, guardar el objeto `usuario` (id, nombre, rol) en el `AuthContext`, redirigir según rol:
     - `admin` → `/dashboard`
     - `operario` → `/escaneo`
   - Si respuesta es 401: mostrar mensaje de error "Credenciales incorrectas" debajo del formulario sin recargar la página.
4. Botón "Ingresar" muestra spinner mientras espera la respuesta.

### UI

- Pantalla centrada, logo o nombre del sistema arriba.
- Fondo oscuro o imagen neutra (sin distracciones).
- Campos: `type="email"` y `type="password"`.
- No hay enlace de registro; las cuentas las crea solo el administrador.

### Datos que maneja

| Campo     | Tipo   | Validación                        |
|-----------|--------|-----------------------------------|
| email     | string | requerido, formato email          |
| password  | string | requerido, mínimo 6 caracteres    |

### API que consume

```
POST /api/auth/login
Body: { email: string, password: string }
Response 200: { token: string, usuario: { id, nombre, rol } }
Response 401: { error: "Credenciales incorrectas" }
```

---

## 6. PANTALLA: DASHBOARD

### Ruta
`/dashboard` — solo Administrador

### Comportamiento

1. Al cargar, hace GET a `/api/reportes/resumen?periodo=hoy` (periodo por defecto: "hoy").
2. El selector de periodo en la parte superior tiene tres opciones: **Hoy**, **Esta Semana**, **Este Mes**. Al cambiarlo, se dispara una nueva llamada a la API y todas las métricas se actualizan sin recargar la página.
3. Las 3 tarjetas métricas muestran:
   - **Total libros en almacén:** suma de `stock_actual` de todos los libros activos.
   - **Entradas del periodo:** suma de `cantidad` del kardex donde `tipo_movimiento = 'ENTRADA'` y `creado_en` está en el rango del periodo.
   - **Salidas del periodo:** ídem con `tipo_movimiento = 'SALIDA'`.
4. Debajo de las tarjetas, una tabla de "Top 5 libros con stock crítico" (los 5 libros activos con menor `stock_actual`), con su semáforo de color.

### UI

- Navbar superior con nombre del sistema, nombre del usuario logueado y botón de cerrar sesión.
- Menú lateral (sidebar) con los módulos disponibles: Dashboard, Inventario, Escaneo, Trazabilidad, Usuarios.
- 3 tarjetas métricas en fila horizontal.
- Selector de periodo como tabs o dropdown arriba de las tarjetas.
- Tabla de libros críticos al fondo.

### API que consume

```
GET /api/reportes/resumen?periodo=hoy|semana|mes
Headers: Authorization: Bearer <token>
Response 200: {
  total_stock: number,
  entradas_periodo: number,
  salidas_periodo: number,
  libros_criticos: [ { id, titulo, stock_actual, foto_url } ]
}
```

---

## 7. PANTALLA: INVENTARIO / CATÁLOGO

### Ruta
`/inventario` — solo Administrador (Operario puede ver su versión en `/escaneo`)

### Comportamiento

1. Al cargar, hace GET a `/api/libros` que devuelve todos los libros con `estado_activo = true`.
2. **Toggle de vista:** Un botón con dos estados ("Tabla" y "Galería") cambia el modo de renderizado. El estado se guarda en un `useState` local. No hay recarga.
3. **Vista Tabla:** Columnas: Código de Barras | Título | Stock (con StockBadge) | Acciones (Editar, Borrar).
   - Clic en cabecera de columna → ordena ascendente/descendente por esa columna.
   - Ordenamiento implementado en el frontend con `.sort()` sobre el array de libros en memoria.
4. **Vista Galería:** Grid de BookCards. Cada card muestra foto de portada, título y StockBadge. Botones de Editar y Borrar visibles en hover.
5. **Buscar:** Un campo de búsqueda en tiempo real filtra por título o código de barras. El filtrado es local (sobre el array ya cargado), sin llamadas adicionales a la API.
6. **Botón "Añadir Libro"** en la esquina superior derecha → navega a `/inventario/nuevo`.
7. **Borrar libro:** Al hacer clic en Borrar, aparece un modal de confirmación: "¿Estás seguro? El libro no aparecerá más en el catálogo pero su historial se conservará." Si confirma → DELETE a `/api/libros/:id` (borrado lógico, actualiza `estado_activo = false`). El libro desaparece del listado sin recargar la página.
8. **Botón "Exportar"** → abre un dropdown con opciones "Excel" y "PDF". Exporta lo que está visible en pantalla en ese momento (incluyendo filtros activos).

### UI

- Navbar + sidebar igual que en Dashboard.
- Barra de acciones: [Buscar] [Toggle Vista] [Exportar ↓] [+ Añadir Libro]
- La tabla y la galería ocupan el área principal.
- Modal de confirmación de borrado es un overlay oscuro centrado.

### API que consume

```
GET  /api/libros
Headers: Authorization: Bearer <token>
Response 200: [ { id, codigo_barras, titulo, descripcion, foto_url, stock_actual } ]

DELETE /api/libros/:id
Headers: Authorization: Bearer <token>
Response 200: { mensaje: "Libro desactivado correctamente" }
```

---

## 8. PANTALLA: REGISTRO DE NUEVO PRODUCTO

### Ruta
`/inventario/nuevo` — solo Administrador
`/inventario/editar/:id` — solo Administrador (misma pantalla, modo edición)

### Comportamiento

**Modo Nuevo:**
1. Formulario vacío.
2. Al enviar: POST a `/api/libros`.

**Modo Edición:**
1. Al cargar, GET a `/api/libros/:id` para pre-llenar los campos.
2. Al enviar: PUT a `/api/libros/:id`.

**Flujo de la foto (Cloudinary):**
1. El usuario hace clic en "Seleccionar foto" → `<input type="file" accept="image/*">`.
2. El frontend convierte la imagen a base64 o FormData y la sube directamente a Cloudinary usando la API de upload de Cloudinary (Upload Preset sin firma, configurado en el panel de Cloudinary).
3. Cloudinary responde con `{ secure_url: "https://res.cloudinary.com/..." }`.
4. Ese URL se guarda en el estado del formulario en el campo `foto_url`.
5. Cuando el usuario hace submit del formulario, el campo `foto_url` ya contiene el URL de Cloudinary; ese es el valor que se envía al backend y se guarda en PostgreSQL.
6. Mostrar preview de la imagen después de subirla a Cloudinary (antes del submit del formulario).

**Stock inicial:**
- En modo "Nuevo", hay un campo "Stock inicial" con valor por defecto 0. Si se ingresa un valor mayor a 0, al crear el libro el backend también crea un registro en kardex con `tipo_movimiento = 'ENTRADA'` por esa cantidad inicial.

**Validaciones en el frontend:**
- Código de barras: requerido, solo números y guiones.
- Título: requerido, mínimo 3 caracteres.
- Stock inicial: número entero >= 0.
- Si el código de barras ya existe: el backend responde 409, el frontend muestra error en ese campo.

### UI

- Pantalla de formulario con navegación de regreso ("← Volver al inventario").
- Dos columnas: formulario a la izquierda, preview de imagen a la derecha.
- Mientras sube la imagen a Cloudinary, mostrar spinner sobre el preview.
- Botones al fondo: "Cancelar" (vuelve al inventario) y "Guardar Libro" (submit).

### Campos del formulario

| Campo           | Tipo     | Requerido | Notas                              |
|-----------------|----------|-----------|------------------------------------|
| codigo_barras   | text     | Sí        | Se puede escanear en este campo    |
| titulo          | text     | Sí        |                                    |
| descripcion     | textarea | No        |                                    |
| foto_url        | file     | No        | Subida a Cloudinary, se guarda URL |
| stock_inicial   | number   | No        | Solo en modo "Nuevo", default 0    |

### API que consume

```
POST /api/libros
Headers: Authorization: Bearer <token>
Body: { codigo_barras, titulo, descripcion, foto_url, stock_inicial }
Response 201: { id, codigo_barras, titulo, ... }
Response 409: { error: "El código de barras ya existe" }

GET /api/libros/:id
PUT /api/libros/:id
Body: { titulo, descripcion, foto_url }  ← No se edita el código de barras
```

---

## 9. PANTALLA: ESCANEO — ENTRADA / SALIDA

### Ruta
`/escaneo` — Administrador y Operario

### Descripción
Esta es la pantalla de trabajo operativo. El usuario registra entradas o salidas de libros. Debe ser extremadamente rápida y de bajo ruido visual.

### Comportamiento General

1. Dos tabs en la parte superior: **"ENTRADA"** (fondo verde) y **"SALIDA"** (fondo rojo). El tab activo determina el `tipo_movimiento` que se enviará.
2. Debajo de los tabs, el **Modo de operación** con un toggle: **"1 a 1"** y **"Por Lote"**.

---

### Modo 1 a 1

1. Un único campo de texto amplio y centrado, siempre enfocado (con `autoFocus` y `ref.focus()` en el cleanup).
2. El usuario escanea el ISBN (cámara o pistola).
   - **Pistola USB:** envía el código + tecla Enter automáticamente. El sistema escucha el evento `keydown` global (hook `useScanner`). Cuando detecta Enter después de una cadena de caracteres, dispara el procesamiento.
   - **Cámara móvil:** botón "📷 Escanear con cámara" abre la API de cámara del navegador (`getUserMedia` + librería `html5-qrcode` o `zxing-js`). Al detectar el código, lo pone en el campo y procesa automáticamente.
3. Al procesar:
   - POST a `/api/movimientos` con `{ codigo_barras, tipo, cantidad: 1 }`.
   - Si respuesta es 200: mostrar feedback visual (flash verde/rojo en el campo), mostrar por 1.5 segundos el título del libro procesado y el nuevo stock, limpiar el campo y volver a enfocar.
   - Si respuesta es 404 (libro no encontrado): mostrar mensaje de error "Código no registrado" en rojo. El campo queda activo para reintentar.
   - Si es SALIDA y no hay suficiente stock: respuesta 400, mensaje "Stock insuficiente".
4. Historial de la sesión: debajo del campo, una lista de los últimos 10 movimientos de la sesión actual (no persiste entre sesiones). Muestra: tipo (entrada/salida), título del libro, cantidad, hora.

---

### Modo Por Lote

1. Dos campos: **"Código de barras"** (escaneable, igual que el modo 1 a 1) y **"Cantidad"** (numérico, mínimo 1).
2. El usuario escanea o escribe el código, tabula al campo de cantidad, escribe el número, y presiona Enter o clic en "Registrar".
3. POST a `/api/movimientos` con `{ codigo_barras, tipo, cantidad: N }`.
4. Mismo feedback visual que en Modo 1 a 1, pero ambos campos se limpian.

---

### UI

- Pantalla con muy pocos elementos. El campo de escaneo ocupa el centro prominente de la pantalla.
- Feedback de éxito: el borde del campo se torna verde/rojo con un destello. Texto de confirmación aparece y desaparece con transición suave.
- No hay tablas complejas en esta pantalla. El historial de sesión es una lista simple.

### Operario solo ve esta pantalla y la galería del inventario.

### API que consume

```
POST /api/movimientos
Headers: Authorization: Bearer <token>
Body: { codigo_barras: string, tipo: 'ENTRADA' | 'SALIDA', cantidad: number, observacion?: string }
Response 200: {
  libro: { id, titulo, stock_anterior, stock_nuevo },
  kardex_id: number
}
Response 404: { error: "Libro no encontrado" }
Response 400: { error: "Stock insuficiente" }
```

---

## 10. PANTALLA: TRAZABILIDAD (KARDEX)

### Ruta
`/trazabilidad` — solo Administrador

### Comportamiento

1. Al cargar, hace GET a `/api/movimientos?desde=&hasta=&libro_id=&tipo=` con todos los parámetros opcionales.
2. **Filtros en la parte superior:**
   - Rango de fechas: dos inputs `type="date"` (Desde / Hasta). Por defecto: último mes.
   - Libro: dropdown con todos los libros activos para filtrar por uno específico.
   - Tipo de movimiento: select con "Todos", "Entrada", "Salida", "Ajuste".
3. Al cambiar cualquier filtro, se hace una nueva llamada a la API (sin recargar la página).
4. **Toggle de vista** (mismo concepto que en Inventario):
   - **Kardex Técnico:** tabla con columnas: Fecha y Hora | Código | Título | Tipo | Cantidad | Saldo Anterior | Saldo Resultante | Usuario.
   - **Línea de Tiempo:** lista vertical cronológica. Cada ítem muestra un ícono de flecha (↑ verde para entrada, ↓ rojo para salida), la hora, el título del libro, la cantidad y el usuario. Formato amigable: "Hoy, 08:30 AM" / "Ayer, 16:45 PM".
5. **Exportar:** botón que descarga la vista actual (con los filtros aplicados) como Excel o PDF.
6. La tabla y la línea de tiempo muestran máximo 100 registros. Si hay más, mostrar paginación simple (anterior / siguiente).

### UI

- Navbar + Sidebar.
- Barra de filtros horizontal arriba (fecha desde, fecha hasta, libro, tipo, botón "Aplicar").
- Botones: [Toggle Vista] [Exportar ↓].
- Área principal con la tabla o línea de tiempo.

### API que consume

```
GET /api/movimientos?desde=YYYY-MM-DD&hasta=YYYY-MM-DD&libro_id=N&tipo=ENTRADA&page=1&limit=100
Headers: Authorization: Bearer <token>
Response 200: {
  total: number,
  page: number,
  data: [
    {
      id, creado_en, codigo_barras, titulo, tipo_movimiento,
      cantidad, saldo_anterior, saldo_resultante, usuario_nombre
    }
  ]
}
```

---

## 11. SISTEMA DE ROLES Y GUARDS

### AuthContext (frontend)

```jsx
// src/context/AuthContext.jsx
// Provee: { usuario, token, login(), logout(), isAuthenticated }
// Al inicializar, lee token de localStorage y lo decodifica con jwt-decode
// para obtener { id, nombre, rol, exp }
// Si exp < Date.now()/1000, limpia y redirige a /login
```

### ProtectedRoute (frontend)

```jsx
// src/components/ProtectedRoute.jsx
// Props: { children, rolesPermitidos: ['admin'] | ['admin', 'operario'] }
// Si no hay token: redirige a /login
// Si el rol no está en rolesPermitidos: redirige a /no-autorizado
// Si todo está bien: renderiza children
```

### Middleware backend

```javascript
// middleware/verifyToken.js
// Lee req.headers.authorization
// Formato esperado: "Bearer <token>"
// Verifica con jwt.verify(token, process.env.JWT_SECRET)
// Si válido: agrega req.usuario = { id, nombre, rol }
// Si inválido: responde 401

// middleware/checkRole.js
// Uso: checkRole('admin') o checkRole('admin', 'operario')
// Si req.usuario.rol no está en la lista: responde 403
```

### Tabla de accesos por pantalla

| Pantalla         | Ruta                    | Admin | Operario |
|------------------|-------------------------|-------|----------|
| Login            | `/login`                | Sí    | Sí       |
| Dashboard        | `/dashboard`            | Sí    | No       |
| Inventario       | `/inventario`           | Sí    | No       |
| Nuevo Producto   | `/inventario/nuevo`     | Sí    | No       |
| Editar Producto  | `/inventario/editar/:id`| Sí    | No       |
| Escaneo          | `/escaneo`              | Sí    | Sí       |
| Trazabilidad     | `/trazabilidad`         | Sí    | No       |
| Usuarios         | `/usuarios`             | Sí    | No       |

---

## 12. API ENDPOINTS — NODE.JS

### Auth

| Método | Ruta                | Auth | Rol   | Descripción                   |
|--------|---------------------|------|-------|-------------------------------|
| POST   | `/api/auth/login`   | No   | —     | Login, devuelve JWT           |
| POST   | `/api/auth/logout`  | Sí   | Ambos | Opcional (el JWT es stateless)|

### Libros

| Método | Ruta              | Auth | Rol   | Descripción                          |
|--------|-------------------|------|-------|--------------------------------------|
| GET    | `/api/libros`     | Sí   | Ambos | Lista todos los libros activos        |
| GET    | `/api/libros/:id` | Sí   | Admin | Detalle de un libro                  |
| POST   | `/api/libros`     | Sí   | Admin | Crear libro (+ kardex si stock > 0)  |
| PUT    | `/api/libros/:id` | Sí   | Admin | Editar título, descripción, foto_url |
| DELETE | `/api/libros/:id` | Sí   | Admin | Soft delete (estado_activo = false)  |

### Movimientos

| Método | Ruta                 | Auth | Rol   | Descripción                        |
|--------|----------------------|------|-------|------------------------------------|
| POST   | `/api/movimientos`   | Sí   | Ambos | Registrar entrada o salida         |
| GET    | `/api/movimientos`   | Sí   | Admin | Listar kardex con filtros y pag.   |

**Lógica del POST /api/movimientos (transacción SQL):**

```javascript
// 1. Iniciar transacción: BEGIN
// 2. SELECT stock_actual FROM libros WHERE codigo_barras = $1 FOR UPDATE
// 3. Si tipo = 'SALIDA' y stock_actual < cantidad → ROLLBACK → 400
// 4. Calcular nuevo_stock:
//      ENTRADA: stock_actual + cantidad
//      SALIDA:  stock_actual - cantidad
// 5. UPDATE libros SET stock_actual = nuevo_stock WHERE id = libro_id
// 6. INSERT INTO kardex (libro_id, usuario_id, tipo_movimiento, cantidad,
//                         saldo_anterior, saldo_resultante)
//    VALUES ($1, $2, $3, $4, $5, $6)
// 7. COMMIT
// 8. Responder con datos del libro y kardex_id
```

### Reportes

| Método | Ruta                        | Auth | Rol   | Descripción                     |
|--------|-----------------------------|------|-------|---------------------------------|
| GET    | `/api/reportes/resumen`     | Sí   | Admin | Métricas del dashboard          |
| GET    | `/api/reportes/kardex-xlsx` | Sí   | Admin | Descarga Excel del kardex       |
| GET    | `/api/reportes/kardex-pdf`  | Sí   | Admin | Descarga PDF del kardex         |

### Usuarios

| Método | Ruta                 | Auth | Rol   | Descripción              |
|--------|----------------------|------|-------|--------------------------|
| GET    | `/api/usuarios`      | Sí   | Admin | Listar usuarios          |
| POST   | `/api/usuarios`      | Sí   | Admin | Crear usuario            |
| PUT    | `/api/usuarios/:id`  | Sí   | Admin | Editar usuario           |
| DELETE | `/api/usuarios/:id`  | Sí   | Admin | Desactivar usuario       |

---

## 13. LÓGICA DE SEMÁFORO DE STOCK

Aplicar en todos los lugares donde aparezca el stock: tabla de inventario, galería, dashboard, kardex.

### Hook: `useStockColor`

```javascript
// src/hooks/useStockColor.js
export function getStockColor(stock) {
  if (stock > 50)              return 'stock-verde';   // CSS: color verde
  if (stock >= 15 && stock <= 50) return 'stock-amarillo'; // CSS: color amarillo/ámbar
  return 'stock-rojo';                                 // CSS: color rojo
}
```

### Componente: `StockBadge`

```jsx
// src/components/StockBadge.jsx
// Props: { stock: number }
// Renderiza: <span className={`stock-badge ${getStockColor(stock)}`}>{stock}</span>
// CSS: badge con fondo de color suave y texto del color correspondiente
```

### Definición de umbrales

| Condición             | Color    | Clase CSS         |
|-----------------------|----------|-------------------|
| stock > 50            | Verde    | `stock-verde`     |
| stock >= 15 y <= 50   | Amarillo | `stock-amarillo`  |
| stock < 15            | Rojo     | `stock-rojo`      |

---

## 14. EXPORTACIÓN A EXCEL Y PDF

### Librería Excel: `xlsx` (SheetJS)

```javascript
// src/hooks/useExport.js
import * as XLSX from 'xlsx';

export function exportarExcel(datos, nombreArchivo) {
  const ws = XLSX.utils.json_to_sheet(datos);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Reporte');
  XLSX.writeFile(wb, `${nombreArchivo}.xlsx`);
}
```

### Librería PDF: `jspdf` + `jspdf-autotable`

```javascript
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export function exportarPDF(columnas, filas, titulo, nombreArchivo) {
  const doc = new jsPDF();
  doc.text(titulo, 14, 16);
  autoTable(doc, {
    head: [columnas],
    body: filas,
    startY: 22,
  });
  doc.save(`${nombreArchivo}.pdf`);
}
```

### Uso en Inventario y Trazabilidad

- El botón "Exportar" lee el array de datos que está actualmente en pantalla (ya filtrado).
- En el Inventario: exporta [Código, Título, Stock].
- En el Kardex: exporta [Fecha, Código, Título, Tipo, Cantidad, Saldo Anterior, Saldo Resultante, Usuario].

---

## 15. COMPONENTES COMPARTIDOS

### Navbar

- Logo / nombre del sistema a la izquierda.
- Nombre del usuario logueado + rol en la derecha.
- Botón de cerrar sesión: limpia `localStorage` y el `AuthContext`, redirige a `/login`.

### Sidebar

- Solo visible para Admin.
- Links: Dashboard | Inventario | Escaneo | Trazabilidad | Usuarios.
- El link activo se resalta visualmente.
- Responsive: en móvil colapsa a un ícono de menú hamburguesa.

### ToggleView

```jsx
// Props: { vista: 'tabla' | 'galeria', onCambiar: fn }
// Renderiza dos botones estilo "pills" seleccionables
```

### BookCard (Vista Galería)

```jsx
// Props: { libro: { id, titulo, foto_url, stock_actual }, onEditar, onBorrar }
// Muestra: <img src={foto_url || placeholder}>, título, <StockBadge stock={stock_actual} />
// Botones Editar y Borrar en hover
```

---

## 16. VARIABLES DE ENTORNO

### Backend: `/backend/.env`

```env
PORT=3001
DATABASE_URL=postgresql://usuario:contraseña@localhost:5432/inventario_libros
JWT_SECRET=una_clave_secreta_muy_larga_y_aleatoria
JWT_EXPIRES_IN=8h
```

### Frontend: `/frontend/.env`

```env
VITE_API_URL=http://localhost:3001/api
VITE_CLOUDINARY_CLOUD_NAME=tu_cloud_name
VITE_CLOUDINARY_UPLOAD_PRESET=tu_upload_preset_sin_firma
```

---

## 17. ORDEN DE IMPLEMENTACIÓN RECOMENDADO

Seguir este orden garantiza que cada capa esté lista cuando la siguiente la necesita.

### FASE 1 — Base y autenticación
1. Crear base de datos PostgreSQL y ejecutar los `CREATE TABLE` del punto 3.
2. Configurar backend: `server.js`, `pool.js`, instalar dependencias (`express`, `pg`, `bcrypt`, `jsonwebtoken`, `cors`, `dotenv`).
3. Implementar `POST /api/auth/login` con hash de contraseña y generación de JWT.
4. Implementar middleware `verifyToken` y `checkRole`.
5. Crear un usuario admin inicial directamente en la base de datos (con password hasheado).
6. En el frontend, crear `AuthContext`, `Login.jsx` y `ProtectedRoute.jsx`.
7. Verificar que el flujo login → JWT → pantalla protegida funciona.

### FASE 2 — Módulo de Libros (CRUD)
8. Backend: rutas y controlador de libros (GET todos, GET por id, POST, PUT, DELETE lógico).
9. Frontend: `Inventario.jsx` con vista tabla básica.
10. Frontend: `NuevoProducto.jsx` con formulario y subida a Cloudinary.
11. Frontend: `EditarProducto.jsx` (reutiliza el formulario de nuevo producto).
12. Agregar `StockBadge` y semáforo de colores.
13. Agregar toggle de vista y `BookCard` para la galería.

### FASE 3 — Módulo de Movimientos (Escaneo)
14. Backend: `POST /api/movimientos` con transacción SQL completa.
15. Frontend: `Escaneo.jsx` modo 1 a 1 (campo de texto + Enter).
16. Agregar hook `useScanner` para la pistola USB.
17. Agregar integración de cámara con `html5-qrcode` para móvil.
18. Agregar modo por lote.

### FASE 4 — Trazabilidad
19. Backend: `GET /api/movimientos` con filtros y paginación.
20. Frontend: `Trazabilidad.jsx` con Kardex técnico y toggle a línea de tiempo.
21. Agregar filtros de fecha, libro y tipo.

### FASE 5 — Dashboard y Reportes
22. Backend: `GET /api/reportes/resumen` con las 3 métricas.
23. Frontend: `Dashboard.jsx` con tarjetas métricas y selector de periodo.
24. Agregar exportación a Excel y PDF en Inventario y Trazabilidad.

### FASE 6 — Gestión de Usuarios y Pulido Final
25. Backend y frontend: pantalla de gestión de usuarios (solo Admin).
26. Manejo de errores global en el frontend (toast notifications o alerts).
27. Responsive: verificar en móvil (principalmente la pantalla de escaneo).
28. Revisión de seguridad: todos los endpoints protegidos con `verifyToken` + `checkRole`.

---

*Fin del documento. Versión 1.0 — Lista para implementación.*
