"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import {
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  Timestamp,
  where,
  type Unsubscribe,
} from "firebase/firestore";
import {
  getFirebaseAuth,
  getFirebaseFirestore,
  isFirebaseConfigured,
} from "@/lib/firebase/client";
import type { UserRole } from "@/lib/types";

export type AdminNotificationItem = {
  id: string;
  type: string;
  title: string;
  message: string;
  href: string;
  createdAt: string;
  read: boolean;
};

export type AdminNotificationsConnectionStatus =
  | "idle"
  | "connecting"
  | "live"
  | "reconnecting"
  | "paused"
  | "fallback"
  | "error";

const ADMIN_STAFF_ROLES = new Set<UserRole>([
  "ADMIN",
  "EMPLEADO",
  "SUPER_ADMIN",
]);
const NOTIFICATIONS_COLLECTION = "adminNotificaciones";
const READS_COLLECTION = "adminNotificationReads";
const NOTIFICATION_LIMIT = 30;
const NOTIFICATION_WINDOW_MS = 72 * 60 * 60 * 1000;
const FALLBACK_POLL_MS = 60_000;

type UseAdminNotificationsRealtimeOptions = {
  enabled: boolean;
  role: UserRole | "";
  fetchFallback: () => Promise<{
    items: AdminNotificationItem[];
    unreadCount: number;
  }>;
};

function isAdminStaffRole(role: UserRole | ""): boolean {
  return Boolean(role && ADMIN_STAFF_ROLES.has(role));
}

function mapNotificationDoc(
  id: string,
  data: Record<string, unknown>,
  readIds: Set<string>,
): AdminNotificationItem {
  const createdAtValue = data.createdAt;
  const createdAt =
    createdAtValue instanceof Timestamp
      ? createdAtValue.toDate().toISOString()
      : typeof createdAtValue === "string"
        ? createdAtValue
        : new Date().toISOString();

  return {
    id,
    type: String(data.type ?? ""),
    title: String(data.title ?? ""),
    message: String(data.message ?? ""),
    href: String(data.href ?? ""),
    createdAt,
    read: readIds.has(id),
  };
}

