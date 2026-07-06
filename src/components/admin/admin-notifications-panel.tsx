"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import {
  Bell,
  CheckCheck,
  CreditCard,
  Package,
  RefreshCw,
  ShoppingCart,
} from "lucide-react";
import { inventarioApi } from "@/lib/api/inventario";
import { useAdminNotificationsRealtime } from "@/hooks/use-admin-notifications-realtime";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { resolveStockNotificationHref } from "@/lib/inventory-prefill";
import type { UserRole } from "@/lib/types";

type AdminNotificationItem = {
  id: string;
  type: string;
  title: string;
  message: string;
  href: string;
  createdAt: string;
  read: boolean;
};

type AdminNotificationsPanelProps = {
  token?: string | null;
  role?: UserRole | "";
  className?: string;
};

function getNotificationIcon(type: string) {
  if (type.startsWith("order")) {
    return ShoppingCart;
  }
  if (type.startsWith("payment")) {
    return CreditCard;
  }
  if (type.startsWith("stock")) {
    return Package;
  }
  return Bell;
}

function formatRelativeTime(isoDate: string) {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);

  if (diffMinutes < 1) return "Ahora";
  if (diffMinutes < 60) return `Hace ${diffMinutes} min`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `Hace ${diffHours} h`;

  const diffDays = Math.floor(diffHours / 24);
  return `Hace ${diffDays} d`;
}

function getConnectionLabel(
  status: ReturnType<typeof useAdminNotificationsRealtime>["status"],
): string | null {
  switch (status) {
    case "connecting":
    case "reconnecting":
      return "Conectando...";
    case "live":
      return "Actualizado en vivo";
    case "paused":
      return "Pausado (pestana oculta)";
    case "fallback":
      return "Modo respaldo";
    default:
      return null;
  }
}

export function AdminNotificationsPanel({
  token,
  role = "",
  className,
}: AdminNotificationsPanelProps) {
  const [open, setOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [markingRead, setMarkingRead] = useState(false);

  const fetchFallback = useCallback(async () => {
    if (!token) {
      return { items: [], unreadCount: 0 };
    }
    return inventarioApi.listAdminNotifications(token);
  }, [token]);

  const {
    items,
    unreadCount,
    status,
    error,
    refresh,
    setReadState,
  } = useAdminNotificationsRealtime({
    enabled: Boolean(token),
    role,
    fetchFallback,
  });

  const connectionLabel = getConnectionLabel(status);
  const displayError = actionError ?? error;

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (nextOpen) {
      void refresh();
    }
  };

  const handleMarkRead = async (id: string) => {
    if (!token) return;

    setMarkingRead(true);
    setActionError(null);
    try {
      const payload = await inventarioApi.markAdminNotificationsRead([id], token);
      setReadState(payload.items, payload.unreadCount);
    } catch {
      setActionError("No se pudo marcar la notificación como leída.");
    } finally {
      setMarkingRead(false);
    }
  };

  const handleMarkAllRead = async () => {
    if (!token) return;

    setMarkingRead(true);
    setActionError(null);
    try {
      const payload = await inventarioApi.markAllAdminNotificationsRead(token);
      setReadState(payload.items, payload.unreadCount);
    } catch {
      setActionError("No se pudieron marcar todas como leídas.");
    } finally {
      setMarkingRead(false);
    }
  };

  const handleNotificationClick = async (item: AdminNotificationItem) => {
    if (!item.read) {
      await handleMarkRead(item.id);
    }
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn(
            "relative rounded-full border border-transparent hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            className,
          )}
          aria-label={
            unreadCount > 0
              ? `Notificaciones, ${unreadCount} sin leer`
              : "Notificaciones"
          }
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 ? (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          ) : null}
        </Button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-[min(92vw,24rem)] overflow-hidden rounded-2xl p-0 shadow-[var(--shadow-elevated)]">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div>
            <p className="text-sm font-semibold">Notificaciones</p>
            <p className="text-xs text-muted-foreground">
              Órdenes, pagos e inventario
            </p>
            {connectionLabel ? (
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                {connectionLabel}
              </p>
            ) : null}
          </div>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              aria-label="Actualizar notificaciones"
              onClick={() => void refresh()}
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
            {unreadCount > 0 ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 gap-1 px-2 text-xs"
                disabled={markingRead}
                onClick={() => void handleMarkAllRead()}
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Marcar todas
              </Button>
            ) : null}
          </div>
        </div>

        <div className="max-h-80 overflow-y-auto">
          {status === "connecting" && items.length === 0 ? (
            <p className="px-4 py-6 text-sm text-muted-foreground">
              Cargando notificaciones...
            </p>
          ) : displayError && items.length === 0 ? (
            <div className="space-y-3 px-4 py-6">
              <p className="text-sm text-destructive">{displayError}</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void refresh()}
              >
                Reintentar
              </Button>
            </div>
          ) : items.length === 0 ? (
            <p className="px-4 py-6 text-sm text-muted-foreground">
              No hay notificaciones recientes.
            </p>
          ) : (
            <ul className="divide-y">
              {items.map((item) => {
                const Icon = getNotificationIcon(item.type);

                return (
                  <li key={item.id}>
                    <Link
                      href={resolveStockNotificationHref(item)}
                      onClick={() => void handleNotificationClick(item)}
                      className={cn(
                        "flex gap-3 px-4 py-3 transition-colors hover:bg-muted/60",
                        !item.read && "bg-primary/5",
                      )}
                    >
                      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                        <Icon className="h-4 w-4 text-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-medium leading-tight">
                            {item.title}
                          </p>
                          {!item.read ? (
                            <span
                              className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary"
                              aria-hidden
                            />
                          ) : null}
                        </div>
                        <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                          {item.message}
                        </p>
                        <p className="mt-1 text-[11px] text-muted-foreground">
                          {formatRelativeTime(item.createdAt)}
                        </p>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
