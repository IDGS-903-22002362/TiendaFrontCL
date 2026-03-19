import Link from 'next/link';
import { Logo } from '@/components/icons';

const footerLinks = {
  shop: [
    { href: '/products?category=jerseys', label: 'Jerseys' },
    { href: '/products?tag=new', label: 'Novedades' },
    { href: '/products?tag=sale', label: 'Ofertas' },
  ],
  support: [
    { href: '#', label: 'Contacto' },
    { href: '#', label: 'Preguntas Frecuentes' },
    { href: '#', label: 'Envíos y Devoluciones' },
  ],
  legal: [
    { href: '#', label: 'Términos y Condiciones' },
    { href: '#', label: 'Aviso de Privacidad' },
  ],
};

export function Footer() {
  return (
    <footer className="border-t border-border bg-background-deep/95">
      <div className="container py-10 md:py-14">
        <div className="mb-8 flex flex-col gap-4 rounded-[28px] border border-secondary/20 bg-[linear-gradient(135deg,rgba(10,130,66,0.18),rgba(20,20,20,0.96)_45%,rgba(237,205,18,0.12))] px-5 py-5 md:mb-10 md:flex-row md:items-center md:justify-between md:px-6">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-secondary">
              Club León
            </p>
            <p className="mt-1 max-w-lg font-headline text-xl font-bold text-foreground md:text-2xl">
              Equipación oficial con identidad premium deportiva
            </p>
          </div>
          <span className="inline-flex self-start rounded-full border border-secondary/35 bg-secondary/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-secondary">
            Ecommerce oficial
          </span>
        </div>

        <div className="grid grid-cols-1 gap-8 border-t border-border/70 pt-8 md:grid-cols-4">
          <div className="md:col-span-1">
            <Link href="/" className="flex items-center">
              <Logo className="h-14 w-auto md:h-16" />
            </Link>
            <p className="mt-4 max-w-sm text-sm leading-6 text-text-secondary">
              Jerseys, accesorios y piezas destacadas con una experiencia
              moderna, sobria y de alto contraste.
            </p>
          </div>
          <div>
            <h3 className="font-headline text-sm font-semibold uppercase tracking-[0.22em] text-secondary">
              Tienda
            </h3>
            <ul className="mt-4 space-y-2">
              {footerLinks.shop.map(link => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-text-secondary hover:text-foreground"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="font-headline text-sm font-semibold uppercase tracking-[0.22em] text-secondary">
              Soporte
            </h3>
            <ul className="mt-4 space-y-2">
              {footerLinks.support.map(link => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-text-secondary hover:text-foreground"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="font-headline text-sm font-semibold uppercase tracking-[0.22em] text-secondary">Legal</h3>
            <ul className="mt-4 space-y-2">
              {footerLinks.legal.map(link => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-text-secondary hover:text-foreground"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="mt-10 border-t border-border pt-6 text-center text-xs leading-5 text-text-muted md:mt-12 md:pt-8 md:text-sm">
          <p>&copy; {new Date().getFullYear()} Tienda Oficial del Club León La Guarida del León. Todos los derechos reservados.</p>
        </div>
      </div>
    </footer>
  );
}
