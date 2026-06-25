export type MovementPrefillParams = {
  productoId: string;
  tallaId: string;
};

export function buildMovementsPrefillHref(
  productoId: string,
  tallaId?: string,
): string {
  const params = new URLSearchParams({ producto: productoId });
  if (tallaId) {
    params.set("talla", tallaId);
  }
  return `/admin/inventario/movimientos?${params.toString()}`;
}

export function readMovementPrefillFromSearchParams(
  searchParams: Pick<URLSearchParams, "get">,
): MovementPrefillParams {
  return {
    productoId: searchParams.get("producto")?.trim() ?? "",
    tallaId: searchParams.get("talla")?.trim() ?? "",
  };
}

type StockNotificationLike = {
  id: string;
  type: string;
  href: string;
};

export function resolveStockNotificationHref(item: StockNotificationLike): string {
  if (item.type !== "stock_low") {
    return item.href;
  }

  try {
    const parsed = new URL(item.href, "https://tiendalaguarida.com");
    const producto = parsed.searchParams.get("producto")?.trim();
    if (producto) {
      const talla = parsed.searchParams.get("talla")?.trim();
      return buildMovementsPrefillHref(producto, talla || undefined);
    }
  } catch {
    // ignore malformed href
  }

  const parts = item.id.split(":");
  if (parts[0] === "stock_low" && parts[1]) {
    const tallaId = parts[2] === "talla" && parts[3] ? parts[3] : undefined;
    return buildMovementsPrefillHref(parts[1], tallaId);
  }

  return item.href;
}