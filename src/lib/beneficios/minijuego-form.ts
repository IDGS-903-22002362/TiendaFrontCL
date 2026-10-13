const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmail(value: string): string {
    return value.trim().toLowerCase();
}

export function parseEmailDraft(raw: string): {
    emails: string[];
    invalid: string[];
} {
    const parts = raw
        .split(/[\s,;]+/)
        .map((part) => normalizeEmail(part))
        .filter((part) => part.length > 0);
    const emails: string[] = [];
    const invalid: string[] = [];
    const seen = new Set<string>();

    for (const part of parts) {
        if (!EMAIL_RE.test(part) || part.length > 200) {
            invalid.push(part);
            continue;
        }
        if (seen.has(part)) continue;
        seen.add(part);
        emails.push(part);
    }

    return { emails, invalid };
}

export function isoToDatetimeLocal(value?: string | null): string {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";

    const pad = (part: number) => String(part).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function datetimeLocalToIso(value: string): string | null {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const date = new Date(trimmed);
    if (Number.isNaN(date.getTime())) return null;
    return date.toISOString();
}
