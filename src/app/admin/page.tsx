import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const sections = [
  {
    href: "/admin/ordenes",
    title: "Órdenes",
    description: "Seguimiento logístico, cancelaciones y estatus de los pedidos.",
  },
  {
    href: "/admin/productos",
    title: "Productos",
    description: "Alta de productos, edición de catálogo, tallas e imágenes.",
  },
  {
    href: "/admin/inventario",
    title: "Inventario",
    description: "Movimientos, ajustes y alertas de stock.",
  },
  {
    href: "/admin/lineas",
    title: "Líneas",
    description: "Gestión parcial de líneas del catálogo.",
  },
  {
    href: "/admin/tallas",
    title: "Tallas",
    description: "Gestión parcial de tallas y orden de visualización.",
  },
  {
    href: "/admin/proveedores",
    title: "Proveedores",
    description: "CRUD de proveedores para operación administrativa.",
  },
];

export default function AdminHomePage() {
  return (
    <div className="container mx-auto space-y-6 px-4 py-8">
      <header>
        <h1 className="font-headline text-3xl font-bold">Panel admin</h1>
        <p className="text-sm text-muted-foreground">
          Sección operativa para líneas, tallas e inventario.
        </p>
      </header>
      <Card>
        <CardContent className="py-4 text-sm text-muted-foreground">
          El acceso admin depende de tu sesión autenticada. Si aún no iniciaste
          sesión, entra desde{" "}
          <Link href="/login" className="font-medium text-primary">
            /login
          </Link>
          .
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {sections.map((section) => (
          <Link key={section.href} href={section.href} className="h-full">
            <Card className="h-full transition-colors hover:border-primary">
              <CardHeader>
                <CardTitle>{section.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {section.description}
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
