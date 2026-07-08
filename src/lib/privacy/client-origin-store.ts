import type { ClientOrigin } from "./types";
import { WEB_PRIVACY_CONTEXT } from "./types";

let currentOrigin: ClientOrigin = WEB_PRIVACY_CONTEXT.origin;

export function setClientOriginForRequests(origin: ClientOrigin): void {
  currentOrigin = origin;
}

export function getClientOriginForRequests(): ClientOrigin {
  return currentOrigin;
}

export function resetClientOriginForRequests(): void {
  currentOrigin = WEB_PRIVACY_CONTEXT.origin;
}
