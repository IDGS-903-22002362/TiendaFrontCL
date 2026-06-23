"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Bell,
  CheckCheck,
  CreditCard,
  Package,
  ShoppingCart,
} from "lucide-react";
import { inventarioApi } from "@/lib/api/inventario";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

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
  className?: string;
};

const POLL_INTERVAL_MS = 60000;

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

export function AdminNotificationsPanel({
  token,
  className,
}: AdminNotificationsPanelProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<AdminNotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const loadNotifications = useCallback(async () => {
    if (!token) {
      setItems([]);
      setUnreadCount(0);
      return;
    }

    setLoading(true);
    try {
      const payload = await inventarioApi.listAdminNotifications(token);
      setItems(payload.items);
      setUnreadCount(payload.unreadCount);
      setError(null);
    } catch {
      setError("No se pudieron cargar las notificaciones.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void loadNotifications();
  }, [loadNotifications]);

  useEffect(() => {
    if (!token) return;

    const interval = window.setInterval(() => {
      void loadNotifications();
    }, POLL_INTERVAL_MS);

    return () => window.clearInterval(interval);
  }, [loadNotifications, token]);

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (nextOpen) {
      void loadNotifications();
    }
  };

  const handleMarkRead = async (id: string) => {
    if (!token) return;

    try {
      const payload = await inventarioApi.markAdminNotificationsRead([id], token);
      setItems(payload.items);
      setUnreadCount(payload.unreadCount);
    } catch {
      setError("No se pudo marcar la notificacion como leida.");
    }
  };

  const handleMarkAllRead = async () => {
    if (!token) return;

    try {
      const payload = await inventarioApi.markAllAdminNotificationsRead(token);
      setItems(payload.items);
      setUnreadCount(payload.unreadCount);
    } catch {
      setError("No se pudieron marcar todas como leidas.");
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
          className={cn("relative", className)}
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

      <PopoverContent align="end" className="w-[min(92vw,24rem)] p-0">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div>
            <p className="text-sm font-semibold">Notificaciones</p>
            <p className="text-xs text-muted-foreground">
              Ordenes, pagos e inventario
            </p>
          </div>
          {unreadCount > 0 ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 gap-1 px-2 text-xs"
              onClick={() => void handleMarkAllRead()}
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Marcar todas
            </Button>
          ) : null}
        </div>

        <div className="max-h-80 overflow-y-auto">
          {loading && items.length === 0 ? (
            <p className="px-4 py-6 text-sm text-muted-foreground">
              Cargando notificaciones...
            </p>
          ) : error ? (
            <p className="px-4 py-6 text-sm text-destructive">{error}</p>
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
                      href={item.href}
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