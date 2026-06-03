export const MX_STATES = [
  { label: "Aguascalientes", fedexCode: "AG" },
  { label: "Baja California", fedexCode: "BC" },
  { label: "Baja California Sur", fedexCode: "BS" },
  { label: "Campeche", fedexCode: "CM" },
  { label: "Chiapas", fedexCode: "CS" },
  { label: "Chihuahua", fedexCode: "CH" },
  { label: "Ciudad de México", fedexCode: "DF" },
  { label: "Coahuila de Zaragoza", fedexCode: "CO" },
  { label: "Colima", fedexCode: "CL" },
  { label: "Durango", fedexCode: "DG" },
  { label: "Estado de México", fedexCode: "EM" },
  { label: "Guanajuato", fedexCode: "GT" },
  { label: "Guerrero", fedexCode: "GR" },
  { label: "Hidalgo", fedexCode: "HG" },
  { label: "Jalisco", fedexCode: "JA" },
  { label: "Michoacán", fedexCode: "MI" },
  { label: "Morelos", fedexCode: "MO" },
  { label: "Nayarit", fedexCode: "NA" },
  { label: "Nuevo León", fedexCode: "NL" },
  { label: "Oaxaca", fedexCode: "OA" },
  { label: "Puebla", fedexCode: "PU" },
  { label: "Querétaro", fedexCode: "QE" },
  { label: "Quintana Roo", fedexCode: "QR" },
  { label: "San Luis Potosí", fedexCode: "SL" },
  { label: "Sinaloa", fedexCode: "SI" },
  { label: "Sonora", fedexCode: "SO" },
  { label: "Tabasco", fedexCode: "TB" },
  { label: "Tamaulipas", fedexCode: "TM" },
  { label: "Tlaxcala", fedexCode: "TL" },
  { label: "Veracruz", fedexCode: "VE" },
  { label: "Yucatán", fedexCode: "YU" },
  { label: "Zacatecas", fedexCode: "ZA" },
] as const;

export function normalizeMxText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[.,;:()[\]{}"'`´_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export function getMxStateByFedexCode(value?: string) {
  if (!value) {
    return undefined;
  }

  const code = value.trim().toUpperCase();
  return MX_STATES.find((state) => state.fedexCode === code);
}

export function getMxStateByLabel(value?: string) {
  if (!value) {
    return undefined;
  }

  const normalized = normalizeMxText(value);
  return MX_STATES.find((state) => normalizeMxText(state.label) === normalized);
}
