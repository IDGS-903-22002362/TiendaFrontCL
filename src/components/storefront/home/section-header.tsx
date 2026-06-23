import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type SectionHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  theme?: "light" | "dark";
  className?: string;
};

export function SectionHeader({
  eyebrow,
  title,
  description,
  action,
  theme = "light",
  className,
}: SectionHeaderProps) {
  const isDark = theme === "dark";

  return (
    <div
      className={cn(
        "flex flex-col gap-5 md:flex-row md:items-end md:justify-between",
        className,
      )}
    >
      <div className="max-w-[42rem]">
        {eyebrow ? (
          <div className="flex items-center gap-3">
            <p className={cn("home-kicker", isDark ? "text-[#d0ad63]" : "text-primary/68")}>
              {eyebrow}
            </p>
            <span
              className={cn(
                "home-rule",
                isDark ? "bg-white/14" : "bg-[color-mix(in_srgb,var(--secondary)_56%,transparent)]",
              )}
            />
          </div>
        ) : null}
        <h2
          className={cn(
            "mt-3 font-headline text-[2.35rem] font-semibold uppercase leading-[0.88] tracking-[0.035em] md:text-[3.9rem]",
            isDark ? "text-[#0A4D34]" : "text-[#0A4D34]",
          )}
        >
          {title}
        </h2>
        {description ? (
          <p
            className={cn(
              "mt-4 max-w-2xl text-sm leading-7 md:text-base",
              isDark ? "text-white/68" : "text-muted-foreground",
            )}
          >
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div className="shrink-0 md:pb-1">{action}</div> : null}
    </div>
  );
}
