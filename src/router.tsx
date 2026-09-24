import { createHashRouter, Navigate } from 'react-router-dom';
import { RequireAuth, RedirectIfAuthed } from '@/components/layout/RequireAuth';
import { LoginPage } from '@/pages/LoginPage';
import { RegisterPage } from '@/pages/RegisterPage';
import { GalleryPage } from '@/pages/GalleryPage';
import { ProjectDetailPage } from '@/pages/ProjectDetailPage';
import { MePage } from '@/pages/MePage';

// Hash router so GitHub Pages static hosting handles deep links without
// a custom 404 rewrite.
export const router = createHashRouter([
  {
    path: '/login',
    element: (
      <RedirectIfAuthed>
        <LoginPage />
      </RedirectIfAuthed>
    ),
  },
  {
    path: '/register',
    element: (
      <RedirectIfAuthed>
        <RegisterPage />
      </RedirectIfAuthed>
    ),
  },
  {
    path: '/',
    element: (
      <RequireAuth>
        <GalleryPage />
      </RequireAuth>
    ),
  },
  {
    path: '/projects/:id',
    element: (
      <RequireAuth>
        <ProjectDetailPage />
      </RequireAuth>
    ),
  },
  {
    path: '/me',
    element: (
      <RequireAuth>
        <MePage />
      </RequireAuth>
    ),
  },
  { path: '*', element: <Navigate to="/" replace /> },
]);
