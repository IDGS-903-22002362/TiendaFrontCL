"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function formatAdminCurrency(
  value: number,
  currency = "MXN",
): string {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

type AdminPageShellProps = {
  children: React.ReactNode;
  className?: string;
};

export function AdminPageShell({ children, className }: AdminPageShellProps) {
  return (
    <div className={cn("admin-page flex w-full max-w-7xl flex-col gap-6", className)}>
      {children}
    </div>
  );
}

type AdminPageHeaderProps = {
  title: string;
  description?: string;
  eyebrow?: string;
  actions?: React.ReactNode;
};

export function AdminPageHeader({
  title,
  description,
  eyebrow = "Panel administrativo",
  actions,
}: AdminPageHeaderProps) {
  return (
    <header className="admin-page-header flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex flex-col gap-2">
        <p className="admin-eyebrow">{eyebrow}</p>
        <h1 className="admin-page-title font-headline">{title}</h1>
        {description ? (
          <p className="max-w-2xl text-sm leading-relaxed text-text-secondary">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex flex-wrap items-center gap-2">{actions}</div>
      ) : null}
    </header>
  );
}

type AdminSectionProps = {
  title: string;
  description?: string;
  icon?: LucideIcon;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
};

export function AdminSection({
  title,
  description,
  icon: Icon,
  actions,
  children,
  className,
}: AdminSectionProps) {
  return (
    <section className={cn("flex flex-col gap-4", className)}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1">
          <h2 className="admin-section-title flex items-center gap-2 font-headline">
            {Icon ? <Icon className="size-4 text-primary" aria-hidden /> : null}
            {title}
          </h2>
          {description ? (
            <p className="text-sm text-text-secondary">{description}</p>
          ) : null}
        </div>
        {actions ? (
          <div className="flex flex-wrap items-center gap-2">{actions}</div>
        ) : null}
      </div>
      {children}
    </section>
  );
}

type AdminMetricCardProps = {
  label: string;
  value: React.ReactNode;
  hint?: string;
  icon?: LucideIcon;
  loading?: boolean;
  variant?: "default" | "featured" | "earnings";
  className?: string;
};

export function AdminMetricCard({
  label,
  value,
  hint,
  icon: Icon,
  loading = false,
  variant = "default",
  className,
}: AdminMetricCardProps) {
  return (
    <Card
      className={cn(
        "admin-metric-card border-border/80 shadow-[var(--shadow-card)] transition-[border-color,box-shadow] duration-200 hover:border-primary/20",
        variant === "featured" && "admin-metric-card-featured",
        variant === "earnings" && "admin-metric-card-earnings",
        className,
      )}
    >
      <CardContent className="flex flex-col gap-4 p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <p className="text-sm font-medium text-text-secondary">{label}</p>
          {Icon ? (
            <span className="admin-metric-icon inline-flex size-9 items-center justify-center rounded-full border border-border/70 bg-background/80">
              <Icon className="size-4" aria-hidden />
            </span>
          ) : null}
        </div>
        <div className="flex flex-col gap-1">
          {loading ? (
            <Skeleton className="h-9 w-28" />
          ) : (
            <span className="admin-tabular admin-metric-value">{value}</span>
          )}
          {hint ? (
            <p className="text-xs text-text-muted">{hint}</p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

type AdminPanelCardProps = {
  title?: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
  noPadding?: boolean;
};

export function AdminPanelCard({
  title,
  description,
  actions,
  children,
  className,
  contentClassName,
  noPadding = false,
}: AdminPanelCardProps) {
  return (
    <Card
      className={cn(
        "admin-panel-card overflow-hidden border-border/80 shadow-[var(--shadow-card)]",
        className,
      )}
    >
      {title ? (
        <CardHeader className="flex flex-row items-start justify-between gap-4 border-b border-border/70 bg-card/80 px-5 py-4 sm:px-6">
          <div className="flex flex-col gap-1">
            <CardTitle className="text-base font-medium">{title}</CardTitle>
            {description ? (
              <CardDescription>{description}</CardDescription>
            ) : null}
          </div>
          {actions ? (
            <div className="flex flex-wrap items-center gap-2">{actions}</div>
          ) : null}
        </CardHeader>
      ) : null}
      <CardContent
        className={cn(
          !noPadding && "p-5 sm:p-6",
          contentClassName,
        )}
      >
        {children}
      </CardContent>
    </Card>
  );
}

type AdminInlineAlertProps = {
  children: React.ReactNode;
  variant?: "error" | "info";
  className?: string;
};

export function AdminInlineAlert({
  children,
  variant = "error",
  className,
}: AdminInlineAlertProps) {
  return (
    <p
      role={variant === "error" ? "alert" : "status"}
      className={cn(
        "rounded-xl border px-4 py-3 text-sm",
        variant === "error"
          ? "border-destructive/30 bg-destructive/5 text-destructive"
          : "border-border bg-muted/40 text-text-secondary",
        className,
      )}
    >
      {children}
    </p>
  );
}

type AdminQuickActionProps = {
  href: string;
  label: string;
  icon: LucideIcon;
};

export function AdminQuickActionCard({
  href,
  label,
  icon: Icon,
}: AdminQuickActionProps) {
  return (
    <Link
      href={href}
      className="admin-quick-action group flex flex-col items-center justify-center gap-3 rounded-2xl border border-border/80 bg-card px-4 py-5 text-center shadow-[var(--shadow-card)] transition-[border-color,transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-[var(--shadow-elevated)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span className="inline-flex size-11 items-center justify-center rounded-full border border-primary/15 bg-primary/8 text-primary transition-colors group-hover:bg-primary/12">
        <Icon className="size-5" aria-hidden />
      </span>
      <span className="text-sm font-medium text-foreground">{label}</span>
    </Link>
  );
}
