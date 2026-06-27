import type { ErrorEvent } from "@sentry/nextjs";

const SENSITIVE_KEY_PATTERN =
  /(password|token|secret|authorization|card|cvv|cvc|pan|payment|stripe|clientSecret|client_secret|api[_-]?key)/i;

function scrubValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(scrubValue);
  }

  if (value && typeof value === "object") {
    return scrubObject(value as Record<string, unknown>);
  }

  return value;
}

function scrubObject(input: Record<string, unknown>): Record<string, unknown> {
  const output: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(input)) {
    if (SENSITIVE_KEY_PATTERN.test(key)) {
      output[key] = "[Filtered]";
      continue;
    }

    output[key] = scrubValue(value);
  }

  return output;
}

export function scrubSentryEvent(event: ErrorEvent): ErrorEvent | null {
  if (event.request?.headers) {
    event.request.headers = scrubObject(
      event.request.headers as Record<string, unknown>,
    ) as typeof event.request.headers;
  }

  if (event.request?.data && typeof event.request.data === "object") {
    event.request.data = scrubObject(
      event.request.data as Record<string, unknown>,
    );
  }

  if (event.extra) {
    event.extra = scrubObject(event.extra as Record<string, unknown>);
  }

  if (event.contexts) {
    event.contexts = scrubObject(
      event.contexts as Record<string, unknown>,
    ) as typeof event.contexts;
  }

  return event;
}