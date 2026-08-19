"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  CalendarDays,
  ChevronRight,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { getApiErrorMessage } from "@/lib/api/errors";
import { formatPosMoney, posApi } from "@/lib/pos/client";
import type {
  PosCapability,
  PosContext,
  PosCutSummary,
  PosRegister,
  PosSale,
  PosShiftReportRow,
} from "@/lib/pos/types";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AdminInlineAlert } from "@/components/admin/admin-ui";

type PosAdminOversightProps = {
  token: string;
  context: PosContext;
  registers: PosRegister[];
};

function hasCapability(context: PosContext, capability: PosCapability) {
  return context.actor.capabilities.includes(capability);
}

function statusLabel(status: PosRegister["status"]) {
  switch (status) {
    case "OPEN":
      return "Abierta";
    case "AVAILABLE":
      return "Disponible";
    case "BLOCKED":
      return "Bloqueada";
    case "MAINTENANCE":
      return "Mantenimiento";
    default:
      return status;
  }
}

function statusDot(status: PosRegister["status"]) {
  switch (status) {
    case "OPEN":
      return "bg-emerald-500";
    case "AVAILABLE":
      return "bg-sky-500";
    case "BLOCKED":
      return "bg-destructive";
    case "MAINTENANCE":
      return "bg-amber-500";
    default:
      return "bg-muted-foreground";
  }
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("es-MX", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

export function canShowPosAdminOversight(context: PosContext) {
  return (
    hasCapability(context, "report.read_all") ||
    hasCapability(context, "register.read_all") ||
    hasCapability(context, "cut.read_all") ||
    hasCapability(context, "shift.read_all")
  );
}

export function PosAdminOversight({
  token,
  context,
  registers,
}: PosAdminOversightProps) {
  const currency = context.settings.currency;
  const [date, setDate] = useState(context.operationalDate);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [shifts, setShifts] = useState<PosShiftReportRow[]>([]);
  const [sales, setSales] = useState<PosSale[]>([]);
  const [cuts, setCuts] = useState<PosCutSummary[]>([]);

  const activeRegisters = useMemo(
    () => registers.filter((item) => item.status !== "ARCHIVED"),
    [registers],
  );

  const selected = activeRegisters.find((item) => item.id === selectedId) ?? null;

  const loadDetail = useCallback(
    async (registerId: string, operationalDate: string) => {
      setLoading(true);
      setError("");
      try {
        const tasks: Array<Promise<void>> = [];

        if (
          hasCapability(context, "report.read_all") ||
          hasCapability(context, "report.read_own")
        ) {
          tasks.push(
            posApi
              .shiftsReport(
                { from: operationalDate, to: operationalDate, registerId },
                token,
              )
              .then((report) => setShifts(report.rows)),
          );
        } else {
          setShifts([]);
        }

        if (
          hasCapability(context, "shift.read_all") ||
          hasCapability(context, "report.read_all")
        ) {
          const params = new URLSearchParams({
            operationalDate,
            registerId,
            limit: "50",
          });
          tasks.push(
            posApi.listSales(params.toString(), token).then((page) => {
              setSales(page.items);
            }),
          );
        } else {
          setSales([]);
        }

        if (
          hasCapability(context, "cut.read_all") ||
          hasCapability(context, "cut.read_own")
        ) {
          const params = new URLSearchParams({
            operationalDate,
            registerId,
            limit: "50",
          });
          tasks.push(
            posApi.listCuts(params.toString(), token).then((page) => {
              setCuts(page.items);
            }),
          );
        } else {
          setCuts([]);
        }

        const results = await Promise.allSettled(tasks);
        const firstError = results.find(
          (result): result is PromiseRejectedResult =>
            result.status === "rejected",
        );
        if (firstError) {
          setError(getApiErrorMessage(firstError.reason));
        }
      } catch (loadError) {
        setError(getApiErrorMessage(loadError));
      } finally {
        setLoading(false);
      }
    },
    [context, token],
  );

  useEffect(() => {
    if (!selectedId) {
      setShifts([]);
      setSales([]);
      setCuts([]);
      setError("");
      return;
    }
    void loadDetail(selectedId, date);
  }, [selectedId, date, loadDetail]);

  const summary = useMemo(() => {
    const salesCount = shifts.reduce((total, row) => total + row.salesCount, 0);
    const netSalesMinor = shifts.reduce(
      (total, row) => total + row.netSalesMinor,
      0,
    );
    const cashSalesMinor = shifts.reduce(
      (total, row) => total + row.cashSalesMinor,
      0,
    );
    return {
      shiftCount: shifts.length,
      salesCount,
      netSalesMinor,
      cashSalesMinor,
    };
  }, [shifts]);

  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-headline text-xl font-semibold">Cajas</h2>
          <p className="mt-0.5 text-sm text-text-secondary">
            Elige una caja para ver turnos, ventas y cortes.
          </p>
        </div>
        <div className="flex items-end gap-2">
          <div className="space-y-1">
            <Label htmlFor="pos-oversight-date" className="text-xs">
              Fecha
            </Label>
            <div className="relative">
              <CalendarDays className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-text-muted" />
              <Input
                id="pos-oversight-date"
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
                className="h-9 w-40 pl-8"
              />
            </div>
          </div>
          {selected ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9"
              disabled={loading}
              onClick={() => void loadDetail(selected.id, date)}
            >
              {loading ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <RefreshCw className="size-3.5" />
              )}
              Actualizar
            </Button>
          ) : null}
        </div>
      </div>

      {!selected ? (
        activeRegisters.length === 0 ? (
          <EmptyState text="No hay cajas configuradas." />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {activeRegisters.map((register) => (
              <button
                key={register.id}
                type="button"
                onClick={() => setSelectedId(register.id)}
                className="group flex items-center gap-3 rounded-2xl border border-border/80 bg-card p-4 text-left shadow-[var(--shadow-card)] transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-[var(--shadow-elevated)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span
                  className={cn(
                    "size-2.5 shrink-0 rounded-full",
                    statusDot(register.status),
                  )}
                  aria-hidden
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{register.code}</p>
                  <p className="truncate text-sm text-text-secondary">
                    {register.name}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Badge variant="outline" className="font-normal">
                    {statusLabel(register.status)}
                  </Badge>
                  <ChevronRight className="size-4 text-text-muted opacity-50 transition-opacity group-hover:opacity-100" />
                </div>
              </button>
            ))}
          </div>
        )
      ) : (
        <div className="rounded-3xl border border-border/80 bg-card shadow-[var(--shadow-card)]">
          <div className="flex flex-col gap-3 border-b border-border/70 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 px-2"
                onClick={() => setSelectedId(null)}
              >
                <ArrowLeft className="size-4" />
                Cajas
              </Button>
              <div className="h-5 w-px bg-border" aria-hidden />
              <div className="flex items-center gap-2">
                <span
                  className={cn("size-2 rounded-full", statusDot(selected.status))}
                  aria-hidden
                />
                <div>
                  <p className="font-medium">
                    {selected.code} · {selected.name}
                  </p>
                  <p className="text-xs text-text-muted">
                    {statusLabel(selected.status)}
                    {selected.activeSessionId ? " · sesión abierta" : " · sin sesión"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {error ? (
            <div className="px-5 pt-4">
              <AdminInlineAlert>
                <span className="block font-medium">No se pudo cargar el detalle</span>
                <span className="mt-1 block">{error}</span>
              </AdminInlineAlert>
            </div>
          ) : null}

          {selected.blockedReason ? (
            <p className="border-b border-border/70 px-5 py-3 text-sm text-destructive">
              {selected.blockedReason}
            </p>
          ) : null}

          <div className="grid gap-3 border-b border-border/70 p-5 sm:grid-cols-4">
            {loading ? (
              Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-16 rounded-xl" />
              ))
            ) : (
              <>
                <MiniStat label="Turnos" value={String(summary.shiftCount)} />
                <MiniStat label="Ventas" value={String(summary.salesCount)} />
                <MiniStat
                  label="Neto"
                  value={formatPosMoney(summary.netSalesMinor, currency)}
                />
                <MiniStat
                  label="Efectivo"
                  value={formatPosMoney(summary.cashSalesMinor, currency)}
                />
              </>
            )}
          </div>

          <div className="p-5">
            <Tabs defaultValue="shifts">
              <TabsList className="mb-4">
                <TabsTrigger value="shifts">Turnos</TabsTrigger>
                <TabsTrigger value="sales">Ventas</TabsTrigger>
                <TabsTrigger value="cuts">Cortes</TabsTrigger>
              </TabsList>

              <TabsContent value="shifts" className="mt-0">
                <DetailTable
                  loading={loading}
                  empty="Sin turnos en esta fecha."
                  headers={["Estado", "Inicio", "Ventas", "Neto", "Corte", "Dif."]}
                  rows={shifts.map((row) => [
                    row.status,
                    formatDateTime(row.startedAt),
                    String(row.salesCount),
                    formatPosMoney(row.netSalesMinor, currency),
                    row.cutFolio ?? row.cutStatus ?? "—",
                    row.differenceMinor == null
                      ? "—"
                      : formatPosMoney(row.differenceMinor, currency),
                  ])}
                />
              </TabsContent>

              <TabsContent value="sales" className="mt-0">
                <DetailTable
                  loading={loading}
                  empty="Sin ventas en esta fecha."
                  headers={["Folio", "Estado", "Líneas", "Total", "Actualizado"]}
                  rows={sales.map((sale) => [
                    sale.folio,
                    sale.status,
                    String(sale.items.length),
                    formatPosMoney(sale.totals.totalMinor, currency),
                    formatDateTime(sale.updatedAt),
                  ])}
                />
              </TabsContent>

              <TabsContent value="cuts" className="mt-0">
                <div className="mb-3">
                  <Link
                    href="/admin/cortes"
                    className="text-sm font-medium text-foreground underline-offset-4 hover:underline"
                  >
                    Abrir historial completo de cortes
                  </Link>
                </div>
                <DetailTable
                  loading={loading}
                  empty="Sin cortes en esta fecha."
                  headers={[
                    "Folio",
                    "Estado",
                    "Clasificación",
                    "Esperado",
                    "Contado",
                    "Dif.",
                  ]}
                  rows={cuts.map((cut) => [
                    cut.folio,
                    cut.status,
                    cut.classification ?? "—",
                    cut.totals
                      ? formatPosMoney(cut.totals.expectedCashMinor, currency)
                      : "—",
                    cut.totals
                      ? formatPosMoney(cut.totals.countedCashMinor, currency)
                      : "—",
                    cut.totals
                      ? formatPosMoney(cut.totals.differenceMinor, currency)
                      : "—",
                  ])}
                />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      )}
    </section>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-muted/40 px-3 py-2.5">
      <p className="text-[11px] uppercase tracking-wide text-text-muted">{label}</p>
      <p className="mt-0.5 admin-tabular text-base font-semibold">{value}</p>
    </div>
  );
}

function DetailTable({
  loading,
  empty,
  headers,
  rows,
}: {
  loading: boolean;
  empty: string;
  headers: string[];
  rows: string[][];
}) {
  if (loading) return <Skeleton className="h-36 rounded-2xl" />;
  if (rows.length === 0) return <EmptyState text={empty} />;

  return (
    <div className="overflow-x-auto rounded-2xl border border-border/70">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-muted/40 text-xs text-text-muted">
          <tr>
            {headers.map((header) => (
              <th key={header} className="px-3 py-2 font-medium">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={`${row[0]}-${index}`} className="border-t border-border/60">
              {row.map((cell, cellIndex) => (
                <td
                  key={`${headers[cellIndex]}-${cellIndex}`}
                  className={cn(
                    "px-3 py-2.5",
                    cellIndex === 0 ? "font-medium" : "text-text-secondary",
                    cellIndex >= 3 ? "admin-tabular" : null,
                  )}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border/70 px-4 py-12 text-center text-sm text-text-secondary">
      {text}
    </div>
  );
}