export function useAdminNotificationsRealtime({
  enabled,
  role,
  fetchFallback,
}: UseAdminNotificationsRealtimeOptions) {
  const [items, setItems] = useState<AdminNotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [status, setStatus] =
    useState<AdminNotificationsConnectionStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  const readIdsRef = useRef<Set<string>>(new Set());
  const notificationRowsRef = useRef<
    Map<string, Omit<AdminNotificationItem, "read">>
  >(new Map());
  const firebaseUserRef = useRef<User | null>(null);
  const unsubscribesRef = useRef<Unsubscribe[]>([]);
  const fallbackTimerRef = useRef<number | null>(null);
  const isInitialNotificationsSnapshotRef = useRef(true);
  const fetchFallbackRef = useRef(fetchFallback);

  useEffect(() => {
    fetchFallbackRef.current = fetchFallback;
  }, [fetchFallback]);

  const applyMergedNotifications = useCallback(() => {
    const merged = Array.from(notificationRowsRef.current.values())
      .map((item) => ({
        ...item,
        read: readIdsRef.current.has(item.id),
      }))
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )
      .slice(0, NOTIFICATION_LIMIT);

    setItems(merged);
    setUnreadCount(merged.filter((item) => !item.read).length);
  }, []);

  const clearListeners = useCallback(() => {
    unsubscribesRef.current.forEach((unsubscribe) => unsubscribe());
    unsubscribesRef.current = [];
  }, []);

  const runFallbackFetch = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!options?.silent) {
        setStatus("fallback");
      }

      try {
        const payload = await fetchFallbackRef.current();
        setItems(payload.items);
        setUnreadCount(payload.unreadCount);
        setError(null);
        if (!options?.silent) {
          setStatus("fallback");
        }
      } catch {
        setError("No se pudieron cargar las notificaciones.");
        setStatus("error");
      }
    },
    [],
  );

  const subscribeRealtime = useCallback(
    (firebaseUser: User) => {
      if (!isFirebaseConfigured()) {
        void runFallbackFetch();
        return;
      }

      clearListeners();
      setStatus("connecting");
      setError(null);
      isInitialNotificationsSnapshotRef.current = true;

      const db = getFirebaseFirestore();
      const since = Timestamp.fromDate(
        new Date(Date.now() - NOTIFICATION_WINDOW_MS),
      );

      const notificationsQuery = query(
        collection(db, NOTIFICATIONS_COLLECTION),
        where("createdAt", ">=", since),
        orderBy("createdAt", "desc"),
        limit(NOTIFICATION_LIMIT),
      );

      const notificationsUnsubscribe = onSnapshot(
        notificationsQuery,
        (snapshot) => {
          if (isInitialNotificationsSnapshotRef.current) {
            isInitialNotificationsSnapshotRef.current = false;
          }

          notificationRowsRef.current = new Map(
            snapshot.docs.map((notificationDoc) => {
              const mapped = mapNotificationDoc(
                notificationDoc.id,
                notificationDoc.data() as Record<string, unknown>,
                readIdsRef.current,
              );
              const { read: _read, ...withoutRead } = mapped;
              return [notificationDoc.id, withoutRead] as const;
            }),
          );

          applyMergedNotifications();
          setStatus(
            document.visibilityState === "hidden" ? "paused" : "live",
          );
          setError(null);
        },
        () => {
          setStatus("error");
          setError(
            "Conexion en tiempo real no disponible. Usa actualizar manualmente.",
          );
          void runFallbackFetch({ silent: true });
        },
      );

      const readsUnsubscribe = onSnapshot(
        doc(db, READS_COLLECTION, firebaseUser.uid),
        (snapshot) => {
          const readIds = snapshot.data()?.readNotificationIds;
          readIdsRef.current = new Set(
            Array.isArray(readIds) ? readIds.map(String) : [],
          );
          applyMergedNotifications();
        },
        () => {
          // Si falla el listener de lecturas, conservamos notificaciones sin marcar leidas extra.
        },
      );

      unsubscribesRef.current = [notificationsUnsubscribe, readsUnsubscribe];
    },
    [applyMergedNotifications, clearListeners, runFallbackFetch],
  );

  const refresh = useCallback(async () => {
    if (
      firebaseUserRef.current &&
      isAdminStaffRole(role) &&
      isFirebaseConfigured() &&
      status !== "error"
    ) {
      subscribeRealtime(firebaseUserRef.current);
      return;
    }

    await runFallbackFetch();
  }, [role, runFallbackFetch, status, subscribeRealtime]);

  const setReadState = useCallback(
    (nextItems: AdminNotificationItem[], nextUnreadCount: number) => {
      readIdsRef.current = new Set(
        nextItems.filter((item) => item.read).map((item) => item.id),
      );
      setItems(nextItems);
      setUnreadCount(nextUnreadCount);
    },
    [],
  );

  useEffect(() => {
    if (!enabled || !isAdminStaffRole(role)) {
      clearListeners();
      notificationRowsRef.current.clear();
      readIdsRef.current.clear();
      setItems([]);
      setUnreadCount(0);
      setStatus("idle");
      setError(null);
      return;
    }

    if (!isFirebaseConfigured()) {
      void runFallbackFetch();
      return;
    }

    const auth = getFirebaseAuth();
    const authUnsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      firebaseUserRef.current = firebaseUser;

      if (!firebaseUser) {
        clearListeners();
        void runFallbackFetch();
        return;
      }

      if (document.visibilityState === "hidden") {
        setStatus("paused");
        return;
      }

      subscribeRealtime(firebaseUser);
    });

    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        clearListeners();
        setStatus("paused");
        return;
      }

      if (firebaseUserRef.current) {
        setStatus("reconnecting");
        subscribeRealtime(firebaseUserRef.current);
      }
    };

    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      authUnsubscribe();
      document.removeEventListener("visibilitychange", onVisibilityChange);
      clearListeners();
    };
  }, [
    clearListeners,
    enabled,
    role,
    runFallbackFetch,
    subscribeRealtime,
  ]);

  useEffect(() => {
    if (!enabled || !isAdminStaffRole(role)) {
      return;
    }

    if (status === "live" || status === "paused") {
      if (fallbackTimerRef.current) {
        window.clearInterval(fallbackTimerRef.current);
        fallbackTimerRef.current = null;
      }
      return;
    }

    fallbackTimerRef.current = window.setInterval(() => {
      if (document.visibilityState !== "visible") {
        return;
      }
      void runFallbackFetch({ silent: true });
    }, FALLBACK_POLL_MS);

    return () => {
      if (fallbackTimerRef.current) {
        window.clearInterval(fallbackTimerRef.current);
        fallbackTimerRef.current = null;
      }
    };
  }, [enabled, role, runFallbackFetch, status]);

  return {
    items,
    unreadCount,
    status,
    error,
    refresh,
    setReadState,
    isRealtime:
      status === "live" || status === "paused" || status === "reconnecting",
  };
}
