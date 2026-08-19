"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  Loader2,
  Printer,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { getApiErrorMessage } from "@/lib/api/errors";
import {
  formatPosMoney,
  pesosToMinor,
  posApi,
} from "@/lib/pos/client";
import {
  describeCashDifference,
  type PosContext,
  type PosCutDetail,
  type PosCutPreview,
} from "@/lib/pos/types";
import {
  AdminPageHeader,
  AdminPageShell,
} from "@/components/admin/admin-ui";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type Step =
  | "sync"
  | "prepare"
  | "count"
  | "reconcile"
  | "review"
  | "result";

const STORAGE_PREFIX = "club-leon-pos-cut-draft:";

type CountDraft = {
  countedPesos: string;
  note: string;
  useDenominations: boolean;
  pieces: Record<string, string>;
};

function emptyDraft(): CountDraft {
  return {
    countedPesos: "",
    note: "",
    useDenominations: false,
    pieces: {},
  };
}

function loadDraft(shiftId: string): CountDraft {
  if (typeof window === "undefined") return emptyDraft();
  try {
    const raw = sessionStorage.getItem(`${STORAGE_PREFIX}${shiftId}`);
    if (!raw) return emptyDraft();
    return { ...emptyDraft(), ...JSON.parse(raw) } as CountDraft;
  } catch {
    return emptyDraft();
  }
}

function saveDraft(shiftId: string, draft: CountDraft) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(`${STORAGE_PREFIX}${shiftId}`, JSON.stringify(draft));
}

function clearDraft(shiftId: string) {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(`${STORAGE_PREFIX}${shiftId}`);
}

function cashFromDenominationBreakdown(
  pieces: Record<string, string>,
): number {
  return Object.entries(pieces).reduce((total, [denomination, value]) => {
    return total + Number(denomination) * (Number(value) || 0);
  }, 0);
}

