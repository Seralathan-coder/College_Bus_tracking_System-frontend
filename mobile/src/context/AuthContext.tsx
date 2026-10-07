import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { TOKEN_KEY, USER_KEY } from "../constants";
import { authApi } from "../api/endpoints";
import { setUnauthorizedHandler } from "../api/client";
import type { User } from "../types";

interface AuthValue {
  user: User | null;
  ready: boolean;
  login: (email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(USER_KEY).then((raw) => {
      if (raw) setUser(JSON.parse(raw) as User);
      setReady(true);
    });
    setUnauthorizedHandler(() => setUser(null));
  }, []);

  const value = useMemo<AuthValue>(
    () => ({
      user,
      ready,
      login: async (email, password) => {
        const response = await authApi.login(email, password);
        await AsyncStorage.setItem(TOKEN_KEY, response.accessToken);
        await AsyncStorage.setItem(USER_KEY, JSON.stringify(response.user));
        setUser(response.user);
        return response.user;
      },
      logout: async () => {
        await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]);
        setUser(null);
      },
    }),
    [user, ready]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
