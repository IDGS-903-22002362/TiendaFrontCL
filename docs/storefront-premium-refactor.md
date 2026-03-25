# Storefront Premium Refactor

## Objetivo

Refactorizar el storefront público de La Guarida con una estética premium deportiva, manteniendo intacta la lógica actual de catálogo, auth, carrito y checkout.

## Cambios principales

- Nueva capa visual storefront aislada por tema en `body`.
- Refactor de `header`, `footer`, `home`, `PLP`, `PDP`, `cart`, `login` y `checkout`.
- Estado local cliente para `wishlist` y personalización de jerseys.
- Nuevos view-models y helpers para derivar badges, stock, copy editorial y recomendaciones sin cambiar contratos backend.

## Componentes nuevos o refactorizados

- `UtilityBar`
- `Header`
- `DesktopNav`
- `MobileNavDrawer`
- `SearchDrawer`
- `HeroEditorial`
- `CategoryGrid`
- `SectionHeading`
- `Breadcrumbs`
- `WishlistButton`
- `ProductToolbar`
- `FilterSidebar`
- `FilterDrawer`
- `ProductGallery`
- `ProductInfoPanel`
- `PersonalizationPanel`
- `AddToCartBar`
- `RecommendationCarousel`
- `EmptyState`

## Dependencias usadas

- `next/font`
- `motion`
- `embla-carousel-react`
- `lucide-react`
- `clsx`
- `tailwind-merge`
- `class-variance-authority`

## Páginas impactadas

- `/`
- `/products`
- `/products/[id]`
- `/cart`
- `/login`
- `/checkout`

## Restricciones de v1

- `wishlist` solo local.
- Personalización de jerseys solo local y sin alterar payloads ni totales backend.
- Sin `quick view` ni `más vendidos` porque la API actual no expone datos suficientes.
