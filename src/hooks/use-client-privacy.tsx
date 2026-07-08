"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { resolveClientPrivacyContextFromBrowser } from "@/lib/privacy/client-privacy-browser";
import { setClientOriginForRequests } from "@/lib/privacy/client-origin-store";
import type { ClientPrivacyContext } from "@/lib/privacy/types";
import { WEB_PRIVACY_CONTEXT } from "@/lib/privacy/types";

type ClientPrivacyContextValue = ClientPrivacyContext;

const ClientPrivacyReactContext = createContext<
  ClientPrivacyContextValue | undefined
>(undefined);

export function ClientPrivacyProvider({
  children,
  initialContext = WEB_PRIVACY_CONTEXT,
}: {
  children: ReactNode;
  initialContext?: ClientPrivacyContext;
}) {
  const [context, setContext] = useState(initialContext);

  useEffect(() => {
    const resolved = resolveClientPrivacyContextFromBrowser();
    setContext(resolved);
    setClientOriginForRequests(resolved.origin);
  }, [initialContext]);

  const value = useMemo(() => context, [context]);

  return (
    <ClientPrivacyReactContext.Provider value={value}>
      {children}
    </ClientPrivacyReactContext.Provider>
  );
}

export function useClientPrivacy(): ClientPrivacyContext {
  const contextValue = useContext(ClientPrivacyReactContext);
  return contextValue ?? WEB_PRIVACY_CONTEXT;
}
