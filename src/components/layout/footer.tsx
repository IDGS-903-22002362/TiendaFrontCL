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
    <footer className="bg-secondary">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          <div className="col-span-2 mb-8 md:col-span-1 md:mb-0">
            <Link href="/" className="flex items-center gap-2">
              <Logo className="h-10 w-auto" />
              <span className="font-headline text-2xl font-bold">
                La Dungeon
              </span>
            </Link>
            <p className="mt-4 text-muted-foreground">
              Tu tienda de confianza.
            </p>
          </div>
          <div>
            <h3 className="font-headline font-semibold tracking-wider">
              Tienda
            </h3>
            <ul className="mt-4 space-y-2">
              {footerLinks.shop.map(link => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-muted-foreground hover:text-primary"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="font-headline font-semibold tracking-wider">
              Soporte
            </h3>
            <ul className="mt-4 space-y-2">
              {footerLinks.support.map(link => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-muted-foreground hover:text-primary"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="font-headline font-semibold tracking-wider">Legal</h3>
            <ul className="mt-4 space-y-2">
              {footerLinks.legal.map(link => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-muted-foreground hover:text-primary"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="mt-12 border-t pt-8 text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} La Dungeon. Todos los derechos reservados.</p>
        </div>
      </div>
    </footer>
  );
}
