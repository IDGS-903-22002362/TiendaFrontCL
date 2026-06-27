# AGENTS.md - Frontend Ecommerce Club León

## Contexto

Frontend del ecommerce Club León.

Stack principal:

* Next.js App Router
* React
* TypeScript
* Tailwind CSS
* shadcn/ui
* Firebase client APIs
* Stripe Embedded Checkout
* Aplazo
* Sentry
* Playwright
* AccessLint

El frontend no es fuente de verdad para precios, descuentos, envío, total, estado de pago, inventario, roles ni permisos admin. El backend debe validar todo.

---

## MCP disponibles

Usa MCP solo cuando aplique a la tarea:

* `plugin-firebase-firebase`
* `user-firebase`
* `user-shadcn`
* `user-playwright`
* `user-accesslint`
* `user-stripe`
* `user-snyk`
* `user-semgrep`

---

## Skills disponibles relevantes

Usa estas skills según la tarea:

### Frontend/UI

* `frontend-design`
* `shadcn`

### Seguridad y revisión

* `review-security`
* `review-bugbot`
* `review-security`
* `find-skills`

### Firebase

* `firebase-basics`
* `firebase-auth-basics`
* `firebase-firestore`
* `firebase-security-rules-auditor`
* `firebase-hosting-basics`
* `firebase-app-hosting-basics`

### Sentry

* `sentry-nextjs-sdk`
* `sentry-react-sdk`
* `sentry-fix-issues`
* `sentry-pr-code-review`
* `sentry-create-alert`

### Cursor

* `create-rule`
* `create-hook`
* `create-skill`
* `split-to-prs`
* `loop`
* `babysit`
* `canvas`

---

# Reglas críticas

## Seguridad

Nunca:

* exponer secretos en frontend
* usar secrets en `NEXT_PUBLIC_*`
* confiar en roles del frontend
* confiar en totales del frontend
* marcar órdenes como pagadas desde estado frontend
* debilitar reglas Firebase para corregir UI
* usar `dangerouslySetInnerHTML` sin sanitizar
* guardar datos sensibles en localStorage
* registrar datos sensibles en consola

Siempre:

* validar contratos con backend
* mantener secrets en backend
* mostrar errores seguros al usuario
* conservar seguridad en admin
* revisar flujo completo si se toca checkout, pagos, ofertas o códigos

---

## Checkout y pagos

No romper:

* carrito
* precios con oferta
* códigos promocionales
* envío a domicilio: $99 MXN (León) / $299 MXN (fuera de León)
* pickup con envío $0
* `expectedSubtotal`
* Stripe Embedded Checkout
* Aplazo
* creación de orden
* pantalla de estado de pedido

Regla principal:

* El frontend puede mostrar cálculos, pero el backend confirma subtotal, descuento, envío, total y pago.

---

## Diseño frontend

El diseño debe sentirse:

* premium
* limpio
* ecommerce real
* mobile-first
* accesible
* profesional
* consistente

Evitar:

* gradientes genéricos de IA
* sombras excesivas
* colores SaaS aleatorios
* animaciones innecesarias
* cards saturadas
* layouts apretados
* romper lógica por rediseñar

---

# Qué usar según la tarea

## Diseño premium / UI visual

Usar:

* Skill: `frontend-design`
* Skill: `shadcn`
* MCP: `user-shadcn`

Aplica para:

* home
* catálogo
* product cards
* carrito
* checkout UI
* banners
* ofertas
* filtros
* admin UI
* modales
* formularios
* tablas

Manual si no hay skill:

* mejorar jerarquía visual
* mejorar spacing
* hacer CTA más claro
* agregar loading, empty y error states
* revisar mobile
* conservar props y estado existente

---

## Componentes shadcn/ui

Usar:

* Skill: `shadcn`
* MCP: `user-shadcn`

Aplica para:

* Button
* Card
* Dialog
* Sheet
* Select
* Input
* Form
* Badge
* Table
* Tabs
* Dropdown
* Skeleton
* Toast
* Alert

Reglas:

* revisar componentes ya existentes
* no duplicar sistemas UI
* usar primitives accesibles
* mantener Tailwind consistente
* no crear componentes custom si shadcn ya lo resuelve bien

---

## Accesibilidad

Usar:

* MCP: `user-accesslint`

Aplica para:

* checkout
* carrito
* forms
* modales
* sheets
* filtros
* botones
* navegación
* admin

Revisar:

* labels
* aria-label
* focus visible
* navegación con teclado
* contraste
* HTML semántico
* mensajes de error
* estados de carga

Manual si no hay MCP:

