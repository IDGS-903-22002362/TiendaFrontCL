import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Logo } from "@/components/icons";

const footerColumns = [
  {
    title: "Comprar",
    links: [
      { href: "/products", label: "Todos los productos" },
      { href: "/products?category=jerseys", label: "Jerseys" },
      { href: "/products?tag=new", label: "Novedades" },
      { href: "/products?tag=sale", label: "Ofertas" },
    ],
  },
  {
    title: "Soporte",
    links: [
      { href: "/order-history", label: "Pedidos" },
      { href: "/checkout", label: "Envíos y devoluciones" },
      { href: "/login", label: "Cuenta" },
      { href: "/products?category=accesorios", label: "Ayuda" },
    ],
  },
];

export function StorefrontFooter() {
  return (
    <footer className="border-t border-border bg-[#111614] text-white">
      <div className="container py-10 md:py-14">
        <div className="grid gap-8 rounded-[2rem] border border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.03),rgba(255,255,255,0.015))] p-6 md:grid-cols-[1.2fr_0.8fr] md:p-10">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#d4af37]">
              La Guarida
            </p>
            <h2 className="mt-3 max-w-2xl font-headline text-4xl font-semibold uppercase leading-none tracking-[0.04em] md:text-6xl">
              Producto oficial con una experiencia limpia, rápida y comercial.
            </h2>
            <p className="mt-4 max-w-xl text-sm leading-6 text-white/70 md:text-base">
              E-commerce oficial de Club León con foco en producto, navegación clara y compra sin fricción.
            </p>
          </div>
          <div className="grid gap-8 sm:grid-cols-2">
            {footerColumns.map((column) => (
              <div key={column.title}>
                <h3 className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/52">
                  {column.title}
                </h3>
                <ul className="mt-4 space-y-3">
                  {column.links.map((link) => (
                    <li key={link.label}>
                      <Link
                        href={link.href}
                        className="group inline-flex items-center gap-2 text-sm text-white/80 transition-colors hover:text-white"
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
          <p className="text-xs uppercase tracking-[0.22em] text-white/42">
            {new Date().getFullYear()} La Guarida. Todos los derechos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
}
