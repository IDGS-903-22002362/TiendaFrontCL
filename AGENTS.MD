# AGENTSFront.MD — Frontend (Next.js + Tailwind) · Mobile-First + Integración API (2026)

> Objetivo: un frontend **mobile-first**, rápido y accesible, conectado de forma segura al backend de tienda.

---

## 1) Objetivo y alcance

Este documento unifica dos frentes:

- reglas de **diseño móvil** para UX consistente,
- guía de **integración con APIs** (storefront + admin).

El frontend objetivo es Next.js (App Router), con foco en rendimiento, accesibilidad y seguridad.

---

## 2) Filosofía de diseño móvil (reglas base)

- **Mobile-first real**: la versión móvil manda; desktop es mejora progresiva.
- **Menos en pantalla**: priorizar 1 acción primaria por vista.
- **Feedback inmediato**: cada tap debe responder visualmente.
- **Accesibilidad desde diseño**, no como parche final.

---

## 3) Estructura de UI recomendada (móvil)

### 3.1 Layout

- Header compacto (44–56px), contenido scrolleable y barra inferior cuando haya 3–5 secciones.
- Evitar sidebars en móvil; usar bottom nav o menú contextual.
- Mantener ancho de lectura cómodo (`max-w-*` + `px-4` consistente).

### 3.2 Patrones móviles preferidos

- Listas con fila completa cliqueable.
- Cards con jerarquía clara (título, meta, acción).
- En móvil, preferir bottom sheets sobre modales centrados cuando aplique.

---

## 4) Touch targets, spacing y accesibilidad

- Tamaño mínimo táctil recomendado: **24x24 CSS px** (mínimo normativo).
- Recomendación UX práctica: **44x44** para acciones principales.
- Separación suficiente entre targets para evitar taps erróneos.
- Estados visibles obligatorios: `focus-visible`, `disabled` claro, errores con texto legible.

---

## 5) Tailwind (mobile-first + responsive)

- Sin prefijo = móvil; `sm:`, `md:`... para escalar.
- Preferir container queries en componentes reutilizables.
- Evitar clase spaghetti: encapsular en componentes base (`Button`, `Input`, `Card`).
- Usar tokens del sistema (color, radios, sombras, spacing); evitar hardcode repetido.

---

## 6) Tipografía móvil

- Body base legible (14–16px aprox).
- Escala de títulos simple (máximo 4 niveles visuales).
- Limitar ancho de texto (`max-w-prose` o `max-w-*`) para lectura cómoda.

---

## 7) Navegación móvil

- Para navegación primaria: bottom navigation (3–5 destinos).
- Estado activo con contraste + label (no solo color).
- Acciones secundarias en menú contextual o sheet.
- En navegación interna, mostrar back visible.

---

## 8) Formularios móviles (UX táctil)

- Inputs cómodos (`h-12` o `py-3`).
- Definir `inputmode`, `autocomplete` y tipo correcto (tel, email, number).
- Validar tras interacción o submit; mensajes simples.
- CTA sticky con safe-area cuando el flujo lo requiera.

---

## 9) Performance enfocada a móvil

- Reducir JS cliente: evitar marcar páginas completas con `"use client"`.
- Mantener Server Components por defecto; aislar islas interactivas.
- Optimizar interacción (INP): handlers livianos, evitar re-renders globales.
- Usar `loading.tsx` + skeletons ligeros en vez de bloquear toda la vista.

---

## 10) Imágenes, iconografía y motion

- Optimizar imágenes para móvil (peso, dimensiones, formato).
- Icon buttons deben respetar target táctil mínimo.
- Animaciones sutiles y respetando `prefers-reduced-motion`.

---

## 11) Reglas Next.js orientadas a UX móvil

- Server-first para fetch/render siempre que sea posible.
- Streaming progresivo para evitar pantallas bloqueadas.
- `error.tsx` con mensaje claro y acción de recuperación.

---

## 12) Checklist mobile antes de PR

