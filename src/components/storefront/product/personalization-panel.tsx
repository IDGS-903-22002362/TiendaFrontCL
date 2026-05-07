"use client";

import { useMemo, useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  buildCustomPersonalization,
  buildPresetPersonalization,
  getPersonalizationPresets,
  sanitizePersonalizationName,
  sanitizePersonalizationNumber,
} from "@/lib/storefront";
import type { ProductPersonalization } from "@/lib/storefront/types";
import { cn } from "@/lib/utils";
import { JerseyPreview } from "./JerseyPreview";

type PersonalizationPanelProps = {
  value?: ProductPersonalization;
  onChange: (value: ProductPersonalization | null) => void;
  jerseyBackImage: string; // URL de la imagen trasera (desde Firebase)
};

const presets = getPersonalizationPresets();

function isSamePersonalization(
  left: ProductPersonalization | null | undefined,
  right: ProductPersonalization | null | undefined,
) {
  if (!left && !right) return true;
  if (!left || !right) return false;
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
  jerseyBackImage,
}: PersonalizationPanelProps) {
  const defaultPresetId = presets[0]?.id ?? "";

  // Estados internos
  const [mode, setMode] = useState<"player" | "custom">(value?.mode ?? "player");
  const [presetId, setPresetId] = useState(defaultPresetId);
  const [customName, setCustomName] = useState(value?.name ?? "");
  const [customNumber, setCustomNumber] = useState(value?.number ?? "");

  // Valor calculado actual (lo que se ve en el preview)
  const currentValue = useMemo(() => {
    if (mode === "player") {
      return buildPresetPersonalization(presetId);
    }
    const nextValue = buildCustomPersonalization(customName, customNumber);
    if (!nextValue.name || !nextValue.number) return null;
    return nextValue;
  }, [mode, presetId, customName, customNumber]);

  // Sincronizar estado interno cuando la prop `value` cambia (ej. al cargar personalización guardada)
  useEffect(() => {
    // Si no hay valor externo, no forzamos el modo "player" 
    // para permitir que el usuario use el modo "custom" aunque esté vacío.
    if (!value) return;

    if (isSamePersonalization(value, currentValue)) return;

    setMode(value.mode);
    setCustomName(value.name);
    setCustomNumber(value.number);

    if (value.mode === "player") {
      const matchingPreset = presets.find(
        (p) => p.name === value.name && p.number === value.number,
      );
      if (matchingPreset) setPresetId(matchingPreset.id);
    }
  }, [value, currentValue]); // Quitamos defaultPresetId para evitar triggers innecesarios

  // Handlers que actualizan estado y notifican al padre SIN causar bucles
  const handleModeChange = (newMode: "player" | "custom") => {
    setMode(newMode);
    // Calcular el nuevo valor para notificar
    const newValue =
      newMode === "player"
        ? buildPresetPersonalization(presetId)
        : customName && customNumber
          ? buildCustomPersonalization(customName, customNumber)
          : null;
    if (newValue && !isSamePersonalization(newValue, value)) {
      onChange(newValue);
    } else if (!newValue && value !== null) {
      onChange(null);
    }
  };

  const handlePresetChange = (newPresetId: string) => {
    setPresetId(newPresetId);
    const newValue = buildPresetPersonalization(newPresetId);
    if (!isSamePersonalization(newValue, value)) {
      onChange(newValue);
    }
  };

  const handleCustomNameChange = (newName: string) => {
    const sanitized = sanitizePersonalizationName(newName);
    setCustomName(sanitized);
    const newValue = buildCustomPersonalization(sanitized, customNumber);
    if (newValue.name && newValue.number && !isSamePersonalization(newValue, value)) {
      onChange(newValue);
    } else if ((!newValue.name || !newValue.number) && value !== null) {
      onChange(null);
    }
  };

  const handleCustomNumberChange = (newNumber: string) => {
    const sanitized = sanitizePersonalizationNumber(newNumber);
    setCustomNumber(sanitized);
    const newValue = buildCustomPersonalization(customName, sanitized);
    if (newValue.name && newValue.number && !isSamePersonalization(newValue, value)) {
      onChange(newValue);
    } else if ((!newValue.name || !newValue.number) && value !== null) {
      onChange(null);
    }
  };

  const handleClear = () => {
    setMode("player");
    setPresetId(defaultPresetId);
    setCustomName("");
    setCustomNumber("");
    onChange(null);
  };

  // Valores a mostrar
  const displayName = currentValue?.name || value?.name || "";
  const displayNumber = currentValue?.number || value?.number || "";
  const displayNote =
    currentValue?.note ||
    value?.note ||
    "La personalización se verá así en la parte trasera.";

  return (
    <div className="rounded-[1.3rem] border border-black/14 bg-white p-4 shadow-none">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="editorial-label text-primary/74">Personaliza tu jersey</p>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            El nombre y número se verán en la espalda.
          </p>
        </div>
        {value ? (
          <Button
            variant="ghost"
            className="h-9 rounded-full border border-black/14 px-3 text-xs hover:border-black"
            onClick={handleClear}
          >
            Limpiar
          </Button>
        ) : null}
      </div>

      {/* Selector de modo */}
      <div className="mt-4 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => handleModeChange("player")}
          className={cn(
            "rounded-full border px-4 py-2 text-sm font-medium transition-all",
            mode === "player"
              ? "border-primary bg-primary text-primary-foreground shadow-md"
              : "border-black/14 bg-white text-foreground hover:-translate-y-px hover:border-black",
          )}
        >
          Elegir jugador
        </button>
        <button
          type="button"
          onClick={() => handleModeChange("custom")}
          className={cn(
            "rounded-full border px-4 py-2 text-sm font-medium transition-all",
            mode === "custom"
              ? "border-primary bg-primary text-primary-foreground shadow-md"
              : "border-black/14 bg-white text-foreground hover:-translate-y-px hover:border-black",
          )}
        >
          Añadir el tuyo
        </button>
      </div>

      {/* Contenido según modo */}
      {mode === "player" ? (
        <div className="mt-4">
          <Select value={presetId} onValueChange={handlePresetChange}>
            <SelectTrigger className="h-12 rounded-[1rem] border-black/14 bg-white">
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
            onChange={(e) => handleCustomNameChange(e.target.value)}
            placeholder="Nombre"
            maxLength={10}
            className="h-12 rounded-[1rem] border-black/14 bg-white"
          />
          <Input
            value={customNumber}
            onChange={(e) => handleCustomNumberChange(e.target.value)}
            placeholder="Número"
            inputMode="numeric"
            maxLength={2}
            className="h-12 rounded-[1rem] border-black/14 bg-white"
          />
        </div>
      )}

      {/* PREVIEW VISUAL (siempre visible) */}
      <div className="mt-4 rounded-[1.1rem] border border-black/14 bg-white p-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary/70">
          Vista previa en la espalda
        </p>
        <JerseyPreview
          imageUrl={jerseyBackImage}
          name={displayName}
          number={displayNumber}
        />
        <p className="mt-3 text-xs leading-5 text-muted-foreground text-center">
          {displayNote}
        </p>
      </div>

      {/* Resumen en texto (opcional) */}
      <div className="mt-4 rounded-[1.1rem] border border-black/14 bg-white px-4 py-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary/70">
          Resumen
        </p>
        <p className="mt-2 font-headline text-3xl font-semibold uppercase leading-none tracking-[0.04em] text-foreground">
          {displayName || "TU NOMBRE"}
        </p>
        <p className="mt-2 text-sm font-medium text-muted-foreground">
          Dorsal {displayNumber || "00"} ·{" "}
          {currentValue?.styleLabel ||
            value?.styleLabel ||
            "Tipografía oficial"}
        </p>
      </div>
    </div>
  );
}