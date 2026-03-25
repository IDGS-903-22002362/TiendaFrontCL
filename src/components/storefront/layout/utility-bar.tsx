import Link from "next/link";

const links = [
  { href: "/products?category=accesorios", label: "Ayuda" },
  { href: "/order-history", label: "Pedidos" },
  { href: "/checkout", label: "Devoluciones" },
  { href: "/products?category=gorra", label: "Contacto" },
];

export function UtilityBar({ compact = false }: { compact?: boolean }) {
  return (
    <div className="hidden bg-[#0d1110] text-[11px] text-white/72 lg:block">
      <div
        className={`storefront-frame flex items-center justify-between gap-4 transition-[height,padding] duration-300 ${
          compact ? "h-9" : "h-10"
        }`}
      >
        <p className="font-medium uppercase tracking-[0.24em] text-[#d4af37]">
          Beneficios para la afición
        </p>
        <nav aria-label="Accesos de soporte" className="flex items-center gap-5">
          {links.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="transition-colors hover:text-white"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}
