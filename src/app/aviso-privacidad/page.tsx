import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Aviso de privacidad",
  description:
    "Aviso de privacidad integral de La Guarida, tienda oficial Club Leon, conforme a la LFPDPPP.",
};

const RESPONSABLE = "Fuerza Deportiva del Club Leon S.A. de C.V.";
const DOMICILIO =
  "Blvd. Adolfo Lopez Mateos Oriente 1810, Colonia La Martinica, C.P. 37500, Leon, Guanajuato, Mexico.";
const CORREO_ARCO = "aficion@clubleon.mx";
const CORREO_TIENDA = "laguaridadelleon1944@gmail.com";
const TELEFONO = "+52 477-918-4579";

export default function AvisoPrivacidadPage() {
  return (
    <main className="container mx-auto max-w-3xl px-4 py-12 md:py-16">
      <header className="mb-10 text-center">
        <p className="editorial-label text-[#d0ad63]">Legal</p>
        <h1 className="mt-3 font-headline text-3xl font-bold md:text-4xl">
          Aviso de privacidad
        </h1>
        <p className="mt-4 text-muted-foreground">
          Ultima actualizacion:{" "}
          {new Date().toLocaleDateString("es-MX", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </p>
      </header>

      <article className="prose prose-muted max-w-none space-y-8">
        <section>
          <h2>1. Identidad y domicilio del responsable</h2>
          <p>
            <strong>{RESPONSABLE}</strong>, con domicilio en {DOMICILIO}, es
            responsable del tratamiento de sus datos personales recabados a
            traves de La Guarida, tienda en linea oficial del Club Leon,
            conforme a la Ley Federal de Proteccion de Datos Personales en
            Posesion de los Particulares (LFPDPPP) y demas disposiciones
            aplicables en Mexico.
          </p>
        </section>

        <section>
          <h2>2. Datos personales que recabamos</h2>
          <ul className="list-disc space-y-2 pl-10">
            <li>Identificacion y contacto: nombre, correo, telefono y fecha de nacimiento.</li>
            <li>Cuenta y acceso: credenciales o acceso social autorizado.</li>
            <li>Datos de compra: direccion, pedidos, tallas y referencias de pago (sin datos completos de tarjeta).</li>
            <li>Atencion al cliente: mensajes y solicitudes de cambio o devolucion.</li>
            <li>Datos tecnicos: IP, cookies y registros de uso cuando sea necesario.</li>
          </ul>
        </section>

        <section>
          <h2>3. Finalidades del tratamiento</h2>
          <h3>3.1 Finalidades primarias</h3>
          <ul className="list-disc space-y-2 pl-10">
            <li>Administrar cuenta, pedidos, pagos, envios y recoleccion en tienda.</li>
            <li>Atender soporte, cambios, devoluciones y obligaciones legales.</li>
            <li>Proteger la seguridad de la plataforma y prevenir fraude.</li>
          </ul>
          <h3>3.2 Finalidades secundarias</h3>
          <ul className="list-disc space-y-2 pl-10">
            <li>Promociones, novedades y analitica sujeta a consentimiento.</li>
          </ul>
        </section>

        <section>
          <h2>4. Transferencias de datos</h2>
          <p>
            Compartimos datos con proveedores esenciales (pagos, autenticacion,
            mensajeria, hosting) bajo obligaciones de confidencialidad. No
            vendemos datos personales.
          </p>
        </section>

        <section>
          <h2>5. Cookies</h2>
          <p>
            Consulte nuestra{" "}
            <Link href="/politica-cookies" className="text-primary underline">
              Politica de cookies
            </Link>{" "}
            para gestionar preferencias.
          </p>
        </section>

        <section>
          <h2>6. Derechos ARCO</h2>
          <p>
            Puede ejercer acceso, rectificacion, cancelacion u oposicion en{" "}
            <a href={`mailto:${CORREO_ARCO}`} className="text-primary underline">
              {CORREO_ARCO}
            </a>
            .
          </p>
        </section>

        <section>
          <h2>7. Conservacion y seguridad</h2>
          <p>
            Conservamos datos el tiempo necesario para las finalidades descritas.
            Los pagos se procesan con proveedores certificados; no almacenamos
            numeros completos de tarjeta.
          </p>
        </section>

        <section id="contacto">
          <h2>8. Contacto</h2>
          <ul className="list-disc space-y-2 pl-10">
            <li>Responsable: {RESPONSABLE}</li>
            <li>Correo ARCO: {CORREO_ARCO}</li>
            <li>Soporte tienda: {CORREO_TIENDA}</li>
            <li>Telefono: {TELEFONO}</li>
            <li>Domicilio: {DOMICILIO}</li>
          </ul>
        </section>
      </article>

      <footer className="mt-12 border-t pt-8 text-center text-sm text-muted-foreground">
        <p>
          &copy; {new Date().getFullYear()} La Guarida del Leon. Todos los derechos reservados.
        </p>
      </footer>
    </main>
  );
}