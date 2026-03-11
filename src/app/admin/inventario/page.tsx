import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const sections = [
  {
    href: "/admin/inventario/movimientos",
    title: "Movimientos",
    description: "Historial paginado con filtros por tipo, producto y fechas.",
  },
  {
    href: "/admin/inventario/ajustes",
    title: "Ajustes",
    description:
      "Ajuste puntual de stock y reemplazo masivo de inventario por talla.",
  },
  {
    href: "/admin/inventario/alertas-stock",
    title: "Alertas",
    description: "Consulta de stock bajo y criticidad.",
  },
];

export default function AdminInventoryHomePage() {
  return (
    <div className="container mx-auto space-y-6 px-4 py-8">
      <header>
        <h1 className="font-headline text-3xl font-bold">Inventario</h1>
        <p className="text-sm text-muted-foreground">
          Módulo operativo de inventario para admin y empleados.
        </p>
      </header>
      <Card>
        <CardContent className="py-4 text-sm text-muted-foreground">
          Este módulo requiere sesión activa con rol ADMIN o EMPLEADO. Si aún no
          has iniciado sesión, entra desde{" "}
          <Link href="/login" className="font-medium text-primary">
            /login
          </Link>
          .
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {sections.map((section) => (
          <Link key={section.href} href={section.href}>
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
