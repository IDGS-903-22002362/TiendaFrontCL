import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  Crown,
  Footprints,
  PackageOpen,
  Shirt,
  ShoppingBag,
  Ticket,
  Trophy,
  Volleyball,
} from "lucide-react";

import type { Category } from "@/lib/types";

type CategoryMarqueeProps = {
  categories: Category[];
};

type CategoryPresentation = {
  description: string;
  Icon: LucideIcon;
};

const normalizeCategoryValue = (value: string) =>
  value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();

function getCategoryPresentation(category: Category): CategoryPresentation {
  const normalized = normalizeCategoryValue(
    `${category.name} ${category.slug}`,
  );

  if (normalized.includes("chamarra")) {
    return {
      Icon: Shirt,
      description: "Capas ligeras para viaje, entrenamiento y clima fresco.",
    };
  }

  if (normalized.includes("jersey") || normalized.includes("playera")) {
    return {
      Icon: Shirt,
      description: "Uniformes y prendas oficiales para cada partido.",
    };
  }

  if (normalized.includes("pantalon") || normalized.includes("short")) {
    return {
      Icon: Shirt,
      description: "Movimiento ligero para entrenamiento y uso diario.",
    };
  }

  if (normalized.includes("accesorio")) {
    return {
      Icon: ShoppingBag,
      description: "Detalles oficiales para completar tu look esmeralda.",
    };
  }

  if (normalized.includes("balon")) {
    return {
      Icon: Volleyball,
      description: "Balones para partido, entrenamiento y coleccion.",
    };
  }

  if (normalized.includes("calceta")) {
    return {
      Icon: Footprints,
      description: "Comodidad y soporte para cancha y tribuna.",
    };
  }

  if (normalized.includes("gorra")) {
    return {
      Icon: Crown,
      description: "Proteccion y estilo con sello del club.",
    };
  }

  if (normalized.includes("coleccionable")) {
    return {
      Icon: Trophy,
      description: "Piezas especiales para aficionados y vitrinas.",
    };
  }

  if (normalized.includes("boleto")) {
    return {
      Icon: Ticket,
      description: "Accesos y experiencias para vivir el estadio.",
    };
  }

  return {
    Icon: PackageOpen,
    description: "Explora la seleccion oficial del club.",
  };
}

function splitRows(categories: Category[]) {
  const topRow = categories.filter((_, index) => index % 2 === 0);
  const bottomRow = categories.filter((_, index) => index % 2 !== 0);

  return {
    topRow: topRow.length > 0 ? topRow : categories,
    bottomRow: bottomRow.length > 0 ? bottomRow : topRow,
  };
}

function CategoryCard({
  category,
  inert = false,
}: {
  category: Category;
  inert?: boolean;
}) {
  const { Icon, description } = getCategoryPresentation(category);
  const content = (
    <div
      className={`flex h-[11.25rem] w-full flex-col rounded-[26px] border border-border bg-card/92 p-5 text-left text-card-foreground shadow-[var(--shadow-card)] transition-all duration-300 md:h-[11.75rem] md:p-6 ${
        inert
          ? ""
          : "group-hover:-translate-y-1 group-hover:border-primary/35 group-hover:bg-muted"
      }`}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-primary/15 bg-primary/10 text-primary">
        <Icon className="h-6 w-6" />
      </div>
      <div className="mt-5 flex flex-1 flex-col">
        <p className="font-headline text-xl font-semibold tracking-tight">
          {category.name}
        </p>
        <p className="mt-2 overflow-hidden text-sm leading-6 text-text-secondary [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]">
          {description}
        </p>
      </div>
    </div>
  );

  if (inert) {
    return (
      <div
        aria-hidden="true"
        className="pointer-events-none h-[11.25rem] w-[17.5rem] flex-none select-none opacity-90 md:h-[11.75rem] md:w-[19rem]"
      >
        {content}
      </div>
    );
  }

  return (
    <Link
      href={`/products?category=${category.slug}`}
      className="group block h-[11.25rem] w-[17.5rem] flex-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-4 focus-visible:ring-offset-background md:h-[11.75rem] md:w-[19rem]"
    >
      {content}
    </Link>
  );
}

function CategoryRow({
  categories,
  direction,
}: {
  categories: Category[];
  direction: "left" | "right";
}) {
  const animationClass =
    direction === "left" ? "category-marquee-left" : "category-marquee-right";

  return (
    <div className="category-marquee-row">
      <div className={`category-marquee-track ${animationClass}`}>
        <div className="category-marquee-group">
          {categories.map((category) => (
            <CategoryCard key={category.id} category={category} />
          ))}
        </div>
        <div className="category-marquee-group" aria-hidden="true">
          {categories.map((category) => (
            <CategoryCard
              key={`${category.id}-duplicate`}
              category={category}
              inert
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export function CategoryMarquee({ categories }: CategoryMarqueeProps) {
  if (categories.length === 0) {
    return null;
  }

  const { topRow, bottomRow } = splitRows(categories);

  return (
    <section className="container">
      <div className="mb-8 max-w-2xl">
        <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-secondary">
          Categorias
        </p>
        <h2 className="mt-2 font-headline text-3xl font-bold tracking-tight md:text-4xl">
          Nuestras Categorias
        </h2>
        <p className="mt-3 text-sm leading-6 text-text-secondary md:text-base">
          Todos lo que necesitas para tu equipo favorito.
        </p>
      </div>

      <div className="category-marquee category-marquee-mask rounded-[30px] border border-border/80 bg-[linear-gradient(180deg,rgba(20,20,20,0.96),rgba(10,10,10,0.96))] px-0 py-5 shadow-[var(--shadow-elevated)] md:rounded-[36px] md:py-6">
        <CategoryRow categories={topRow} direction="left" />
        <CategoryRow categories={bottomRow} direction="right" />
      </div>
    </section>
  );
}
