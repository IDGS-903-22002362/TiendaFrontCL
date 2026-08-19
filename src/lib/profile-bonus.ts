export function normalizeTelefonoDigits(telefono?: string | null): string {
  return String(telefono ?? "").replace(/\D/g, "");
}

export function hasDemographicFieldsComplete(input: {
  telefono?: string | null;
  fechaNacimiento?: string | Date | null;
  genero?: string | null;
}): boolean {
  const telefono = normalizeTelefonoDigits(input.telefono);
  const genero = String(input.genero ?? "").trim();
  const fecha =
    input.fechaNacimiento instanceof Date
      ? input.fechaNacimiento.toISOString().slice(0, 10)
      : String(input.fechaNacimiento ?? "").trim().slice(0, 10);

  return telefono.length === 10 && fecha.length >= 8 && genero.length > 0;
}

/** CTA de +15 pts: solo registro email, sin bono previo y datos demográficos incompletos. */
export function canClaimProfileBonus(user: {
  provider?: string | null;
  bonoPerfilCompletadoAt?: string | null | unknown;
  telefono?: string | null;
  fechaNacimiento?: string | Date | null;
  genero?: string | null;
}): boolean {
  if (user.provider !== "email") return false;
  if (user.bonoPerfilCompletadoAt) return false;
  return !hasDemographicFieldsComplete(user);
}
