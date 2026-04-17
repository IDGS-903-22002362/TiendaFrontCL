import type { ReactNode } from "react";

export function FilterSidebar({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <aside className="hidden xl:block">
      <div className="sticky top-[calc(var(--storefront-header-current-height,var(--storefront-header-desktop-height))+1.5rem)] border border-black/14 bg-white p-6 shadow-[0_20px_40px_-36px_rgb(8_12_10_/_0.16)]">
        {children}
      </div>
    </aside>
  );
}
