import type { Models } from 'appwrite';
import type { OptimisticStatus, ProjectStatus } from '@/lib/constants';

// ---- Appwrite document types ------------------------------------------------

// Profile document (collection: profiles). $id mirrors the Auth user id.
export interface Profile extends Models.Document {
  name: string;
  wechat: string;
  avatar_file_id?: string;
}

// Project document (collection: projects).
export interface Project extends Models.Document {
  title: string;
  summary: string;
  cover_file_id: string;
  owner_id: string;
  status: ProjectStatus;
  updated_at: string;
}

// Update document (collection: updates).
export interface UpdateItem extends Models.Document {
  project_id: string;
  content: string;
  author_id: string;
  file_ids: string[];
  created_at: string;
}

// ---- Client-side view models ------------------------------------------------

// A timeline entry rendered by the UI. Includes optimistic local drafts
// that are still uploading (isLocal=true, status=pending|failed).
export interface TimelineEntry {
  id: string;
  projectId: string;
  authorId: string;
  content: string;
  createdAt: string;
  fileIds: string[];
  // Local preview URLs (blob:) used while the upload is in-flight.
  localPreviewUrls?: string[];
  isLocal?: boolean;
  status?: OptimisticStatus;
  // Retry handle kept in memory; not persisted anywhere.
  retryPayload?: RetryPayload;
}

export interface RetryPayload {
  content: string;
  files: File[];
}

// Joined project + owner profile for gallery cards.
export interface ProjectWithOwner extends Project {
  owner?: Profile;
}

// Joined update + author profile for timeline items.
export interface UpdateWithAuthor extends UpdateItem {
  author?: Profile;
}

// Auth user (from Appwrite Account) plus resolved profile.
export interface SessionUser {
  id: string;
  email: string;
  name?: string;
  profile?: Profile;
}
