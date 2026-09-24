import { Toaster } from 'sonner';
import { type ReactNode } from 'react';

// Toast layer with mobile-friendly positioning.
export function ToastProvider({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <Toaster
        position="top-center"
        richColors
        closeButton={false}
        toastOptions={{
          style: { borderRadius: '12px' },
        }}
      />
    </>
  );
}