export function PosCutFlow() {
  const { token } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const closedCutId = searchParams.get("cutId");

  const [loading, setLoading] = useState(true);
  const [context, setContext] = useState<PosContext | null>(null);
  const [preview, setPreview] = useState<PosCutPreview | null>(null);
  const [step, setStep] = useState<Step>("sync");
  const [draft, setDraft] = useState<CountDraft>(emptyDraft());
  const [pageError, setPageError] = useState<string | null>(null);
  const [inlineError, setInlineError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [closedCut, setClosedCut] = useState<PosCutDetail | null>(null);

  const shiftId = context?.activeShift?.id ?? preview?.shiftId ?? null;
  const currency = context?.settings.currency ?? "MXN";

  const countedMinor = useMemo(() => {
    if (draft.useDenominations) {
      return cashFromDenominationBreakdown(draft.pieces);
    }
    return pesosToMinor(draft.countedPesos) ?? null;
  }, [draft]);

  const expectedMinor = preview?.totals.expectedCashMinor ?? 0;
  const differenceMinor =
    countedMinor == null ? null : countedMinor - expectedMinor;

  const refresh = useCallback(async () => {
    if (!token) return;
    setPageError(null);
    setLoading(true);
    try {
      const ctx = await posApi.context(token);
      setContext(ctx);
      const activeShiftId = ctx.activeShift?.id;
      if (!activeShiftId) {
        setPreview(null);
        setPageError(
          "No hay un turno abierto. Abre tu caja desde el punto de venta antes de cerrar.",
        );
        return;
      }
      const { preview: nextPreview } = await posApi.cutPreview(
        activeShiftId,
        token,
      );
      setPreview(nextPreview);
      setDraft(loadDraft(activeShiftId));

      if (
        nextPreview.cut &&
        (nextPreview.cut.status === "APPROVED" ||
          nextPreview.cut.status === "CLOSED")
      ) {
        setClosedCut(nextPreview.cut);
        setStep("result");
        return;
      }

      if (nextPreview.shiftStatus === "COUNTING") {
        setStep("count");
      } else {
        setStep("sync");
      }
    } catch (error) {
      setPageError(getApiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!closedCutId || !token || closedCut) return;
    void (async () => {
      try {
        const { cut } = await posApi.getCut(closedCutId, token);
        setClosedCut(cut);
        setStep("result");
        setLoading(false);
      } catch (error) {
        setPageError(getApiErrorMessage(error));
        setLoading(false);
      }
    })();
  }, [closedCutId, token, closedCut]);

  useEffect(() => {
    if (!shiftId) return;
    saveDraft(shiftId, draft);
  }, [draft, shiftId]);

  async function startCounting() {
    if (!token || !shiftId) return;
    setBusy("start");
    setPageError(null);
    try {
      await posApi.startCount(shiftId, token);
      await refresh();
      setStep("count");
    } catch (error) {
      setPageError(getApiErrorMessage(error));
    } finally {
      setBusy(null);
    }
  }

  async function cancelCounting() {
    if (!token || !shiftId) return;
    setBusy("cancel");
    setPageError(null);
    try {
      await posApi.cancelCount(shiftId, token);
      clearDraft(shiftId);
      setDraft(emptyDraft());
      toast({ title: "Conteo cancelado", description: "La caja volvió a operar." });
      router.push("/admin/pos");
    } catch (error) {
      setPageError(getApiErrorMessage(error));
    } finally {
      setBusy(null);
    }
  }

  function goReconcile() {
    setInlineError(null);
    if (countedMinor == null || countedMinor < 0) {
      setInlineError("Captura un efectivo contado válido.");
      return;
    }
    if (differenceMinor !== 0 && draft.note.trim().length < 5) {
      setInlineError(
        "La diferencia requiere una observación de al menos 5 caracteres.",
      );
      return;
    }
    setStep("reconcile");
  }

  async function confirmClose() {
    if (!token || !shiftId || countedMinor == null) return;
    setBusy("close");
    setConfirmError(null);
    try {
      const payload = draft.useDenominations
        ? {
            denominations: Object.entries(draft.pieces).map(
              ([denominationMinor, pieces]) => ({
                denominationMinor: Number(denominationMinor),
                pieces: Number(pieces) || 0,
              }),
            ),
            note: draft.note.trim() || undefined,
          }
        : {
            countedCashMinor: countedMinor,
            note: draft.note.trim() || undefined,
          };
      const result = await posApi.submitCount(shiftId, payload, token);
      clearDraft(shiftId);
      setClosedCut(result.cut);
      setConfirmOpen(false);
      setStep("result");
      router.replace(`/admin/pos/corte?cutId=${result.cut.id}`);
    } catch (error) {
      setConfirmError(getApiErrorMessage(error));
    } finally {
      setBusy(null);
    }
  }

  if (loading) {
    return (
      <AdminPageShell>
        <AdminPageHeader title="Corte de caja" description="Preparando cierre…" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-24 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-2xl" />
      </AdminPageShell>
    );
  }

  if (step === "result" && closedCut) {
    const totals = closedCut.totals;
    return (
      <AdminPageShell className="max-w-3xl">
        <div className="rounded-2xl border bg-card p-6 sm:p-8">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-1 size-8 text-emerald-700" aria-hidden />
            <div>
              <h1 className="font-headline text-2xl">Corte cerrado correctamente</h1>
              <p className="mt-1 text-sm text-text-secondary">
                Folio {closedCut.folio} · Caja {closedCut.registerCode}
              </p>
            </div>
          </div>
          <dl className="mt-6 grid gap-3 sm:grid-cols-2">
            <ResultRow label="Cajero" value={closedCut.cashierUid ?? "—"} />
            <ResultRow
              label="Cierre"
              value={
                closedCut.approvedAt
                  ? new Date(closedCut.approvedAt).toLocaleString("es-MX")
                  : "—"
              }
            />
            <ResultRow
              label="Venta total"
              value={
                totals
                  ? formatPosMoney(totals.netSalesMinor, currency)
                  : "—"
              }
            />
            <ResultRow
              label="Efectivo contado"
              value={
                totals
                  ? formatPosMoney(totals.countedCashMinor, currency)
                  : "—"
              }
            />
            <ResultRow
              label="Diferencia"
              value={
                totals
                  ? describeCashDifference(totals.differenceMinor)
                  : "—"
              }
            />
            <ResultRow
              label="Cerrado por"
              value={closedCut.approverUid ?? closedCut.cashierUid ?? "—"}
            />
          </dl>
          <div className="mt-8 flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link href={`/admin/cortes/${closedCut.id}/imprimir`}>
                <Printer className="size-4" /> Imprimir corte
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={`/admin/cortes/${closedCut.id}/imprimir`}>
                Descargar PDF
              </Link>
            </Button>
            <Button asChild>
              <Link href="/admin/pos">Volver al POS</Link>
            </Button>
          </div>
        </div>
      </AdminPageShell>
    );
  }

  return (
    <AdminPageShell className="max-w-4xl">
      <AdminPageHeader
        eyebrow="Punto de venta"
        title="Corte de caja"
        description="Cierra únicamente la caja y el turno que tienes asignados."
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href="/admin/pos">
              <ArrowLeft className="size-4" /> Volver al POS
            </Link>
          </Button>
        }
      />

      {pageError ? (
        <div
          role="alert"
          className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
        >
          <p className="font-medium">No se puede continuar</p>
          <p className="mt-1">{pageError}</p>
          <Button
            className="mt-3"
            variant="outline"
            size="sm"
            onClick={() => void refresh()}
          >
            <RefreshCw className="size-4" /> Reintentar
          </Button>
        </div>
      ) : null}

      {preview ? (
        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Caja" value={preview.registerCode} />
          <Stat label="Cajero" value={context?.actor.name ?? preview.cashierUid} />
          <Stat
            label="Apertura"
            value={new Date(preview.startedAt).toLocaleString("es-MX")}
          />
          <Stat
            label="Fondo inicial"
            value={formatPosMoney(preview.receivedFloatMinor, currency)}
          />
          <Stat
            label="Tickets"
            value={String(preview.totals.salesCount)}
          />
          <Stat
            label="Venta total"
            value={formatPosMoney(preview.totals.netSalesMinor, currency)}
          />
          <Stat
            label="Efectivo esperado"
            value={formatPosMoney(preview.totals.expectedCashMinor, currency)}
          />
          <Stat
            label="Entradas / salidas"
            value={`${formatPosMoney(preview.totals.cashInMinor, currency)} / ${formatPosMoney(preview.totals.cashOutMinor, currency)}`}
          />
        </section>
      ) : null}

      {preview && !preview.blocking.canStartOrContinue ? (
        <div
          role="status"
          className="rounded-xl border border-border bg-muted/40 px-4 py-3 text-sm text-text-secondary"
        >
          <p className="font-medium text-foreground">Bloqueos operativos</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {preview.blocking.messages.map((message) => (
              <li key={message}>{message}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <nav aria-label="Pasos del corte" className="flex flex-wrap gap-2 text-xs">
        {(
          [
            ["sync", "Sincronización"],
            ["prepare", "Preparación"],
            ["count", "Conteo"],
            ["reconcile", "Conciliación"],
            ["review", "Revisión"],
          ] as const
        ).map(([id, label]) => (
          <span
            key={id}
            className={cn(
              "rounded-full border px-3 py-1",
              step === id
                ? "border-foreground bg-foreground text-background"
                : "text-text-secondary",
            )}
          >
            {label}
          </span>
        ))}
      </nav>

      {step === "sync" || step === "prepare" ? (
        <section className="space-y-4 rounded-2xl border bg-card p-5">
          <h2 className="font-medium">Verificación previa</h2>
          <p className="text-sm text-text-secondary">
            Confirma que no haya ventas pendientes y que los totales del backend estén
            listos antes de congelar la caja.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => void refresh()}
              disabled={busy !== null}
            >
              <RefreshCw className="size-4" /> Verificar sincronización
            </Button>
            <Button
              onClick={() => {
                setStep("prepare");
                void startCounting();
              }}
              disabled={
                busy !== null ||
                !preview?.blocking.canStartOrContinue ||
                preview.shiftStatus === "COUNTING"
              }
            >
              {busy === "start" ? (
                <Loader2 className="size-4 animate-spin" />
              ) : null}
              Iniciar conteo
            </Button>
            {preview?.shiftStatus === "COUNTING" ? (
              <Button onClick={() => setStep("count")}>Continuar conteo</Button>
            ) : null}
          </div>
        </section>
      ) : null}

      {step === "count" || step === "reconcile" || step === "review" ? (
        <section className="space-y-5 rounded-2xl border bg-card p-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="font-medium">Conteo de efectivo</h2>
              <p className="text-sm text-text-secondary">
                Captura el efectivo físico. Las denominaciones son opcionales.
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() =>
                setDraft((current) => ({
                  ...current,
                  useDenominations: !current.useDenominations,
                }))
              }
            >
              {draft.useDenominations
                ? "Usar total simple"
                : "Contar por denominaciones"}
            </Button>
          </div>

          {!draft.useDenominations ? (
            <div className="space-y-2">
              <Label htmlFor="counted-cash">Efectivo contado (MXN)</Label>
              <Input
                id="counted-cash"
                inputMode="decimal"
                value={draft.countedPesos}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    countedPesos: event.target.value,
                  }))
                }
                placeholder="0.00"
                className="max-w-xs text-lg"
              />
            </div>
          ) : (
            <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
              {(context?.settings.denominationsMinor ?? []).map((denomination) => (
                <div
                  key={denomination}
                  className="grid grid-cols-[1fr_7rem_8rem] items-center gap-3 rounded-xl border px-3 py-2"
                >
                  <span className="font-medium">
                    {formatPosMoney(denomination, currency)}
                  </span>
                  <Input
                    inputMode="numeric"
                    aria-label={`Piezas de ${formatPosMoney(denomination, currency)}`}
                    value={draft.pieces[String(denomination)] ?? ""}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        pieces: {
                          ...current.pieces,
                          [String(denomination)]: event.target.value.replace(
                            /\D/g,
                            "",
                          ),
                        },
                      }))
                    }
                  />
                  <span className="text-right text-sm text-text-secondary">
                    {formatPosMoney(
                      denomination *
                        (Number(draft.pieces[String(denomination)]) || 0),
                      currency,
                    )}
                  </span>
                </div>
              ))}
            </div>
          )}

          <div className="grid gap-3 rounded-xl border bg-muted/40 p-4 sm:grid-cols-3">
            <Metric
              label="Efectivo esperado"
              value={formatPosMoney(expectedMinor, currency)}
            />
            <Metric
              label="Efectivo contado"
              value={
                countedMinor == null
                  ? "—"
                  : formatPosMoney(countedMinor, currency)
              }
            />
            <Metric
              label="Diferencia"
              value={
                differenceMinor == null
                  ? "—"
                  : describeCashDifference(differenceMinor)
              }
              tone={
                differenceMinor == null
                  ? "neutral"
                  : differenceMinor === 0
                    ? "ok"
                    : "warn"
              }
            />
          </div>

          {differenceMinor != null && differenceMinor !== 0 ? (
            <div className="space-y-2">
              <Label htmlFor="diff-note">
                Observación de la diferencia (obligatoria)
              </Label>
              <Textarea
                id="diff-note"
                value={draft.note}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    note: event.target.value,
                  }))
                }
                rows={3}
                maxLength={context?.settings.maxNoteLength ?? 500}
              />
            </div>
          ) : null}

          {inlineError ? (
            <p className="flex items-center gap-2 text-sm text-destructive" role="alert">
              <AlertTriangle className="size-4" /> {inlineError}
            </p>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => void cancelCounting()}
              disabled={busy !== null}
            >
              Cancelar conteo
            </Button>
            {step === "count" ? (
              <Button onClick={goReconcile}>Continuar a conciliación</Button>
            ) : null}
            {step === "reconcile" ? (
              <Button onClick={() => setStep("review")}>Ir a revisión</Button>
            ) : null}
            {step === "review" ? (
              <Button onClick={() => setConfirmOpen(true)}>
                Confirmar cierre
              </Button>
            ) : null}
          </div>

          {step === "review" && preview ? (
            <div className="space-y-3 border-t pt-4">
              <h3 className="font-medium">Revisión del corte</h3>
              <dl className="grid gap-2 text-sm sm:grid-cols-2">
                <ResultRow label="Caja" value={preview.registerCode} />
                <ResultRow
                  label="Cajero"
                  value={context?.actor.name ?? preview.cashierUid}
                />
                <ResultRow
                  label="Fondo inicial"
                  value={formatPosMoney(preview.receivedFloatMinor, currency)}
                />
                <ResultRow
                  label="Tickets"
                  value={String(preview.totals.salesCount)}
                />
                <ResultRow
                  label="Venta total"
                  value={formatPosMoney(preview.totals.netSalesMinor, currency)}
                />
                <ResultRow
                  label="Efectivo esperado"
                  value={formatPosMoney(expectedMinor, currency)}
                />
                <ResultRow
                  label="Efectivo contado"
                  value={
                    countedMinor == null
                      ? "—"
                      : formatPosMoney(countedMinor, currency)
                  }
                />
                <ResultRow
                  label="Diferencia"
                  value={
                    differenceMinor == null
                      ? "—"
                      : describeCashDifference(differenceMinor)
                  }
                />
                <ResultRow
                  label="Observación"
                  value={draft.note.trim() || "—"}
                />
                <ResultRow
                  label="Devoluciones"
                  value={formatPosMoney(preview.totals.refundsMinor, currency)}
                />
              </dl>
            </div>
          ) : null}
        </section>
      ) : null}

      <Dialog
        open={confirmOpen}
        onOpenChange={(open) => {
          if (busy === "close") return;
          setConfirmOpen(open);
          if (!open) setConfirmError(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar cierre de caja</DialogTitle>
            <DialogDescription>
              El corte no podrá editarse directamente después del cierre.
            </DialogDescription>
          </DialogHeader>
          <dl className="space-y-2 text-sm">
            <ResultRow label="Caja" value={preview?.registerCode ?? "—"} />
            <ResultRow
              label="Cajero"
              value={context?.actor.name ?? preview?.cashierUid ?? "—"}
            />
            <ResultRow
              label="Efectivo contado"
              value={
                countedMinor == null
                  ? "—"
                  : formatPosMoney(countedMinor, currency)
              }
            />
            <ResultRow
              label="Diferencia"
              value={
                differenceMinor == null
                  ? "—"
                  : describeCashDifference(differenceMinor)
              }
            />
          </dl>
          {confirmError ? (
            <p className="text-sm text-destructive" role="alert">
              {confirmError}
            </p>
          ) : null}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={busy === "close"}
              onClick={() => setConfirmOpen(false)}
            >
              Volver a revisar
            </Button>
            <Button
              type="button"
              disabled={busy === "close"}
              onClick={() => void confirmClose()}
            >
              {busy === "close" ? (
                <Loader2 className="size-4 animate-spin" />
              ) : null}
              Cerrar caja
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminPageShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border bg-card px-4 py-3">
      <p className="text-xs uppercase tracking-wide text-text-muted">{label}</p>
      <p className="mt-1 truncate text-sm font-medium">{value}</p>
    </div>
  );
}

function Metric({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "neutral" | "ok" | "warn";
}) {
  return (
    <div>
      <p className="text-xs text-text-muted">{label}</p>
      <p
        className={cn(
          "mt-1 text-base font-semibold",
          tone === "ok" && "text-emerald-700",
          tone === "warn" && "text-amber-800",
        )}
      >
        {value}
      </p>
    </div>
  );
}

function ResultRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-border/60 py-1.5">
      <dt className="text-text-secondary">{label}</dt>
      <dd className="text-right font-medium">{value}</dd>
    </div>
  );
}
