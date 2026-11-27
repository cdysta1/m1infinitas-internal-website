import { useI18n } from '@/app/I18nProvider';
import { Navigate, useLocation, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { OnboardingGuide } from '@/components/onboarding/OnboardingGuide';
import { buildAuthPath, readRedirectTarget } from '@/lib/redirect';

// Route guard: bounce unauthenticated users to /login while preserving intent.
export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { t, ready } = useI18n();
  const { status } = useAuth();
  const location = useLocation();

  if (status === 'loading' || (status === 'authenticated' && !ready)) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-sm text-muted-foreground">{t('加载中…')}</div>
    );
  }
  if (status !== 'authenticated') {
    return <Navigate to={buildAuthPath('/login', location)} replace state={{ from: location }} />;
  }
  return (
    <>
      {children}
      <OnboardingGuide />
    </>
  );
}

// Redirects authenticated users away from login/register back to their target or gallery.
export function RedirectIfAuthed({ children }: { children: React.ReactNode }) {
  const { t } = useI18n();
  const { status } = useAuth();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  if (status === 'loading') {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-sm text-muted-foreground">{t('加载中…')}</div>
    );
  }
  if (status === 'authenticated') {
    return <Navigate to={readRedirectTarget(searchParams, location.state)} replace />;
  }
  return <>{children}</>;
}
