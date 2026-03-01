# TiendaFrontCL

Frontend storefront en Next.js (App Router) integrado con backend real de tienda.

## Requisitos

- Node.js 20+
- npm 10+
- Backend de tienda disponible (local o cloud)

## Configuración local

1. Crear archivo de entorno desde plantilla:

```bash
cp .env.example .env.local
```

2. Configurar URL base local:

```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000/api
API_BASE_URL=http://localhost:3000/api
```

3. Instalar dependencias y arrancar:

```bash
npm install
npm run dev
```

La app queda en `http://localhost:9002`.

## Configuración producción

Configurar variables de entorno en el host de despliegue:

- `NEXT_PUBLIC_API_BASE_URL=https://us-central1-e-comerce-leon.cloudfunctions.net/api`
- `API_BASE_URL=https://us-central1-e-comerce-leon.cloudfunctions.net/api`

Si el backend entrega imágenes en Firebase Storage, esta app ya tiene dominios permitidos en `next.config.ts`.

## Integración backend implementada

- Catálogo real: `/productos`, `/productos/:id`, `/categorias`
- Carrito anónimo real: `/carrito`, `/carrito/items`, `/carrito/items/:productoId`, `DELETE /carrito`
- Header `x-session-id` persistente en cliente (UUID)
- Cliente HTTP unificado con `ApiError` y parseo uniforme de respuestas

## Alcance actual

- ✅ Home, listado y detalle consumen backend real
- ✅ Carrito sincroniza con backend
- ✅ Configuración local/producción documentada
- ⏳ Login Firebase + merge de carrito (fase siguiente)
- ⏳ Checkout/pago/órdenes reales (fase siguiente)

## Validación

```bash
npm run lint
npm run typecheck
npm run build
```

## Verificación manual rápida

1. Abrir home y verificar productos reales.
2. Entrar a detalle de producto y agregar al carrito.
3. Ir a carrito, cambiar cantidad, eliminar y vaciar.
4. Recargar página y validar persistencia del carrito por `x-session-id`.
