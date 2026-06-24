"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  DEFAULT_CONSENT,
  type ConsentCategories,
} from "@/lib/cookies/constants";
import { useCookieConsent } from "@/hooks/use-cookie-consent";

type CategoryConfig = {
  key: keyof ConsentCategories;
  title: string;
  description: string;
  locked?: boolean;
};

const CATEGORY_CONFIG: CategoryConfig[] = [
  {
    key: "necessary",
    title: "Necesarias",
    description:
      "Imprescindibles para iniciar sesión, mantener el carrito, procesar checkout y pagos de forma segura.",
    locked: true,
  },
  {
    key: "preferences",
    title: "Preferencias",
    description:
      "Recuerdan opciones como lista de deseos, personalización del catálogo y estado del panel admin.",
  },
  {
    key: "analytics",
    title: "Analítica",
    description:
      "Nos ayudan a entender el uso de la tienda y mejorar la experiencia (p. ej. Google Analytics, Clarity).",
  },
  {
    key: "marketing",
    title: "Marketing",
    description:
      "Permiten medir campañas y remarketing en plataformas como Meta o TikTok, solo si están configuradas.",
  },
];

export function CookieSettingsDialog() {
  const {
    showSettings,
    closeSettings,
    savePreferences,
    acceptAll,
    rejectNonEssential,
    consent,
  } = useCookieConsent();

  const [draft, setDraft] = useState<ConsentCategories>(DEFAULT_CONSENT);

  useEffect(() => {
    if (showSettings) {
      setDraft(consent?.categories ?? DEFAULT_CONSENT);
    }
  }, [showSettings, consent]);

  return (
    <Dialog open={showSettings} onOpenChange={(open) => !open && closeSettings()}>
      <DialogContent
        className="max-h-[90vh] overflow-y-auto border-white/10 bg-[#111715] text-white sm:max-w-lg"
        data-testid="cookie-settings-dialog"
      >
        <DialogHeader>
          <DialogTitle className="font-headline text-lg uppercase tracking-[0.08em]">
            Configuración de cookies
          </DialogTitle>
          <DialogDescription className="text-white/65">
            Elige qué categorías autorizas. Las cookies necesarias siempre están
            activas para que la tienda funcione.{" "}
            <Link
              href="/politica-cookies"
              className="text-[#d0ad63] underline underline-offset-2"
            >
              Más información
            </Link>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {CATEGORY_CONFIG.map((category) => (
            <div
              key={category.key}
              className="flex items-start justify-between gap-4 rounded-xl border border-white/10 bg-white/[0.03] p-4"
            >
              <div className="space-y-1.5">
                <Label
                  htmlFor={`cookie-toggle-${category.key}`}
                  className="text-sm font-semibold text-white"
                >
                  {category.title}
                </Label>
                <p className="text-xs leading-5 text-white/60">
                  {category.description}
                </p>
              </div>
              <Switch
                id={`cookie-toggle-${category.key}`}
                checked={draft[category.key]}
                disabled={category.locked}
                onCheckedChange={(checked) =>
                  setDraft((prev) => ({
                    ...prev,
                    [category.key]: category.locked ? true : checked,
                  }))
                }
                aria-readonly={category.locked}
                data-testid={`cookie-toggle-${category.key}`}
              />
            </div>
          ))}
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button
            type="button"
            className="w-full bg-[#d0ad63] text-[#111715] hover:bg-[#e0bd73]"
            onClick={() => savePreferences(draft)}
            data-testid="cookie-save-preferences"
          >
            Guardar preferencias
          </Button>
          <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-2">
            <Button
              type="button"
              variant="outline"
              className="border-white/20 bg-transparent text-white hover:bg-white/10"
              onClick={rejectNonEssential}
            >
              Solo necesarias
            </Button>
            <Button
              type="button"
              variant="outline"
              className="border-white/20 bg-transparent text-white hover:bg-white/10"
              onClick={acceptAll}
            >
              Aceptar todas
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
