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
    <Card className="flex h-full flex-col overflow-hidden transition-shadow hover:shadow-lg">
      <CardHeader className="p-0">
        <Link href={`/products/${product.id}`} className="block">
          <div className="relative aspect-square w-full">
            {product.tags.length > 0 && (
              <Badge
                className="absolute right-2 top-2 z-10 capitalize"
                variant={product.tags[0] === 'sale' ? 'destructive' : 'default'}
              >
                {product.tags[0] === 'new' ? 'Nuevo' : 'Oferta'}
              </Badge>
            )}
            <Image
              src={product.images[0]}
              alt={product.name}
              fill
              sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
              className="object-cover transition-transform group-hover:scale-105"
              data-ai-hint={placeholder?.imageHint}
            />
          </div>
        </Link>
      </CardHeader>
      <CardContent className="flex-grow p-4">
        <Link href={`/products/${product.id}`} className="block">
          <h3 className="truncate font-headline font-semibold">
            {product.name}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {product.category}
          </p>
        </Link>
      </CardContent>
      <CardFooter className="flex-col items-start gap-4 p-4 pt-0">
        <PriceTag price={product.price} salePrice={product.salePrice} />
        <Button asChild className="w-full">
          <Link href={`/products/${product.id}`}>Ver detalles</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
