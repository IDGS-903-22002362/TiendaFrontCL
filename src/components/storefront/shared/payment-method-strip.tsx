"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";

const PAYMENT_METHODS = [
  {
    name: "Visa",
    src: "/images/iconosdepagos/visa.svg",
    width: 88,
    height: 28,
    className: "h-5 md:h-6",
  },
  {
    name: "Mastercard",
    src: "/images/iconosdepagos/mastercard.svg",
    width: 72,
    height: 44,
    className: "h-7 md:h-8",
  },
  {
    name: "American Express",
    src: "/images/iconosdepagos/AmericanExpress.svg",
    width: 86,
    height: 54,
    className: "h-8 md:h-9",
  },
  {
    name: "OXXO",
    src: "/images/iconosdepagos/oxxo.svg",
    width: 92,
    height: 36,
    className: "h-6 md:h-7",
  },
  {
    name: "SPEI",
    src: "/images/iconosdepagos/spei.svg",
    width: 90,
    height: 34,
    className: "h-6 md:h-7",
  },
  {
    name: "Aplazo",
    src: "/images/iconosdepagos/aplazo.svg",
    width: 90,
    height: 34,
    className: "h-6 md:h-7",
  },
  {
    name: "Apple Pay",
    src: "/images/iconosdepagos/ApplePay.svg",
    width: 78,
    height: 32,
    className: "h-6 md:h-7",
  },
  {
    name: "Google Pay",
    src: "/images/iconosdepagos/GooglePay.svg",
    width: 92,
    height: 36,
    className: "h-6 md:h-7",
  },
] as const;

type PaymentMethodStripProps = {
  className?: string;
  title?: string;
  description?: string;
  compact?: boolean;
};

export function PaymentMethodStrip({
  className,
  title = "Métodos de pago",
  description = "Compra con tarjetas, pagos inmediatos y opciones flexibles dentro del mismo flujo.",
  compact = false,
}: PaymentMethodStripProps) {
  return (
    <section
      aria-label={title}
      className={cn(
        "overflow-hidden rounded-[1.7rem] border border-border/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(246,248,243,0.98))] shadow-[var(--shadow-card)]",
        compact ? "p-4 md:p-5" : "p-5 md:p-6",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="max-w-xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-primary/70">
            Pago seguro
          </p>
          <h2
            className={cn(
              "mt-2 font-headline font-semibold uppercase tracking-[0.04em] text-foreground",
              compact ? "text-2xl leading-none" : "text-3xl leading-none md:text-4xl",
            )}
          >
            {title}
          </h2>
          {description ? (
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground md:text-base">
              {description}
            </p>
          ) : null}
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-4 md:mt-6 md:gap-x-6">
        {PAYMENT_METHODS.map((method) => (
          <div
            key={method.name}
            className="flex h-12 items-center justify-center rounded-2xl border border-black/6 bg-white/90 px-3 shadow-[0_10px_30px_-26px_rgb(8_12_10_/_0.32)]"
          >
            <Image
              src={method.src}
              alt={method.name}
              width={method.width}
              height={method.height}
              className={cn("w-auto object-contain", method.className)}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
