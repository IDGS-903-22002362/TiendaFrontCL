import Link from "next/link";

const links = [
  { href: "/products?category=accesorios", label: "Ayuda" },
  { href: "/order-history", label: "Pedidos" },
  { href: "/checkout", label: "Devoluciones" },
  { href: "/products?category=gorra", label: "Contacto" },
];

export function UtilityBar() {
  return (
    <div className="hidden border-b border-black bg-black text-[10px] text-white/60 lg:block">
      <div className="storefront-frame flex h-9 items-center justify-between gap-6">
        <div className="flex items-center gap-3">
          <span className="h-1.5 w-1.5 rounded-full bg-[#b99145]" />
          <p className="editorial-label text-[#c9a562]">Beneficios para la afición</p>
        </div>
        <nav
          aria-label="Accesos de soporte"
          className="flex items-center gap-5 text-[0.72rem] tracking-[0.08em] text-white/62"
        >
          {links.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="relative py-1 hover:text-white"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}
