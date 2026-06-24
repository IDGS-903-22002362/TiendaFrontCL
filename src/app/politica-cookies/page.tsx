import type { Metadata } from "next";
import Link from "next/link";
import {
  COOKIE_POLICY_VERSION,
  CONSENT_COOKIE_NAME,
} from "@/lib/cookies/constants";
import {
  COOKIE_REGISTRY,
  EXTERNAL_SCRIPTS,
  NECESSARY_THIRD_PARTIES,
  getRegistryByCategory,
} from "@/lib/cookies/registry";

export const metadata: Metadata = {
  title: "Política de cookies",
  description:
    "Información sobre cookies, almacenamiento local y proveedores usados en La Guarida, tienda oficial Club León.",
};

const CATEGORY_LABELS = {
  necessary: "Necesarias",
  preferences: "Preferencias",
  analytics: "Analítica",
  marketing: "Marketing",
} as const;

export default function PoliticaCookiesPage() {
  return (
    <div className="container max-w-3xl py-10 md:py-16">
      <p className="editorial-label text-[#d0ad63]">Legal</p>
      <h1 className="mt-3 font-headline text-3xl font-semibold uppercase tracking-[0.04em] md:text-4xl">
        Política de cookies
      </h1>
      <p className="mt-4 text-sm text-muted-foreground">
        Versión {COOKIE_POLICY_VERSION} · Última actualización: junio 2025
      </p>

      <div className="prose prose-neutral mt-10 max-w-none dark:prose-invert">
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">¿Qué son las cookies?</h2>
          <p className="text-muted-foreground leading-7">
            Las cookies son pequeños archivos que se guardan en tu dispositivo
            cuando visitas nuestra tienda. También usamos{" "}
            <strong>localStorage</strong> y <strong>sessionStorage</strong> para
            funciones esenciales como el carrito de invitado o la idempotencia en
            checkout. Puedes gestionar tus preferencias desde el banner de
            cookies o el enlace &quot;Configuración de cookies&quot; en el pie de
            página.
          </p>
        </section>

        <section className="mt-10 space-y-4">
          <h2 className="text-xl font-semibold">Consentimiento</h2>
          <p className="text-muted-foreground leading-7">
            Guardamos tu elección en la cookie{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
              {CONSENT_COOKIE_NAME}
            </code>{" "}
            durante un máximo de 13 meses. Si cambiamos la política o agregamos
            nuevas finalidades, te volveremos a solicitar consentimiento.
          </p>
        </section>

        {(["necessary", "preferences", "analytics", "marketing"] as const).map(
          (category) => {
            const entries = getRegistryByCategory(category);
            const scripts = EXTERNAL_SCRIPTS.filter((s) => s.category === category);

            if (entries.length === 0 && scripts.length === 0) {
              return null;
            }

            return (
              <section key={category} className="mt-10 space-y-4">
                <h2 className="text-xl font-semibold">
                  {CATEGORY_LABELS[category]}
                </h2>
                {entries.length > 0 ? (
                  <div className="overflow-x-auto rounded-xl border">
                    <table className="w-full min-w-[520px] text-left text-sm">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="px-4 py-3 font-medium">Nombre</th>
                          <th className="px-4 py-3 font-medium">Tipo</th>
                          <th className="px-4 py-3 font-medium">Finalidad</th>
                          <th className="px-4 py-3 font-medium">Duración</th>
                        </tr>
                      </thead>
                      <tbody>
                        {entries.map((entry) => (
                          <tr key={entry.name} className="border-t">
                            <td className="px-4 py-3 font-mono text-xs">
                              {entry.name}
                            </td>
                            <td className="px-4 py-3 capitalize">
                              {entry.kind}
                            </td>
                            <td className="px-4 py-3 text-muted-foreground">
                              {entry.purpose}
                            </td>
                            <td className="px-4 py-3">{entry.duration}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : null}

                {scripts.length > 0 ? (
                  <ul className="list-disc space-y-2 pl-5 text-muted-foreground">
                    {scripts.map((script) => (
                      <li key={script.id}>
                        <strong>{script.provider}</strong>: {script.description}
                        {process.env[script.envKey ?? ""] ? " (activo)" : " (no configurado)"}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </section>
            );
          },
        )}

        <section className="mt-10 space-y-4">
          <h2 className="text-xl font-semibold">
            Proveedores necesarios de terceros
          </h2>
          <ul className="list-disc space-y-2 pl-5 text-muted-foreground">
            {NECESSARY_THIRD_PARTIES.map((item) => (
              <li key={item.provider}>
                <strong>{item.provider}</strong>: {item.purpose}
              </li>
            ))}
          </ul>
          <p className="text-sm text-muted-foreground">
            Stripe puede establecer cookies propias durante el pago embebido para
            prevenir fraude y completar la transacción de forma segura.
          </p>
        </section>

        <section className="mt-10 space-y-4">
          <h2 className="text-xl font-semibold">Cómo cambiar tu elección</h2>
          <p className="text-muted-foreground leading-7">
            Usa el enlace{" "}
            <Link
              href="/?openCookieSettings=1"
              className="text-[#d0ad63] underline underline-offset-2"
            >
              Configuración de cookies
            </Link>{" "}
            en el pie de página en cualquier momento. Retirar el consentimiento
            de analítica o marketing no interrumpe un pago en curso ni cierra tu
            sesión.
          </p>
        </section>

        <section className="mt-10 rounded-xl border bg-muted/30 p-4 text-xs text-muted-foreground">
          <p>
            Inventario técnico: {COOKIE_REGISTRY.length} entradas registradas en
            el sistema. Esta página refleja únicamente cookies, storage y scripts
            presentes o configurables en La Guarida.
          </p>
        </section>
      </div>
    </div>
  );
}
