export function normalizeWhitespace(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

export function normalizeEmail(value: string): string {
  return normalizeWhitespace(value).toLowerCase();
}

export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(value));
}

export function normalizeMxPhone(raw: string): string {
  const digitsOnly = raw.replace(/\D/g, "");
  if (digitsOnly.startsWith("52") && digitsOnly.length === 12) {
    return digitsOnly.slice(2);
  }

  return digitsOnly;
}

export function isValidMxPhone(raw: string): boolean {
  return /^\d{10}$/.test(normalizeMxPhone(raw));
}

export function splitFullName(fullName: string): {
  firstName: string;
  lastName: string;
} {
  const normalized = normalizeWhitespace(fullName);
  if (!normalized) {
    return { firstName: ".", lastName: "." };
  }

  const parts = normalized.split(" ");
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: "." };
  }

  return {
    firstName: parts[0] || ".",
    lastName: parts.slice(1).join(" ") || ".",
  };
}

export function safeString(value: unknown, fallback = ""): string {
  if (typeof value === "string") {
    return value.trim() || fallback;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  return fallback;
}
