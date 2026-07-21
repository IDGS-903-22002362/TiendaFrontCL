const MEMBER_ID_PATTERN = /^[A-Za-z0-9_-]{5,128}$/;

function candidateFromObject(value: unknown): string {
  if (!value || typeof value !== "object") return "";
  const record = value as Record<string, unknown>;
  for (const key of ["memberId", "uid", "clientId", "id"]) {
    if (typeof record[key] === "string") return record[key].trim();
  }
  return "";
}

export function extractMemberIdFromQr(payload: string): string | null {
  const trimmed = payload.trim();
  if (!trimmed || trimmed.length > 512) return null;

  let candidate = trimmed;
  try {
    candidate = candidateFromObject(JSON.parse(trimmed)) || candidate;
  } catch {
    try {
      const url = new URL(trimmed);
      candidate =
        url.searchParams.get("memberId") ??
        url.searchParams.get("uid") ??
        url.searchParams.get("clientId") ??
        "";
    } catch {
      // Los QR existentes contienen directamente el UID.
    }
  }

  return MEMBER_ID_PATTERN.test(candidate) ? candidate : null;
}

export class KeyboardWedgeBuffer {
  private value = "";
  private lastAt = 0;
  private cadenceValid = true;

  constructor(
    private readonly maxGapMs = 80,
    private readonly maxSubmitGapMs = 150,
  ) {}

  push(key: string, at: number): string | null {
    if (key === "Enter") {
      const candidate =
        this.cadenceValid && at - this.lastAt <= this.maxSubmitGapMs
          ? extractMemberIdFromQr(this.value)
          : null;
      this.reset();
      return candidate;
    }

    if (key.length !== 1) return null;
    if (this.lastAt && at - this.lastAt > this.maxGapMs) {
      this.value = "";
      this.cadenceValid = true;
      this.lastAt = 0;
    }
    this.value = (this.value + key).slice(-512);
    this.lastAt = at;
    return null;
  }

  reset(): void {
    this.value = "";
    this.lastAt = 0;
    this.cadenceValid = true;
  }
}

export function isEditableScannerTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(
    target.closest("input, textarea, select, [contenteditable='true'], [role='textbox']"),
  );
}
