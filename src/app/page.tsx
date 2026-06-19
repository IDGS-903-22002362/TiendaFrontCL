import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { fetchCategories, fetchProducts } from "@/lib/api/storefront";
import type { Product } from "@/lib/types";
import {
  getCategoryCards,
  getFeaturedProducts,
  getHeroProduct,
  getNewArrivalProducts,
  isPersonalizableProduct,
} from "@/lib/storefront";
import { CategoryGrid } from "@/components/storefront/home/category-grid";
import { EditorialSplit } from "@/components/storefront/home/editorial-split";
import { HeroEditorial } from "@/components/storefront/home/hero-editorial";
import { LookbookSection } from "@/components/storefront/home/lookbook-section";
import { ProductRail } from "@/components/storefront/home/product-rail";
import { SectionHeader } from "@/components/storefront/home/section-header";
import LineaCategorySection from "@/components/storefront/home/lineCategory-section";
import { HomeRecommendations } from "@/components/storefront/recommendations/home-recommendations";

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
  const [products, categories] = await Promise.all([
    fetchProducts(),
    fetchCategories(),
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

  const featuredProducts = dedupeProducts(getFeaturedProducts(products));
  const newArrivals = dedupeProducts(getNewArrivalProducts(products));
  const categoryCards = getCategoryCards(categories, products);
  const homeCategories = [...categoryCards]
    .sort((left, right) => right.count - left.count)
    .slice(0, 4);
  const customizableProduct =
    featuredProducts.find(isPersonalizableProduct) ||
    products.find(isPersonalizableProduct);
  const editorialProduct =
    featuredProducts.find((product) => product.id !== heroProduct.id) ||
    newArrivals.find((product) => product.id !== heroProduct.id) ||
    heroProduct;

  const collectionProduct =
    dedupeProducts([
      customizableProduct && customizableProduct.id !== heroProduct.id
        ? customizableProduct
        : null,
      editorialProduct,
      heroProduct,
    ])[0] ?? heroProduct;

  const featuredRailProducts = dedupeProducts(
    featuredProducts.filter(
      (product) =>
        product.id !== heroProduct.id && product.id !== collectionProduct.id,
    ),
  ).slice(0, 6);

  const lookbookProducts = dedupeProducts([
    editorialProduct,
    ...featuredProducts,
    ...newArrivals,
  ])
    .filter((product) => product.id !== collectionProduct.id)
    .slice(0, 3);

  const excludedIds = new Set([
    heroProduct.id,
    collectionProduct.id,
    ...lookbookProducts.map((product) => product.id),
  ]);

  const secondaryRailProducts = dedupeProducts([
    ...newArrivals,
    ...featuredProducts,
  ])
    .filter((product) => !excludedIds.has(product.id))
    .slice(0, 6);

  const collectionIsPersonalizable = isPersonalizableProduct(collectionProduct);
  const collectionTitle = collectionIsPersonalizable
    ? "Personaliza la prenda oficial"
    : "Nueva Colección oficial con más estilo y más Fiera que nunca.";
  const collectionDescription = collectionIsPersonalizable
    ? "La personalización sigue conectada al PDP y al carrito actual, pero ahora entra en una composición más limpia, más directa y más centrada en la pieza."
    : "Descubre nuestro nuevo lanzamiento dando clic en 'Ver colección', adquierela y luce los colores esmeralda.";

  return (
    <div className="pb-16 md:pb-24">
      <HeroEditorial />

      <div className="home-section">
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

      {homeCategories.length > 0 ? (
        <section className="home-section">
          <div className="container">
            <SectionHeader
              eyebrow="Explora nuestras colecciones"
              title="Tendencias y calidad en una sola colección."
              description="Cada colección reúne nuestra identidad como equipo, siempre pensadas para acompañarte en cada etapa de torneo."
              action={
                <Link
                  href="/products"
                  className="editorial-link text-foreground/72 hover:text-primary"
                >
                  Ver catálogo
                  <ArrowRight className="h-4 w-4" />
                </Link>
              }
            />
          </div>
          <div className="mt-8">
            <CategoryGrid categories={homeCategories} />
          </div>
        </section>
      ) : null}

      {featuredRailProducts.length > 0 ? (
        <div className="home-section">
          <ProductRail
            eyebrow="Productos"
            title="Destacados"
            description="Descubre los artículos favoritos de la afición y lleva contigo la pasión por nuestros colores."
            products={featuredRailProducts}
            href="/products"
            hrefLabel="Ver más"
          />
        </div>
      ) : null}

      {lookbookProducts.length >= 3 ? (
        <div className="home-section">
          <LookbookSection products={lookbookProducts} />
        </div>
      ) : null}

      {/* Sección de Líneas */}
      <section className="home-section">
        <div className="container">
        </div>
        <div className="mt-8">
          <LineaCategorySection />
        </div>
      </section>

      {secondaryRailProducts.length > 0 ? (
        <div className="home-section">
          <ProductRail
            eyebrow="Productos nuevos"
            title="Novedades"
            description="Los artículos que marcan tendencia dentro y fuera del estadio."
            products={secondaryRailProducts}
            href="/products?tag=new"
            hrefLabel="Ver más"
          />
        </div>
      ) : null}

      <div className="home-section">
        <HomeRecommendations />
      </div>
    </div>
  );
}
