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
import { getOrCreateSessionId } from "@/lib/api/cart";
import { resetAuthRecoveryCache } from "@/lib/api/client";
import {
  checkInUserStreak,
  completeUserProfile,
  getUserStreak,
  updateUserProfile,
  type CompleteProfilePayload,
  type UserStreak,
} from "@/lib/api/users";
import { signOutFirebaseClient } from "@/lib/firebase/auth";

type AuthContextType = {
  token: string;
  role: UserRole | "";
  user: Partial<AuthUsuario> | null;
  streak: UserStreak | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  signInWithFirebase: (firebaseIdToken: string) => Promise<void>;
  clearSession: () => Promise<void>;
  refreshSession: () => Promise<void>;
  completeProfile: (payload: CompleteProfilePayload) => Promise<void>;
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
      setToken(authenticated ? nextToken || "cookie-session" : "");
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

  const signInWithFirebase = useCallback(async (firebaseIdToken: string) => {
    const response = await createLocalSessionFromFirebaseToken(firebaseIdToken);

    setToken(response.data?.token || "cookie-session");
    setRole(response.data?.role ?? "");
    setUser(response.data?.user ?? null);

    const sessionToken = response.data?.token || "cookie-session";
    const sessionId = getOrCreateSessionId();
    if (sessionId) {
      void mergeRecommendationIdentity(sessionToken, sessionId).catch(() => undefined);
    }

    // Notificar a Flutter si estamos dentro de un WebView
    if (typeof window !== "undefined" && (window as any).ClubLeonBridge) {
      (window as any).ClubLeonBridge.postMessage(
        JSON.stringify({
          type: "CLUBLEON_LOGIN",
          token: response.data?.token ?? "",
        })
      );
    }
  }, []);

  const clearSession = useCallback(async () => {
    // Ejecutar todos los callbacks registrados (ej: limpiar favoritos)
    clearSessionCallbacks.forEach(callback => {
      try {
        callback();
      } catch (error) {
        console.error("Error en callback de limpieza de sesión:", error);
      }
    });

    resetAuthRecoveryCache();
    await Promise.allSettled([clearLocalSession(), signOutFirebaseClient()]);
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
    if (typeof window !== 'undefined') {
      (window as any).__tiendaAuth = {
        signInWithFirebase: signInWithFirebase,
        getAuthStatus: () => ({
          isAuthenticated: Boolean(token) && !isLoading,
          token,
          user
        })
      };
    }
  }, [signInWithFirebase, token, user, isLoading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
}