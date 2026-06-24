"use client";

import type { SyntheticEvent } from "react";
import { CheckCircle2, X } from "lucide-react";
import { Button } from "@/components/ui/button";

type CartAddedNotificationProps = {
  title: string;
  description?: string;
  onDismiss: () => void;
};

export function CartAddedNotification({
  title,
  description,
  onDismiss,
}: CartAddedNotificationProps) {
  const stop = (event: SyntheticEvent) => {
    event.stopPropagation();
  };

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-auto fixed bottom-4 right-4 z-[80] w-[min(100vw-2rem,22rem)] rounded-2xl border border-border/80 bg-card p-4 shadow-lg"
      onClick={stop}
      onMouseDown={stop}
      onPointerDown={stop}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-success/15 text-success">
          <CheckCircle2 className="h-5 w-5" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">{title}</p>
          {description ? (
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          ) : null}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0 rounded-full"
          aria-label="Cerrar notificación"
          onClick={(event) => {
            event.stopPropagation();
            onDismiss();
          }}
        >
          <X className="h-4 w-4" aria-hidden />
        </Button>
      </div>
    </div>
  );
}
