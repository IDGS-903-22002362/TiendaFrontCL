# Guía Frontend: implementación de endpoints de Proveedores, Órdenes, Carrito y Pagos

Esta guía documenta cómo consumir en frontend (Next.js + Fetch) los módulos:

- `proveedores`
- `ordenes`
- `carrito`
- `pagos`

Está basada en las rutas, middlewares y controladores actuales del backend en `functions/src`.

---

## 1) Base URL y convenciones

## Base URL

- Local: `http://localhost:3000/api`
- Producción (Cloud Functions): `https://us-central1-e-comerce-leon.cloudfunctions.net/api`

Recomendación en Next.js:

```env
# .env.local
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000/api
API_BASE_URL=http://localhost:3000/api
```

## Formato de respuesta (real actual)

El backend de estos módulos usa principalmente:

- Éxito: `{ success: true, data, count?, message? }`
- Error: `{ success: false, message, error?, errors? }`

> Nota importante: algunos errores de `authMiddleware` pueden responder solo `{ message }` sin `success`. Conviene normalizar errores en frontend.

---

## 2) Autenticación y headers

### Headers más usados

```http
Content-Type: application/json
Authorization: Bearer <token>
x-session-id: <uuid-v4>            # carrito anónimo
Idempotency-Key: <clave-unica>     # recomendado para /pagos/iniciar
```

### Reglas por módulo

- `proveedores`: actualmente sin auth (público).
- `ordenes`:
  - `POST /ordenes`: actualmente público.
  - el resto: requiere `Authorization`.
- `carrito`:
  - `GET/POST/PUT/DELETE` de carrito/items: admite autenticado o anónimo (`x-session-id`).
  - `POST /carrito/checkout` y `POST /carrito/merge`: requieren autenticación.
- `pagos`: requiere autenticación en endpoints de app/frontend (excepto webhook interno de Stripe).

---

## 3) Cliente base recomendado (Next.js + Fetch)

## Tipos base

```ts
export type ApiSuccess<T> = {
  success: true;
  data: T;
  count?: number;
  message?: string;
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

## Wrapper fetch (normalización de errores)

```ts
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || process.env.API_BASE_URL || "";

type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
  token?: string;
  sessionId?: string;
  idempotencyKey?: string;
  cache?: RequestCache;
};

export async function apiFetch<T>(
  path: string,
  {
    method = "GET",
    body,
    token,
    sessionId,
    idempotencyKey,
    cache = "no-store",
  }: RequestOptions = {},
): Promise<ApiSuccess<T>> {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };

  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (sessionId) headers["x-session-id"] = sessionId;
  if (idempotencyKey) headers["Idempotency-Key"] = idempotencyKey;

  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    cache,
  });

  const raw = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw {
      statusCode: res.status,
      message: raw?.message || "Error inesperado",
      error: raw?.error,
      errors: raw?.errors,
      success: raw?.success,
    } as ApiError;
  }

  return raw as ApiSuccess<T>;
}
```

---

## 4) Endpoints de Proveedores (`/proveedores`)

## Resumen

- Base: `/api/proveedores`
- Auth: no requerida actualmente.
- Validación Zod en `POST` y `PUT`; validación de params en `GET /:id`, `GET /buscar/:termino`, `PUT`, `DELETE`.

## Endpoints

### `GET /proveedores`

Lista proveedores activos.

Respuesta típica:

```json
{
  "success": true,
  "count": 8,
  "data": [{ "id": "nike", "nombre": "Nike", "activo": true }]
}
```

### `GET /proveedores/buscar/:termino`

Busca por término (1-100 chars).

### `GET /proveedores/:id`

Obtiene proveedor por ID.

- `404` si no existe.

### `POST /proveedores`

Crea proveedor.

- `201` si se crea.
- `400` por body inválido.

### `PUT /proveedores/:id`

Actualización parcial.

- `200` si actualiza.
- `404` si no existe.

### `DELETE /proveedores/:id`

Soft delete.

- `200` si elimina.
- `404` si no existe.

## Ejemplo de servicio frontend

```ts
export const providersApi = {
  getAll: () => apiFetch<any[]>("/proveedores"),
  search: (termino: string) =>
    apiFetch<any[]>(`/proveedores/buscar/${encodeURIComponent(termino)}`),
  getById: (id: string) => apiFetch<any>(`/proveedores/${id}`),
  create: (payload: Record<string, unknown>) =>
    apiFetch<any>("/proveedores", { method: "POST", body: payload }),
  update: (id: string, payload: Record<string, unknown>) =>
    apiFetch<any>(`/proveedores/${id}`, { method: "PUT", body: payload }),
  remove: (id: string) =>
    apiFetch<any>(`/proveedores/${id}`, { method: "DELETE" }),
};
```

---

## 5) Endpoints de Órdenes (`/ordenes`)

## Resumen

- Base: `/api/ordenes`
- Auth mixta:
  - `POST /ordenes`: público actualmente.
  - operaciones de lectura/gestión: requieren token.
- Validaciones Zod en body, params y query según endpoint.

## Endpoints

### `POST /ordenes`

Crea una orden directamente.

- `201` creado.
- `400` por validación o reglas de negocio.
- Actualmente no exige token.

### `GET /ordenes`

Lista órdenes con filtros opcionales (`estado`, `usuarioId`, `fechaDesde`, `fechaHasta`).

- Requiere token.
- Cliente: recibe sus órdenes.
- Admin/empleado: puede ver todas y filtrar por usuario.

### `GET /ordenes/:id`

Obtiene detalle de orden por ID.

- Requiere token.
- Ownership: cliente solo sus órdenes; admin/empleado cualquiera.

### `GET /ordenes/:id/pago`

Proxy para obtener el pago asociado a la orden.

- Requiere token.
- Ownership/admin.

### `PUT /ordenes/:id/estado`

Actualiza estado de orden.

- Requiere token + rol admin/empleado.

### `PUT /ordenes/:id/cancelar`

Cancela orden y restaura stock.

- Requiere token.
- Admin/empleado pueden cualquier orden.
- Cliente solo sus órdenes y solo en estados permitidos.

## Ejemplo de servicio frontend

```ts
type ListOrdenesQuery = {
  estado?: string; // "PENDIENTE,CONFIRMADA"
  usuarioId?: string;
  fechaDesde?: string; // ISO
  fechaHasta?: string; // ISO
};

