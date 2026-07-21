"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Coins, Loader2, ScanLine, UserRound } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getApiErrorMessage } from "@/lib/api/errors";
import {
  earnFromStoreSale,
  getQrMemberSummary,
  mxnToAmountCents,
  previewEarnPoints,
  type QrMemberSummary,
} from "@/lib/api/loyalty";
import { puedeAsignarPuntos } from "@/lib/types";
import {
  isEditableScannerTarget,
  KeyboardWedgeBuffer,
} from "@/lib/loyalty/qr-scanner";
import {
  getSaleFolioError,
  normalizeSaleFolio,
  SALE_FOLIO_MAX_LENGTH,
} from "@/lib/loyalty/sale-folio";

type AwardResult = { points: number; balanceAfter: number };

export function StaffQrPointsHost() {
  const { isAuthenticated, isLoading: authLoading, role, token } = useAuth();
  const { toast } = useToast();
  const scanner = useRef(new KeyboardWedgeBuffer());
  const lastScan = useRef<{ memberId: string; at: number } | null>(null);
  const [member, setMember] = useState<QrMemberSummary | null>(null);
  const [saleFolio, setSaleFolio] = useState("");
  const [folioTouched, setFolioTouched] = useState(false);
  const [amount, setAmount] = useState("");
  const [previewPoints, setPreviewPoints] = useState(0);
  const [isResolving, setIsResolving] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);
  const [result, setResult] = useState<AwardResult | null>(null);
  const authorized = isAuthenticated && puedeAsignarPuntos(role);
  const amountMxn = Number(amount);
  const amountCents = useMemo(
    () => (Number.isFinite(amountMxn) ? mxnToAmountCents(amountMxn) : 0),
    [amountMxn],
  );
  const saleFolioError = member
    ? getSaleFolioError(saleFolio, member.memberId)
    : null;

  useEffect(() => {
    if (!authorized || !member || result || amountCents <= 0) {
      setPreviewPoints(0);
      setIsPreviewing(false);
      return;
    }

    let active = true;
    const timeout = window.setTimeout(async () => {
      setIsPreviewing(true);
      try {
        const preview = await previewEarnPoints(amountCents);
        if (active) setPreviewPoints(preview.points);
      } catch {
        if (active) setPreviewPoints(0);
      } finally {
        if (active) setIsPreviewing(false);
      }
    }, 220);

    return () => {
      active = false;
      window.clearTimeout(timeout);
    };
  }, [amountCents, authorized, member, result]);

  useEffect(() => {
    if (authLoading || !authorized) {
      scanner.current.reset();
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (
        event.isComposing ||
        event.ctrlKey ||
        event.metaKey ||
        event.altKey ||
        isEditableScannerTarget(event.target) ||
        member ||
        isResolving
      ) {
        scanner.current.reset();
        return;
      }

      const memberId = scanner.current.push(event.key, event.timeStamp);
      if (!memberId) return;

      const now = Date.now();
      if (
        lastScan.current?.memberId === memberId &&
        now - lastScan.current.at < 3_000
      ) {
        return;
      }
      lastScan.current = { memberId, at: now };
      setIsResolving(true);
      void getQrMemberSummary(memberId, token)
        .then((summary) => {
          setMember(summary);
          setSaleFolio("");
          setFolioTouched(false);
          setAmount("");
          setPreviewPoints(0);
          setResult(null);
        })
        .catch((error) => {
          toast({
            title: "QR no válido",
            description: getApiErrorMessage(error),
            variant: "destructive",
          });
        })
        .finally(() => setIsResolving(false));
    };

    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [authLoading, authorized, isResolving, member, toast, token]);

  if (!authorized) return null;

  const close = () => {
    if (isAssigning) return;
    setMember(null);
    setSaleFolio("");
    setFolioTouched(false);
    setAmount("");
    setPreviewPoints(0);
    setResult(null);
    scanner.current.reset();
  };

  const assign = async () => {
    setFolioTouched(true);
    if (!member || saleFolioError || amountCents <= 0 || previewPoints <= 0) return;
    setIsAssigning(true);
    try {
      const normalizedSaleFolio = normalizeSaleFolio(saleFolio);
      const transaction = await earnFromStoreSale({
        memberId: member.memberId,
        saleFolio: normalizedSaleFolio,
        amountCents,
        description: `Venta en tienda por $${amountMxn.toFixed(2)} MXN`,
        token,
      });
      setSaleFolio("");
      setFolioTouched(false);
      setResult({ points: transaction.points, balanceAfter: transaction.balanceAfter });
    } catch (error) {
      toast({
        title: "No se asignaron los puntos",
        description: getApiErrorMessage(error),
        variant: "destructive",
      });
    } finally {
      setIsAssigning(false);
    }
  };

  return (
    <>
      {isResolving ? (
        <div className="fixed bottom-5 right-5 z-[90] flex items-center gap-2 rounded-full bg-[#073b2a] px-4 py-2 text-sm font-medium text-white shadow-lg" role="status">
          <Loader2 className="h-4 w-4 animate-spin" /> Verificando QR…
        </div>
      ) : null}

      <Dialog open={Boolean(member)} onOpenChange={(open) => !open && close()}>
        <DialogContent className="overflow-hidden border-0 p-0 sm:max-w-md">
          <div className="bg-[#073b2a] px-6 py-5 text-white">
            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-white/12">
              <ScanLine className="h-6 w-6" />
            </div>
            <DialogHeader>
              <DialogTitle className="text-xl text-white">
                {result ? "Puntos asignados" : "Cliente identificado"}
              </DialogTitle>
              <DialogDescription className="text-white/75">
                {result
                  ? "La operación quedó registrada correctamente."
                  : "Confirma el gasto de esta compra para calcular sus puntos."}
              </DialogDescription>
            </DialogHeader>
          </div>

          {member ? (
            <div className="space-y-5 px-6 py-6">
              <div className="flex items-center gap-3 rounded-xl bg-[#f2f6f3] p-4">
                <UserRound className="h-5 w-5 text-[#087443]" />
                <div className="min-w-0">
                  <p className="truncate font-semibold text-[#10261d]">{member.fullName}</p>
                  <p className="text-sm text-[#557066]">
                    {result?.balanceAfter ?? member.currentPoints} puntos actuales
                  </p>
                </div>
              </div>

              {result ? (
                <div className="rounded-xl border border-[#b9dfca] bg-[#effaf3] p-5 text-center" aria-live="polite">
                  <Coins className="mx-auto mb-2 h-7 w-7 text-[#087443]" />
                  <p className="text-sm text-[#557066]">Se agregaron</p>
                  <p className="text-3xl font-bold text-[#073b2a]">+{result.points}</p>
                  <p className="mt-1 font-medium text-[#173d2d]">
                    Saldo final: {result.balanceAfter} puntos
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="staff-sale-folio">ID o folio de la venta</Label>
                    <Input
                      id="staff-sale-folio"
                      type="text"
                      value={saleFolio}
                      maxLength={SALE_FOLIO_MAX_LENGTH}
                      onBlur={() => setFolioTouched(true)}
                      onChange={(event) => setSaleFolio(event.target.value)}
                      placeholder="Ej. TICKET-10482"
                      autoComplete="off"
                      aria-invalid={folioTouched && Boolean(saleFolioError)}
                      aria-describedby="staff-sale-folio-help"
                      required
                      autoFocus
                    />
                    <p
                      id="staff-sale-folio-help"
                      className={`min-h-5 text-sm ${folioTouched && saleFolioError ? "text-destructive" : "text-[#557066]"}`}
                      aria-live="polite"
                    >
                      {(folioTouched || !saleFolio) && saleFolioError
                        ? saleFolioError
                        : "Este dato identifica la venta; no escribas el ID del cliente."}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="staff-sale-amount">Gasto del cliente (MXN)</Label>
                    <Input
                      id="staff-sale-amount"
                      type="number"
                      min="0.01"
                      step="0.01"
                      inputMode="decimal"
                      value={amount}
                      onChange={(event) => setAmount(event.target.value)}
                      placeholder="$0.00"
                    />
                    <p className="min-h-5 text-sm text-[#557066]" aria-live="polite">
                      {isPreviewing
                        ? "Calculando con la regla vigente…"
                        : amountCents > 0
                          ? `Se asignarán ${previewPoints} puntos.`
                          : "Ingresa el total pagado en pesos mexicanos."}
                    </p>
                  </div>
                </div>
              )}
            </div>
          ) : null}

          <DialogFooter className="px-6 pb-6">
            {result ? (
              <Button className="w-full bg-[#087443] hover:bg-[#066338]" onClick={close}>
                Finalizar
              </Button>
            ) : (
              <>
                <Button variant="outline" onClick={close} disabled={isAssigning}>Cancelar</Button>
                <Button
                  className="bg-[#087443] hover:bg-[#066338]"
                  onClick={() => void assign()}
                  disabled={
                    isAssigning ||
                    isPreviewing ||
                    previewPoints <= 0 ||
                    Boolean(saleFolioError)
                  }
                >
                  {isAssigning ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Asignar {previewPoints > 0 ? `${previewPoints} puntos` : "puntos"}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
