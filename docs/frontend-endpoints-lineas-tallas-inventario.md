# Guía Frontend: implementación de endpoints de Líneas, Tallas e Inventario

Esta guía documenta cómo consumir en frontend (Next.js + Fetch) los módulos:

- `lineas`
- `tallas`
- `inventario`

Está basada en las rutas/validaciones/controladores actuales del backend en `functions/src`.

---

## 1) Base URL y convenciones

## Base URL

- Local: `http://localhost:3000/api`
- Producción (Cloud Functions): `https://us-central1-e-comerce-leon.cloudfunctions.net/api`

Recomendación en Next.js:

```env
# .env.local
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000/api
# para server-side también puedes usar API_BASE_URL
API_BASE_URL=http://localhost:3000/api
```

## Formato de respuesta (real actual)

El backend de estos módulos usa principalmente:

- Éxito: `{ success: true, data, ... }`
- Error: `{ success: false, message, error?, errors? }`

> Nota: hay endpoints/middlewares de auth que pueden responder solo `{ message }` sin `success`. Por eso conviene normalizar errores en frontend (ver sección 3).

---

## 2) Autenticación y headers

- `lineas` y `tallas`: públicos actualmente.
- `inventario`: requiere `Authorization: Bearer <token>`.
- `inventario/ajustes`: soporta idempotencia opcional por header `Idempotency-Key` (también puede venir en body como `idempotencyKey`).

Headers típicos:

```http
Content-Type: application/json
Authorization: Bearer <token>          # solo inventario
Idempotency-Key: 2026-02-ajuste-001    # opcional en POST /inventario/ajustes
```

---

## 3) Cliente base recomendado (Next.js + Fetch)

## Tipos base

```ts
export type ApiSuccess<T> = {
  success: true;
  data: T;
  count?: number;
  message?: string;
  pagination?: {
    limit: number;
    nextCursor: string | null;
    hasNextPage: boolean;
  };
};

export type ApiValidationError = {
  campo: string;
  mensaje: string;
  codigo: string;
};

export type ApiError = {
  success?: false;
  message: string;
  error?: string;
  errors?: ApiValidationError[];
  statusCode?: number;
};
```

## Wrapper fetch (normaliza inconsistencias)

```ts
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || process.env.API_BASE_URL || "";

type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
  token?: string;
  idempotencyKey?: string;
  cache?: RequestCache;
};

export async function apiFetch<T>(
  path: string,
  {
    method = "GET",
    body,
    token,
    idempotencyKey,
    cache = "no-store",
  }: RequestOptions = {},
): Promise<ApiSuccess<T>> {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };

  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (idempotencyKey) headers["Idempotency-Key"] = idempotencyKey;

  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    cache,
  });

  const raw = await res.json().catch(() => ({}));

  if (!res.ok) {
    const normalizedError: ApiError = {
      statusCode: res.status,
      message: raw?.message || "Error inesperado",
      errors: raw?.errors,
      error: raw?.error,
      success: raw?.success,
    };
    throw normalizedError;
  }

  return raw as ApiSuccess<T>;
}
```

---

## 4) Endpoints de Líneas (`/lineas`)

## Resumen

- Base: `/api/lineas`
- Sin auth
- Validación Zod en `POST` y `PUT`

## Endpoints

### `GET /lineas`

Lista líneas activas.

Respuesta esperada:

```json
{
  "success": true,
  "count": 5,
  "data": [
    { "id": "jersey", "codigo": 1, "nombre": "Jersey Oficial", "activo": true }
  ]
}
```

### `GET /lineas/:id`

Obtiene línea por ID.

- `404` si no existe.

### `GET /lineas/buscar/:termino`

Busca por término (path param `termino`, 1-100 chars).

### `POST /lineas`

Crea una línea.

Body válido:

```json
{
  "codigo": 10,
  "nombre": "Souvenirs",
  "activo": true
}
```

Validaciones:

- `codigo`: entero > 0
- `nombre`: string trim, 1-100
- `activo`: boolean opcional
- body `strict` (rechaza campos extra)

### `PUT /lineas/:id`

Actualización parcial (`codigo?`, `nombre?`, `activo?`).

### `DELETE /lineas/:id`

Soft delete (marca inactivo).

## Ejemplo de servicio frontend