const qs = (q?: Record<string, string | undefined>) => {
  if (!q) return "";
  const p = new URLSearchParams();
  Object.entries(q).forEach(([k, v]) => v && p.set(k, v));
  return p.toString() ? `?${p.toString()}` : "";
};

export const ordersApi = {
  create: (payload: Record<string, unknown>) =>
    apiFetch<any>("/ordenes", { method: "POST", body: payload }),
  list: (token: string, query?: ListOrdenesQuery) =>
    apiFetch<any[]>(`/ordenes${qs(query)}`, { token }),
  getById: (id: string, token: string) =>
    apiFetch<any>(`/ordenes/${id}`, { token }),
  getPago: (id: string, token: string) =>
    apiFetch<any>(`/ordenes/${id}/pago`, { token }),
  updateEstado: (id: string, estado: string, token: string) =>
    apiFetch<any>(`/ordenes/${id}/estado`, {
      method: "PUT",
      token,
      body: { estado },
    }),
  cancel: (id: string, token: string) =>
    apiFetch<any>(`/ordenes/${id}/cancelar`, { method: "PUT", token }),
};
```

---

## 6) Endpoints de Carrito (`/carrito`)

## Resumen

- Base: `/api/carrito`
- Soporta dos modos:
  1. Usuario autenticado (`Authorization`).
  2. Usuario anónimo (`x-session-id` UUID).
- Checkout y merge requieren token.

## Endpoints

### `GET /carrito`

Obtiene carrito actual.

- Si no existe, crea carrito vacío.
- Requiere `Authorization` **o** `x-session-id`.
- `400` si no se envía ninguna identificación.

### `POST /carrito/items`

Agrega producto al carrito.

- Requiere `Authorization` o `x-session-id`.
- Valida stock, disponibilidad, reglas por talla y máximo de cantidad.

### `PUT /carrito/items/:productoId`

Actualiza cantidad de item.

- Si `cantidad = 0`, elimina item.

### `DELETE /carrito/items/:productoId`

Elimina item del carrito.

### `DELETE /carrito`

Vacía carrito completo.

### `POST /carrito/checkout`

Convierte carrito en orden.

- Requiere token.
- Body incluye dirección de envío, método de pago, costo de envío y notas.

### `POST /carrito/merge`

Fusiona carrito anónimo con carrito del usuario al iniciar sesión.

- Requiere token.
- Body mínimo: `{ sessionId }`.

## Ejemplo de servicio frontend

```ts
export const cartApi = {
  get: ({ token, sessionId }: { token?: string; sessionId?: string }) =>
    apiFetch<any>("/carrito", { token, sessionId }),

  addItem: (
    payload: { productoId: string; cantidad: number; tallaId?: string },
    { token, sessionId }: { token?: string; sessionId?: string },
  ) =>
    apiFetch<any>("/carrito/items", {
      method: "POST",
      token,
      sessionId,
      body: payload,
    }),

  updateItem: (
    productoId: string,
    payload: { cantidad: number },
    { token, sessionId }: { token?: string; sessionId?: string },
  ) =>
    apiFetch<any>(`/carrito/items/${productoId}`, {
      method: "PUT",
      token,
      sessionId,
      body: payload,
    }),

  removeItem: (
    productoId: string,
    { token, sessionId }: { token?: string; sessionId?: string },
  ) =>
    apiFetch<any>(`/carrito/items/${productoId}`, {
      method: "DELETE",
      token,
      sessionId,
    }),

  clear: ({ token, sessionId }: { token?: string; sessionId?: string }) =>
    apiFetch<any>("/carrito", { method: "DELETE", token, sessionId }),

  checkout: (token: string, payload: Record<string, unknown>) =>
    apiFetch<any>("/carrito/checkout", {
      method: "POST",
      token,
      body: payload,
    }),

  merge: (token: string, sessionId: string) =>
    apiFetch<any>("/carrito/merge", {
      method: "POST",
      token,
      body: { sessionId },
    }),
};
```

---

## 7) Endpoints de Pagos (`/pagos`)

## Resumen

- Base: `/api/pagos`
- Auth requerida en endpoints consumidos por frontend.
- Flujo principal con Stripe: iniciar pago → confirmar por webhook backend → consultar estado.

## Endpoints frontend/admin

### `POST /pagos/iniciar`

Inicia pago para una orden (Stripe PaymentIntent).

- Requiere token.
- Recomendado enviar `Idempotency-Key` para reintentos seguros.
- `201` cuando crea intent.
- `200` cuando reutiliza intento idempotente.

Body típico:

```json
{
  "ordenId": "orden_abc123",
  "metodoPago": "TARJETA"
}
```

### `GET /pagos/orden/:ordenId`

Consulta pago asociado a una orden.

- Requiere token.
- Ownership/admin.

### `GET /pagos/:id`

Consulta pago por ID.

- Requiere token.
- Ownership/admin.

### `POST /pagos/:id/reembolso` (administrativo)

Procesa reembolso total/parcial.

- Requiere token admin/empleado.
- No usar desde frontend público de cliente; endpoint de panel administrativo.

## Ejemplo de servicio frontend

```ts
export const paymentsApi = {
  iniciar: (
    token: string,
    payload: { ordenId: string; metodoPago: "TARJETA" },
    idempotencyKey?: string,
  ) =>
    apiFetch<{
      pagoId: string;
      paymentIntentId: string;
      clientSecret: string;
      status: string;
    }>("/pagos/iniciar", {
      method: "POST",
      token,
      body: payload,
      idempotencyKey,
    }),

  getByOrden: (ordenId: string, token: string) =>
    apiFetch<any>(`/pagos/orden/${ordenId}`, { token }),

  getById: (id: string, token: string) =>
    apiFetch<any>(`/pagos/${id}`, { token }),

  reembolsoAdmin: (
    id: string,
    token: string,
    body?: { refundAmount?: number; refundReason?: string },
  ) =>
    apiFetch<any>(`/pagos/${id}/reembolso`, {
      method: "POST",
      token,
      body,
    }),
};
```

---

## 8) Flujo recomendado de compra (frontend)

### Caso A: usuario anónimo

1. Generar `sessionId` UUID y guardarlo localmente.
2. Usar `sessionId` en carrito (`GET/POST/PUT/DELETE /carrito...`).
3. Al login, llamar `POST /carrito/merge` con token + `{ sessionId }`.
4. Refrescar carrito autenticado (`GET /carrito` con token).

### Caso B: usuario autenticado

1. Gestionar carrito con token.
2. Ejecutar `POST /carrito/checkout` para crear orden.
3. Ejecutar `POST /pagos/iniciar` para obtener `clientSecret`.
4. Confirmar pago en frontend con SDK de Stripe.
5. Consultar estado con `GET /pagos/orden/:ordenId` o `GET /ordenes/:id/pago`.

---

## 9) Errores frecuentes y manejo sugerido

- `400`: validación de datos (`errors[]` de Zod).
- `401`: token ausente/expirado/inválido.
- `403`: sin permisos (ownership o rol).
- `404`: recurso no encontrado.
- `409`: conflicto de negocio (ej. estado no válido para operación).
- `500/502`: error interno/proveedor externo.

Sugerencia UI:

- Mostrar `message` como texto principal de error.
- Si existe `errors[]`, renderizar lista por campo.
- En `401`, forzar flujo de re-login.

---

## 10) Fuera de alcance de consumo frontend público

- `POST /pagos/webhook`: endpoint interno para Stripe (backend a backend).
- Endpoints `debug` de módulos (uso local/diagnóstico).

---

## 11) Checklist rápido para integrar en frontend

- [ ] Configurar `NEXT_PUBLIC_API_BASE_URL`.
- [ ] Implementar wrapper único (`apiFetch`) con normalización de errores.
- [ ] Soportar `Authorization` y `x-session-id` en carrito.
- [ ] Enviar `Idempotency-Key` en inicio de pago para reintentos seguros.
- [ ] Implementar flujo de merge de carrito al autenticar.
- [ ] Distinguir endpoints de cliente vs endpoints administrativos.
