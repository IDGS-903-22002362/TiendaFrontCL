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
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState("");
  const [role, setRole] = useState<UserRole | "">("");
  const [user, setUser] = useState<Partial<AuthUsuario> | null>(null);
  const [streak, setStreak] = useState<UserStreak | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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

    try {
      const streakResponse = await getUserStreak();
      setStreak(streakResponse.data);
    } catch {
      setStreak(null);
    }
  }, []);

  const clearSession = useCallback(async () => {
    setToken("");
    setRole("");
    setUser(null);
    setStreak(null);

    await Promise.allSettled([clearLocalSession(), signOutFirebaseClient()]);
  }, []);

  const completeProfile = useCallback(
    async (payload: CompleteProfilePayload) => {
      const response = await completeUserProfile(payload);
      setUser((currentUser) => ({
        ...(currentUser ?? {}),
        uid: response.data.uid,
        perfilCompleto: response.data.perfilCompleto,
        telefono: payload.telefono ?? currentUser?.telefono,
        fechaNacimiento:
          payload.fechaNacimiento ?? currentUser?.fechaNacimiento,
        genero: payload.genero ?? currentUser?.genero,
      }));
    },
    [],
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
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
}
