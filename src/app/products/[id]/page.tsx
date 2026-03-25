import { fetchProductById, fetchProducts } from "@/lib/api/storefront";
import { notFound } from "next/navigation";
import { ProductDetailsClient } from "./product-details-client";
import { Breadcrumbs } from "@/components/storefront/shared/breadcrumbs";
import { RecommendationCarousel } from "@/components/storefront/product/recommendation-carousel";
import {
  getProductRecommendationTitle,
  getRelatedProducts,
  isProductVisible,
} from "@/lib/storefront";

export default async function ProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const product = await fetchProductById(id);

  if (!product) {
    notFound();
  }

  const allProducts = await fetchProducts();
  const relatedProducts = getRelatedProducts(allProducts.filter(isProductVisible), product);

  return (
    <div className="storefront-frame py-5 md:py-8">
      <div className="mb-6">
        <Breadcrumbs
          items={[
            { label: "Inicio", href: "/" },
            { label: "Productos", href: "/products" },
            { label: product.category },
            { label: product.name },
          ]}
        />
      </div>

      <ProductDetailsClient product={product}>
        {relatedProducts.length > 0 ? (
          <div className="pt-12 md:pt-16">
            <RecommendationCarousel
              title={getProductRecommendationTitle(product)}
              products={relatedProducts}
              contained={false}
            />
          </div>
        ) : null}
      </ProductDetailsClient>
    </div>
  );
}
