export const EMPLEADO_ADMIN_PREFIXES = [
  "/admin/ordenes",
  "/admin/inventario",
  "/admin/puntos",
] as const;

export const EMPLEADO_ADMIN_BLOCKED_PREFIXES = [
  "/admin/puntos/reportes",
] as const;

export type EmpleadoAdminPath = (typeof EMPLEADO_ADMIN_PREFIXES)[number];

export function getEmpleadoDefaultAdminPath(): EmpleadoAdminPath {
  return "/admin/ordenes";
}

export function isEmpleadoAdminPath(pathname: string): boolean {
  if (
    EMPLEADO_ADMIN_BLOCKED_PREFIXES.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
    )
  ) {
    return false;
  }

  return EMPLEADO_ADMIN_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}