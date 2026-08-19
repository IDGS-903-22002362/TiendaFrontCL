"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { getApiErrorMessage } from "@/lib/api/errors";
import { formatPosMoney, posApi } from "@/lib/pos/client";
import {
  describeCashDifference,
  mapCutOperationalLabel,
  type PosCutDetail,
} from "@/lib/pos/types";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminCortePrintPage() {
  const params = useParams<{ corteId: string }>();
  const { token } = useAuth();
  const [cut, setCut] = useState<PosCutDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token || !params.corteId) return;
    void (async () => {
      try {
        const { cut: detail } = await posApi.getCut(params.corteId, token);
        setCut(detail);
      } catch (err) {
        setError(getApiErrorMessage(err));
      } finally {
        setLoading(false);
      }
    })();
  }, [token, params.corteId]);

  useEffect(() => {
    if (!cut) return;
    const timer = window.setTimeout(() => window.print(), 400);
    return () => window.clearTimeout(timer);
  }, [cut]);

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl space-y-3 p-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error || !cut) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 p-6">
        <p className="text-destructive">{error ?? "Corte no encontrado."}</p>
        <Button asChild variant="outline">
          <Link href="/admin/cortes">Volver</Link>
        </Button>
      </div>
    );
  }

  const totals = cut.totals;
  const currency = "MXN";
  const generatedAt = new Date().toLocaleString("es-MX");

  return (
    <div className="mx-auto max-w-2xl bg-white p-6 text-black print:max-w-none print:p-0">
      <div className="mb-4 flex gap-2 print:hidden">
        <Button type="button" onClick={() => window.print()}>
          Imprimir / Guardar PDF
        </Button>
        <Button asChild variant="outline">
          <Link href={`/admin/cortes/${cut.id}`}>Volver al detalle</Link>
        </Button>
      </div>

      <article className="space-y-4">
        <header className="border-b pb-3">
          <h1 className="text-2xl font-bold">Corte de caja {cut.folio}</h1>
          <p className="text-sm">
            {cut.registerCode} · {cut.operationalDate} ·{" "}
            {mapCutOperationalLabel(cut.status)}
          </p>
          <p className="text-xs text-neutral-600">
            Generado: {generatedAt}
          </p>
        </header>

        <section className="grid grid-cols-2 gap-2 text-sm">
          <p>Cajero: {cut.cashierUid ?? "—"}</p>
          <p>Cerrado por: {cut.approverUid ?? "—"}</p>
          <p>
            Apertura:{" "}
            {cut.startedAt
              ? new Date(cut.startedAt).toLocaleString("es-MX")
              : "—"}
          </p>
          <p>
            Cierre:{" "}
            {cut.endedAt
              ? new Date(cut.endedAt).toLocaleString("es-MX")
              : "—"}
          </p>
          <p>Tipo: {cut.scope}</p>
          <p>Clasificación: {cut.classification ?? "—"}</p>
        </section>

        <section className="space-y-1 border-y py-3 text-sm">
          <Line
            label="Venta neta"
            value={
              totals ? formatPosMoney(totals.netSalesMinor, currency) : "—"
            }
          />
          <Line
            label="Fondo inicial"
            value={
              totals
                ? formatPosMoney(totals.openingFloatMinor, currency)
                : "—"
            }
          />
          <Line
            label="Entradas"
            value={
              totals ? formatPosMoney(totals.cashInMinor, currency) : "—"
            }
          />
          <Line
            label="Salidas"
            value={
              totals ? formatPosMoney(totals.cashOutMinor, currency) : "—"
            }
          />
          <Line
            label="Efectivo esperado"
            value={
              totals
                ? formatPosMoney(totals.expectedCashMinor, currency)
                : "—"
            }
          />
          <Line
            label="Efectivo contado"
            value={
              totals
                ? formatPosMoney(totals.countedCashMinor, currency)
                : "—"
            }
          />
          <Line
            label="Diferencia"
            value={
              totals
                ? describeCashDifference(totals.differenceMinor)
                : "—"
            }
          />
          <Line
            label="Tickets"
            value={totals ? String(totals.salesCount) : "—"}
          />
          <Line
            label="Devoluciones"
            value={
              totals ? formatPosMoney(totals.refundsMinor, currency) : "—"
            }
          />
        </section>

        <section className="text-sm">
          <h2 className="mb-2 font-semibold">Métodos de pago</h2>
          <ul className="space-y-1">
            {(totals?.paymentBreakdown ?? []).map((row) => (
              <li key={row.method} className="flex justify-between">
                <span>{row.method}</span>
                <span>{formatPosMoney(row.netMinor, currency)}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="text-sm">
          <h2 className="mb-1 font-semibold">Observaciones</h2>
          <p className="whitespace-pre-wrap">
            {cut.observations?.trim() || "Sin observaciones."}
          </p>
        </section>

        <footer className="border-t pt-6 text-sm">
          <p>Responsable: {cut.approverUid ?? cut.cashierUid ?? "—"}</p>
          <div className="mt-10 border-t border-dashed pt-2 text-center text-xs text-neutral-600">
            Firma / identificación
          </div>
        </footer>
      </article>
    </div>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span>{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