```ts
export type Linea = {
  id: string;
  codigo: number;
  nombre: string;
  activo: boolean;
};

export const linesApi = {
  getAll: () => apiFetch<Linea[]>("/lineas"),
  getById: (id: string) => apiFetch<Linea>(`/lineas/${id}`),
  search: (termino: string) =>
    apiFetch<Linea[]>(`/lineas/buscar/${encodeURIComponent(termino)}`),
  create: (payload: { codigo: number; nombre: string; activo?: boolean }) =>
    apiFetch<Linea>("/lineas", { method: "POST", body: payload }),
  update: (
    id: string,
    payload: Partial<{ codigo: number; nombre: string; activo: boolean }>,
  ) => apiFetch<Linea>(`/lineas/${id}`, { method: "PUT", body: payload }),
  remove: (id: string) => apiFetch<null>(`/lineas/${id}`, { method: "DELETE" }),
};
```

---

## 5) Endpoints de Tallas (`/tallas`)

## Resumen

- Base: `/api/tallas`
- Sin auth
- Validación Zod en `POST` y `PUT`

## Endpoints

### `GET /tallas`

Lista todas las tallas ordenadas por `orden`.

### `GET /tallas/:id`

Obtiene talla por ID.

- `404` si no existe.

### `POST /tallas`

Crea una talla.

Body válido:

```json
{
  "codigo": "XL",
  "descripcion": "Extra Grande",
  "orden": 5
}
```

Validaciones:

- `codigo`: string trim, 1-20
- `descripcion`: string trim, 1-100
- `orden`: entero >= 0 opcional
- body `strict`

### `PUT /tallas/:id`

Actualización parcial (`codigo?`, `descripcion?`, `orden?`).

### `DELETE /tallas/:id`

Eliminación física (no soft delete).

## Ejemplo de servicio frontend

```ts
export type Talla = {
  id: string;
  codigo: string;
  descripcion: string;
  orden?: number;
};

export const sizesApi = {
  getAll: () => apiFetch<Talla[]>("/tallas"),
  getById: (id: string) => apiFetch<Talla>(`/tallas/${id}`),
  create: (payload: { codigo: string; descripcion: string; orden?: number }) =>
    apiFetch<Talla>("/tallas", { method: "POST", body: payload }),
  update: (
    id: string,
    payload: Partial<{ codigo: string; descripcion: string; orden: number }>,
  ) => apiFetch<Talla>(`/tallas/${id}`, { method: "PUT", body: payload }),
  remove: (id: string) => apiFetch<null>(`/tallas/${id}`, { method: "DELETE" }),
};
```

---

## 6) Endpoints de Inventario (`/inventario`)

## Resumen

- Base: `/api/inventario`
- Requiere Bearer token
- `POST` protegidos con rol admin/empleado (`requireAdmin`)

## Endpoints

### `POST /inventario/movimientos`

Registra movimiento manual de inventario.

Body base:

```json
{
  "tipo": "entrada",
  "productoId": "prod_123",
  "tallaId": "m",
  "cantidad": 10,
  "motivo": "Recepción proveedor",
  "referencia": "OC-9921"
}
```

Reglas importantes:

- `tipo`: `entrada | salida | venta | devolucion`
- `cantidad` requerida
- para `venta` y `devolucion`, `ordenId` es obligatorio
- responde `201` en éxito

### `POST /inventario/ajustes`

Ajusta stock por conteo físico.

Body base:

```json
{
  "productoId": "prod_123",
  "tallaId": "m",
  "cantidadFisica": 8,
  "motivo": "Conteo físico",
  "referencia": "INV-2026-067"
}
```

Reglas:

- `productoId`, `cantidadFisica`, `motivo` obligatorios
- `cantidadFisica`: entero >= 0
- idempotencia opcional con `Idempotency-Key`
- puede responder:
  - `201` nuevo ajuste
  - `200` ajuste reutilizado por idempotencia

### `GET /inventario/movimientos`

Consulta historial con filtros y paginación cursor-based.

Query soportados:

- `productoId?`
- `tallaId?`
- `tipo?` (`entrada|salida|ajuste|venta|devolucion`)
- `ordenId?`
- `fechaDesde?` (ISO datetime)
- `fechaHasta?` (ISO datetime)
- `limit?` (1-100, default 20)
- `cursor?`

Respuesta:

```json
{
  "success": true,
  "count": 20,
  "data": [],
  "pagination": {
    "limit": 20,
    "nextCursor": "mov_abc123",
    "hasNextPage": true
  }
}
```

### `GET /inventario/alertas-stock`

Dashboard de alertas de stock bajo.

Query soportados:

