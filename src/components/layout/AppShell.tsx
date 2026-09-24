import { type ReactNode } from 'react';
import { Header } from './Header';

interface AppShellProps {
  children: ReactNode;
  onCreateClick?: () => void;
  showCreate?: boolean;
  footer?: ReactNode;
}

// Page frame: sticky header + main content + optional fixed footer (FAB).
// The bottom padding reserves space for the fixed footer on mobile.
export function AppShell({ children, onCreateClick, showCreate, footer }: AppShellProps) {
  return (
    <div className="min-h-[100dvh] bg-background text-foreground">
      <Header onCreateClick={onCreateClick} showCreate={showCreate} />
      <main className={footer ? 'pb-28' : 'pb-8'}>{children}</main>
      {footer}
    </div>
  );
}
