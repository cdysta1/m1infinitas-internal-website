import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

// Route guard: bounce unauthenticated users to /login while preserving intent.
export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { status } = useAuth();
  const location = useLocation();

  if (status === 'loading') {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-sm text-muted-foreground">
        加载中…
      </div>
    );
  }
  if (status !== 'authenticated') {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  return <>{children}</>;
}

// Redirects authenticated users away from login/register back to the gallery.
export function RedirectIfAuthed({ children }: { children: React.ReactNode }) {
  const { status } = useAuth();
  if (status === 'loading') {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-sm text-muted-foreground">
        加载中…
      </div>
    );
  }
  if (status === 'authenticated') return <Navigate to="/" replace />;
  return <>{children}</>;
}
