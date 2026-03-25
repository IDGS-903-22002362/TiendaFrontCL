import Link from "next/link";
import { PackageSearch } from "lucide-react";
import { Button } from "@/components/ui/button";

type EmptyStateProps = {
  title: string;
  description: string;
  ctaLabel?: string;
  ctaHref?: string;
};

export function EmptyState({
  title,
  description,
  ctaLabel,
  ctaHref = "/products",
}: EmptyStateProps) {
  return (
    <div className="rounded-[2rem] border border-border bg-card px-6 py-12 text-center shadow-[var(--shadow-card)] md:px-10 md:py-16">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-border bg-muted/60 text-primary">
        <PackageSearch className="h-7 w-7" />
      </div>
      <h2 className="mt-6 font-headline text-3xl font-semibold uppercase leading-none tracking-[0.04em]">
        {title}
      </h2>
      <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-muted-foreground md:text-base">
        {description}
      </p>
      {ctaLabel ? (
        <Button asChild className="mt-6 h-11 px-6">
          <Link href={ctaHref}>{ctaLabel}</Link>
        </Button>
      ) : null}
    </div>
  );
}
