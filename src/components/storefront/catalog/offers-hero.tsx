import Link from "next/link";
import type { Category } from "@/lib/types";
import { cn } from "@/lib/utils";

type OffersHeroProduct = {
  id: string;
  name?: string;
  price?: number;
  salePrice?: number;
  categoryId?: string;
  categoryIds?: string[];
};

type OffersHeroProps = {
  products: OffersHeroProduct[];
  categories: Category[];
  currentDiscount?: number;
};

type OfferGroup = {
  id: string;
  name: string;
  href: string;
  image?: string;
  productCount: number;
};

function normalizeValue(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

function getStringProperty(
  record: Record<string, unknown>,
  keys: string[],
): string | undefined {
  for (const key of keys) {
    const value = record[key];

    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return undefined;
}

function getNumberProperty(
  record: Record<string, unknown>,
  keys: string[],
): number {
  for (const key of keys) {
    const value = record[key];

    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === "string") {
      const parsed = Number(value);

      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }

  return 0;
}

function getStringArrayProperty(
  record: Record<string, unknown>,
  keys: string[],
): string[] {
  for (const key of keys) {
    const value = record[key];

    if (Array.isArray(value)) {
      return value
        .map((item) => (typeof item === "string" ? item.trim() : ""))
        .filter(Boolean);
    }

    if (typeof value === "string" && value.trim()) {
      return [value.trim()];
    }
  }

  return [];
}

function getProductRecord(product: OffersHeroProduct) {
  return product as unknown as Record<string, unknown>;
}

function getProductName(product: OffersHeroProduct) {
  const record = getProductRecord(product);

  return (
    getStringProperty(record, [
      "name",
      "nombre",
      "title",
      "titulo",
      "productName",
      "nombreProducto",
    ]) ?? "Producto"
  );
}

function getProductImage(product: OffersHeroProduct): string | undefined {
  const record = getProductRecord(product);

  const directImage = getStringProperty(record, [
    "image",
    "imageUrl",
    "imagen",
    "imagenUrl",
    "thumbnail",
    "thumbnailUrl",
    "coverImage",
    "fotoUrl",
    "mainImage",
  ]);

  if (directImage) {
    return directImage;
  }

  const possibleArrays = [
    record.images,
    record.imagenes,
    record.gallery,
    record.media,
  ];

  for (const value of possibleArrays) {
    if (!Array.isArray(value)) {
      continue;
    }

    for (const item of value) {
      if (typeof item === "string" && item.trim()) {
        return item.trim();
      }

      if (item && typeof item === "object") {
        const imageFromObject = getStringProperty(
          item as Record<string, unknown>,
          ["url", "src", "imageUrl", "imagenUrl"],
        );

        if (imageFromObject) {
          return imageFromObject;
        }
      }
    }
  }

  return undefined;
}

function getProductCategoryValues(product: OffersHeroProduct): string[] {
  const record = getProductRecord(product);

  const values = [
    ...getStringArrayProperty(record, [
      "categoryIds",
      "categoriaIds",
      "categories",
      "categorias",
    ]),
  ];

  const singleValues = [
    "categoryId",
    "categoriaId",
    "category",
    "categoria",
    "categoryName",
    "categoriaNombre",
    "categorySlug",
    "categoriaSlug",
  ];

  singleValues.forEach((key) => {
    const value = getStringProperty(record, [key]);

    if (value) {
      values.push(value);
    }
  });

  return values.filter(Boolean);
}

function getCategorySlug(category: Category) {
  const record = category as unknown as Record<string, unknown>;

  return (
    getStringProperty(record, ["slug", "key", "codigo"]) ??
    category.id
  );
}

function getProductDiscountPercent(product: OffersHeroProduct) {
  const record = getProductRecord(product);

  const explicitDiscount = getNumberProperty(record, [
    "discountPercent",
    "descuentoPorcentaje",
    "porcentajeDescuento",
    "valorDescuento",
    "ofertaValorDescuento",
  ]);

  if (explicitDiscount > 0) {
    return Math.round(explicitDiscount);
  }

  const originalPrice = getNumberProperty(record, [
    "precioOriginal",
    "originalPrice",
    "compareAtPrice",
    "priceBeforeDiscount",
    "precioPublico",
    "price",
  ]);

  const finalPrice = getNumberProperty(record, [
    "precioFinal",
    "salePrice",
    "precioOferta",
    "finalPrice",
    "discountedPrice",
  ]);

  if (originalPrice > 0 && finalPrice > 0 && finalPrice < originalPrice) {
    return Math.round(((originalPrice - finalPrice) / originalPrice) * 100);
  }

  return 0;
}

function findCategoryForProduct(
  product: OffersHeroProduct,
  categories: Category[],
) {
  const productCategoryValues = getProductCategoryValues(product).map(
    normalizeValue,
  );

  return categories.find((category) => {
    const categoryRecord = category as unknown as Record<string, unknown>;

    const possibleValues = [
      category.id,
      category.name,
      getCategorySlug(category),
      getStringProperty(categoryRecord, ["codigo", "key"]),
    ]
      .filter(Boolean)
      .map((value) => normalizeValue(String(value)));

    return possibleValues.some((value) =>
      productCategoryValues.includes(value),
    );
  });
}

export function OffersHero({
  products,
  categories,
  currentDiscount,
}: OffersHeroProps) {
  const offerProducts = products.filter(
    (product) => getProductDiscountPercent(product) > 0,
  );

  const discountOptions = Array.from(
    new Set(
      offerProducts
        .map((product) => getProductDiscountPercent(product))
        .filter((discount) => discount > 0),
    ),
  ).sort((a, b) => b - a);

  const groupsMap = new Map<string, OfferGroup>();

  offerProducts.forEach((product) => {
    const category = findCategoryForProduct(product, categories);
    const image = getProductImage(product);
    const productName = getProductName(product);

    const fallbackCategoryName =
      getStringProperty(getProductRecord(product), [
        "categoryName",
        "categoriaNombre",
        "category",
        "categoria",
      ]) ?? productName;

    const groupId = category?.id ?? fallbackCategoryName;
    const groupName = category?.name ?? fallbackCategoryName;
    const groupSlug = category ? getCategorySlug(category) : groupId;

    const currentGroup = groupsMap.get(groupId);

    if (currentGroup) {
      groupsMap.set(groupId, {
        ...currentGroup,
        image: currentGroup.image ?? image,
        productCount: currentGroup.productCount + 1,
      });

      return;
    }

    groupsMap.set(groupId, {
      id: groupId,
      name: groupName,
      href: category
        ? `/products?sort=ofertas_populares&category=${encodeURIComponent(groupSlug)}`
        : `/products?sort=ofertas_populares&q=${encodeURIComponent(productName)}`,
      image,
      productCount: 1,
    });
  });

  const offerGroups = Array.from(groupsMap.values()).slice(0, 6);

  if (offerGroups.length === 0) {
    return null;
  }

  return (
    <section className="mb-8 border border-black/10 bg-white px-5 py-6 md:px-8">
      <div className="mx-auto max-w-4xl text-center">
        <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.35em] text-emerald-900/70">
          Promociones activas
        </p>

        <h1 className="font-headline text-2xl font-bold uppercase tracking-[0.24em] text-emerald-900 md:text-3xl">
          Rebajas Club León
        </h1>

        <div className="mt-6 flex flex-wrap justify-center gap-x-7 gap-y-5">
          {offerGroups.map((group) => (
            <Link
              key={group.id}
              href={group.href}
              className="group flex w-[90px] flex-col items-center gap-2"
            >
              <div className="flex h-20 w-20 items-center justify-center overflow-hidden bg-neutral-50">
                {group.image ? (
                  <img
                    src={group.image}
                    alt={group.name}
                    className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  <span className="text-sm font-bold uppercase tracking-[0.2em] text-emerald-900">
                    {group.name.slice(0, 2)}
                  </span>
                )}
              </div>

              <span className="max-w-full truncate text-[10px] font-bold uppercase tracking-[0.12em] text-emerald-900 underline-offset-4 group-hover:underline">
                {group.name}
              </span>

              <span className="text-[8px] font-bold uppercase tracking-[0.16em] text-black/45">
                {group.productCount}{" "}
                {group.productCount === 1 ? "producto" : "productos"}
              </span>
            </Link>
          ))}
        </div>

        {discountOptions.length > 0 && (
          <div className="mx-auto mt-6 grid max-w-3xl grid-cols-2 gap-2 md:grid-cols-5">
            {discountOptions.map((discount) => {
              const isActive = currentDiscount === discount;

              return (
                <Link
                  key={discount}
                  href={`/products?sort=ofertas_populares&discount=${discount}`}
                  className={cn(
                    "border px-4 py-2 text-center text-sm font-bold tracking-[0.14em] transition",
                    isActive
                      ? "border-emerald-900 bg-emerald-900 text-white"
                      : "border-emerald-900 bg-white text-emerald-900 hover:bg-emerald-900 hover:text-white",
                  )}
                >
                  {discount}%
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}