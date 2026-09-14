"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import * as api from "@/app/lib/api";
import type { AuthUser } from "@/app/lib/api";

type AuthState = {
  user: AuthUser | null;
  /** True until the initial session check finishes. */
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

/**
 * Holds the signed-in user for the whole app.
 *
 * On mount it asks the API who we are. A 401 there is the normal "not signed
 * in" answer rather than an error, so it resolves to a null user instead of
 * throwing — anything else is a real failure worth surfacing.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    let active = true;

    api
      .getMe()
      .then((me) => {
        if (active) setUser(me);
      })
      .catch((error) => {
        if (!(error instanceof api.ApiError && error.isUnauthenticated)) {
          console.error("Could not load the current session", error);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const signIn = useCallback(
    async (email: string, password: string) => {
      setUser(await api.login(email, password));
      router.replace("/");
    },
    [router],
  );

  const signOut = useCallback(async () => {
    try {
      await api.logout();
    } finally {
      // Clear locally even if the call failed — the session may already be gone.
      setUser(null);
      router.replace("/login");
    }
  }, [router]);

  const value = useMemo(
    () => ({ user, loading, signIn, signOut }),
    [user, loading, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside an AuthProvider");
  }
  return context;
}