- [ ] Targets táctiles con tamaño y separación correctos.
- [ ] Scroll + teclado móvil probados sin romper layout.
- [ ] Bottom nav/CTA sticky con safe-area.
- [ ] Estados empty/loading/error consistentes.
- [ ] Sin `"use client"` innecesario.

---

## 13) Integración API: objetivo

Integrar el frontend Next.js con las APIs del backend con foco en:

- consumo consistente de endpoints,
- autenticación segura,
- manejo uniforme de errores,
- flujo carrito/checkout/pagos,
- separación storefront vs admin.

---

## 14) URLs base y documentación

### 14.1 Base URL API

- Local: `http://localhost:3000/api`
- Producción: `https://us-central1-e-comerce-leon.cloudfunctions.net/api`

### 14.2 Swagger UI

- Local: `http://localhost:3000/api-docs`
- Producción: `https://us-central1-e-comerce-leon.cloudfunctions.net/api/api-docs`

Regla: si hay duda de payloads, tomar Swagger como referencia operativa.

---

## 15) Variables de entorno recomendadas (Next.js)

Crear `.env.local`:

```bash
# API base
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000/api

# Firebase Web SDK (cliente)
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
```

Opcional para server actions/route handlers:

```bash
API_BASE_URL=http://localhost:3000/api
```

---

## 16) Autenticación real del backend (flujo dual)

Este backend usa 2 etapas:

1. Obtener Firebase ID token en frontend.
2. Llamar `POST /api/auth/register-or-login` con `Authorization: Bearer <firebaseIdToken>`.
3. Recibir `token` (JWT propio) y `usuario`.
4. Consumir endpoints protegidos con `Authorization: Bearer <apiToken>`.

Respuesta típica:

```json
{
  "success": true,
  "token": "jwt_propio_backend",
  "usuario": {
    "uid": "...",
    "email": "...",
    "rol": "CLIENTE"
  }
}
```

Recomendación de almacenamiento:

- Simple: memoria + re-login silencioso.
- Robusto: cookie `httpOnly` con patrón BFF (route handlers en Next).

---

## 17) Cliente HTTP base recomendado

Crear `src/lib/api/client.ts`:

```ts
const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL!;

type ApiErrorPayload = {
  success?: false;
  message?: string;
  error?: string;
  errors?: Array<{ campo?: string; mensaje?: string; codigo?: string }>;
};

export class ApiError extends Error {
  status: number;
  payload?: ApiErrorPayload;

  constructor(status: number, message: string, payload?: ApiErrorPayload) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.payload = payload;
  }
}

export async function apiFetch<T>(
  path: string,
  init: RequestInit = {},
  options?: { token?: string; sessionId?: string; idempotencyKey?: string },
): Promise<T> {
  const headers = new Headers(init.headers ?? {});
  headers.set("Content-Type", "application/json");

  if (options?.token) headers.set("Authorization", `Bearer ${options.token}`);
  if (options?.sessionId) headers.set("x-session-id", options.sessionId);
  if (options?.idempotencyKey)
    headers.set("Idempotency-Key", options.idempotencyKey);

  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
    cache: "no-store",
  });

  const payload = (await res.json().catch(() => ({}))) as ApiErrorPayload & T;

  if (!res.ok || (payload as any)?.success === false) {
    const message = payload?.message || `Error HTTP ${res.status}`;
    throw new ApiError(res.status, message, payload);
  }

  return payload as T;
}
```

---

## 18) Formato de respuestas y errores

Éxito típico:

```json
{ "success": true, "data": {}, "count": 10, "message": "..." }
```

Error de validación:

```json
{
  "success": false,
  "message": "Validación fallida",
  "errors": [
    {
      "campo": "email",
      "mensaje": "El email debe ser válido",
      "codigo": "invalid_string"
    }
  ]
}
```

Mapeo UI recomendado:

- `400`: mostrar errores de formulario.
- `401`: redirigir/login.
- `403`: acceso denegado.
- `404`: no encontrado.
- `409`: conflicto de negocio.
- `500+`: error servidor con retry opcional.

---

