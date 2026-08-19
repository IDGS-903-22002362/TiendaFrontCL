"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, Printer } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { getApiErrorMessage } from "@/lib/api/errors";
import { formatPosMoney, posApi } from "@/lib/pos/client";
import {
  describeCashDifference,
  mapCutOperationalLabel,
  mapCutReconciliationLabel,
  type PosAuditEvent,
  type PosCutDetail,
} from "@/lib/pos/types";
import {
  AdminInlineAlert,
  AdminPageHeader,
  AdminPageShell,
} from "@/components/admin/admin-ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminCorteDetailPage() {
  const params = useParams<{ corteId: string }>();
  const corteId = params.corteId;
  const { token } = useAuth();
  const [cut, setCut] = useState<PosCutDetail | null>(null);
  const [audit, setAudit] = useState<PosAuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token || !corteId) return;
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const [{ cut: detail }, auditPage] = await Promise.all([
          posApi.getCut(corteId, token),
          posApi
            .listAuditEvents(
              `entityId=${encodeURIComponent(corteId)}&limit=50`,
              token,
            )
            .catch(() => ({ items: [] as PosAuditEvent[], pagination: { nextCursor: null, hasMore: false } })),
        ]);
        if (cancelled) return;
        setCut(detail);
        setAudit(auditPage.items);
      } catch (err) {
        if (!cancelled) setError(getApiErrorMessage(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, corteId]);

  if (loading) {
    return (
      <AdminPageShell>
        <Skeleton className="h-10 w-72" />
        <div className="grid gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-24 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-80 rounded-2xl" />
      </AdminPageShell>
    );
  }

  if (error || !cut) {
    return (
      <AdminPageShell>
        <AdminInlineAlert variant="error">
          {error ?? "Corte no encontrado."}
        </AdminInlineAlert>
        <Button asChild variant="outline">
          <Link href="/admin/cortes">Volver al historial</Link>
        </Button>
      </AdminPageShell>
    );
  }

  const totals = cut.totals;
  const currency = "MXN";

  return (
    <AdminPageShell>
      <AdminPageHeader
        title={`Corte ${cut.folio}`}
        description={`${cut.registerCode} · ${cut.operationalDate}`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href="/admin/cortes">
                <ArrowLeft className="size-4" /> Historial
              </Link>
            </Button>
            <Button asChild size="sm">
              <Link href={`/admin/cortes/${cut.id}/imprimir`}>
                <Printer className="size-4" /> Imprimir
              </Link>
            </Button>
          </div>
        }
      />

      <header className="flex flex-wrap items-center gap-2">
        <Badge variant="outline">{mapCutOperationalLabel(cut.status)}</Badge>
        <Badge variant="secondary">
          {mapCutReconciliationLabel(
            cut.status,
            cut.classification,
            totals?.differenceMinor,
          )}
        </Badge>
        <span className="text-sm text-text-secondary">
          Cajero {cut.cashierUid ?? "—"} · Cerrado por{" "}
          {cut.approverUid ?? "—"}
        </span>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <SummaryCard
          label="Venta total"
          value={totals ? formatPosMoney(totals.netSalesMinor, currency) : "—"}
        />
        <SummaryCard
          label="Efectivo esperado"
          value={
            totals ? formatPosMoney(totals.expectedCashMinor, currency) : "—"
          }
        />
        <SummaryCard
          label="Efectivo contado"
          value={
            totals ? formatPosMoney(totals.countedCashMinor, currency) : "—"
          }
        />
        <SummaryCard
          label="Diferencia"
          value={
            totals ? describeCashDifference(totals.differenceMinor) : "—"
          }
        />
        <SummaryCard
          label="Tickets"
          value={totals ? String(totals.salesCount) : "—"}
        />
        <SummaryCard
          label="Devoluciones"
          value={totals ? formatPosMoney(totals.refundsMinor, currency) : "—"}
        />
      </section>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-4">
          <Accordion type="multiple" className="rounded-2xl border bg-card px-4">
            <AccordionItem value="payments">
              <AccordionTrigger>Métodos de pago</AccordionTrigger>
              <AccordionContent>
                <ul className="space-y-2 text-sm">
                  {(totals?.paymentBreakdown ?? []).map((row) => (
                    <li
                      key={row.method}
                      className="flex justify-between border-b py-1"
                    >
                      <span>{row.method}</span>
                      <span>
                        {formatPosMoney(row.netMinor, currency)} ({row.count})
                      </span>
                    </li>
                  ))}
                  {!totals?.paymentBreakdown?.length ? (
                    <li className="text-text-secondary">Sin desglose.</li>
                  ) : null}
                </ul>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="cash">
              <AccordionTrigger>Movimientos de efectivo</AccordionTrigger>
              <AccordionContent>
                <dl className="space-y-1 text-sm">
                  <Row
                    label="Fondo inicial"
                    value={
                      totals
                        ? formatPosMoney(totals.openingFloatMinor, currency)
                        : "—"
                    }
                  />
                  <Row
                    label="Entradas"
                    value={
                      totals
                        ? formatPosMoney(totals.cashInMinor, currency)
                        : "—"
                    }
                  />
                  <Row
                    label="Salidas"
                    value={
                      totals
                        ? formatPosMoney(totals.cashOutMinor, currency)
                        : "—"
                    }
                  />
                  <Row
                    label="Retiros de seguridad"
                    value={
                      totals
                        ? formatPosMoney(totals.securityDropsMinor, currency)
                        : "—"
                    }
                  />
                </dl>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="notes">
              <AccordionTrigger>Observaciones</AccordionTrigger>
              <AccordionContent>
                <p className="text-sm whitespace-pre-wrap">
                  {cut.observations?.trim() || "Sin observaciones."}
                </p>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="audit">
              <AccordionTrigger>Historial de auditoría</AccordionTrigger>
              <AccordionContent>
                <ol className="space-y-3 text-sm">
                  {audit.map((event) => (
                    <li key={event.id} className="border-b pb-2">
                      <p className="font-medium">{event.eventType}</p>
                      <p className="text-xs text-text-secondary">
                        {event.actorUid} ·{" "}
                        {new Date(event.createdAt).toLocaleString("es-MX")}
                      </p>
                      {event.reason ? (
                        <p className="mt-1 text-text-secondary">{event.reason}</p>
                      ) : null}
                    </li>
                  ))}
                  {!audit.length ? (
                    <li className="text-text-secondary">
                      Sin eventos de auditoría visibles para este corte.
                    </li>
                  ) : null}
                </ol>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>

        <aside className="space-y-3 rounded-2xl border bg-card p-4 text-sm">
          <h2 className="font-medium">Datos del corte</h2>
          <Row label="Apertura" value={new Date(cut.startedAt).toLocaleString("es-MX")} />
          <Row
            label="Cierre"
            value={
              cut.endedAt
                ? new Date(cut.endedAt).toLocaleString("es-MX")
                : "—"
            }
          />
          <Row label="Sucursal / store" value={cut.storeId} />
          <Row label="Sesión" value={cut.sessionId} />
          <Row label="Turno" value={cut.shiftId ?? "—"} />
          <Row label="Tipo" value={cut.scope} />
          <Row label="Clasificación" value={cut.classification ?? "—"} />
        </aside>
      </div>
    </AdminPageShell>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border bg-card px-4 py-3">
      <p className="text-xs uppercase tracking-wide text-text-muted">{label}</p>
      <p className="mt-1 text-base font-semibold">{value}</p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-border/50 py-1.5">
      <dt className="text-text-secondary">{label}</dt>
      <dd className="text-right font-medium">{value}</dd>
    </div>
  );
}
