"use client";

import { useMemo, useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
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
  formatCurrency,
  getPersonalizationPresets,
  sanitizePersonalizationName,
  sanitizePersonalizationNumber,
} from "@/lib/storefront";
import { PERSONALIZATION_FEE_MXN } from "@/lib/cart-personalization";
import type { ProductPersonalization } from "@/lib/storefront/types";
import { cn } from "@/lib/utils";
import { JerseyPreview } from "./JerseyPreview";

type PersonalizationPanelProps = {
  value?: ProductPersonalization | null;
  onChange: (value: ProductPersonalization | null) => void;
  jerseyBackImage: string;
  feePerUnit?: number;
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
    left.number === right.number
  );
}

export function PersonalizationPanel({
  value,
  onChange,
  jerseyBackImage,
  feePerUnit = PERSONALIZATION_FEE_MXN,
}: PersonalizationPanelProps) {
  const defaultPresetId = presets[0]?.id ?? "";
  const [purchaseMode, setPurchaseMode] = useState<"plain" | "personalized">(
    value ? "personalized" : "plain",
  );
  const [customMode, setCustomMode] = useState<"player" | "custom">(
    value?.mode ?? "player",
  );
  const [presetId, setPresetId] = useState(defaultPresetId);
  const [customName, setCustomName] = useState(value?.name ?? "");
  const [customNumber, setCustomNumber] = useState(value?.number ?? "");

  useEffect(() => {
    if (value) {
      setPurchaseMode("personalized");
      setCustomMode(value.mode);
      setCustomName(value.name);
      setCustomNumber(value.number);
      if (value.mode === "player") {
        const matchingPreset = presets.find(
          (preset) => preset.name === value.name && preset.number === value.number,
        );
        if (matchingPreset) {
          setPresetId(matchingPreset.id);
        }
      }
      return;
    }

    setPurchaseMode("plain");
  }, [value]);

  const personalizedValue = useMemo(() => {
    if (purchaseMode !== "personalized") {
      return null;
    }

    if (customMode === "player") {
      return buildPresetPersonalization(presetId);
    }

    const nextValue = buildCustomPersonalization(customName, customNumber);
    if (!nextValue.name || !nextValue.number) {
      return null;
    }

    return nextValue;
  }, [purchaseMode, customMode, presetId, customName, customNumber]);

  const handlePlainSelection = () => {
    setPurchaseMode("plain");
    onChange(null);
  };

  const handlePersonalizedSelection = () => {
    setPurchaseMode("personalized");
    if (customMode === "player") {
      const presetValue = buildPresetPersonalization(presetId);
      if (!isSamePersonalization(presetValue, value)) {
        onChange(presetValue);
      }
      return;
    }

    const customValue = buildCustomPersonalization(customName, customNumber);
    if (customValue.name && customValue.number) {
      if (!isSamePersonalization(customValue, value)) {
        onChange(customValue);
      }
    } else {
      onChange(null);
    }
  };

  const handleCustomModeChange = (nextMode: "player" | "custom") => {
    setCustomMode(nextMode);
    if (purchaseMode !== "personalized") {
      return;
    }

    if (nextMode === "player") {
      const presetValue = buildPresetPersonalization(presetId);
      if (!isSamePersonalization(presetValue, value)) {
        onChange(presetValue);
      }
      return;
    }

    const customValue = buildCustomPersonalization(customName, customNumber);
    if (customValue.name && customValue.number) {
      if (!isSamePersonalization(customValue, value)) {
        onChange(customValue);
      }
    } else {
      onChange(null);
    }
  };

  const handlePresetChange = (nextPresetId: string) => {
    setPresetId(nextPresetId);
    if (purchaseMode !== "personalized") {
      return;
    }

    const presetValue = buildPresetPersonalization(nextPresetId);
    if (!isSamePersonalization(presetValue, value)) {
      onChange(presetValue);
    }
  };

  const handleCustomNameChange = (nextName: string) => {
    const sanitized = sanitizePersonalizationName(nextName);
    setCustomName(sanitized);
    if (purchaseMode !== "personalized" || customMode !== "custom") {
      return;
    }

    const customValue = buildCustomPersonalization(sanitized, customNumber);
    if (customValue.name && customValue.number) {
      if (!isSamePersonalization(customValue, value)) {
        onChange(customValue);
      }
    } else if (value !== null) {
      onChange(null);
    }
  };

  const handleCustomNumberChange = (nextNumber: string) => {
    const sanitized = sanitizePersonalizationNumber(nextNumber);
    setCustomNumber(sanitized);
    if (purchaseMode !== "personalized" || customMode !== "custom") {
      return;
    }

    const customValue = buildCustomPersonalization(customName, sanitized);
    if (customValue.name && customValue.number) {
      if (!isSamePersonalization(customValue, value)) {
        onChange(customValue);
      }
    } else if (value !== null) {
      onChange(null);
    }
  };

  const previewName =
    purchaseMode === "personalized"
      ? personalizedValue?.name || value?.name || ""
      : "";
  const previewNumber =
    purchaseMode === "personalized"
      ? personalizedValue?.number || value?.number || ""
      : "";

  return (
    <div className="rounded-[1.3rem] border border-black/14 bg-white p-4 shadow-none">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="editorial-label text-primary/74">Jersey</p>
            {feePerUnit > 0 ? (
              <span className="rounded-full border border-primary/25 bg-primary/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-primary">
                Personalización +{formatCurrency(feePerUnit)}
              </span>
            ) : null}
          </div>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Puedes comprarlo en blanco o agregar nombre y número en la espalda.
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
        <button
          type="button"
          onClick={handlePlainSelection}
          className={cn(
            "rounded-full border px-4 py-3 text-left text-sm font-medium transition-all",
            purchaseMode === "plain"
              ? "border-primary bg-primary text-primary-foreground shadow-md"
              : "border-black/14 bg-white text-foreground hover:-translate-y-px hover:border-black",
          )}
        >
          <span className="block font-semibold">Sin personalización</span>
          <span
            className={cn(
              "mt-1 block text-xs",
              purchaseMode === "plain"
                ? "text-primary-foreground/85"
                : "text-muted-foreground",
            )}
          >
            Jersey en blanco, sin cargo extra
          </span>
        </button>
        <button
          type="button"
          onClick={handlePersonalizedSelection}
          className={cn(
            "rounded-full border px-4 py-3 text-left text-sm font-medium transition-all",
            purchaseMode === "personalized"
              ? "border-primary bg-primary text-primary-foreground shadow-md"
              : "border-black/14 bg-white text-foreground hover:-translate-y-px hover:border-black",
          )}
        >
          <span className="block font-semibold">Personalizar</span>
          <span
            className={cn(
              "mt-1 block text-xs",
              purchaseMode === "personalized"
                ? "text-primary-foreground/85"
                : "text-muted-foreground",
            )}
          >
            +{formatCurrency(feePerUnit)} por pieza
          </span>
        </button>
      </div>

      {purchaseMode === "personalized" ? (
        <>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleCustomModeChange("player")}
              className={cn(
                "rounded-full border px-4 py-2 text-sm font-medium transition-all",
                customMode === "player"
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-black/14 bg-white text-foreground hover:border-black",
              )}
            >
              Elegir jugador
            </button>
            <button
              type="button"
              onClick={() => handleCustomModeChange("custom")}
              className={cn(
                "rounded-full border px-4 py-2 text-sm font-medium transition-all",
                customMode === "custom"
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-black/14 bg-white text-foreground hover:border-black",
              )}
            >
              Añadir el tuyo
            </button>
          </div>

          {customMode === "player" ? (
            <div className="mt-4">
              <Select value={presetId} onValueChange={handlePresetChange}>
                <SelectTrigger className="h-12 rounded-[1rem] border-black/14 bg-white">
                  <SelectValue placeholder="Selecciona un jugador" />
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
                onChange={(event) => handleCustomNameChange(event.target.value)}
                placeholder="Nombre"
                maxLength={10}
                className="h-12 rounded-[1rem] border-black/14 bg-white"
              />
              <Input
                value={customNumber}
                onChange={(event) => handleCustomNumberChange(event.target.value)}
                placeholder="Número"
                inputMode="numeric"
                maxLength={2}
                className="h-12 rounded-[1rem] border-black/14 bg-white"
              />
            </div>
          )}

          <div className="mt-4 rounded-[1.1rem] border border-primary/20 bg-primary/5 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary/70">
              Vista previa en la espalda
            </p>
            <JerseyPreview
              imageUrl={jerseyBackImage}
              name={previewName}
              number={previewNumber}
            />
            <p className="mt-3 text-xs leading-5 text-muted-foreground text-center">
              Producto personalizado. No aplica para devoluciones.
            </p>
          </div>

          <div className="mt-4 rounded-[1.1rem] border border-black/14 bg-white px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary/70">
              Resumen
            </p>
            <p className="mt-2 font-headline text-3xl font-semibold uppercase leading-none tracking-[0.04em] text-foreground">
              {previewName || "TU NOMBRE"}
            </p>
            <p className="mt-2 text-sm font-medium text-muted-foreground">
              Dorsal {previewNumber || "00"}
            </p>
            {feePerUnit > 0 ? (
              <p className="mt-2 text-sm font-semibold text-primary">
                +{formatCurrency(feePerUnit)} por personalización
              </p>
            ) : null}
          </div>
        </>
      ) : (
        <div className="mt-4 rounded-[1.1rem] border border-black/14 bg-muted/30 px-4 py-4">
          <p className="text-sm font-medium text-foreground">
            Comprarás el jersey sin nombre ni número en la espalda.
          </p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Si prefieres dorsal personalizado, elige la opción Personalizar arriba.
          </p>
        </div>
      )}
    </div>
  );
}