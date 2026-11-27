// Safe internal redirect helpers so share links and email notifications return
// users to their intended route after login/registration without open redirects.

export function sanitizeRedirectPath(raw: string | null | undefined): string {
  if (!raw || typeof raw !== 'string') return '/';
  const trimmed = raw.trim();
  if (!trimmed.startsWith('/') || trimmed.startsWith('//')) return '/';
  if (trimmed === '/login' || trimmed.startsWith('/login?') || trimmed === '/register' || trimmed.startsWith('/register?')) {
    return '/';
  }
  return trimmed;
}

export function buildAuthPath(
  authRoute: '/login' | '/register',
  target: { pathname: string; search?: string } | string | null | undefined,
): string {
  const raw = typeof target === 'string'
    ? target
    : target
      ? `${target.pathname}${target.search ?? ''}`
      : '/';
  const safe = sanitizeRedirectPath(raw);
  if (safe === '/') return authRoute;
  return `${authRoute}?redirect=${encodeURIComponent(safe)}`;
}

export function readRedirectTarget(
  searchParams: URLSearchParams,
  state?: unknown,
): string {
  const fromQuery = searchParams.get('redirect');
  if (fromQuery) return sanitizeRedirectPath(fromQuery);
  const fromState = (state as { from?: { pathname?: string; search?: string } } | null)?.from;
  if (fromState?.pathname) {
    return sanitizeRedirectPath(`${fromState.pathname}${fromState.search ?? ''}`);
  }
  return '/';
}
