import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { Models } from 'appwrite';
import { useQueryClient } from '@tanstack/react-query';
import { getCurrentUser, login as loginService, logout as logoutService, register as registerService, type RegisterInput } from '@/services/auth';
import { getProfile } from '@/services/profiles';
import { env } from '@/lib/env';
import type { Profile } from '@/types/models';

interface AuthState {
  user: Models.User<Models.Preferences> | null;
  profile: Profile | null;
  status: 'loading' | 'authenticated' | 'unauthenticated';
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<Models.User<Models.Preferences> | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [status, setStatus] = useState<AuthState['status']>('loading');

  // Resolve the profile for a given user (used on bootstrap + login/register).
  const fetchProfileSafe = useCallback(async (u: Models.User<Models.Preferences> | null): Promise<Profile | null> => {
    if (!u) return null;
    try {
      return await getProfile(u.$id);
    } catch (err) {
      console.warn('[auth] failed to load profile', err);
      return null;
    }
  }, []);

  // Bootstrap: check for an existing session once on mount.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const u = await getCurrentUser();
        if (cancelled) return;
        const p = u ? await fetchProfileSafe(u) : null;
        if (cancelled) return;
        setUser(u);
        setProfile(p);
        setStatus(u ? 'authenticated' : 'unauthenticated');
      } catch (err) {
        console.warn('[auth] bootstrap failed', err);
        if (!cancelled) setStatus('unauthenticated');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fetchProfileSafe]);

  // Demo preview always has a local identity. Recover automatically if a hot
  // reload or an earlier logout left the provider unauthenticated.
  useEffect(() => {
    if (!env.demoMode || status !== 'unauthenticated') return;
    let cancelled = false;
    void (async () => {
      const u = await getCurrentUser();
      if (cancelled || !u) return;
      const p = await fetchProfileSafe(u);
      if (cancelled) return;
      setUser(u);
      setProfile(p);
      setStatus('authenticated');
    })();
    return () => {
      cancelled = true;
    };
  }, [fetchProfileSafe, status]);

  const login = useCallback(
    async (email: string, password: string) => {
      const u = await loginService(email, password);
      const p = await fetchProfileSafe(u);
      setUser(u);
      setProfile(p);
      setStatus('authenticated');
    },
    [fetchProfileSafe],
  );

  const register = useCallback(
    async (input: RegisterInput) => {
      const u = await registerService(input);
      const p = await fetchProfileSafe(u);
      setUser(u);
      setProfile(p);
      setStatus('authenticated');
    },
    [fetchProfileSafe],
  );

  const logout = useCallback(async () => {
    if (env.demoMode) return;
    await logoutService();
    queryClient.clear();
    setUser(null);
    setProfile(null);
    setStatus('unauthenticated');
  }, [queryClient]);

  const refreshProfile = useCallback(async () => {
    const p = await fetchProfileSafe(user);
    setProfile(p);
  }, [fetchProfileSafe, user]);

  const value = useMemo<AuthContextValue>(
    () => ({ user, profile, status, login, register, logout, refreshProfile }),
    [user, profile, status, login, register, logout, refreshProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuthContext(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuthContext must be used within AuthProvider');
  return ctx;
}
