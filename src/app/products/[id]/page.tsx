import { fetchProductById } from "@/lib/api/storefront";
import { notFound } from "next/navigation";
import { ProductDetailsClient } from "./product-details-client";
import { Breadcrumbs } from "@/components/storefront/shared/breadcrumbs";
import { ProductRecommendations } from "@/components/storefront/recommendations/product-recommendations";

export default async function ProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const product = await fetchProductById(id);

  if (!product || product.activo === false) {
    notFound();
  }

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
        <ProductRecommendations productId={product.id} />
      </ProductDetailsClient>
    </div>
  );
}