- `productoId?`
- `lineaId?`
- `categoriaId?`
- `soloCriticas?` (`boolean`, default `false`)
- `limit?` (`1-200`, default `50`)

---

## 7) Servicios frontend de inventario (Next.js)

```ts
export type InventoryMovementPayload = {
  tipo: "entrada" | "salida" | "venta" | "devolucion";
  productoId: string;
  tallaId?: string;
  cantidad?: number;
  motivo?: string;
  referencia?: string;
  ordenId?: string;
};

export type InventoryAdjustmentPayload = {
  productoId: string;
  tallaId?: string;
  cantidadFisica: number;
  motivo: string;
  referencia?: string;
  idempotencyKey?: string;
};

export const inventoryApi = {
  registerMovement: (token: string, payload: InventoryMovementPayload) =>
    apiFetch<unknown>("/inventario/movimientos", {
      method: "POST",
      body: payload,
      token,
    }),

  registerAdjustment: (
    token: string,
    payload: InventoryAdjustmentPayload,
    idempotencyKey?: string,
  ) =>
    apiFetch<unknown>("/inventario/ajustes", {
      method: "POST",
      body: payload,
      token,
      idempotencyKey,
    }),

  listMovements: (
    token: string,
    params: {
      productoId?: string;
      tallaId?: string;
      tipo?: "entrada" | "salida" | "ajuste" | "venta" | "devolucion";
      ordenId?: string;
      fechaDesde?: string;
      fechaHasta?: string;
      limit?: number;
      cursor?: string;
    },
  ) => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") qs.set(k, String(v));
    });
    return apiFetch<unknown>(`/inventario/movimientos?${qs.toString()}`, {
      token,
    });
  },

  listLowStockAlerts: (
    token: string,
    params: {
      productoId?: string;
      lineaId?: string;
      categoriaId?: string;
      soloCriticas?: boolean;
      limit?: number;
    },
  ) => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") qs.set(k, String(v));
    });
    return apiFetch<unknown>(`/inventario/alertas-stock?${qs.toString()}`, {
      token,
    });
  },
};
```

---

## 8) Paginación cursor-based (frontend)

Para `GET /inventario/movimientos`:

1. Primera carga: sin `cursor`, con `limit`.
2. Guardar `pagination.nextCursor` de la respuesta.
3. Si `hasNextPage` es `true`, enviar ese `cursor` en la siguiente request.
4. Para resetear filtros, limpiar cursor y volver a primera página.

Ejemplo de flujo:

```ts
let cursor: string | undefined;

async function loadNextPage(token: string) {
  const response = await inventoryApi.listMovements(token, {
    limit: 20,
    cursor,
  });
  cursor = response.pagination?.nextCursor ?? undefined;
  return response.data;
}
```

---

## 9) Manejo de errores en UI

Mapeo recomendado:

- `400`: mostrar errores de validación (`errors[]`) o `message`.
- `401`: redirigir a login / renovar token.
- `403`: mostrar “sin permisos”.
- `404`: mostrar estado vacío o “recurso no encontrado”.
- `500`: toast genérico + logging en cliente.

Helper de mensaje:

```ts
export function getApiErrorMessage(error: unknown): string {
  const err = error as ApiError;

  if (err?.errors?.length) {
    return err.errors.map((e) => `${e.campo}: ${e.mensaje}`).join(" | ");
  }

  return err?.message || "Ocurrió un error inesperado";
}
```

---

## 10) Diferencias importantes a considerar

1. En este backend real, la clave principal es `success` (no `ok`).
2. Algunas respuestas de auth pueden venir sin `success` (solo `message`).
3. Swagger indica `BearerAuth`; la validación actual usa JWT propio (`JWT_SECRET`) + lookup en `usuariosApp`.

Recomendación práctica para frontend:

- no depender de un único shape rígido de error,
- normalizar respuestas en `apiFetch`,
- centralizar auth/token handling.

---

## 11) Checklist de implementación frontend

- [ ] Configurar `API_BASE_URL` por entorno.
- [ ] Crear `apiFetch` reutilizable con normalización de errores.
- [ ] Implementar servicios `linesApi`, `sizesApi`, `inventoryApi`.
- [ ] Enviar `Authorization` en todos los endpoints de inventario.
- [ ] Usar `Idempotency-Key` en reintentos de ajustes.
- [ ] Implementar flujo cursor-based para movimientos.
- [ ] Mostrar mensajes de validación por campo cuando exista `errors[]`.
- [ ] Manejar 401/403/404/500 con UX consistente.
