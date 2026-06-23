import type { Metadata } from "next";
import {
  buildHomeDestacadosRailProducts,
  HOME_DESTACADOS_RAIL_LIMIT,
} from "@/lib/api/home-sections";
import { lineasApi } from "@/lib/api/lineas";
import {
  DESTACADOS_CATALOG_FETCH_LIMIT,
  fetchDestacadosProducts,
  fetchProducts,
} from "@/lib/api/storefront";
import type { Product } from "@/lib/types";
import {
  getHeroProduct,
  getHomeLineaCards,
  isPersonalizableProduct,
} from "@/lib/storefront";
import { CategoryGrid } from "@/components/storefront/home/category-grid";
import { EditorialSplit } from "@/components/storefront/home/editorial-split";
import { HeroEditorial } from "@/components/storefront/home/hero-editorial";
import { HomeDynamicRails } from "@/components/storefront/home/home-dynamic-rails";
import { HomeEditorialGrid } from "@/components/storefront/home/home-editorial-grid";
import { ProductRail } from "@/components/storefront/home/product-rail";
import CategorySection from "@/components/storefront/home/category-section";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Inicio",
  description:
    "La Guarida presenta la colección oficial del Club León con una home editorial, limpia y enfocada en producto.",
};

function dedupeProducts(products: Array<Product | null | undefined>) {
  const seen = new Set<string>();

  return products.filter((product): product is Product => {
    if (!product || seen.has(product.id)) {
      return false;
    }

    seen.add(product.id);
    return true;
  });
}

export default async function Home() {
  const [products, lineas, featuredFromAnalytics] = await Promise.all([
    fetchProducts(),
    lineasApi.getAll({ fresh: true }),
    fetchDestacadosProducts(DESTACADOS_CATALOG_FETCH_LIMIT),
  ]);

  const heroProduct = getHeroProduct(products);

  if (!heroProduct) {
    return (
      <div className="container py-20">
        <div className="home-surface rounded-[2rem] px-8 py-12 text-center">
          <h1 className="font-headline text-4xl font-semibold uppercase tracking-[0.03em] text-foreground"></h1>
          <p className="mt-4 text-muted-foreground">
            No hay productos visibles para construir la portada en este momento.
          </p>
        </div>
      </div>
    );
  }

  const destacadosProducts = dedupeProducts(featuredFromAnalytics);
  const homeLineaCards = getHomeLineaCards(lineas, products);

  const customizableProduct =
    destacadosProducts.find(isPersonalizableProduct) ||
    products.find(isPersonalizableProduct);
  const editorialProduct =
    destacadosProducts.find((product) => product.id !== heroProduct.id) ||
    heroProduct;

  const collectionProduct =
    dedupeProducts([
      customizableProduct && customizableProduct.id !== heroProduct.id
        ? customizableProduct
        : null,
      editorialProduct,
      heroProduct,
    ])[0] ?? heroProduct;

  // Same destacados ranking as /products?sort=destacados; hero/collection are editorial slots.
  const featuredRailProducts = buildHomeDestacadosRailProducts(
    destacadosProducts,
    [heroProduct.id, collectionProduct.id],
    HOME_DESTACADOS_RAIL_LIMIT,
  );

  const collectionIsPersonalizable = isPersonalizableProduct(collectionProduct);
  const collectionTitle = collectionIsPersonalizable
    ? "Personaliza la prenda oficial"
    : "Colección oficial";
  const collectionDescription = collectionIsPersonalizable
    ? "La personalización sigue conectada al PDP y al carrito actual, pero ahora entra en una composición más limpia, más directa y más centrada en la pieza."
    : "Descubre nuestro nuevo lanzamiento dando clic en 'Ver colección', adquierela y luce los colores esmeralda.";

  return (
    <div className="pb-10 md:pb-16">
      <HeroEditorial />

      <div className="home-container-compact">
        <EditorialSplit
          product={collectionProduct}
          eyebrow={
            collectionIsPersonalizable
              ? "Colección personalizable"
              : "Colección destacada"
          }
          title={collectionTitle}
          description={collectionDescription}
          primaryHref={`/products/${collectionProduct.id}`}
          primaryLabel={
            collectionIsPersonalizable ? "Personalizar ahora" : "Ver colección"
          }
          secondaryHref={
            collectionIsPersonalizable
              ? "/products?category=jerseys"
              : "/products"
          }
          secondaryLabel={
            collectionIsPersonalizable ? "Ver jerseys" : "Ir al catálogo"
          }
        />
      </div>


      {homeLineaCards.length > 0 ? (
        <section className="home-section">
          <CategoryGrid categories={homeLineaCards} />
        </section>
      ) : null}

      {featuredRailProducts.length > 0 ? (
        <div className="home-container-compact">
          <ProductRail
            eyebrow="Analytics"
            title="Destacados"
            description="Los artículos con mayor interacción real en la tienda."
            products={featuredRailProducts}
            href="/products?sort=destacados"
            hrefLabel="Ver más"
            showCategoryTabs={false}
          />
        </div>
      ) : null}

      <HomeEditorialGrid />

      <HomeDynamicRails />

      <section className="home-section pb-0">
        <CategorySection />
      </section>
    </div>
  );
}
