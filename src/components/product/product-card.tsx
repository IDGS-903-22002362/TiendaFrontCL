import Image from 'next/image';
import Link from 'next/link';
import type { Product } from '@/lib/types';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PriceTag } from './price-tag';

type ProductCardProps = {
  product: Product;
};

export function ProductCard({ product }: ProductCardProps) {
  const productImageId = product.images[0].split('/').slice(-3, -2)[0];
  const placeholder = PlaceHolderImages.find(p =>
    p.imageUrl.includes(productImageId)
  );

  return (
    <Card className="group flex h-full flex-col overflow-hidden rounded-[24px] border-border/80 bg-[linear-gradient(180deg,rgba(28,28,28,0.92),rgba(20,20,20,0.98))] transition-all duration-300 hover:-translate-y-1 hover:border-primary/35 hover:shadow-[var(--shadow-elevated)] md:rounded-[28px]">
      <CardHeader className="p-0">
        <Link href={`/products/${product.id}`} className="block">
          <div className="relative aspect-square w-full overflow-hidden">
            {product.tags.length > 0 && (
              <Badge
                className="absolute right-2.5 top-2.5 z-10 capitalize md:right-3 md:top-3"
                variant={product.tags[0] === 'sale' ? 'secondary' : 'default'}
              >
                {product.tags[0] === 'new' ? 'Nuevo' : 'Oferta'}
              </Badge>
            )}
            <div className="absolute inset-0 z-[1] bg-[linear-gradient(180deg,transparent_42%,rgba(5,5,5,0.72))]" />
            <Image
              src={product.images[0]}
              alt={product.name}
              fill
              sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              data-ai-hint={placeholder?.imageHint}
            />
          </div>
        </Link>
      </CardHeader>
      <CardContent className="flex-grow p-4 md:p-5">
        <Link href={`/products/${product.id}`} className="block">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-secondary">
            {product.category}
          </p>
          <h3 className="mt-2 line-clamp-2 min-h-[3rem] font-headline text-base font-semibold text-foreground md:min-h-[3.4rem] md:text-lg">
            {product.name}
          </h3>
          <p className="mt-1.5 line-clamp-2 text-xs text-text-secondary md:mt-2 md:text-sm">
            Pieza oficial con acabado premium para colección y matchday.
          </p>
        </Link>
      </CardContent>
      <CardFooter className="mt-auto flex-col items-start gap-3 p-4 pt-0 md:gap-4 md:p-5 md:pt-0">
        <PriceTag price={product.price} salePrice={product.salePrice} />
        <Button asChild className="h-11 w-full">
          <Link href={`/products/${product.id}`}>Ver detalles</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
