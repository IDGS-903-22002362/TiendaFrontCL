"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { useToast } from "@/hooks/use-toast";
import { ordersApi } from "@/lib/api/orders";
import { getApiErrorMessage } from "@/lib/api/errors";
import type { Orden } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  getOrderStatusLabel,
  getOrderStatusVariant,
  getPaymentStateLabel,
  getPaymentStateVariant,
  getPickupStatusLabel,
  getShippingStatusLabel,
} from "@/lib/orders/status";

const CLIENT_ORDERS_PER_PAGE = 6;

function getDeliveryStatusLabel(order: Orden) {
  if (order.fulfillmentMethod === "PICKUP") {
    return getPickupStatusLabel(order.fulfillmentStatus);
  }
  return getShippingStatusLabel(order.shipping?.status);
}

function formatDate(value?: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleDateString("es-MX", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function getVisiblePages(currentPage: number, totalPages: number) {
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const start = Math.max(1, Math.min(currentPage - 2, totalPages - 4));
  return Array.from({ length: 5 }, (_, index) => start + index);
}

export default function OrderHistoryPage() {
  const [orders, setOrders] = useState<Orden[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const { toast } = useToast();

  const loadOrders = useCallback(async () => {
    setIsLoading(true);
    try {
      const list = await ordersApi.list();
      setOrders(list);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "No se pudieron cargar tus pedidos",
        description: getApiErrorMessage(error),
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  const sortedOrders = useMemo(
    () =>
      [...orders].sort((a, b) => {
        const first = new Date(a.createdAt ?? 0).getTime();
        const second = new Date(b.createdAt ?? 0).getTime();
        return second - first;
      }),
    [orders],
  );

  const totalPages = Math.max(
    1,
    Math.ceil(sortedOrders.length / CLIENT_ORDERS_PER_PAGE),
  );
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pageStart = (safeCurrentPage - 1) * CLIENT_ORDERS_PER_PAGE;
  const paginatedOrders = sortedOrders.slice(
    pageStart,
    pageStart + CLIENT_ORDERS_PER_PAGE,
  );
  const visiblePages = getVisiblePages(safeCurrentPage, totalPages);
  const showingFrom = sortedOrders.length === 0 ? 0 : pageStart + 1;
  const showingTo = Math.min(
    pageStart + CLIENT_ORDERS_PER_PAGE,
    sortedOrders.length,
  );

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const goToPage = (page: number) => {
    setCurrentPage(Math.min(Math.max(1, page), totalPages));
  };

  return (
    <div className="container py-5 md:py-8">
      <div className="mb-6 rounded-[26px] border border-border bg-card/90 p-5 shadow-[var(--shadow-card)] md:mb-8 md:rounded-[30px] md:p-6">
        <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-secondary">
          Historial
        </p>
        <h1 className="mt-2 font-headline text-3xl font-bold md:text-4xl">Mis Pedidos</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Historial de Pedidos</CardTitle>
          <CardDescription>
            Aquí puedes ver el historial de tus compras.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3 md:hidden">
            {isLoading ? (
              <div className="rounded-[22px] border border-border bg-muted/35 p-4 text-sm text-text-secondary">
                Cargando pedidos...
              </div>
            ) : sortedOrders.length === 0 ? (
              <div className="rounded-[22px] border border-border bg-muted/35 p-4 text-sm text-text-secondary">
                Aún no tienes pedidos.
              </div>
            ) : (
              paginatedOrders.map((order) => (
                <article
                  key={order.id}
                  className="rounded-[22px] border border-border bg-muted/30 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-text-muted">
                        Pedido
                      </p>
                      <p className="mt-1 truncate font-medium">{order.id}</p>
                    </div>
                    <Badge variant={getOrderStatusVariant(order.estado)}>
                      {getOrderStatusLabel(order.estado)}
                    </Badge>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Badge variant={getPaymentStateVariant(order)}>
                      {getPaymentStateLabel(order)}
                    </Badge>
                    <Badge variant="outline">
                      {order.fulfillmentMethod === "PICKUP"
                        ? "Recoger en tienda"
                        : "Envío a domicilio"}
                    </Badge>
                  </div>
                  <div className="mt-4 flex items-end justify-between gap-3">
                    <div>
                      <p className="text-xs text-text-secondary">
                        {formatDate(order.createdAt)}
                      </p>
                      <p className="mt-1 text-xs text-text-secondary">
                        {getDeliveryStatusLabel(order)}
                      </p>
                    </div>
                    <p className="font-headline text-lg font-bold text-secondary">
                      ${order.total.toFixed(2)}
                    </p>
                  </div>
                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                    className="mt-3 w-full"
                  >
                    <Link href={`/order-history/${order.id}`}>Ver detalle</Link>
                  </Button>
                </article>
              ))
            )}
          </div>

          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pedido</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Entrega</TableHead>
                  <TableHead>Pago</TableHead>
                  <TableHead>Estado envío/recolección</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7}>Cargando pedidos...</TableCell>
                  </TableRow>
                ) : sortedOrders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-text-secondary">Aún no tienes pedidos.</TableCell>
                  </TableRow>
                ) : (
                  paginatedOrders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">{order.id}</TableCell>
                      <TableCell>{formatDate(order.createdAt)}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            order.fulfillmentMethod === "PICKUP"
                              ? "secondary"
                              : "outline"
                          }
                        >
                          {order.fulfillmentMethod === "PICKUP"
                            ? "Recoger en tienda"
                            : "Envío a domicilio"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getPaymentStateVariant(order)}>
                          {getPaymentStateLabel(order)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-text-secondary">
                        {getDeliveryStatusLabel(order)}
                      </TableCell>
                      <TableCell className="text-right font-headline text-secondary">
                        ${order.total.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button asChild variant="outline" size="sm">
                          <Link href={`/order-history/${order.id}`}>
                            Ver detalle
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {!isLoading && sortedOrders.length > 0 ? (
            <div className="flex flex-col gap-3 rounded-[1.4rem] border border-border bg-muted/30 px-4 py-3 md:flex-row md:items-center md:justify-between">
              <p className="text-xs text-muted-foreground">
                Mostrando{" "}
                <span className="font-semibold text-foreground">
                  {showingFrom}-{showingTo}
                </span>{" "}
                de{" "}
                <span className="font-semibold text-foreground">
                  {sortedOrders.length}
                </span>{" "}
                pedidos
              </p>

              <Pagination className="mx-0 w-full justify-start md:w-auto md:justify-end">
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      href="#"
                      aria-disabled={safeCurrentPage === 1}
                      className={
                        safeCurrentPage === 1
                          ? "pointer-events-none opacity-45"
                          : undefined
                      }
                      onClick={(event) => {
                        event.preventDefault();
                        goToPage(safeCurrentPage - 1);
                      }}
                    />
                  </PaginationItem>

                  {visiblePages.map((page) => (
                    <PaginationItem key={page} className="hidden sm:block">
                      <PaginationLink
                        href="#"
                        isActive={page === safeCurrentPage}
                        onClick={(event) => {
                          event.preventDefault();
                          goToPage(page);
                        }}
                      >
                        {page}
                      </PaginationLink>
                    </PaginationItem>
                  ))}

                  <PaginationItem>
                    <PaginationNext
                      href="#"
                      aria-disabled={safeCurrentPage === totalPages}
                      className={
                        safeCurrentPage === totalPages
                          ? "pointer-events-none opacity-45"
                          : undefined
                      }
                      onClick={(event) => {
                        event.preventDefault();
                        goToPage(safeCurrentPage + 1);
                      }}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
