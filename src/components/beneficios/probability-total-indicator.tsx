"use client";

import { AlertCircle, CheckCircle2 } from "lucide-react";
import { summarizeProbabilities } from "@/lib/minigame-probability";
import { cn } from "@/lib/utils";

type ProbabilityTotalIndicatorProps = {
    /** Probabilidades de los premios habilitados, como texto del input. */
    values: string[];
};

export function ProbabilityTotalIndicator({ values }: ProbabilityTotalIndicatorProps) {
    const summary = summarizeProbabilities(values);
    const valid = summary.status === "valid";
    const Icon = valid ? CheckCircle2 : AlertCircle;

    return (
        <div
            role="status"
            aria-live="polite"
            className={cn(
                "flex items-start gap-2 rounded-md border p-3 text-sm",
                valid
                    ? "border-primary/30 bg-primary/5 text-primary"
                    : "border-destructive/40 bg-destructive/5 text-destructive",
            )}
        >
            <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <div className="space-y-0.5">
                <p className="font-medium">{summary.message}</p>
                {!valid ? (
                    <p className="text-xs opacity-90">
                        La suma de todos los premios, incluido el especial si está habilitado, debe ser exactamente 100% para poder guardar.
                    </p>
                ) : null}
            </div>
        </div>
    );
}
