import { createContext, useContext, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { UserDTO } from "@finpilot/shared";
import { api, ApiError } from "../lib/api";
import { qk } from "../lib/queryKeys";

interface AuthState {
  user: UserDTO | null;
  isLoading: boolean;
  setUser: (u: UserDTO | null) => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: qk.me,
    queryFn: async () => {
      try {
        return (await api.get<{ user: UserDTO }>("/auth/me")).user;
      } catch (e) {
        if (e instanceof ApiError && e.status === 401) return null;
        throw e;
      }
    },
    staleTime: 5 * 60_000,
    retry: false,
  });

  const value: AuthState = {
    user: data ?? null,
    isLoading,
    setUser: (u) => qc.setQueryData(qk.me, u),
    logout: async () => {
      await api.post("/auth/logout").catch(() => undefined);
      // Mark signed-out first so route guards redirect to /login, then drop every
      // cached financial record from memory (without touching the auth query itself).
      qc.setQueryData(qk.me, null);
      await qc.cancelQueries({ predicate: (q) => q.queryKey[0] !== qk.me[0] });
      qc.removeQueries({ predicate: (q) => q.queryKey[0] !== qk.me[0] });
    },
  };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}

/** For pages behind RequireAuth: the user is guaranteed. */
export function useUser(): UserDTO {
  const { user } = useAuth();
  if (!user) throw new Error("useUser called without an authenticated user");
  return user;
}
