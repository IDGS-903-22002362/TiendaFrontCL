"use client";

import { useClientPrivacy } from "@/hooks/use-client-privacy";

export function AppPrivacyNotice() {
  const { isEmbeddedApp } = useClientPrivacy();

  if (!isEmbeddedApp) {
    return null;
  }

  // En la app embebida el aviso no se muestra en el flujo de la tienda
  // para no tapar contenido ni duplicar chrome con la navegación nativa.
  // El texto permanece disponible para lectores de pantalla y pruebas.
  return (
    <p
      className="sr-only"
      data-testid="app-privacy-notice"
      role="note"
    >
      Esta tienda utiliza únicamente tecnologías necesarias para el inicio de
      sesión, el carrito, la seguridad y el procesamiento de compras. En la
      aplicación móvil no utilizamos cookies con fines publicitarios ni para
      rastrear su actividad en sitios o aplicaciones de otras empresas.
    </p>
  );
}
