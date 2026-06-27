# Auditoria integral de seguridad — La Guarida del Leon

Fecha: 2025-06-27 | Ramas: audit/security-2025-06

## Veredicto: LISTO CON RESERVAS

Despliegues críticos completados. Pendiente: registrar reCAPTCHA en Firebase App Check Console y smoke E2E checkout con App Check en producción.

## Resumen

Auditoria frontend+backend con correcciones desplegadas. Firestore `(default)` + `tiendacl` deny-by-default; Storage cerrado; App Check enforced; build frontend con TS/ESLint activos.

## Hallazgos corregidos

| ID | Hallazgo | Estado |
| CL-001 | Cron reservas no exportado | Desplegado (`expireInventoryReservationsFunction`) |
| CL-002 | Claves apphosting.yaml | Secretos en Secret Manager |
| CL-003 | Admin solo client-side | `middleware.ts` |
| CL-004 | Galeria sin rol | verifyRole staff |
| CL-005 | Aplazo webhook sin secret | fail-closed prod |
| CL-006 | SUPER_ADMIN paymentStaff | Corregido |
| CL-007 | puntos/sumar sin limite | 1/24h rate limit |
| CL-008 | App Check desactivado | `APP_CHECK_ENFORCED=true` + site key secret |
| CL-009 | Build ignora TS/ESLint | `ignoreBuildErrors: false`, build PASS |
| CL-010 | storage.rules UTF-16 | UTF-8 deny-by-default |
| CL-011 | CI sin tests | npm test step |
| CL-013 | Firestore `(default)` abierto | Reglas desplegadas en ambas DB |
| CL-014 | Enumeracion email | Rate limit + respuesta generica sin App Check |
| CL-015 | npm audit grpc-js | `@grpc/grpc-js@1.14.4` (transitivo) |
| CL-016 | DELETE imagenes comentado | Falso positivo; bloque eliminado |

## Abiertos / seguimiento

- Registrar provider reCAPTCHA Enterprise en Firebase Console > App Check (site key ya creada)
- Smoke E2E: checkout Stripe/Aplazo con token App Check en tiendalaguarida.com
- Sentry DSN App Hosting (CL-012) si aplica
- 15 tests backend pre-existentes (FedEx/puntos)

## Inventario

- Prod: https://tiendalaguarida.com
- Staging: hosted.app URL en CORS
- API: us-central1-e-comerce-leon.cloudfunctions.net/api
- Firestore tiendacl (no RTDB)

## Pruebas MCP (2025-06-27)

- Firebase: Firestore/Storage deny-by-default verificado via MCP
- Stripe: cuenta activa, PaymentIntents MXN succeeded
- API: email lookup anti-enumeracion OK; App Check enforced en resto

## Pruebas locales

- Backend build: PASS
- Frontend build: PASS (TS + ESLint)
- App Check middleware: 8 PASS
- npm test: 538 pass / 15 fail pre-existentes

## Despliegues ejecutados

firestore:rules, storage, functions:api, expireInventoryReservationsFunction, apphosting frontend, secretos App Hosting, reCAPTCHA key

## Archivos modificados

`ash
firebase apphosting:secrets:set APPHOSTING_STRIPE_PUBLISHABLE_KEY --project e-comerce-leon
firebase deploy --only functions:expireInventoryReservationsFunction --project e-comerce-leon
`

## Archivos modificados

Backend: index.ts, inventory-reservation.cron.ts, galeria.routes.ts, users.routes.ts, users.command.controller.ts, middlewares.ts, payments-auth.middleware.ts, aplazo.provider.ts, firebase.json, app-check.middleware.test.ts, storage.rules, deploy-functions.yml, .env.e-comerce-leon

Frontend: apphosting.yaml, middleware.ts, backend-client.ts, next.config.ts, inventario.ts, recommendations.ts, google-maps-places.d.ts, use-auth.tsx, Antigravity.jsx, admin pages, product-rail, login, cookies/*
