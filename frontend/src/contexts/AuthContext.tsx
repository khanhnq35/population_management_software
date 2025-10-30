import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { authApi, type LoginPayload, type User } from "../services/api";

type AuthContextValue = {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (payload: LoginPayload) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const storedToken = localStorage.getItem("token");
    const storedUser = localStorage.getItem("user");
    if (storedToken) {
      setToken(storedToken);
    }
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch {
        localStorage.removeItem("user");
      }
    }
  }, []);

  const login = useCallback(async (payload: LoginPayload) => {
    const { access_token: accessToken } = await authApi.login(payload);
    localStorage.setItem("token", accessToken);
    setToken(accessToken);
    const currentUser = await authApi.getCurrentUser();
    localStorage.setItem("user", JSON.stringify(currentUser));
    setUser(currentUser);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setToken(null);
    setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      isAuthenticated: Boolean(user && token),
      login,
      logout
    }),
    [user, token, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
