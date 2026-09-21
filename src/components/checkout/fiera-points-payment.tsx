"use client";

import { Coins, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { LoyaltyWallet } from "@/lib/api/loyalty";
import {
  canSelectFieraPoints,
  getFieraPointsQuoteMessage,
} from "@/lib/fiera-points-quote";
import { formatCurrency } from "@/lib/storefront";
import type { FieraPointsQuote, FieraPointsRequest } from "@/lib/types";
import { cn } from "@/lib/utils";

export function FieraPointsPayment({
  wallet,
  loading,
  value,
  onChange,
  disabled,
  quote,
  quoting,
}: {
  wallet: LoyaltyWallet | null;
  loading: boolean;
  value: FieraPointsRequest;
  onChange: (value: FieraPointsRequest) => void;
  disabled?: boolean;
  quote?: FieraPointsQuote | null;
  quoting?: boolean;
}) {
  const balance = Math.max(0, Math.trunc(wallet?.availablePoints ?? 0));
  const exactValue = value.mode === "EXACT" ? value.points ?? "" : "";
  const canSelect = canSelectFieraPoints(quote, balance);
  const quoteMessage = getFieraPointsQuoteMessage(quote);
  const pointValue =
    (quote?.pointValueMinor ?? 0) > 0 ? quote!.pointValueMinor / 100 : 0;
  const minimum = quote?.minimumRedemptionPoints ?? 0;
  const discountMinor = quote?.canRedeem
    ? quote.paymentComposition.pointsDiscountMinor
    : 0;

  return (
    <section className="overflow-hidden rounded-[1.6rem] border border-[#D9A928]/35 bg-[linear-gradient(135deg,rgba(7,58,38,0.04),rgba(217,169,40,0.12))]">
      <div className="flex items-center justify-between gap-4 border-b border-[#D9A928]/20 px-5 py-4">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#D9A928] text-[#073A26] shadow-sm">
            <Coins className="h-5 w-5" />
          </span>
          <div>
            <p className="font-semibold text-foreground">Paga con FieraPuntos</p>
            <p className="text-xs text-muted-foreground">
              Puedes cubrir una parte o el total de tu compra.
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Saldo disponible
          </p>
          <p className="font-headline text-2xl font-bold text-[#073A26]">
            {loading ? <Loader2 className="ml-auto h-5 w-5 animate-spin" /> : balance.toLocaleString("es-MX")}
          </p>
        </div>
      </div>

      <div className="space-y-4 px-5 py-4">
        <div className="grid gap-2 sm:grid-cols-3">
          {([
            ["NONE", "No usar"],
            ["MAX", "Usar máximo"],
            ["EXACT", "Elegir cantidad"],
          ] as const).map(([mode, label]) => (
            <Button
              key={mode}
              type="button"
              variant={value.mode === mode ? "default" : "outline"}
              className={cn(
                "rounded-full",
                value.mode === mode && "border-[#073A26] bg-[#073A26] text-white hover:bg-[#073A26]/90",
              )}
              disabled={disabled || loading || (mode !== "NONE" && !canSelect)}
              onClick={() =>
                onChange(
                  mode === "EXACT"
                    ? { mode, points: Math.min(balance, Math.max(1, value.points ?? 1)) }
                    : { mode },
                )
              }
            >
              {label}
            </Button>
          ))}
        </div>

        {value.mode === "EXACT" ? (
          <label className="block space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              FieraPuntos a usar
            </span>
            <Input
              type="number"
              inputMode="numeric"
              min={1}
              max={balance || undefined}
              value={exactValue}
              disabled={disabled}
              onChange={(event) => {
                const points = Math.max(0, Math.trunc(Number(event.target.value)));
                onChange({ mode: "EXACT", points });
              }}
              className="h-12 rounded-xl bg-white"
              aria-describedby="fiera-points-help"
            />
          </label>
        ) : null}

        <div className="space-y-1 text-xs leading-5 text-muted-foreground">
          {pointValue > 0 ? (
            <p>Cada FieraPunto vale {formatCurrency(pointValue)}.</p>
          ) : null}
          {minimum > 0 ? (
            <p>Canje mínimo: {minimum.toLocaleString("es-MX")} puntos.</p>
          ) : null}
          {quoting ? (
            <p className="flex items-center gap-2 text-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Calculando descuento…
            </p>
          ) : discountMinor > 0 ? (
            <p className="font-medium text-[#073A26]">
              Se descontarán {formatCurrency(discountMinor / 100)} de tu total.
            </p>
          ) : null}
          {quoteMessage ? (
            <p className="font-medium text-destructive" role="alert">
              {quoteMessage}
            </p>
          ) : null}
          <p id="fiera-points-help">
            El backend confirmará tu saldo antes de reservar los puntos. Solo el remanente se enviará a Stripe.
          </p>
        </div>
      </div>
    </section>
  );
}
