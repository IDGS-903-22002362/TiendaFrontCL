import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type SectionHeadingProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: "left" | "center";
  action?: ReactNode;
  className?: string;
};

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "left",
  action,
  className,
}: SectionHeadingProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-5 md:flex-row md:items-end md:justify-between",
        align === "center" && "items-center text-center md:items-end md:text-left",
        className,
      )}
    >
      <div className="max-w-[46rem]">
        {eyebrow ? (
          <div
            className={cn(
              "flex items-center gap-3",
              align === "center" && "justify-center md:justify-start",
            )}
          >
            <p className="editorial-label text-primary/76">{eyebrow}</p>
            <span className="h-px w-12 bg-[color-mix(in_srgb,var(--secondary)_70%,transparent)]" />
          </div>
        ) : null}
        <h2 className="mt-3 font-headline text-[2.2rem] font-semibold uppercase leading-[0.9] tracking-[0.03em] text-foreground md:text-[3.65rem]">
          {title}
        </h2>
        {description ? (
          <p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground md:text-base">
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div className="shrink-0 md:pb-1">{action}</div> : null}
    </div>
  );
}
