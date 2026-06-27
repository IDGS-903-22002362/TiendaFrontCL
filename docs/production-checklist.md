# Checklist de produccion - La Guarida (Club Leon)

Lista operativa para el lanzamiento publico en tiendalaguarida.com.

## 1. Secretos pre-deploy

### Backend

- STRIPE_SECRET_KEY (sk_live_*)
- STRIPE_WEBHOOK_SECRET
- JWT / tokens de sesion API
- BREVO_API_KEY
- STORE_PUBLIC_BASE_URL=https://tiendalaguarida.com
- SERVICE_ACCOUNT_APP_OFICIAL
- Secretos Aplazo (solo si se habilita)

### Frontend

- ALLOWED_FRONT_IPS="" (publico)
- NEXT_PUBLIC_API_BASE_URL
- NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY (pk_live_*)
- SENTRY_DSN / NEXT_PUBLIC_SENTRY_DSN
- NEXT_PUBLIC_FIREBASE_APP_CHECK_SITE_KEY (opcional)
- NEXT_PUBLIC_GA_MEASUREMENT_ID / NEXT_PUBLIC_GTM_ID (opcional)
- STORE_PUBLIC_BASE_URL

## 2. Dominio tiendalaguarida.com

1. Agregar dominio en Firebase App Hosting
2. Configurar DNS y TLS
3. Actualizar CORS_ALLOWED_ORIGINS en backend
4. Actualizar webhook Stripe

## 3. App Check

No activar APP_CHECK_ENFORCED=true en backend hasta configurar NEXT_PUBLIC_FIREBASE_APP_CHECK_SITE_KEY y validar header X-Firebase-AppCheck.

## 4. Analitica

GA4/GTM cargan solo con consentimiento (use-cookie-consent + script-loader).

## 5. Aplazo

Checkout activo: Stripe. Aplazo deshabilitado hasta secretos backend. Mantener NEXT_PUBLIC_APLAZO_SHOP_ID.

## 6. Sentry

Configurar DSN en App Hosting. Opcional: SENTRY_AUTH_TOKEN para source maps.

## 7. Smoke tests

- Catalogo, carrito, checkout
- Pickup $0
- Domicilio Leon $99 / fuera $299
- Stripe + confirmacion
- /aviso-privacidad, /TerminosCondiciones, /politica-cookies
- /robots.txt y /sitemap.xml

## 8. Deploy

Frontend: npm run build && npm run deploy:frontend

Backend: cd functions && npm run build && firebase deploy --only functions --project e-comerce-leon

## 9. Post-deploy

- Sitio responde 200 (no 403)
- CORS OK
- Webhook Stripe OK
- Correos de pedido OK