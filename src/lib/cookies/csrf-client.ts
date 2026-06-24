import { CSRF_COOKIE_NAME } from "./constants";

/** Lee token CSRF desde document.cookie en el cliente. */
export function readCsrfTokenFromDocument(): string {
  if (typeof document === "undefined") {
    return "";
  }

  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${CSRF_COOKIE_NAME}=`));

  return match ? match.slice(CSRF_COOKIE_NAME.length + 1) : "";
}
