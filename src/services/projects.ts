import { ID, Permission, Query, Role } from 'appwrite';
import { COLLECTIONS, DATABASE_ID, databases, realtime } from '@/lib/appwrite';
import { PAGE_SIZE, PROJECT_STATUS, type ProjectStatus } from '@/lib/constants';
import type { Project } from '@/types/models';
import { env } from '@/lib/env';
import {
  demoCreateProject,
  demoGetProject,
  demoListProjects,
  demoListProjectsByOwner,
  demoSubscribeProjects,
  demoTouchProject,
  demoUpdateProject,
  demoUpdateProjectStatus,
} from '@/demo/store';

export interface CreateProjectInput {
  title: string;
  summary: string;
  cover_file_id: string;
  owner_id: string;
}

export interface ListProjectsResult {
  projects: Project[];
  total: number;
  cursor?: string;
}

export type UpdateProjectInput = Partial<
  Pick<Project, 'title' | 'summary' | 'cover_file_id'>
>;

// List active projects ordered by updated_at desc, cursor-paginated.
export async function listProjects(opts: {
  status?: ProjectStatus;
  limit?: number;
  cursor?: string;
} = {}): Promise<ListProjectsResult> {
  if (env.demoMode) return demoListProjects(opts);
  const limit = opts.limit ?? PAGE_SIZE;
  const queries: string[] = [
    Query.orderDesc('updated_at'),
    Query.limit(limit),
  ];
  if (opts.status) queries.push(Query.equal('status', opts.status));
  if (opts.cursor) queries.push(Query.cursorAfter(opts.cursor));

  const res = await databases.listDocuments<Project>(
    DATABASE_ID,
    COLLECTIONS.projects,
    queries,
  );
  const last = res.documents[res.documents.length - 1];
  return {
    projects: res.documents,
    total: res.total,
    cursor: res.documents.length === limit && last ? last.$id : undefined,
  };
}

export async function getProject(id: string): Promise<Project> {
  if (env.demoMode) return demoGetProject(id);
  return databases.getDocument<Project>(DATABASE_ID, COLLECTIONS.projects, id);
}

export async function listProjectsByOwner(ownerId: string): Promise<Project[]> {
  if (env.demoMode) return demoListProjectsByOwner(ownerId);
  const res = await databases.listDocuments<Project>(
    DATABASE_ID,
    COLLECTIONS.projects,
    [Query.equal('owner_id', ownerId), Query.limit(100)],
  );
  return [...res.documents].sort((a, b) => b.updated_at.localeCompare(a.updated_at));
}

export async function createProject(input: CreateProjectInput): Promise<Project> {
  if (env.demoMode) return demoCreateProject(input);
  const now = new Date().toISOString();
  return databases.createDocument<Project>(
    DATABASE_ID,
    COLLECTIONS.projects,
    ID.unique(),
    {
      title: input.title,
      summary: input.summary,
      cover_file_id: input.cover_file_id,
      owner_id: input.owner_id,
      status: PROJECT_STATUS.ACTIVE,
      updated_at: now,
    },
    [
      Permission.read(Role.users()),
      Permission.update(Role.user(input.owner_id)),
      Permission.delete(Role.user(input.owner_id)),
    ],
  );
}

export async function updateProject(
  id: string,
  input: UpdateProjectInput,
): Promise<Project> {
  if (env.demoMode) return demoUpdateProject(id, input);
  return databases.updateDocument<Project>(
    DATABASE_ID,
    COLLECTIONS.projects,
    id,
    {
      ...input,
      updated_at: new Date().toISOString(),
    },
  );
}

// Bump updated_at; called after a new update is appended so the gallery reorders.
// Only the project owner has write permission; other callers should skip.
export async function touchProject(id: string): Promise<Project | null> {
  if (env.demoMode) return demoTouchProject(id);
  try {
    return await databases.updateDocument<Project>(
      DATABASE_ID,
      COLLECTIONS.projects,
      id,
      { updated_at: new Date().toISOString() },
    );
  } catch (err) {
    console.warn('[projects] touchProject failed', err, { id });
    return null;
  }
}

export async function updateProjectStatus(
  id: string,
  status: ProjectStatus,
): Promise<Project> {
  if (env.demoMode) return demoUpdateProjectStatus(id, status);
  return databases.updateDocument<Project>(DATABASE_ID, COLLECTIONS.projects, id, {
    status,
    updated_at: new Date().toISOString(),
  });
}

// Realtime subscription on the projects collection. Used to re-sort the
// gallery when someone else creates a project or bumps updated_at.
export function subscribeProjects(onEvent: () => void): () => void {
  if (env.demoMode) return demoSubscribeProjects(onEvent);
  const channel = `databases.${DATABASE_ID}.collections.${COLLECTIONS.projects}.documents`;
  return realtime.subscribe([channel], () => onEvent());
}
