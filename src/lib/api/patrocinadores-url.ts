/** Cadena vacía si no hay enlace. `null` si el texto no es una URL http(s). */
export function normalizeSponsorUrl(value: string): string | null {
    const trimmed = value.trim();
    if (!trimmed) {
        return "";
    }

    try {
        const parsed = new URL(trimmed);
        if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
            return null;
        }
        return parsed.toString();
    } catch {
        return null;
    }
}
