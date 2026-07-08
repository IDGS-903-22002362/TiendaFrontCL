import Image from "next/image";
import Link from "next/link";
import { Package } from "lucide-react";
import { formatCurrency } from "@/lib/storefront";
import type { OrdenItem } from "@/lib/types";

const TIMES_SEPARATOR = "\u00d7";
const DOT_SEPARATOR = "\u00b7";

type OrderItemsListProps = {
  items: OrdenItem[];
  linkProducts?: boolean;
  showPersonalization?: boolean;
};

function getItemName(item: OrdenItem) {
  return (
    item.producto?.descripcion ||
    item.producto?.clave ||
    item.productoId
  );
}

function OrderItemRow({
  item,
  index,
  linkProducts,
  showPersonalization,
}: {
  item: OrdenItem;
  index: number;
  linkProducts: boolean;
  showPersonalization: boolean;
}) {
  const image = item.producto?.imagenes?.[0];
  const name = getItemName(item);
  const rowKey = `${item.productoId}-${item.tallaId ?? ""}-${index}`;

  const content = (
    <>
      <div
        className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-[0.9rem] border border-border bg-card transition ${linkProducts ? "group-hover:border-primary/35" : ""}`}
      >
        {image ? (
          <Image
            src={image}
            alt=""
            fill
            className={`object-cover transition duration-300 ${linkProducts ? "group-hover:scale-105" : ""}`}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
            <Package className="h-6 w-6" />
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p
          className={`line-clamp-2 text-sm font-medium text-foreground ${linkProducts ? "transition group-hover:text-primary" : ""}`}
        >
          {name}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {item.cantidad} {TIMES_SEPARATOR} {formatCurrency(item.precioUnitario)}
          {item.tallaId ? ` ${DOT_SEPARATOR} Talla ${item.tallaId}` : ""}
        </p>
        {showPersonalization && item.personalizacion ? (
          <p className="mt-1 text-xs text-primary">
            Personalizado: {item.personalizacion.nombre}{" "}
            {item.personalizacion.numero}
            {item.personalizationFee
              ? ` (+${formatCurrency(item.personalizationFee)})`
              : ""}
          </p>
        ) : null}
      </div>
      <p className="text-sm font-medium text-foreground">
        {formatCurrency(item.subtotal)}
      </p>
    </>
  );

  const rowClassName = `flex gap-3 rounded-[1.1rem] border border-border bg-muted/40 p-3 ${linkProducts ? "group transition-colors hover:border-primary/30 hover:bg-muted/60" : ""}`;

  if (linkProducts) {
    return (
      <Link key={rowKey} href={`/products/${item.productoId}`} className={rowClassName}>
        {content}
      </Link>
    );
  }

  return (
    <div key={rowKey} className={rowClassName}>
      {content}
    </div>
  );
}

export function OrderItemsList({
  items,
  linkProducts = false,
  showPersonalization = false,
}: OrderItemsListProps) {
  if (items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">Sin productos disponibles.</p>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item, index) => (
        <OrderItemRow
          key={`${item.productoId}-${item.tallaId ?? ""}-${index}`}
          item={item}
          index={index}
          linkProducts={linkProducts}
          showPersonalization={showPersonalization}
        />
      ))}
    </div>
  );
}

export function OrderItemsListSkeleton() {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Cargando productos">
      {[0, 1].map((index) => (
        <div
          key={index}
          className="flex animate-pulse gap-3 rounded-[1.1rem] border border-border bg-muted/40 p-3"
        >
          <div className="h-16 w-16 shrink-0 rounded-[0.9rem] bg-muted" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="h-4 w-3/4 rounded bg-muted" />
            <div className="h-3 w-1/2 rounded bg-muted" />
          </div>
          <div className="h-4 w-16 rounded bg-muted" />
        </div>
      ))}
    </div>
  );
}