import type { UserRole } from "@/lib/types";

export const INTERNAL_ROLES: readonly UserRole[] = [
  "SUPER_ADMIN",
  "ADMIN",
  "EMPLEADO",
  "EMPLEADO_CLUB",
  "TRABAJADOR_CLUBLEON",
  "CONCESION_SUPERADMIN",
  "CONCESION_ADMIN",
  "CONCESION_VENDEDOR",
];

export function isInternalRole(role: UserRole | "" | undefined): boolean {
  return Boolean(role && INTERNAL_ROLES.includes(role));
}

export function isInternalAccount(
  primaryRole: UserRole | "" | undefined,
  roles?: readonly UserRole[],
): boolean {
  const effectiveRoles = roles?.length ? roles : primaryRole ? [primaryRole] : [];
  return effectiveRoles.some(isInternalRole);
}

export function isStaffAreaPath(pathname: string): boolean {
  return ["/staff", "/admin", "/empleado", "/empleado-club", "/super-admin"].some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}
