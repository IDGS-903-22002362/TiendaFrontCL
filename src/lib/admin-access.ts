export const EMPLEADO_ADMIN_PREFIXES = [
  "/admin/ordenes",
  "/admin/inventario",
  "/admin/puntos",
] as const;

export type EmpleadoAdminPath = (typeof EMPLEADO_ADMIN_PREFIXES)[number];

export function getEmpleadoDefaultAdminPath(): EmpleadoAdminPath {
  return "/admin/ordenes";
}

export function isEmpleadoAdminPath(pathname: string): boolean {
  return EMPLEADO_ADMIN_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}