import { RouterProvider } from 'react-router-dom';
import { router } from './router';
import { QueryProvider } from './app/QueryProvider';
import { AuthProvider } from './app/AuthProvider';
import { ToastProvider } from './app/ToastProvider';
import { I18nProvider } from './app/I18nProvider';

// Provider composition:
// Toast (outermost so toasts can be triggered from anywhere)
//   -> Query (react-query cache)
//     -> Auth (session + profile context, uses query client implicitly)
//       -> Router (routes render inside all providers)
export function App() {
  return (
    <ToastProvider>
      <QueryProvider>
        <AuthProvider>
          <I18nProvider>
            <RouterProvider router={router} />
          </I18nProvider>
        </AuthProvider>
      </QueryProvider>
    </ToastProvider>
  );
}
