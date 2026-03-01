"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { UserRole } from "@/lib/types";
import { apiFetch } from "@/lib/api/client";

const TOKEN_STORAGE_KEY = "tiendafront_api_token";
const ROLE_STORAGE_KEY = "tiendafront_user_role";

type SessionStatusResponse = {
  success?: boolean;
  data?: {
    isAuthenticated?: boolean;
    role?: UserRole | "";
  };
};

type AuthContextType = {
  token: string;
  role: UserRole | "";
  isAuthenticated: boolean;
  setSession: (payload: { token: string; role: UserRole | "" }) => void;
  clearSession: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState("");
  const [role, setRole] = useState<UserRole | "">("");

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    setToken(localStorage.getItem(TOKEN_STORAGE_KEY) ?? "");
    const storedRole = localStorage.getItem(
      ROLE_STORAGE_KEY,
    ) as UserRole | null;
    setRole(storedRole ?? "");

    const syncSession = async () => {
      try {
        const response = await apiFetch<SessionStatusResponse>(
          "/api/auth/session",
          { method: "GET" },
          { local: true },
        );

        const nextRole = response.data?.role ?? "";
        const authenticated = Boolean(response.data?.isAuthenticated);

        if (authenticated) {
          setToken((current) => current || "cookie-session");
        } else {
          setToken("");
        }

        if (nextRole) {
          setRole(nextRole);
          localStorage.setItem(ROLE_STORAGE_KEY, nextRole);
        }
      } catch {
        // noop: mantenemos fallback local para compatibilidad actual
      }
    };

    void syncSession();
  }, []);

  const setSession = ({
    token: nextToken,
    role: nextRole,
  }: {
    token: string;
    role: UserRole | "";
  }) => {
    setToken(nextToken || "cookie-session");
    setRole(nextRole);

    void apiFetch(
      "/api/auth/session",
      {
        method: "POST",
        body: JSON.stringify({ token: nextToken, role: nextRole }),
      },
      { local: true },
    ).catch(() => undefined);

    if (typeof window === "undefined") {
      return;
    }

    if (nextToken) {
      localStorage.setItem(TOKEN_STORAGE_KEY, nextToken);
    } else {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
    }

    if (nextRole) {
      localStorage.setItem(ROLE_STORAGE_KEY, nextRole);
    } else {
      localStorage.removeItem(ROLE_STORAGE_KEY);
    }
  };

  const clearSession = () => {
    setToken("");
    setRole("");

    void apiFetch(
      "/api/auth/session",
      {
        method: "DELETE",
      },
      { local: true },
    ).catch(() => undefined);

    if (typeof window === "undefined") {
      return;
    }

    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(ROLE_STORAGE_KEY);
  };

  const value = useMemo(
    () => ({
      token,
      role,
      isAuthenticated: Boolean(token),
      setSession,
      clearSession,
    }),
    [token, role],
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
