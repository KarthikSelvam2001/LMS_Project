import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { customFetch } from "@/lib/custom-fetch";

export type UserRole = "ADMIN" | "TRAINER" | "LEARNER";

export interface AuthUser {
  id: number;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  roleId: UserRole;
  picture?: string;
  provider?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: (token: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchMe = useCallback(async () => {
    try {
      const data = await customFetch("/api/auth/me");
      setUser(data);
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMe();
  }, [fetchMe]);

  const login = useCallback(async (email: string, password: string) => {
    const data = await customFetch("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    setUser(data.user);
  }, []);

  const loginWithGoogle = useCallback(async (token: string) => {
    const data = await customFetch("/api/auth/google", {
      method: "POST",
      body: JSON.stringify({ token }),
    });
    setUser(data.user);
  }, []);

  const logout = useCallback(async () => {
    try {
      await customFetch("/api/auth/logout", { method: "POST" });
    } catch {}
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, loginWithGoogle, logout, refreshUser: fetchMe }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
