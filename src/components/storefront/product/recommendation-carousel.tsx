import type { Product } from "@/lib/types";
import { ProductCarousel } from "./product-carousel";

export function RecommendationCarousel({
  title,
  products,
  contained,
  className,
}: {
  title: string;
  products: Product[];
  contained?: boolean;
  className?: string;
}) {
  return (
    <ProductCarousel
      eyebrow="Recomendados"
      title={title}
      description="Selección relacionada para mantener continuidad entre exploración y compra."
      products={products}
      contained={contained}
      className={className}
    />
  );
}
