import { Suspense, type ReactNode } from "react";
import { StorefrontHeaderShell } from "@/components/storefront/layout/storefront-header-shell";
import { StorefrontShellClient } from "@/components/layout/storefront-shell-client";

type StorefrontShellProps = {
  children: ReactNode;
};

export function StorefrontShell({ children }: StorefrontShellProps) {
  return (
    <>
      <Suspense fallback={null}>
        <StorefrontHeaderShell />
      </Suspense>
      <StorefrontShellClient>{children}</StorefrontShellClient>
    </>
  );
}