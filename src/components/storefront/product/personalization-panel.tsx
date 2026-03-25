"use client";

import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  buildCustomPersonalization,
  buildPresetPersonalization,
  getPersonalizationPresets,
  sanitizePersonalizationName,
  sanitizePersonalizationNumber,
} from "@/lib/storefront";
import type { ProductPersonalization } from "@/lib/storefront/types";
import { cn } from "@/lib/utils";

type PersonalizationPanelProps = {
  value?: ProductPersonalization;
  onChange: (value: ProductPersonalization | null) => void;
};

const presets = getPersonalizationPresets();

function isSamePersonalization(
  left: ProductPersonalization | null | undefined,
  right: ProductPersonalization | null | undefined,
) {
  if (!left && !right) {
    return true;
  }

  if (!left || !right) {
    return false;
  }

  return (
    left.mode === right.mode &&
    left.name === right.name &&
    left.number === right.number &&
    left.styleLabel === right.styleLabel &&
    left.previewLabel === right.previewLabel &&
    left.note === right.note
  );
}

export function PersonalizationPanel({
  value,
  onChange,
}: PersonalizationPanelProps) {
  const defaultPresetId = presets[0]?.id ?? "";
  const [mode, setMode] = useState<"player" | "custom">(value?.mode ?? "player");
  const [presetId, setPresetId] = useState(defaultPresetId);
  const [customName, setCustomName] = useState(value?.name ?? "");
  const [customNumber, setCustomNumber] = useState(value?.number ?? "");

  const draftValue = useMemo(() => {
    if (mode === "player") {
      return buildPresetPersonalization(presetId);
    }

    const nextValue = buildCustomPersonalization(customName, customNumber);
    if (!nextValue.name || !nextValue.number) {
      return null;
    }

    return nextValue;
  }, [customName, customNumber, mode, presetId]);

  useEffect(() => {
    if (!value) {
      setMode("player");
      setPresetId(defaultPresetId);
      setCustomName("");
      setCustomNumber("");
      return;
    }

    setMode(value.mode);
    setCustomName(value.name);
    setCustomNumber(value.number);

    const matchingPreset = presets.find(
      (preset) =>
        preset.name === value.name &&
        preset.number === value.number,
    );
    if (matchingPreset) {
      setPresetId(matchingPreset.id);
    }
  }, [defaultPresetId, value]);

  useEffect(() => {
    if (!draftValue) {
      return;
    }

    if (isSamePersonalization(draftValue, value)) {
      return;
    }

    onChange(draftValue);
  }, [draftValue, onChange, value]);

  return (
    <div className="rounded-[1.5rem] border border-border bg-muted/45 p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-primary/74">
            Personaliza tu jersey
          </p>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            V1 local: el preview se refleja en la UI y mantiene el precio base del producto.
          </p>
        </div>
        {value ? (
          <Button
            variant="ghost"
            className="h-9 rounded-full px-3 text-xs"
            onClick={() => {
              setMode("player");
              setPresetId(defaultPresetId);
              setCustomName("");
              setCustomNumber("");
              onChange(null);
            }}
          >
            Limpiar
          </Button>
        ) : null}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setMode("player")}
          className={cn(
            "rounded-full border px-4 py-2 text-sm font-medium transition-colors",
            mode === "player"
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-card text-foreground",
          )}
        >
          Elegir jugador
        </button>
        <button
          type="button"
          onClick={() => setMode("custom")}
          className={cn(
            "rounded-full border px-4 py-2 text-sm font-medium transition-colors",
            mode === "custom"
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-card text-foreground",
          )}
        >
          Añadir el tuyo
        </button>
      </div>

      {mode === "player" ? (
        <div className="mt-4">
          <Select value={presetId} onValueChange={setPresetId}>
            <SelectTrigger className="h-12 rounded-[1rem] bg-card">
              <SelectValue placeholder="Selecciona un preset" />
            </SelectTrigger>
            <SelectContent>
              {presets.map((preset) => (
                <SelectItem key={preset.id} value={preset.id}>
                  {preset.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : (
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <Input
            value={customName}
            onChange={(event) => setCustomName(sanitizePersonalizationName(event.target.value))}
            placeholder="Nombre"
            maxLength={12}
            className="h-12 rounded-[1rem] bg-card"
          />
          <Input
            value={customNumber}
            onChange={(event) => setCustomNumber(sanitizePersonalizationNumber(event.target.value))}
            placeholder="Número"
            inputMode="numeric"
            maxLength={2}
            className="h-12 rounded-[1rem] bg-card"
          />
        </div>
      )}

        <div className="mt-4 rounded-[1.25rem] border border-border bg-card px-4 py-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary/70">
          Preview
        </p>
        <p className="mt-2 font-headline text-3xl font-semibold uppercase leading-none tracking-[0.04em] text-foreground">
          {draftValue?.name || value?.name || "TU NOMBRE"}
        </p>
        <p className="mt-2 text-sm font-medium text-muted-foreground">
          Dorsal {draftValue?.number || value?.number || "00"} · {draftValue?.styleLabel || value?.styleLabel || "Tipografía oficial"}
        </p>
        <p className="mt-3 text-xs leading-5 text-muted-foreground">
          {draftValue?.note || value?.note || "La personalización solo vive en storefront UI y no modifica el total backend en esta versión."}
        </p>
      </div>
    </div>
  );
}
