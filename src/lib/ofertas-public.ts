const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "";

export type ProductOfferPricing = {
  productoId: string;
  precioOriginal: number;
  precioFinal: number;
  subtotalOriginal?: number;
  subtotalFinal?: number;
  ahorroTotal?: number;
  ofertaAplicadaId?: string | null;
  ofertaTitulo?: string | null;
};

type CalcularOfertaItem = {
  productoId: string;
  cantidad: number;
};

export async function calcularPreciosOfertasPublicas(
  items: CalcularOfertaItem[],
): Promise<Record<string, ProductOfferPricing>> {
  if (!items.length) return {};

  try {
    const response = await fetch(`${API_BASE_URL}/api/ofertas/calcular-precios`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "omit",
      body: JSON.stringify({
        items,
      }),
    });

    if (!response.ok) {
      console.warn("No se pudieron calcular las ofertas públicas", response.status);
      return {};
    }

    const data = await response.json();

    const lista: ProductOfferPricing[] =
      data?.data?.items ||
      data?.data?.productos ||
      data?.data?.resultados ||
      data?.items ||
      data?.productos ||
      data?.resultados ||
      [];

    return lista.reduce<Record<string, ProductOfferPricing>>((acc, item) => {
      if (item.productoId) {
        acc[item.productoId] = item;
      }

      return acc;
    }, {});
  } catch (error) {
    console.warn("Error calculando ofertas públicas", error);
    return {};
  }
}