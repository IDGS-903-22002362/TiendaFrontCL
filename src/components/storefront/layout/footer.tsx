import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Logo } from "@/components/icons";
import { CookieSettingsFooterLink } from "@/components/cookies/cookie-settings-footer-link";
import { useIsFromMobileApp } from "@/hooks/use-from-mobile-app";

const footerColumns = [
  {
    title: "Comprar",
    links: [
      { href: "/products", label: "Todos los productos" },
      { href: "/products?category=jerseys", label: "Jerseys" },
      { href: "/products?tag=new", label: "Novedades" },
      { href: "/products?onlyOffers=true", label: "Oferton" },
    ],
  },
  {
    title: "Soporte",
    links: [
      { href: "/order-history", label: "Pedidos" },
      { href: "/checkout", label: "Envíos y devoluciones" },
      { href: "/login", label: "Cuenta" },
      { href: "/politica-cookies", label: "Política de cookies" },
    ],
  },
];

export function StorefrontFooter() {
  const { isFromMobileApp } = useIsFromMobileApp();

  if (isFromMobileApp) return null;
  return (
    <footer className="border-t border-[#1c2420] bg-[#111715] text-white">
      <div className="container py-12 md:py-16">
        <div className="grid gap-10 rounded-[1.8rem] border border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.05),rgba(255,255,255,0.018))] p-6 md:grid-cols-[1.15fr_0.85fr] md:p-10 lg:p-12">
          <div>
            <p className="editorial-label text-[#d0ad63]">La Guarida</p>
            <h2 className="mt-4 max-w-2xl font-headline text-4xl font-semibold uppercase leading-[0.9] tracking-[0.04em] md:text-6xl"></h2>
            <p className="mt-5 max-w-xl text-sm leading-6 text-white/68 md:text-base">
              E-commerce oficial de Club León con colecciones de ropa deportiva, accesorios y artículos para grandes aficionados.
            </p>
          </div>
          <div className="grid gap-8 border-t border-white/8 pt-2 sm:grid-cols-2 sm:border-t-0 sm:pt-0">
            {footerColumns.map((column) => (
              <div key={column.title}>
                <h3 className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/48">
                  {column.title}
                </h3>
                <ul className="mt-5 space-y-3.5">
                  {column.links.map((link) => (
                    <li key={link.label}>
                      <Link
                        href={link.href}
                        className="group inline-flex items-center gap-2 text-sm text-white/76 transition-colors hover:text-white"
                      >
                        <span>{link.label}</span>
                        <ChevronRight className="h-4 w-4 opacity-60 transition-transform group-hover:translate-x-0.5" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-4 border-t border-white/10 pt-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <Logo className="h-12 w-auto object-contain" />
            <div className="text-sm text-white/60">
              <p>Tienda oficial Club León</p>
              <p>La Guarida</p>
            </div>
          </div>
          <div className="flex flex-col gap-2 md:items-end">
            <CookieSettingsFooterLink />
            <p className="text-xs uppercase tracking-[0.22em] text-white/42">
              {new Date().getFullYear()} La Guarida. Todos los derechos
              reservados.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
