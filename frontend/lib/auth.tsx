"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { apiFetch, getToken } from "./api";

export type User = {
  id: string;
  email: string;
  display_name?: string | null;
  profile_photo_url?: string | null;
  max_heart_rate: number;
  resting_heart_rate: number;
  lthr?: number | null;
  strava_connected: boolean;
  last_sync_at: string | null;
  onboarding_complete: boolean;
};

type AuthCtx = {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    if (!getToken()) {
      setUser(null);
      return;
    }
    try {
      const me = await apiFetch<User>("/api/auth/me");
      setUser(me);
    } catch {
      localStorage.removeItem("access_token");
      setUser(null);
    }
  };

  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, []);

  const login = async (email: string, password: string) => {
    const data = await apiFetch<{ access_token: string; user: User }>(
      "/api/auth/login",
      { method: "POST", body: JSON.stringify({ email, password }) }
    );
    localStorage.setItem("access_token", data.access_token);
    setUser(data.user);
  };

  const register = async (email: string, password: string) => {
    const data = await apiFetch<{ access_token: string; user: User }>(
      "/api/auth/register",
      { method: "POST", body: JSON.stringify({ email, password }) }
    );
    localStorage.setItem("access_token", data.access_token);
    setUser(data.user);
  };

  const logout = () => {
    localStorage.removeItem("access_token");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
