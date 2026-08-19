"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useCallback,
  useMemo,
  useState,
} from "react";
import type { UserRole } from "@/lib/types";
import {
  clearLocalSession,
  createLocalSessionFromFirebaseToken,
  getLocalSessionStatus,
  type AuthUsuario,
} from "@/lib/api/auth";
import { mergeRecommendationIdentity } from "@/lib/api/recommendations";
import { clearCartMergeMarker } from "@/lib/api/cart-merge";
import { getOrCreateSessionId } from "@/lib/api/cart";
import { resetAuthRecoveryCache } from "@/lib/api/client";
import { COOKIE_SESSION_TOKEN } from "@/lib/cookies/constants";
import { notifyMobileAppAuth, notifyMobileAppLogout, resetMobileAppAuthNotification } from "@/lib/mobile-app-bridge";
import {
  checkInUserStreak,
  completeUserProfile,
  getUserStreak,
  updateUserProfile,
  type CompleteProfilePayload,
  type UserStreak,
} from "@/lib/api/users";
import { signOutFirebaseClient } from "@/lib/firebase/auth";
import { isEmbeddedMobileApp } from "@/lib/mobile-app-bridge";

type AuthContextType = {
  token: string;
  role: UserRole | "";
  user: Partial<AuthUsuario> | null;
  streak: UserStreak | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  signInWithFirebase: (
    firebaseIdToken: string,
    options?: { force?: boolean },
  ) => Promise<void>;
  clearSession: (options?: { notifyNative?: boolean }) => Promise<void>;
  refreshSession: () => Promise<void>;
  completeProfile: (
    payload: CompleteProfilePayload,
  ) => Promise<{ bonoOtorgado?: boolean; puntosBonificados?: number }>;
  updateProfilePhone: (telefono: string) => Promise<void>;
  refreshStreak: () => Promise<void>;
  checkInStreak: () => Promise<void>;
  // Añadimos esta función para registrar callbacks de limpieza
  onSessionClear: (callback: () => void) => () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState("");
  const [role, setRole] = useState<UserRole | "">("");
  const [user, setUser] = useState<Partial<AuthUsuario> | null>(null);
  const [streak, setStreak] = useState<UserStreak | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Array de callbacks para ejecutar al limpiar sesión
  const [clearSessionCallbacks, setClearSessionCallbacks] = useState<(() => void)[]>([]);

  const refreshSession = useCallback(async () => {
    try {
      const response = await getLocalSessionStatus();

      const authenticated = Boolean(response.data?.isAuthenticated);
      const nextRole = response.data?.role ?? "";
      const nextToken = response.data?.token ?? "";
      const nextUser = response.data?.user ?? null;

      setRole(nextRole);
      setToken(authenticated ? nextToken || COOKIE_SESSION_TOKEN : "");
      setUser(authenticated ? nextUser : null);

      if (!authenticated) {
        setStreak(null);
      }
    } catch {
      setToken("");
      setRole("");
      setUser(null);
      setStreak(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshSession();
  }, [refreshSession]);

  const signInWithFirebase = useCallback(async (
    firebaseIdToken: string,
    options?: { force?: boolean },
  ) => {
    const normalizedToken = firebaseIdToken.trim();
    if (!normalizedToken) {
      return;
    }

    // Evita POST duplicados cuando el WebView ya tiene sesión activa.
    if (!options?.force && token && !isLoading) {
      return;
    }

    const response = await createLocalSessionFromFirebaseToken(normalizedToken);

    setToken(response.data?.token || COOKIE_SESSION_TOKEN);
    setRole(response.data?.role ?? "");
    setUser(response.data?.user ?? null);
    setIsLoading(false);

    const sessionToken = response.data?.token || COOKIE_SESSION_TOKEN;
    const sessionId = getOrCreateSessionId();
    if (sessionId) {
      void mergeRecommendationIdentity(sessionToken, sessionId).catch(() => undefined);
    }

    // Notificar a la app móvil con token backend o Firebase ID token.
    notifyMobileAppAuth({
      token: response.data?.token,
      firebaseIdToken: normalizedToken,
      uid: response.data?.user?.uid,
      user: response.data?.user ?? null,
    });
  }, [token, isLoading]);

  const clearSession = useCallback(async (options?: { notifyNative?: boolean }) => {
    const shouldNotifyNative = options?.notifyNative !== false;
    if (shouldNotifyNative) {
      notifyMobileAppLogout();
    }

    // Ejecutar todos los callbacks registrados (ej: limpiar favoritos)
    clearSessionCallbacks.forEach(callback => {
      try {
        callback();
      } catch (error) {
        console.error("Error en callback de limpieza de sesión:", error);
      }
    });

    resetAuthRecoveryCache();
    clearCartMergeMarker();
    resetMobileAppAuthNotification();

    const sessionClearTasks: Promise<unknown>[] = [clearLocalSession()];
    // Firebase signOut can navigate the embedded WebView to auth iframe URLs.
    if (!isEmbeddedMobileApp()) {
      sessionClearTasks.push(signOutFirebaseClient());
    }

    await Promise.allSettled(sessionClearTasks);
    setToken("");
    setRole("");
    setUser(null);
    setStreak(null);
    setIsLoading(false);
  }, [clearSessionCallbacks]);

  // Función para registrar callbacks de limpieza
  const onSessionClear = useCallback((callback: () => void) => {
    setClearSessionCallbacks(prev => [...prev, callback]);
    // Retornar función para eliminar el callback
    return () => {
      setClearSessionCallbacks(prev => prev.filter(cb => cb !== callback));
    };
  }, []);

  const completeProfile = useCallback(
    async (payload: CompleteProfilePayload) => {
      const response = await completeUserProfile(payload);
      setUser((currentUser) => ({
        ...(currentUser ?? {}),
        ...response.data,
        perfilCompleto: response.data.perfilCompleto,
      }));

      await refreshSession();

      return {
        bonoOtorgado: response.bonoOtorgado,
        puntosBonificados: response.puntosBonificados,
      };
    },
    [refreshSession],
  );

  const updateProfilePhone = useCallback(async (telefono: string) => {
    const response = await updateUserProfile({ telefono });
    setUser((currentUser) => ({
      ...(currentUser ?? {}),
      uid: response.data.uid,
      telefono: response.data.telefono,
    }));
  }, []);

  const refreshStreak = useCallback(async () => {
    const response = await getUserStreak();
    setStreak(response.data);
  }, []);

  const checkInStreak = useCallback(async () => {
    const response = await checkInUserStreak();
    setStreak({
      streakCount: response.data.streakCount,
      streakBest: response.data.streakBest,
      streakLastDay: response.data.todayKey,
    });
  }, []);

  const value = useMemo(
    () => ({
      token,
      role,
      user,
      streak,
      isAuthenticated: Boolean(token) && !isLoading,
      isLoading,
      signInWithFirebase,
      clearSession,
      refreshSession,
      completeProfile,
      updateProfilePhone,
      refreshStreak,
      checkInStreak,
      onSessionClear,
    }),
    [
      token,
      role,
      user,
      streak,
      isLoading,
      signInWithFirebase,
      clearSession,
      refreshSession,
      completeProfile,
      updateProfilePhone,
      refreshStreak,
      checkInStreak,
      onSessionClear,
    ],
  );

  useEffect(() => {
    if (isLoading || !token || !user) {
      return;
    }

    notifyMobileAppAuth({
      token: token !== COOKIE_SESSION_TOKEN ? token : undefined,
      uid: user.uid ?? user.id,
      user,
    });
  }, [isLoading, token, user]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.__tiendaAuth = {
        signInWithFirebase,
        refreshSession,
        // Native WebView clear scripts must not re-notify the app.
        clearSession: () => clearSession({ notifyNative: false }),
        getAuthStatus: () => ({
          isAuthenticated: Boolean(token) && !isLoading,
          token,
          user,
        }),
      };
    }
  }, [signInWithFirebase, refreshSession, clearSession, token, user, isLoading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
}
