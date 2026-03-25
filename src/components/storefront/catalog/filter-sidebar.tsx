import type { ReactNode } from "react";

export function FilterSidebar({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <aside className="hidden xl:block">
      <div className="sticky top-[calc(var(--storefront-header-current-height,var(--storefront-header-desktop-height))+1.5rem)] rounded-[2rem] border border-border bg-card p-6 shadow-[var(--shadow-card)]">
        {children}
      </div>
    </aside>
  );
}
