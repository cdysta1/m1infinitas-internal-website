import { useAuth } from './useAuth';

// Convenience accessor for the current user's profile.
// Returns null while the auth bootstrap is still resolving.
export function useCurrentProfile() {
  const { profile, user, status } = useAuth();
  return {
    profile,
    userId: user?.$id ?? null,
    isAuthenticated: status === 'authenticated',
    isLoading: status === 'loading',
  };
}