## 19) Headers especiales que frontend debe manejar

1. `Authorization: Bearer <apiToken>`
2. `x-session-id` (UUID para carrito anónimo, persistir localmente)
3. `Idempotency-Key` (recomendado para reintentos de pago seguros)

---

## 20) Mapa de endpoints clave para Next.js

### 20.1 Públicos (storefront)

- `GET /productos`
- `GET /productos/:id`
- `GET /productos/categoria/:categoriaId`
- `GET /productos/linea/:lineaId`
- `GET /productos/buscar/:termino`
- `GET /categorias`
- `GET /categorias/:id`
- `GET /categorias/linea/:lineaId`
- `GET /lineas`
- `GET /lineas/:id`
- `GET /tallas`
- `GET /tallas/:id`
- `GET /noticias`
- `GET /noticias/:id`
- `GET /plantilla/:id`

### 20.2 Auth + usuario

- `POST /auth/register-or-login`
- `GET /usuarios/:id` (protegido)
- `GET /usuarios` (protegido)
- `GET /usuarios/exists/email`

### 20.3 Carrito (anónimo + autenticado)

- `GET /carrito`
- `POST /carrito/items`
- `PUT /carrito/items/:productoId`
- `DELETE /carrito/items/:productoId`
- `DELETE /carrito`
- `POST /carrito/merge` (protegido)
- `POST /carrito/checkout` (protegido)

### 20.4 Órdenes

- `POST /ordenes`
- `GET /ordenes` (protegido)
- `GET /ordenes/:id` (protegido)
- `PUT /ordenes/:id/cancelar` (protegido)
- `PUT /ordenes/:id/estado` (protegido + admin/empleado)
- `GET /ordenes/:id/pago` (protegido)

### 20.5 Pagos (Stripe)

- `POST /pagos/iniciar` (protegido)
- `GET /pagos/:id` (protegido)
- `GET /pagos/orden/:ordenId` (protegido)
- `POST /pagos/:id/reembolso` (protegido + admin/empleado)
- `POST /pagos/webhook` (server-to-server; no frontend)

### 20.6 Admin inventario

- `POST /inventario/movimientos` (admin/empleado)
- `POST /inventario/ajustes` (admin/empleado)
- `GET /inventario/movimientos` (protegido)
- `GET /inventario/alertas-stock` (admin/empleado)

Nota: endpoints `debug` no deben consumirse en storefront productivo.

---

## 21) Flujos recomendados en frontend

### 21.1 Login social/email

1. Sign-in con Firebase Auth.
2. Obtener `firebaseUser.getIdToken()`.
3. `POST /auth/register-or-login`.
4. Guardar `apiToken` y `usuario`.
5. Si existe carrito anónimo, ejecutar merge.

### 21.2 Carrito anónimo a autenticado

1. Navegación anónima con `x-session-id`.
2. Operar carrito con sesión.
3. Login.
4. `POST /carrito/merge` con `sessionId`.

### 21.3 Checkout y pago

1. `POST /carrito/checkout` -> orden `PENDIENTE`.
2. `POST /pagos/iniciar` con `Idempotency-Key`.
3. Confirmación de pago en frontend con `clientSecret`.
4. Consultar estado de pago/orden.

---

## 22) Ejemplo mínimo de integración

```ts
// src/lib/api/auth.ts
import { apiFetch } from "./client";

type RegisterLoginResponse = {
  success: boolean;
  token: string;
  usuario: {
    uid: string;
    email: string;
    rol: "ADMIN" | "EMPLEADO" | "CLIENTE";
    nombre: string;
  };
};

export async function registerOrLoginWithFirebaseToken(
  firebaseIdToken: string,
) {
  return apiFetch<RegisterLoginResponse>(
    "/auth/register-or-login",
    { method: "POST", body: JSON.stringify({}) },
    { token: firebaseIdToken },
  );
}
```

