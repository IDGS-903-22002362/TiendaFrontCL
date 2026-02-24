'use client';

import { useState, useMemo, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ProductGrid } from './product-grid';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import type { Product, Category } from '@/lib/types';
import { Filter } from 'lucide-react';

type ProductFiltersProps = {
  allProducts: Product[];
  categories: Category[];
  searchParams: { [key: string]: string | string[] | undefined };
};

export function ProductFilters({ allProducts, categories, searchParams }: ProductFiltersProps) {
  const router = useRouter();
  const initialSearchParams = useSearchParams();

  const [sort, setSort] = useState(initialSearchParams.get('sort') || 'relevance');
  const [category, setCategory] = useState(initialSearchParams.get('category') || 'all');
  const [priceRange, setPriceRange] = useState<[number]>([5000]);
  const [tags, setTags] = useState<string[]>(initialSearchParams.getAll('tag'));

  useEffect(() => {
    const params = new URLSearchParams();
    if (sort !== 'relevance') params.set('sort', sort);
    if (category !== 'all') params.set('category', category);
    if (priceRange[0] < 5000) params.set('maxPrice', priceRange[0].toString());
    tags.forEach(tag => params.append('tag', tag));
    
    router.replace(`/products?${params.toString()}`, { scroll: false });
  }, [sort, category, priceRange, tags, router]);

  const filteredProducts = useMemo(() => {
    let products = [...allProducts];

    // Filter by category
    if (category !== 'all') {
      const cat = categories.find(c => c.slug === category);
      if (cat) {
        products = products.filter(p => p.category === cat.name);
      }
    }

    // Filter by price
    products = products.filter(p => (p.salePrice || p.price) <= priceRange[0]);

    // Filter by tags
    if (tags.length > 0) {
      products = products.filter(p => tags.every(tag => p.tags.includes(tag as 'new' | 'sale')));
    }

    // Sort
    switch (sort) {
      case 'price-asc':
        products.sort((a, b) => (a.salePrice || a.price) - (b.salePrice || b.price));
        break;
      case 'price-desc':
        products.sort((a, b) => (b.salePrice || b.price) - (a.salePrice || a.price));
        break;
      case 'newest':
        products.sort((a, b) => (b.tags.includes('new') ? 1 : -1) - (a.tags.includes('new') ? 1 : -1));
        break;
      default: // relevance
        break;
    }

    return products;
  }, [allProducts, category, categories, priceRange, tags, sort]);

  const handleTagChange = (tag: string, checked: boolean) => {
    setTags(prev => checked ? [...prev, tag] : prev.filter(t => t !== tag));
  };
  
  const FilterControls = () => (
    <div className="space-y-6">
      <div>
        <h3 className="mb-4 font-headline text-lg font-semibold">Categoría</h3>
        <div className="space-y-2">
          <div className="flex items-center">
            <Checkbox id="cat-all" checked={category === 'all'} onCheckedChange={() => setCategory('all')} />
            <label htmlFor="cat-all" className="ml-2 text-sm">Todos</label>
          </div>
          {categories.map(cat => (
            <div key={cat.id} className="flex items-center">
              <Checkbox id={`cat-${cat.slug}`} checked={category === cat.slug} onCheckedChange={() => setCategory(cat.slug)} />
              <label htmlFor={`cat-${cat.slug}`} className="ml-2 text-sm">{cat.name}</label>
            </div>
          ))}
        </div>
      </div>
      <div>
        <h3 className="mb-4 font-headline text-lg font-semibold">Precio</h3>
        <Slider
          value={priceRange}
          onValueChange={(value) => setPriceRange(value as [number])}
          max={5000}
          step={100}
        />
        <div className="mt-2 text-sm text-muted-foreground">
          Hasta: ${priceRange[0].toLocaleString()}
        </div>
      </div>
      <div>
        <h3 className="mb-4 font-headline text-lg font-semibold">Etiquetas</h3>
        <div className="space-y-2">
            <div className="flex items-center">
                <Checkbox id="tag-new" checked={tags.includes('new')} onCheckedChange={(checked) => handleTagChange('new', !!checked)} />
                <label htmlFor="tag-new" className="ml-2 text-sm">Novedades</label>
            </div>
            <div className="flex items-center">
                <Checkbox id="tag-sale" checked={tags.includes('sale')} onCheckedChange={(checked) => handleTagChange('sale', !!checked)} />
                <label htmlFor="tag-sale" className="ml-2 text-sm">Ofertas</label>
            </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
      {/* Desktop Filters */}
      <aside className="hidden md:block">
        <h2 className="mb-6 font-headline text-xl font-bold">Filtros</h2>
        <FilterControls />
      </aside>

      {/* Products Grid */}
      <main className="md:col-span-3">
        <div className="mb-6 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{filteredProducts.length} productos</p>
          
          {/* Mobile Filters Trigger */}
           <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" className="md:hidden">
                <Filter className="mr-2 h-4 w-4" /> Filtros
              </Button>
            </SheetTrigger>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>Filtros</SheetTitle>
              </SheetHeader>
              <div className="py-4"><FilterControls /></div>
            </SheetContent>
          </Sheet>

          <Select value={sort} onValueChange={setSort}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Ordenar por" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="relevance">Relevancia</SelectItem>
              <SelectItem value="price-asc">Precio: Bajo a Alto</SelectItem>
              <SelectItem value="price-desc">Precio: Alto a Bajo</SelectItem>
              <SelectItem value="newest">Novedades</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <ProductGrid products={filteredProducts} />
      </main>
    </div>
  );
}
