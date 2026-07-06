# Stack - TiendaFrontCL

Frontend del ecommerce **Club León** (Tienda La Guarida). Documento de referencia del stack actual del proyecto.

---

## Resumen

| Area | Tecnología |
|------|------------|
| Framework | Next.js 15 (App Router) + React 19 |
| Lenguaje | TypeScript 5 |
| Estilos | Tailwind CSS 4 + shadcn/ui |
| Auth / datos cliente | Firebase Web SDK |
| Backend | Cloud Functions (BackendCL) via BFF en /api/* |
| Pagos | Stripe Embedded Checkout + Aplazo |
| Deploy | Firebase App Hosting |
| Monitoreo | Sentry |
| E2E | Playwright |

---

## Core

| Paquete | Versión | Uso |
|---------|---------|-----|
| Next.js | 15.5.9 | App Router, SSR/SSG, Route Handlers, Turbopack en dev |
| React | ^19.2.1 | UI |
| TypeScript | ^5 | Tipado estático |
| Node.js | 20+ | Runtime local y CI |
| npm | 10+ | Gestor de paquetes |

### Scripts principales

`ash
npm run dev          # next dev --turbopack -p 9002
npm run build        # next build
npm run start        # next start
npm run lint         # next lint
npm run typecheck    # next typegen && tsc --noEmit
npm run deploy:frontend
npm run test:e2e:cookies
`

Dev local: http://localhost:9002

---

## UI y diseño

| Paquete | Versión | Uso |
|---------|---------|-----|
| Tailwind CSS | ^4.2.1 | Utility-first (@tailwindcss/postcss) |
| shadcn/ui | - | Componentes Radix (components.json) |
| Radix UI | @radix-ui/react-* | Primitives accesibles |
| Lucide React | ^0.475.0 | Iconos principales |
| @tabler/icons-react | ^3.44.0 | Iconos complementarios |
| class-variance-authority | ^0.7.1 | Variantes |
| clsx + tailwind-merge | - | Clases condicionales |
| tw-animate-css | ^1.4.0 | Animaciones CSS |
| Motion | ^12.40.0 | Animaciones React |
| GSAP | ^3.15.0 | Animaciones avanzadas |
| Embla Carousel | ^8.6.0 | Carruseles |
| Recharts | ^2.15.1 | Gráficas admin |
| react-day-picker | ^9.11.3 | Fechas |

Registries shadcn: @aceternity, @react-bits

Tokens: src/app/globals.css (verde #0d4b38, dorado #b99145)

---

## Formularios

| Paquete | Versión |
|---------|---------|
| react-hook-form | ^7.54.2 |
| zod | ^3.24.2 |
| @hookform/resolvers | ^4.1.3 |

---

## Firebase (cliente)

| Servicio | Uso |
|----------|-----|
| Auth | Login y sesión |
| Firestore | Lecturas cliente |
| Storage | Imágenes |
| App Check | reCAPTCHA v3 |

Proyecto Auth: app-oficial-leon | Deploy: e-comerce-leon | Config: src/lib/firebase/client.ts

El frontend no usa Firebase Admin SDK.

---

## Backend API (BFF)

Route Handlers en src/app/api/** proxy a Cloud Functions.

- URL prod: https://us-central1-e-comerce-leon.cloudfunctions.net/api
- Cliente: src/lib/api/client.ts
- Proxy server: src/lib/server/backend-client.ts
- Auth: Bearer Firebase + CSRF cookies

Dominios proxy: auth, carrito, checkout, ordenes, orders, pagos, payments, stripe, productos, categorias, ofertas, códigos-promocion, favoritos, inventario, proveedores, tallas, lineas, banners, shipping, pickup-locations, places, usuarios, beneficios, noticias, galeria, recomendaciones, ai, admin/orders, admin/fedex, admin/pickup-orders

El backend valida precios, descuentos, envio, totales e inventario.

---

## Pagos

| Proveedor | Integración |
|-----------|-------------|
| Stripe | @stripe/stripe-js, @stripe/react-stripe-js, Embedded Checkout |
| Aplazo | Backend + NEXT_PUBLIC_APLAZO_SHOP_ID |

Archivos: src/lib/api/payments.ts, src/hooks/use-stripe-config.ts, src/app/checkout/page.tsx

Envío temporal: pickup 0 MXN | León 99 MXN | fuera Leon 299 MXN

---

## Mapas, IA, 3D

- Google Maps: @googlemaps/js-api-loader ^2.0.2, /api/places/*
- IA: Genkit ^1.28.0, @genkit-ai/google-genai, src/ai/flows/
- 3D: three ^0.167.1 + @react-three/fiber ^9.6.1

---

## Sentry

@sentry/nextjs ^10.62.0 | tunnel /monitoring | src/lib/sentry-scrub.ts

Variables: NEXT_PUBLIC_SENTRY_DSN, SENTRY_DSN, SENTRY_AUTH_TOKEN

---

## Seguridad

- CSP en next.config.ts (default + checkout)
- HSTS, X-Frame-Options, Referrer-Policy
- Firebase App Check (reCAPTCHA v3)
- CSRF en cookies
- Cookie consent (src/lib/cookies/)
- Sin secret keys ni service accounts en frontend

---

## Testing

Playwright ^1.61.1

Specs e2e/: cookie-consent, cart-notification, checkout-inventory, inventory-concurrency

Config: playwright.config.ts

---

## Deploy

Firebase App Hosting - backend ecomerce-next-front - proyecto e-comerce-leon

- Dominio: https://tiendalaguarida.com
- App Hosting: https://ecomerce-next-front--e-comerce-leon.us-central1.hosted.app

`ash
firebase deploy --only apphosting:ecomerce-next-front --project e-comerce-leon
`

---

## Estructura del proyecto

`
src/app/              App Router + API routes
src/components/ui/    shadcn/ui
src/components/storefront/  Catálogo, home, producto
src/components/admin/ Panel admin
src/components/ai/    Asistente IA
src/hooks/            use-cart, use-auth, use-storefront
src/lib/api/          Cliente HTTP por dominio
src/lib/firebase/     Init Firebase client
src/ai/               Genkit flows
e2e/                  Playwright
`

### Rutas principales

/ | /products | /products/[id] | /cart | /checkout | /checkout/confirmation | /login | /register | /profile | /order-history | /admin/* | /empleado-club/* | /ai | /super-admin/usuarios

---

## Variables de entorno

Ver env.example y apphosting.yaml

| Variable | Descripcion |
|----------|-------------|
| NEXT_PUBLIC_API_BASE_URL | URL base backend |
| API_BASE_URL | Fallback server-side |
| NEXT_PUBLIC_AUTH_FIREBASE_* | Config Firebase Auth |
| NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY | Stripe publishable key |
| NEXT_PUBLIC_APLAZO_SHOP_ID | Shop ID Aplazo |
| NEXT_PUBLIC_GOOGLE_MAPS_API_KEY | Maps cliente |
| GOOGLE_MAPS_API_KEY | Maps server |
| NEXT_PUBLIC_FIREBASE_APP_CHECK_SITE_KEY | App Check |
| NEXT_PUBLIC_SENTRY_DSN | Sentry browser |
| STORE_PUBLIC_BASE_URL | URL canonica tienda |

---

## Dev tooling

- ESLint ^8.57.1 + eslint-config-next ^15.5.9
- patch-package ^8.0.0
- dotenv ^16.5.0
- Path alias: @/* -> src/*

---

## Features de negocio

| Feature | Modulos |
|---------|---------|
| Catálogo | storefront + API productos/ofertas |
| Ofertas | Backend pricing, tag=sale |
| Codigos promo | API códigos-promocion |
| Carrito | API carrito, use-cart |
| Checkout | Stripe + Aplazo, idempotency |
| Recomendaciones | API recomendaciones |
| Inventario admin | API inventario |
| FedEx | API admin/shipping |
| Cookies | Banner + politíca |

---

## Repos relacionados

| Repo | Rol |
|------|-----|
| TiendaFrontCL | Storefront + admin UI + BFF |
| BackendCL | Cloud Functions, pricing, pagos, webhooks |

---

Última actualización: junio 2026 - generado desde package.json, configs y código fuente.
