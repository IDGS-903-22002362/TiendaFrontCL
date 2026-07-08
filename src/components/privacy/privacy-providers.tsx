import { cookies, headers } from "next/headers";
import type { ReactNode } from "react";
import { ClientPrivacyProvider } from "@/hooks/use-client-privacy";
import { CL_APP_CONTEXT_COOKIE } from "@/lib/privacy/constants";
import { resolveClientPrivacyContext } from "@/lib/privacy/resolve-client-privacy-context";

export async function PrivacyProviders({ children }: { children: ReactNode }) {
  const cookieStore = await cookies();
  const headerStore = await headers();

  const initialContext = resolveClientPrivacyContext({
    cookieValue: cookieStore.get(CL_APP_CONTEXT_COOKIE)?.value,
    userAgent: headerStore.get("user-agent"),
  });

  return (
    <ClientPrivacyProvider initialContext={initialContext}>
      {children}
    </ClientPrivacyProvider>
  );
}
