"use client";

import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  X,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type AppNotificationVariant = "success" | "error" | "warning" | "info";

const variantConfig: Record<
  AppNotificationVariant,
  { icon: LucideIcon; iconBg: string; iconColor: string }
> = {
  success: {
    icon: CheckCircle2,
    iconBg: "bg-success/15",
    iconColor: "text-success",
  },
  error: {
    icon: XCircle,
    iconBg: "bg-destructive/15",
    iconColor: "text-destructive",
  },
  warning: {
    icon: AlertTriangle,
    iconBg: "bg-warning/15",
    iconColor: "text-warning",
  },
  info: {
    icon: Info,
    iconBg: "bg-primary/10",
    iconColor: "text-primary",
  },
};

export function toastVariantToAppVariant(
  variant?: "default" | "destructive" | "success" | "warning" | null,
): AppNotificationVariant {
  switch (variant) {
    case "destructive":
      return "error";
    case "success":
      return "success";
    case "warning":
      return "warning";
    default:
      return "info";
  }
}

type AppNotificationLayoutProps = {
  variant?: AppNotificationVariant;
  title: ReactNode;
  description?: ReactNode;
  onDismiss?: () => void;
  className?: string;
  role?: "status" | "alert";
  dismissLabel?: string;
};

export function AppNotificationLayout({
  variant = "info",
  title,
  description,
  onDismiss,
  className,
  role = "status",
  dismissLabel = "Cerrar notificación",
}: AppNotificationLayoutProps) {
  const config = variantConfig[variant];
  const Icon = config.icon;

  return (
    <div
      role={role}
      aria-live={role === "alert" ? "assertive" : "polite"}
      className={cn(
        "pointer-events-auto w-full rounded-2xl border border-border/80 bg-card p-4 shadow-lg",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
            config.iconBg,
            config.iconColor,
          )}
        >
          <Icon className="h-5 w-5" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">{title}</p>
          {description ? (
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {onDismiss ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 rounded-full"
            aria-label={dismissLabel}
            onClick={onDismiss}
          >
            <X className="h-4 w-4" aria-hidden />
          </Button>
        ) : null}
      </div>
    </div>
  );
}

type AppNotificationBannerProps = {
  variant?: AppNotificationVariant;
  title?: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  className?: string;
};

export function AppNotificationBanner({
  variant = "error",
  title,
  description,
  children,
  className,
}: AppNotificationBannerProps) {
  const content = children ?? description;

  return (
    <AppNotificationLayout
      variant={variant}
      title={title ?? "Aviso"}
      description={content}
      role="alert"
      className={cn("shadow-none", className)}
    />
  );
}
