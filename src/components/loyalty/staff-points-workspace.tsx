"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  ChevronLeft,
  ChevronRight,
  History,
  Loader2,
  RefreshCw,
  ScanLine,
  Search,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getApiErrorMessage } from "@/lib/api/errors";
import {
  getAdminTransactions,
  type StaffAssignmentHistoryRow,
} from "@/lib/api/loyalty";
import {
  formatHistoryAmount,
  getHistoryCustomerLabel,
  getHistorySaleLabel,
} from "@/lib/loyalty/staff-history";
import { puedeAsignarPuntos } from "@/lib/types";

const PAGE_SIZE = 20;

export function StaffPointsWorkspace() {
  const { isAuthenticated, role, token, user } = useAuth();
  const [items, setItems] = useState<StaffAssignmentHistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [activeSearch, setActiveSearch] = useState("");
  const [pageIndex, setPageIndex] = useState(0);
  const [pageCursors, setPageCursors] = useState<Array<string | undefined>>([
    undefined,
  ]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [searchWindowLimited, setSearchWindowLimited] = useState(false);

  const fetchPage = useCallback(
    async (cursor?: string, search = "") => {
      if (!isAuthenticated || !puedeAsignarPuntos(role)) {
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const response = await getAdminTransactions({
          limit: PAGE_SIZE,
          cursor,
          search,
          token,
          actorId: role === "EMPLEADO" ? user?.uid : undefined,
        });
        setItems(response.items);
        setNextCursor(response.nextCursor);
        setSearchWindowLimited(response.searchWindowLimited);
      } catch (requestError) {
        setItems([]);
        setNextCursor(null);
        setSearchWindowLimited(false);
        setError(getApiErrorMessage(requestError));
      } finally {
        setLoading(false);
      }
    },
    [isAuthenticated, role, token, user?.uid],
  );

  useEffect(() => {
    setPageIndex(0);
    setPageCursors([undefined]);
    setActiveSearch("");
    setSearchInput("");
    void fetchPage(undefined, "");
  }, [fetchPage]);

  if (!puedeAsignarPuntos(role)) {
    return (
      <p className="p-8 text-center text-destructive">
        No tienes permisos para asignar puntos.
      </p>
    );
  }

  const submitSearch = (event: FormEvent) => {
    event.preventDefault();
    const normalized = searchInput.trim();
    setActiveSearch(normalized);
    setPageIndex(0);
    setPageCursors([undefined]);
    void fetchPage(undefined, normalized);
  };

  const clearSearch = () => {
    setSearchInput("");
    setActiveSearch("");
    setPageIndex(0);
    setPageCursors([undefined]);
    void fetchPage(undefined, "");
  };

  const goNext = () => {
    if (!nextCursor || loading) return;
    const nextPage = pageIndex + 1;
    setPageCursors((current) => [
      ...current.slice(0, nextPage),
      nextCursor,
    ]);
    setPageIndex(nextPage);
    void fetchPage(nextCursor, activeSearch);
  };

  const goPrevious = () => {
    if (pageIndex === 0 || loading) return;
    const previousPage = pageIndex - 1;
    setPageIndex(previousPage);
    void fetchPage(pageCursors[previousPage], activeSearch);
  };

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 p-4 md:p-8">
      <Card className="overflow-hidden border-[#c8d8cf]">
        <div className="bg-[#073b2a] p-6 text-white">
          <div className="flex items-start gap-4">
            <div className="rounded-full bg-white/12 p-3">
              <ScanLine className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Asignación por QR</h1>
              <p className="mt-1 max-w-2xl text-sm text-white/75">
                El lector está activo en todas las pantallas de personal. Escanea
                el QR del cliente; nunca captures su identificador manualmente.
              </p>
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader className="gap-5">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
            <div>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" /> Historial de asignaciones
              </CardTitle>
              <CardDescription>
                Consulta ventas por nombre, folio o ID del cliente.
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                void fetchPage(pageCursors[pageIndex], activeSearch)
              }
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Actualizar
            </Button>
          </div>

          <form
            className="flex flex-col gap-2 sm:flex-row"
            onSubmit={submitSearch}
            role="search"
          >
            <div className="relative min-w-0 flex-1">
              <Label htmlFor="staff-history-search" className="sr-only">
                Buscar historial
              </Label>
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="staff-history-search"
                className="pl-9"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                maxLength={80}
                placeholder="Nombre, folio o ID del cliente"
              />
            </div>
            <Button type="submit" disabled={loading}>
              Buscar
            </Button>
            {activeSearch ? (
              <Button type="button" variant="ghost" onClick={clearSearch}>
                Limpiar
              </Button>
            ) : null}
          </form>
        </CardHeader>

        <CardContent className="space-y-4">
          {error ? (
            <div
              className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive"
              role="alert"
            >
              <p>{error}</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() =>
                  void fetchPage(pageCursors[pageIndex], activeSearch)
                }
              >
                Reintentar
              </Button>
            </div>
          ) : loading ? (
            <div className="flex justify-center py-12" role="status">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="sr-only">Cargando historial</span>
            </div>
          ) : items.length === 0 ? (
            <div className="py-12 text-center">
              <p className="font-medium">
                {activeSearch
                  ? "No encontramos asignaciones en este bloque."
                  : "Aún no hay asignaciones para mostrar."}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {activeSearch && nextCursor
                  ? "Continúa a la siguiente página para buscar en registros más antiguos."
                  : "Prueba con otro nombre, folio o ID."}
              </p>
            </div>
          ) : (
            <div className="divide-y rounded-xl border border-[#d8e2dc]">
              {items.map((item) => {
                const customer = getHistoryCustomerLabel(item);
                return (
                  <article
                    key={item.transactionId}
                    className="grid gap-4 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
                  >
                    <div className="min-w-0 space-y-1">
                      <h3 className="truncate font-semibold text-[#10261d]">
                        {customer.primary}
                      </h3>
                      <p className="truncate text-xs text-muted-foreground">
                        {customer.secondary}
                      </p>
                      <p className="text-sm">
                        <span className="text-muted-foreground">Folio: </span>
                        <span className="font-mono font-medium">
                          {getHistorySaleLabel(item)}
                        </span>
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-x-5 gap-y-1 border-t pt-3 text-left sm:block sm:border-0 sm:pt-0 sm:text-right">
                      <p className="font-bold text-[#087443]">
                        +{item.points} puntos
                      </p>
                      <p className="text-sm font-medium text-[#173d2d] sm:mt-1">
                        {formatHistoryAmount(item.amountMxn)}
                      </p>
                      <p className="col-span-2 text-xs text-muted-foreground sm:mt-1">
                        {format(new Date(item.createdAt), "d MMM yyyy, HH:mm", {
                          locale: es,
                        })}
                      </p>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          {searchWindowLimited ? (
            <p className="text-xs text-muted-foreground" role="status">
              La búsqueda revisa hasta 500 asignaciones por página para mantener
              una respuesta rápida. Continúa para consultar registros anteriores.
            </p>
          ) : null}

          {!error && !loading ? (
            <nav
              className="flex items-center justify-between border-t pt-4"
              aria-label="Paginación del historial"
            >
              <Button
                variant="outline"
                size="sm"
                onClick={goPrevious}
                disabled={pageIndex === 0}
              >
                <ChevronLeft className="mr-1 h-4 w-4" /> Anterior
              </Button>
              <span className="text-sm text-muted-foreground">
                Página {pageIndex + 1}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={goNext}
                disabled={!nextCursor}
              >
                Siguiente <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </nav>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