* todo input debe tener label
* todo botón debe tener texto claro o aria-label
* no depender solo del color
* evitar `div` clickeables sin teclado
* mantener focus visible

---

## Pruebas visuales y flujo real

Usar:

* MCP: `user-playwright`

Aplica para:

* catálogo
* filtros
* carrito
* checkout
* pickup
* domicilio
* Stripe
* Aplazo
* admin
* responsive
* regresiones visuales

Probar en checkout:

* producto normal
* producto con oferta
* código promocional
* oferta + código
* pickup
* domicilio León $99 / fuera de León $299
* carrito vacío
* error de pago
* mobile

Manual si no hay MCP:

* dar pasos exactos de prueba
* incluir URL, acción, resultado esperado y posible fallo

---

## Stripe

Usar:

* MCP: `user-stripe`

Aplica para:

* Stripe Embedded Checkout
* publishable key
* clientSecret
* errores Stripe
* inicialización de pago
* payload de checkout

Reglas:

* no exponer secret key
* no calcular monto final solo en frontend
* no marcar orden pagada desde frontend
* usar datos confirmados por backend
* no registrar datos sensibles

Manual si no hay MCP:

* revisar endpoint backend usado
* revisar respuesta segura al frontend
* validar que solo se use publishable key
* conservar flujo actual que ya funciona

---

## Firebase frontend

Usar:

* Skill: `firebase-basics`
* Skill: `firebase-auth-basics`
* Skill: `firebase-firestore`
* MCP: `plugin-firebase-firebase`
* MCP: `user-firebase`

Aplica para:

* inicialización Firebase
* Auth
* sesión
* Firestore client reads
* Storage images
* datos públicos
* datos de usuario
* lectura de órdenes

Reglas:

* no usar Admin SDK en frontend
* no exponer service accounts
* frontend admin checks son solo UX
* permisos reales van en backend/reglas
* no debilitar rules por errores del frontend

Manual si no hay MCP:

* seguir patrón actual de Firebase client
* revisar que solo se usen configs públicas
* documentar colección/path usado

---

## Reglas Firebase / seguridad de datos

Usar:

* Skill: `firebase-security-rules-auditor`
* MCP: `plugin-firebase-firebase`
* MCP: `user-firebase`

Aplica cuando el frontend accede a:

* Firestore
* Storage
* órdenes
* usuarios
* admin collections
* productos privados
* datos de cliente

Reglas:

* productos públicos pueden ser públicos solo si es intencional
* órdenes deben limitarse al dueño
* admin collections deben protegerse
* no resolver permisos abriendo reglas de más

Manual:

* identificar path
* identificar quién debe leer/escribir
* decidir si debe hacerlo frontend o backend

---

## Seguridad frontend

Usar:

* Skill: `review-security`
* MCP: `user-semgrep`
* MCP: `user-snyk`

Aplica para:

* checkout
* carrito
* admin
* auth
* órdenes
* pagos
* ofertas
* códigos
* variables env
* dependencias
* inputs de usuario

Revisar:

* XSS
* secretos expuestos
* redirects inseguros
* roles solo en UI
* manipulación de precios
* datos sensibles en logs
* dependencias vulnerables

Manual:

* buscar `dangerouslySetInnerHTML`
* buscar `eval`
* buscar `NEXT_PUBLIC`
* revisar localStorage
* revisar console logs
* revisar que backend valide

---

## Dependencias

Usar:

* MCP: `user-snyk`

Aplica para:

* `package.json`
* lockfiles
* upgrades
* nuevas librerías
* paquetes de auth, pagos, forms, uploads o parsers

Reglas:

* no hacer upgrades masivos sin motivo
* no usar `audit fix --force` sin revisar
* explicar riesgos antes de cambiar
* preferir cambios mínimos

Manual:

* revisar `npm audit`
* revisar breaking changes
* correr lint/build

---

## Semgrep

Usar:

* MCP: `user-semgrep`

Aplica para:

* revisión de seguridad estática
* checkout
* auth
* admin
* env
* redirects
* HTML peligroso
* lógica de pagos

Manual:

* buscar patrones inseguros
* revisar trust boundaries
* confirmar validación backend

---

## Sentry

Usar:

* Skill: `sentry-nextjs-sdk`
* Skill: `sentry-react-sdk`
* Skill: `sentry-fix-issues`
* Skill: `sentry-pr-code-review`
* Skill: `sentry-create-alert`

Aplica para:

* errores producción
* checkout errors
* error boundaries
* tracing
* performance
* alertas
* debugging

Reglas:

* no enviar secrets
* no enviar payloads sensibles de pago
* errores usuario deben ser claros
* errores internos deben ser rastreables

