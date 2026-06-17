"use client";

import { use, useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ExternalLink, Package } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { ordersApi } from "@/lib/api/orders";
import { getApiErrorMessage } from "@/lib/api/errors";
import { formatCurrency } from "@/lib/storefront";
import { OrderTimeline } from "@/components/orders/order-timeline";
import {
  getOrderStatusLabel,
  getOrderStatusVariant,
  getPaymentStateLabel,
  getPaymentStateVariant,
  getPickupStatusLabel,
  getPreparationStatusLabel,
  getShippingStatusLabel,
} from "@/lib/orders/status";
import type { Orden } from "@/lib/types";

function formatDate(value?: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("es-MX", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium text-foreground">{value}</span>
    </div>
  );
}

export default function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { toast } = useToast();
  const [order, setOrder] = useState<Orden | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const loadOrder = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await ordersApi.getById(id);
      if (!data || !data.id) {
        setNotFound(true);
        return;
      }
      setOrder(data);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "No se pudo cargar el pedido",
        description: getApiErrorMessage(error),
      });
      setNotFound(true);
    } finally {
      setIsLoading(false);
    }
  }, [id, toast]);

  useEffect(() => {
    void loadOrder();
  }, [loadOrder]);

  if (isLoading) {
    return (
      <div className="container py-8">
        <div className="rounded-[22px] border border-border bg-muted/35 p-6 text-sm text-muted-foreground">
          Cargando detalle del pedido...
        </div>
      </div>
    );
  }

  if (notFound || !order) {
    return (
      <div className="container py-8">
        <div className="rounded-[22px] border border-border bg-muted/35 p-6 text-center text-sm text-muted-foreground">
          <p>No encontramos este pedido.</p>
          <Button asChild variant="outline" className="mt-4">
            <Link href="/order-history">Volver a mis pedidos</Link>
          </Button>
        </div>
      </div>
    );
  }

  const isPickup = order.fulfillmentMethod === "PICKUP";
  const shipping = order.shipping;
  const trackingUrl = shipping?.trackingUrl;
  const trackingNumber = shipping?.trackingNumber || order.numeroGuia;
  const discountOferta =
    typeof order.subtotalOriginal === "number" && order.subtotalOriginal > 0
      ? Math.max(0, order.subtotalOriginal - (order.subtotal ?? 0))
      : 0;
  const discountCodigo = order.descuentoCodigoPromocion ?? 0;

  return (
    <div className="container py-5 md:py-8">
      <Button asChild variant="ghost" size="sm" className="mb-4 -ml-2">
        <Link href="/order-history">
          <ArrowLeft className="mr-1 h-4 w-4" /> Volver a mis pedidos
        </Link>
      </Button>

      <div className="mb-6 rounded-[26px] border border-border bg-card/90 p-5 shadow-[var(--shadow-card)] md:p-6">
        <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-secondary">
          Pedido
        </p>
        <h1 className="mt-2 break-all font-headline text-2xl font-bold md:text-3xl">
          {order.id}
        </h1>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Badge variant={getOrderStatusVariant(order.estado)}>
            {getOrderStatusLabel(order.estado)}
          </Badge>
          <Badge variant={getPaymentStateVariant(order)}>
            {getPaymentStateLabel(order)}
          </Badge>
          <Badge variant="outline">
            {isPickup ? "Recoger en tienda" : "Envío a domicilio"}
          </Badge>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <div className="space-y-6">
          {/* Resumen general */}
          <Card>
            <CardHeader>
              <CardTitle>Resumen</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <SummaryRow label="Fecha de compra" value={formatDate(order.createdAt)} />
              <SummaryRow
                label="Método de entrega"
                value={isPickup ? "Recoger en tienda" : "Envío a domicilio"}
              />
              <SummaryRow label="Estado de pago" value={getPaymentStateLabel(order)} />
              <SummaryRow
                label="Estado de preparación"
                value={getPreparationStatusLabel(order)}
              />
              <SummaryRow label="Estado final" value={getOrderStatusLabel(order.estado)} />
            </CardContent>
          </Card>

          {/* Productos */}
          <Card>
            <CardHeader>
              <CardTitle>Productos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {(order.items ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Sin productos disponibles.
                </p>
              ) : (
                (order.items ?? []).map((item, index) => {
                  const image = item.producto?.imagenes?.[0];
                  const name =
                    item.producto?.descripcion ||
                    item.producto?.clave ||
                    item.productoId;
                  return (
                    <div
                      key={`${item.productoId}-${item.tallaId ?? ""}-${index}`}
                      className="flex gap-3 rounded-[1.1rem] border border-border bg-muted/40 p-3"
                    >
                      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-[0.9rem] border border-border bg-card">
                        {image ? (
                          <Image
                            src={image}
                            alt={name}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                            <Package className="h-6 w-6" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-2 text-sm font-medium text-foreground">
                          {name}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {item.cantidad} × {formatCurrency(item.precioUnitario)}
                          {item.tallaId ? ` · Talla ${item.tallaId}` : ""}
                        </p>
                      </div>
                      <p className="text-sm font-medium text-foreground">
                        {formatCurrency(item.subtotal)}
                      </p>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>

          {/* Totales */}
          <Card>
            <CardHeader>
              <CardTitle>Totales</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <SummaryRow
                label="Subtotal"
                value={formatCurrency(order.subtotal ?? 0)}
              />
              {discountOferta > 0 ? (
                <SummaryRow
                  label="Descuento por oferta"
                  value={`- ${formatCurrency(discountOferta)}`}
                />
              ) : null}
              {discountCodigo > 0 ? (
                <SummaryRow
                  label={`Descuento por código${order.codigoPromocion ? ` (${order.codigoPromocion})` : ""}`}
                  value={`- ${formatCurrency(discountCodigo)}`}
                />
              ) : null}
              <SummaryRow
                label="Envío"
                value={
                  isPickup
                    ? "Gratis"
                    : formatCurrency(order.shippingCost ?? 0)
                }
              />
              <Separator className="my-2" />
              <div className="flex items-center justify-between">
                <span className="font-semibold">Total</span>
                <span className="font-headline text-xl font-bold text-secondary">
                  {formatCurrency(order.total)}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {/* Domicilio */}
          {!isPickup ? (
            <Card>
              <CardHeader>
                <CardTitle>Envío a domicilio</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {order.direccionEnvio ? (
                  <div className="rounded-[1rem] border border-border bg-muted/40 p-3">
                    <p className="font-medium text-foreground">
                      {order.direccionEnvio.nombre ||
                        order.direccionEnvio.nombreCompleto}
                    </p>
                    <p className="mt-1 text-muted-foreground">
                      {[
                        order.direccionEnvio.calle,
                        order.direccionEnvio.numero,
                        order.direccionEnvio.numeroInterior
                          ? `Int. ${order.direccionEnvio.numeroInterior}`
                          : "",
                        order.direccionEnvio.colonia,
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    </p>
                    <p className="text-muted-foreground">
                      {[
                        order.direccionEnvio.ciudad,
                        order.direccionEnvio.estado,
                        order.direccionEnvio.codigoPostal,
                      ]
                        .filter(Boolean)
                        .join(", ")}
                    </p>
                    {order.direccionEnvio.telefono ? (
                      <p className="mt-1 text-muted-foreground">
                        Tel: {order.direccionEnvio.telefono}
                      </p>
                    ) : null}
                    {order.direccionEnvio.referencias ? (
                      <p className="mt-1 text-muted-foreground">
                        Referencias: {order.direccionEnvio.referencias}
                      </p>
                    ) : null}
                  </div>
                ) : (
                  <p className="text-muted-foreground">
                    Dirección no disponible.
                  </p>
                )}

                <SummaryRow
                  label="Estado del envío"
                  value={getShippingStatusLabel(shipping?.status)}
                />

                {trackingNumber ? (
                  <SummaryRow label="Número de guía" value={trackingNumber} />
                ) : (
                  <p className="rounded-[0.9rem] border border-dashed border-border px-3 py-2 text-xs text-muted-foreground">
                    Guía pendiente. Tu pedido está siendo preparado. Recibirás tu
                    guía cuando sea entregado a paquetería.
                  </p>
                )}

                {trackingUrl ? (
                  <Button asChild variant="outline" size="sm" className="w-full">
                    <a href={trackingUrl} target="_blank" rel="noreferrer">
                      Rastrear pedido
                      <ExternalLink className="ml-1 h-3.5 w-3.5" />
                    </a>
                  </Button>
                ) : null}

                {shipping?.shippedAt ? (
                  <SummaryRow
                    label="Fecha de envío"
                    value={formatDate(shipping.shippedAt)}
                  />
                ) : null}
                {order.deliveredAt ? (
                  <SummaryRow
                    label="Fecha de entrega"
                    value={formatDate(order.deliveredAt)}
                  />
                ) : null}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Recoger en tienda</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {order.pickupLocation ? (
                  <div className="rounded-[1rem] border border-border bg-muted/40 p-3">
                    <p className="font-medium text-foreground">
                      {order.pickupLocation.name}
                    </p>
                    <p className="mt-1 text-muted-foreground">
                      {[
                        order.pickupLocation.address,
                        order.pickupLocation.city,
                        order.pickupLocation.state,
                        order.pickupLocation.postalCode,
                      ]
                        .filter(Boolean)
                        .join(", ")}
                    </p>
                  </div>
                ) : null}

                <SummaryRow
                  label="Estado de pickup"
                  value={getPickupStatusLabel(order.fulfillmentStatus)}
                />

                {order.pickupCodeLast4 ? (
                  <SummaryRow
                    label="Código de recolección"
                    value={`•••• ${order.pickupCodeLast4}`}
                  />
                ) : null}

                {order.pickupInstructions ? (
                  <p className="rounded-[0.9rem] border border-border px-3 py-2 text-xs text-muted-foreground">
                    {order.pickupInstructions}
                  </p>
                ) : null}

                {order.readyForPickupAt ? (
                  <SummaryRow
                    label="Listo desde"
                    value={formatDate(order.readyForPickupAt)}
                  />
                ) : null}
                {order.pickedUpAt ? (
                  <SummaryRow
                    label="Recogido el"
                    value={formatDate(order.pickedUpAt)}
                  />
                ) : null}
              </CardContent>
            </Card>
          )}

          {/* Timeline */}
          <Card>
            <CardHeader>
              <CardTitle>Seguimiento</CardTitle>
            </CardHeader>
            <CardContent>
              <OrderTimeline order={order} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
