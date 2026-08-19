"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ExternalLink, Loader2, X } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { getApiErrorMessage } from "@/lib/api/errors";
import { formatPosMoney, posApi } from "@/lib/pos/client";
import {
  describeCashDifference,
  mapCutOperationalLabel,
  mapCutReconciliationLabel,
  type PosContext,
  type PosCutSummary,
  type PosRegister,
} from "@/lib/pos/types";
import {
  AdminInlineAlert,
  AdminPageHeader,
  AdminPageShell,
} from "@/components/admin/admin-ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

function hasCutReadAll(context: PosContext | null) {
  return Boolean(context?.actor.capabilities.includes("cut.read_all"));
}

export function PosCutsHistory() {
  const { token } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [context, setContext] = useState<PosContext | null>(null);
  const [registers, setRegisters] = useState<PosRegister[]>([]);
  const [items, setItems] = useState<PosCutSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [tableLoading, setTableLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filters = useMemo(
    () => ({
      operationalDate: searchParams.get("operationalDate") ?? "",
      registerId: searchParams.get("registerId") ?? "",
      cashierUid: searchParams.get("cashierUid") ?? "",
      status: searchParams.get("status") ?? "",
      classification: searchParams.get("classification") ?? "",
      folio: searchParams.get("folio") ?? "",
      cursor: searchParams.get("cursor") ?? "",
      quick: searchParams.get("quick") ?? "",
    }),
    [searchParams],
  );

  const updateParams = useCallback(
    (patch: Record<string, string | null>) => {
      const next = new URLSearchParams(searchParams.toString());
      Object.entries(patch).forEach(([key, value]) => {
        if (!value) next.delete(key);
        else next.set(key, value);
      });
      if (!("cursor" in patch)) next.delete("cursor");
      router.replace(`/admin/cortes?${next.toString()}`);
    },
    [router, searchParams],
  );

  const load = useCallback(async () => {
    if (!token) return;
    setError(null);
    setTableLoading(true);
    try {
      const [ctx, regs] = await Promise.all([
        context
          ? Promise.resolve(context)
          : posApi.context(token).then((value) => {
              setContext(value);
              return value;
            }),
        registers.length
          ? Promise.resolve({ items: registers })
          : posApi.registers(token).then((page) => {
              setRegisters(page.items);
              return page;
            }),
      ]);
      void regs;

      if (!hasCutReadAll(ctx)) {
        setError("No tienes permiso para consultar el historial de cortes.");
        setItems([]);
        return;
      }

      const params = new URLSearchParams({ limit: "25" });
      if (filters.operationalDate) {
        params.set("operationalDate", filters.operationalDate);
      }
      if (filters.registerId) params.set("registerId", filters.registerId);
      if (filters.cashierUid) params.set("cashierUid", filters.cashierUid);
      if (filters.status) params.set("status", filters.status);
      if (filters.classification) {
        params.set("classification", filters.classification);
      }
      if (filters.cursor) params.set("cursor", filters.cursor);

      const page = await posApi.listCuts(params.toString(), token);
      let nextItems = page.items;
      if (filters.folio.trim()) {
        const folio = filters.folio.trim().toLowerCase();
        nextItems = nextItems.filter((cut) =>
          cut.folio.toLowerCase().includes(folio),
        );
      }
      if (filters.quick === "difference") {
        nextItems = nextItems.filter(
          (cut) => cut.totals && cut.totals.differenceMinor !== 0,
        );
      }
      if (filters.quick === "closed") {
        nextItems = nextItems.filter(
          (cut) => cut.status === "APPROVED" || cut.status === "CLOSED",
        );
      }
      if (filters.quick === "counting") {
        nextItems = nextItems.filter((cut) => cut.status === "COUNTING");
      }
      setItems(nextItems);
      setNextCursor(page.pagination.nextCursor);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
      setTableLoading(false);
    }
  }, [token, filters, context, registers]);

  useEffect(() => {
    void load();
  }, [load]);

  const selected = items.find((cut) => cut.id === selectedId) ?? null;
  const currency = context?.settings.currency ?? "MXN";

  const stats = useMemo(() => {
    const closed = items.filter(
      (cut) => cut.status === "APPROVED" || cut.status === "CLOSED",
    );
    const counting = items.filter((cut) => cut.status === "COUNTING");
    const withDiff = items.filter(
      (cut) => cut.totals && cut.totals.differenceMinor !== 0,
    );
    const diffSum = withDiff.reduce(
      (total, cut) => total + (cut.totals?.differenceMinor ?? 0),
      0,
    );
    return {
      counting: counting.length,
      closed: closed.length,
      withDiff: withDiff.length,
      diffSum,
    };
  }, [items]);

  const activeChips = useMemo(() => {
    const chips: Array<{ key: string; label: string }> = [];
    if (filters.operationalDate) {
      chips.push({
        key: "operationalDate",
        label: `Fecha ${filters.operationalDate}`,
      });
    }
    if (filters.registerId) {
      const register = registers.find((item) => item.id === filters.registerId);
      chips.push({
        key: "registerId",
        label: `Caja ${register?.code ?? filters.registerId}`,
      });
    }
    if (filters.cashierUid) {
      chips.push({ key: "cashierUid", label: `Cajero ${filters.cashierUid}` });
    }
    if (filters.status) {
      chips.push({ key: "status", label: `Estado ${filters.status}` });
    }
    if (filters.classification) {
      chips.push({
        key: "classification",
        label: `Clasificación ${filters.classification}`,
      });
    }
    if (filters.folio) {
      chips.push({ key: "folio", label: `Folio ${filters.folio}` });
    }
    if (filters.quick) {
      chips.push({ key: "quick", label: `Filtro ${filters.quick}` });
    }
    return chips;
  }, [filters, registers]);

  if (loading) {
    return (
      <AdminPageShell>
        <AdminPageHeader title="Cortes de caja" />
        <div className="grid gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-20 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-96 rounded-2xl" />
      </AdminPageShell>
    );
  }

  return (
    <AdminPageShell className="max-w-[1400px]">
      <AdminPageHeader
        title="Cortes de caja"
        description="Historial y supervisión de cortes de todas las cajas autorizadas."
      />

      {error ? (
        <AdminInlineAlert variant="error">{error}</AdminInlineAlert>
      ) : null}

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <QuickStat
          label="En conteo"
          value={String(stats.counting)}
          active={filters.quick === "counting"}
          onClick={() =>
            updateParams({
              quick: filters.quick === "counting" ? null : "counting",
            })
          }
        />
        <QuickStat
          label="Cerrados (página)"
          value={String(stats.closed)}
          active={filters.quick === "closed"}
          onClick={() =>
            updateParams({
              quick: filters.quick === "closed" ? null : "closed",
            })
          }
        />
        <QuickStat
          label="Con diferencia"
          value={String(stats.withDiff)}
          active={filters.quick === "difference"}
          onClick={() =>
            updateParams({
              quick: filters.quick === "difference" ? null : "difference",
            })
          }
        />
        <QuickStat
          label="Dif. acumulada"
          value={formatPosMoney(stats.diffSum, currency)}
          active={false}
        />
      </section>

      <section className="space-y-3 rounded-2xl border bg-card p-4">
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1.5">
            <Label htmlFor="cut-date">Fecha operativa</Label>
            <Input
              id="cut-date"
              type="date"
              value={filters.operationalDate}
              onChange={(event) =>
                updateParams({ operationalDate: event.target.value || null })
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label>Caja</Label>
            <Select
              value={filters.registerId || "all"}
              onValueChange={(value) =>
                updateParams({ registerId: value === "all" ? null : value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {registers.map((register) => (
                  <SelectItem key={register.id} value={register.id}>
                    {register.code} · {register.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cut-cashier">Cajero (UID)</Label>
            <Input
              id="cut-cashier"
              value={filters.cashierUid}
              onChange={(event) =>
                updateParams({ cashierUid: event.target.value || null })
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cut-folio">Folio</Label>
            <Input
              id="cut-folio"
              value={filters.folio}
              onChange={(event) =>
                updateParams({ folio: event.target.value || null })
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label>Estado de cierre</Label>
            <Select
              value={filters.status || "all"}
              onValueChange={(value) =>
                updateParams({ status: value === "all" ? null : value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="COUNTING">En conteo</SelectItem>
                <SelectItem value="APPROVED">Cerrado</SelectItem>
                <SelectItem value="CLOSED">Cerrado (día)</SelectItem>
                <SelectItem value="REJECTED">Rechazado</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Clasificación</Label>
            <Select
              value={filters.classification || "all"}
              onValueChange={(value) =>
                updateParams({
                  classification: value === "all" ? null : value,
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="BALANCED">Cuadrado</SelectItem>
                <SelectItem value="SHORTAGE">Faltante</SelectItem>
                <SelectItem value="OVERAGE">Sobrante</SelectItem>
                <SelectItem value="CRITICAL_DIFFERENCE">Crítica</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {activeChips.length ? (
          <div className="flex flex-wrap items-center gap-2">
            {activeChips.map((chip) => (
              <button
                key={chip.key}
                type="button"
                className="inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs"
                onClick={() => updateParams({ [chip.key]: null })}
              >
                {chip.label}
                <X className="size-3" />
              </button>
            ))}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                router.replace("/admin/cortes");
                toast({ title: "Filtros restablecidos" });
              }}
            >
              Limpiar filtros
            </Button>
          </div>
        ) : null}
      </section>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="relative overflow-hidden rounded-2xl border bg-card">
          {tableLoading ? (
            <div className="absolute inset-x-0 top-0 z-10 flex justify-center bg-background/70 py-2">
              <Loader2 className="size-4 animate-spin" aria-label="Cargando" />
            </div>
          ) : null}

          <div className="hidden md:block">
            <table className="w-full text-left text-sm">
              <thead className="border-b bg-muted/40 text-xs uppercase tracking-wide text-text-muted">
                <tr>
                  <th className="px-3 py-3">Folio</th>
                  <th className="px-3 py-3">Fecha</th>
                  <th className="px-3 py-3">Caja</th>
                  <th className="px-3 py-3">Cajero</th>
                  <th className="px-3 py-3 text-right">Venta</th>
                  <th className="px-3 py-3 text-right">Dif.</th>
                  <th className="px-3 py-3">Estado</th>
                  <th className="px-3 py-3">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {items.map((cut) => {
                  const selectedRow = selectedId === cut.id;
                  const expanded = expandedId === cut.id;
                  return (
                    <FragmentRow
                      key={cut.id}
                      cut={cut}
                      currency={currency}
                      selected={selectedRow}
                      expanded={expanded}
                      onSelect={() => {
                        setSelectedId(cut.id);
                        if (
                          typeof window !== "undefined" &&
                          window.innerWidth < 1280
                        ) {
                          router.push(`/admin/cortes/${cut.id}`);
                        }
                      }}
                      onToggleExpand={() =>
                        setExpandedId(expanded ? null : cut.id)
                      }
                    />
                  );
                })}
                {!items.length ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-3 py-10 text-center text-text-secondary"
                    >
                      No hay cortes con estos filtros.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          <div className="space-y-3 p-3 md:hidden">
            {items.map((cut) => (
              <article
                key={cut.id}
                className="rounded-xl border p-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">{cut.folio}</p>
                    <p className="text-xs text-text-secondary">
                      {cut.registerCode} · {cut.cashierUid ?? "—"}
                    </p>
                    <p className="text-xs text-text-muted">
                      {cut.operationalDate}
                    </p>
                  </div>
                  <Badge variant="outline">
                    {mapCutOperationalLabel(cut.status)}
                  </Badge>
                </div>
                <div className="mt-3 flex items-center justify-between text-sm">
                  <span>
                    {cut.totals
                      ? formatPosMoney(cut.totals.netSalesMinor ?? 0, currency)
                      : "—"}
                  </span>
                  <span>
                    {cut.totals
                      ? describeCashDifference(cut.totals.differenceMinor)
                      : "—"}
                  </span>
                </div>
                <Button asChild size="sm" className="mt-3 w-full" variant="outline">
                  <Link href={`/admin/cortes/${cut.id}`}>Ver detalle</Link>
                </Button>
              </article>
            ))}
          </div>

          <div className="flex items-center justify-between border-t px-3 py-2">
            <p className="text-xs text-text-muted">
              {items.length} corte(s) en esta página
            </p>
            <Button
              size="sm"
              variant="outline"
              disabled={!nextCursor || tableLoading}
              onClick={() => updateParams({ cursor: nextCursor })}
            >
              Siguiente
            </Button>
          </div>
        </div>

        <aside className="hidden rounded-2xl border bg-card p-4 xl:block">
          <h2 className="font-medium">Vista previa</h2>
          {!selected ? (
            <p className="mt-3 text-sm text-text-secondary">
              Selecciona un corte para ver un resumen breve.
            </p>
          ) : (
            <div className="mt-3 space-y-2 text-sm">
              <p>
                <span className="text-text-secondary">Folio:</span>{" "}
                {selected.folio}
              </p>
              <p>
                <span className="text-text-secondary">Caja:</span>{" "}
                {selected.registerCode}
              </p>
              <p>
                <span className="text-text-secondary">Estado:</span>{" "}
                {mapCutOperationalLabel(selected.status)}
              </p>
              <p>
                <span className="text-text-secondary">Conciliación:</span>{" "}
                {mapCutReconciliationLabel(
                  selected.status,
                  selected.classification,
                  selected.totals?.differenceMinor,
                )}
              </p>
              <p>
                <span className="text-text-secondary">Esperado:</span>{" "}
                {selected.totals
                  ? formatPosMoney(selected.totals.expectedCashMinor, currency)
                  : "—"}
              </p>
              <p>
                <span className="text-text-secondary">Contado:</span>{" "}
                {selected.totals
                  ? formatPosMoney(selected.totals.countedCashMinor, currency)
                  : "—"}
              </p>
              <p>
                <span className="text-text-secondary">Diferencia:</span>{" "}
                {selected.totals
                  ? describeCashDifference(selected.totals.differenceMinor)
                  : "—"}
              </p>
              <Button asChild className="mt-4 w-full">
                <Link href={`/admin/cortes/${selected.id}`}>
                  Ver detalle <ExternalLink className="size-4" />
                </Link>
              </Button>
            </div>
          )}
        </aside>
      </div>
    </AdminPageShell>
  );
}

function QuickStat({
  label,
  value,
  active,
  onClick,
}: {
  label: string;
  value: string;
  active: boolean;
  onClick?: () => void;
}) {
  const className = cn(
    "rounded-2xl border bg-card px-4 py-3 text-left",
    active && "border-foreground",
    onClick && "transition-colors hover:bg-muted/40",
  );
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={className}>
        <p className="text-xs uppercase tracking-wide text-text-muted">{label}</p>
        <p className="mt-1 text-lg font-semibold">{value}</p>
      </button>
    );
  }
  return (
    <div className={className}>
      <p className="text-xs uppercase tracking-wide text-text-muted">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </div>
  );
}

function FragmentRow({
  cut,
  currency,
  selected,
  expanded,
  onSelect,
  onToggleExpand,
}: {
  cut: PosCutSummary;
  currency: string;
  selected: boolean;
  expanded: boolean;
  onSelect: () => void;
  onToggleExpand: () => void;
}) {
  return (
    <>
      <tr
        className={cn(
          "cursor-pointer border-b hover:bg-muted/30",
          selected && "bg-muted/40",
        )}
        onClick={onSelect}
      >
        <td className="px-3 py-3 font-medium">{cut.folio}</td>
        <td className="px-3 py-3">{cut.operationalDate}</td>
        <td className="px-3 py-3">{cut.registerCode}</td>
        <td className="px-3 py-3">{cut.cashierUid ?? "—"}</td>
        <td className="px-3 py-3 text-right">
          {cut.totals
            ? formatPosMoney(cut.totals.netSalesMinor ?? 0, currency)
            : "—"}
        </td>
        <td className="px-3 py-3 text-right">
          {cut.totals
            ? describeCashDifference(cut.totals.differenceMinor)
            : "—"}
        </td>
        <td className="px-3 py-3">
          <Badge variant="outline">{mapCutOperationalLabel(cut.status)}</Badge>
        </td>
        <td className="px-3 py-3">
          <div className="flex gap-2" onClick={(event) => event.stopPropagation()}>
            <Button asChild size="sm" variant="outline">
              <Link href={`/admin/cortes/${cut.id}`}>Ver detalle</Link>
            </Button>
            <Button size="sm" variant="ghost" onClick={onToggleExpand}>
              {expanded ? "Ocultar" : "Más"}
            </Button>
          </div>
        </td>
      </tr>
      {expanded ? (
        <tr className="border-b bg-muted/20 text-xs text-text-secondary">
          <td colSpan={8} className="px-4 py-3">
            Fondo / esperado / contado:{" "}
            {cut.totals
              ? `${formatPosMoney(cut.totals.expectedCashMinor, currency)} / ${formatPosMoney(cut.totals.countedCashMinor, currency)}`
              : "—"}
            {" · "}
            Clasificación: {cut.classification ?? "—"}
            {" · "}
            Conciliación:{" "}
            {mapCutReconciliationLabel(
              cut.status,
              cut.classification,
              cut.totals?.differenceMinor,
            )}
          </td>
        </tr>
      ) : null}
    </>
  );
}
