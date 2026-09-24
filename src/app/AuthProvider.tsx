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
import { getCurrentUser, login as loginService, logout as logoutService, register as registerService, type RegisterInput } from '@/services/auth';
import { getProfile } from '@/services/profiles';
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
  const [user, setUser] = useState<Models.User<Models.Preferences> | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [status, setStatus] = useState<AuthState['status']>('loading');

  // Resolve the profile for a given user (used on bootstrap + login/register).
  const loadProfile = useCallback(async (u: Models.User<Models.Preferences> | null) => {
    if (!u) {
      setProfile(null);
      return;
    }
    try {
      const p = await getProfile(u.$id);
      setProfile(p);
    } catch (err) {
      console.warn('[auth] failed to load profile', err);
      setProfile(null);
    }
  }, []);

  // Bootstrap: check for an existing session once on mount.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const u = await getCurrentUser();
        if (cancelled) return;
        setUser(u);
        setStatus(u ? 'authenticated' : 'unauthenticated');
        if (u) await loadProfile(u);
      } catch (err) {
        console.warn('[auth] bootstrap failed', err);
        if (!cancelled) setStatus('unauthenticated');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadProfile]);

  const login = useCallback(
    async (email: string, password: string) => {
      const u = await loginService(email, password);
      setUser(u);
      setStatus('authenticated');
      await loadProfile(u);
    },
    [loadProfile],
  );

  const register = useCallback(
    async (input: RegisterInput) => {
      const u = await registerService(input);
      setUser(u);
      setStatus('authenticated');
      await loadProfile(u);
    },
    [loadProfile],
  );

  const logout = useCallback(async () => {
    await logoutService();
    setUser(null);
    setProfile(null);
    setStatus('unauthenticated');
  }, []);

  const refreshProfile = useCallback(async () => {
    await loadProfile(user);
  }, [loadProfile, user]);

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
