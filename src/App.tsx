import { RouterProvider } from 'react-router-dom';
import { router } from './router';
import { QueryProvider } from './app/QueryProvider';
import { AuthProvider } from './app/AuthProvider';
import { ToastProvider } from './app/ToastProvider';

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
          <RouterProvider router={router} />
        </AuthProvider>
      </QueryProvider>
    </ToastProvider>
  );
}