```ts
// src/lib/api/cart.ts
import { apiFetch } from "./client";

export function getCart(params: { apiToken?: string; sessionId?: string }) {
  return apiFetch<{ success: true; data: unknown }>(
    "/carrito",
    { method: "GET" },
    { token: params.apiToken, sessionId: params.sessionId },
  );
}
```

---

## 23) SSR, Server Actions y Route Handlers

Para reducir exposición de token en cliente:

- usar route handlers como BFF,
- guardar JWT backend en cookie `httpOnly`,
- llamar backend desde server components/actions cuando sea posible.

---

## 24) CORS y despliegue

- Usar URL exacta por ambiente.
- Evitar mezclar localhost y cloud en una misma sesión.
- Centralizar `API_BASE_URL` por entorno.

---

## 25) Reglas para pantallas admin

- Basar visibilidad en `usuario.rol`.
- No confiar solo en ocultar botones; backend valida permisos.
- Ante `403`, mostrar estado de acceso denegado.

---

## 26) Checklist de integración frontend

- [ ] Variables de entorno por ambiente.
- [ ] Login Firebase + canje a JWT propio.
- [ ] Cliente API centralizado con manejo uniforme de errores.
- [ ] `x-session-id` persistente para carrito anónimo.
- [ ] Merge de carrito al autenticarse.
- [ ] Pago con `Idempotency-Key` y retries seguros.
- [ ] Vistas admin protegidas por rol y manejo 403.
- [ ] Verificación manual de payloads en `/api-docs`.

---

## 27) Notas de consistencia

- El backend responde principalmente con `success` (no `ok`).
- Algunas rutas de catálogo pueden tener políticas históricas; tratar acciones admin como protegidas.
- Si cambian endpoints o contratos, actualizar este documento y Swagger.

---

Fin.

---

## 28) Estado de implementación (2026-02-28)

Se completó la unificación **storefront** de este frontend con backend real para:

- catálogo (`/productos`, `/productos/:id`, `/categorias`),
- carrito anónimo (`/carrito`, `/carrito/items`, `/carrito/items/:productoId`, `DELETE /carrito`),
- configuración por ambiente (local y producción).

### 28.1 Archivos base agregados

- `src/lib/api/client.ts`: cliente HTTP centralizado con `ApiError`.
- `src/lib/api/storefront.ts`: fetch + mapeo de productos/categorías backend -> tipos UI.
- `src/lib/api/cart.ts`: fetch de carrito con soporte `x-session-id`.
- `.env.example`: plantilla única para local y referencia productiva.

### 28.2 Migración de vistas a backend real

- `src/app/page.tsx` (home) ya no usa `mock-data`.
- `src/app/products/page.tsx` (listado) ya no usa `mock-data`.
- `src/app/products/[id]/page.tsx` (detalle) ya no usa `mock-data`.
- `src/hooks/use-cart.tsx` ahora sincroniza contra backend.
- `src/app/cart/page.tsx` y `src/app/checkout/page.tsx` consumen el carrito remoto.

### 28.3 Variables por ambiente

**Local (`.env.local`)**

```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000/api
API_BASE_URL=http://localhost:3000/api
```

**Producción (hosting)**

```bash
NEXT_PUBLIC_API_BASE_URL=https://us-central1-e-comerce-leon.cloudfunctions.net/api
API_BASE_URL=https://us-central1-e-comerce-leon.cloudfunctions.net/api
```

### 28.4 Estado de alcance

- ✅ Unificación de datos reales en catálogo y carrito.
- ✅ Configuración completa local/producción documentada.
- ⏳ Pendiente fase siguiente: login Firebase -> `/auth/register-or-login`.
- ⏳ Pendiente fase siguiente: `POST /carrito/merge` al autenticar.
- ⏳ Pendiente fase siguiente: checkout/órdenes/pagos reales.

### 28.5 Pruebas requeridas al cierre

Ejecutar:

```bash
npm run lint
npm run typecheck
npm run build
```

Smoke manual:

1. Home/listado/detalle muestran datos backend.
2. Add/update/remove/clear de carrito persiste con `x-session-id`.
3. Recarga de navegador conserva estado del carrito anónimo.
