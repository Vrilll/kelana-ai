"use client";

import { useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  clearSession,
  fetchMe,
  getStoredUser,
  getToken,
  login as loginRequest,
  register as registerRequest,
  storeSession,
  UNAUTHORIZED_EVENT,
  type User,
} from "@/lib/api";

type AuthContextValue = {
  user: User | null;
  /** true until the stored session has been read and checked */
  isLoading: boolean;
  /**
   * True from the moment "Sign out" is pressed until the login page renders.
   * RequireAuth uses it to stand down, so signing out from a protected page
   * lands on a clean /login instead of racing to add a ?next= back to it.
   */
  isSigningOut: boolean;
  /** Called by the login page once it has taken over. */
  clearSigningOut: () => void;
  login: (email: string, password: string) => Promise<void>;
  register: (
    email: string,
    password: string,
    fullName?: string,
  ) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSigningOut, setIsSigningOut] = useState(false);

  // Restore the session on first paint. localStorage is read in an effect, not
  // during render, so the server and client markup match.
  useEffect(() => {
    const token = getToken();

    if (!token) {
      setIsLoading(false);
      return;
    }

    // Show the cached user immediately, then confirm the token still works.
    setUser(getStoredUser());

    let cancelled = false;
    fetchMe()
      .then((fresh) => {
        if (!cancelled) {
          setUser(fresh);
          storeSession(token, fresh);
        }
      })
      .catch(() => {
        // An unreachable API should not sign you out; an invalid token already
        // cleared storage inside the client and fires the event below.
        if (!cancelled && !getToken()) setUser(null);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // The API rejected our token mid-session - drop it and go to the login page.
  useEffect(() => {
    function handleUnauthorized() {
      setUser(null);
      router.replace("/login?expired=1");
    }

    window.addEventListener(UNAUTHORIZED_EVENT, handleUnauthorized);
    return () =>
      window.removeEventListener(UNAUTHORIZED_EVENT, handleUnauthorized);
  }, [router]);

  const login = useCallback(async (email: string, password: string) => {
    const result = await loginRequest({ email, password });
    storeSession(result.access_token, result.user);
    setUser(result.user);
  }, []);

  const register = useCallback(
    async (email: string, password: string, fullName?: string) => {
      const result = await registerRequest({
        email,
        password,
        full_name: fullName?.trim() || undefined,
      });
      storeSession(result.access_token, result.user);
      setUser(result.user);
    },
    [],
  );

  const logout = useCallback(() => {
    setIsSigningOut(true);
    clearSession();
    setUser(null);
    router.replace("/login");
  }, [router]);

  const clearSigningOut = useCallback(() => setIsSigningOut(false), []);

  const value = useMemo(
    () => ({
      user,
      isLoading,
      isSigningOut,
      clearSigningOut,
      login,
      register,
      logout,
    }),
    [user, isLoading, isSigningOut, clearSigningOut, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside an AuthProvider");
  }
  return context;
}
