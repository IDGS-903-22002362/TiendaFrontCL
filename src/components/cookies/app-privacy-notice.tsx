"use client";

import { useClientPrivacy } from "@/hooks/use-client-privacy";

export function AppPrivacyNotice() {
  const { isEmbeddedApp } = useClientPrivacy();

  if (!isEmbeddedApp) {
    return null;
  }

  return (
    <div
      className="border-b border-border/60 bg-muted/40 px-4 py-3 text-center text-sm text-muted-foreground"
      data-testid="app-privacy-notice"
      role="note"
    >
      Esta tienda utiliza únicamente tecnologías necesarias para el inicio de
      sesión, el carrito, la seguridad y el procesamiento de compras. En la
      aplicación móvil no utilizamos cookies con fines publicitarios ni para
      rastrear su actividad en sitios o aplicaciones de otras empresas.
    </div>
  );
}