Manual:

* agregar estados de error seguros
* evitar stack traces al usuario
* capturar contexto no sensible

---

## Bugs y regresiones

Usar:

* Skill: `review-bugbot`

Aplica cuando:

* algo aparece y desaparece
* hay hydration mismatch
* filtros fallan
* totales se ven mal
* cards muestran precio incorrecto
* admin carga y luego falla
* bug apareció tras merge

Manual:

* reproducir
* aislar cambio reciente
* revisar estado/fuente de datos
* hacer fix mínimo
* evitar rewrite grande

---

## Refactors grandes

Usar:

* Skill: `canvas`
* Skill: `split-to-prs`
* Skill: `loop`
* Skill: `babysit`

Aplica para:

* rediseño grande
* checkout
* catálogo
* admin
* separación de componentes
* migraciones UI

Reglas:

* plan primero
* cambios pequeños
* no mezclar UI con pagos
* verificar entre pasos

Manual:

* separar por módulos
* mantener comportamiento
* probar antes y después

---

## Crear reglas/hooks/skills

Usar:

* Skill: `create-rule`
* Skill: `create-hook`
* Skill: `create-skill`

Aplica cuando:

* Cursor repite errores
* se necesita regla del proyecto
* se necesita validación automática
* se necesita skill propia

Manual:

* documentar el error recurrente
* crear checklist corto
* aplicar en futuras tareas

---

## Buscar skills

Usar:

* Skill: `find-skills`

Aplica cuando:

* no hay skill clara
* se necesita algo de SEO, analytics, performance, testing o seguridad específica

Manual:

* seguir patrones del proyecto
* consultar código existente
* explicar incertidumbre

---

# Reglas de negocio frontend

## Ofertas

* No guardar precio final como precio base.
* Mostrar precio original y precio oferta si aplica.
* No duplicar descuentos.
* Mantener compatibilidad con `tag=sale` y `onlyOffers=true` si existe.
* No romper “Rebajas Club León”.
* Checkout debe usar backend como fuente final.

Usar:

* `frontend-design`
* `shadcn`
* `user-playwright`
* `review-bugbot`
* `review-security` si afecta totales

---

## Códigos promocionales

* Validación real viene del backend.
* Frontend solo muestra resultado.
* No aplicar descuento doble.
* Mantener `expectedSubtotal` alineado.

Usar:

* `user-playwright`
* `review-security`
* `user-semgrep`

---

## Envío

Regla temporal:

* pickup = $0
* domicilio León = $99 MXN
* domicilio fuera de León = $299 MXN
* domicilio requiere dirección
* FedEx no debe bloquear pago temporalmente

Usar:

* `user-playwright`
* `frontend-design`
* `review-security`

---

## Admin

* Checks de frontend son UX, no seguridad real.
* Acciones destructivas requieren confirmación.
* Forms deben validar.
* Tablas deben ser legibles.
* No eliminar campos sin revisar backend.

Usar:

* `shadcn`
* `frontend-design`
* `user-accesslint`
* `user-playwright`
* `review-security`

---

# Flujo obligatorio

Para cambios normales:

1. Revisar componente existente.
2. Usar skill/MCP aplicable.
3. Preservar props, estado, API calls y lógica.
4. Revisar mobile.
5. Agregar loading, empty y error state si falta.
6. Dar pasos de prueba.

Para checkout, pagos, seguridad o admin:

1. Analizar primero.
2. Listar archivos involucrados.
3. Identificar contrato frontend/backend.
4. Usar `review-security`.
5. Usar MCP específico si aplica.
6. No editar hasta tener plan claro.

---

# Quality gate

Antes de terminar:

* no hay secretos expuestos
* no se rompió pricing
* no se rompió checkout
* no se rompió Stripe/Aplazo
* responsive correcto
* accesibilidad básica correcta
* errores seguros
* loading/empty/error states revisados

Si el cambio es importante, correr:

* `npm run lint`
* `npm run build`

Usar el package manager actual del proyecto.

---

# No hacer

No:

* reescribir sin aprobación
* mezclar rediseño con pagos
* confiar en totales frontend
* exponer secrets
* debilitar Firebase rules
* duplicar lógica backend
* agregar dependencias innecesarias
* ignorar mobile
* ignorar accesibilidad
* cambiar contratos backend sin revisar backend

---

# Si ninguna skill aplica

1. Seguir patrones existentes.
2. Hacer cambios mínimos.
3. Explicar supuestos.
4. Mantener lógica actual.
5. Dar pruebas manuales.
6. Pedir confirmación antes de cambios riesgosos.
