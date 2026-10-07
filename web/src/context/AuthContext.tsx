import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { authApi } from "../api/endpoints";
import { REFRESH_KEY, TOKEN_KEY, USER_KEY } from "../constants";
import type { Role, User } from "../types";

interface AuthState {
  user: User | null;
  token: string | null;
  login: (email: string, password: string, role: Role) => Promise<User>;
  logout: () => void;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

function readUser(): User | null {
  const raw = localStorage.getItem(USER_KEY);
  return raw ? (JSON.parse(raw) as User) : null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(readUser);
  const [token, setToken] = useState<string | null>(localStorage.getItem(TOKEN_KEY));

  const value = useMemo<AuthState>(
    () => ({
      user,
      token,
      login: async (email, password, role) => {
        const response = await authApi.login(email, password, role);
        localStorage.setItem(TOKEN_KEY, response.accessToken);
        localStorage.setItem(REFRESH_KEY, response.refreshToken);
        localStorage.setItem(USER_KEY, JSON.stringify(response.user));
        setUser(response.user);
        setToken(response.accessToken);
        return response.user;
      },
      logout: () => {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(REFRESH_KEY);
        localStorage.removeItem(USER_KEY);
        setUser(null);
        setToken(null);
      },
    }),
    [user, token]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}

export function homeForRole(role: Role): string {
  if (role === "ADMIN") return "/admin";
  if (role === "DRIVER") return "/driver";
  return "/student";
}
