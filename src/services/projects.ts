import { ID, Permission, Query, Role } from 'appwrite';
import { COLLECTIONS, DATABASE_ID, databases, realtime } from '@/lib/appwrite';
import { PAGE_SIZE, PROJECT_STATUS, type ProjectStatus } from '@/lib/constants';
import type { Project } from '@/types/models';

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

// List active projects ordered by updated_at desc, cursor-paginated.
export async function listProjects(opts: {
  status?: ProjectStatus;
  limit?: number;
  cursor?: string;
} = {}): Promise<ListProjectsResult> {
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
  return databases.getDocument<Project>(DATABASE_ID, COLLECTIONS.projects, id);
}

export async function createProject(input: CreateProjectInput): Promise<Project> {
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

// Bump updated_at; called after a new update is appended so the gallery reorders.
// Only the project owner has write permission; other callers should skip.
export async function touchProject(id: string): Promise<Project | null> {
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
  return databases.updateDocument<Project>(DATABASE_ID, COLLECTIONS.projects, id, {
    status,
    updated_at: new Date().toISOString(),
  });
}

// Realtime subscription on the projects collection. Used to re-sort the
// gallery when someone else creates a project or bumps updated_at.
export function subscribeProjects(onEvent: () => void): () => void {
  const channel = `databases.${DATABASE_ID}.collections.${COLLECTIONS.projects}.documents`;
  return realtime.subscribe([channel], () => onEvent());
}
