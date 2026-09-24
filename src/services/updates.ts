import { ID, Permission, Query, Role } from 'appwrite';
import { COLLECTIONS, DATABASE_ID, databases, realtime } from '@/lib/appwrite';
import { TIMELINE_PAGE_SIZE } from '@/lib/constants';
import type { UpdateItem } from '@/types/models';

export interface CreateUpdateInput {
  project_id: string;
  content: string;
  author_id: string;
  file_ids: string[];
}

export interface ListUpdatesResult {
  updates: UpdateItem[];
  total: number;
  cursor?: string;
}

// Fetch a page of updates for a project, newest first.
export async function listUpdatesByProject(
  projectId: string,
  opts: { limit?: number; cursor?: string } = {},
): Promise<ListUpdatesResult> {
  const limit = opts.limit ?? TIMELINE_PAGE_SIZE;
  const queries: string[] = [
    Query.equal('project_id', projectId),
    Query.orderDesc('created_at'),
    Query.limit(limit),
  ];
  if (opts.cursor) queries.push(Query.cursorAfter(opts.cursor));

  const res = await databases.listDocuments<UpdateItem>(
    DATABASE_ID,
    COLLECTIONS.updates,
    queries,
  );
  const last = res.documents[res.documents.length - 1];
  return {
    updates: res.documents,
    total: res.total,
    cursor: res.documents.length === limit && last ? last.$id : undefined,
  };
}

export async function createUpdate(input: CreateUpdateInput): Promise<UpdateItem> {
  const now = new Date().toISOString();
  return databases.createDocument<UpdateItem>(
    DATABASE_ID,
    COLLECTIONS.updates,
    ID.unique(),
    {
      project_id: input.project_id,
      content: input.content,
      author_id: input.author_id,
      file_ids: input.file_ids,
      created_at: now,
    },
    [
      Permission.read(Role.users()),
      Permission.update(Role.user(input.author_id)),
      Permission.delete(Role.user(input.author_id)),
    ],
  );
}

export async function deleteUpdate(id: string): Promise<void> {
  await databases.deleteDocument(DATABASE_ID, COLLECTIONS.updates, id);
}

// Subscribe to realtime create/update/delete events on the updates collection.
// The channel is scoped to the whole collection; callers must filter by
// project_id themselves (Appwrite does not support server-side filtering here).
export function subscribeUpdates(
  handler: (payload: RealtimeUpdatePayload) => void,
): () => void {
  const channel = `databases.${DATABASE_ID}.collections.${COLLECTIONS.updates}.documents`;
  return realtime.subscribe<RealtimeUpdatePayload>([channel], (event) => {
    const payload = event.payload;
    if (!payload) return;
    handler(payload);
  });
}

export interface RealtimeUpdatePayload {
  $id: string;
  $collectionId: string;
  $databaseId: string;
  $createdAt: string;
  $updatedAt: string;
  $permissions: string[];
  project_id: string;
  content: string;
  author_id: string;
  file_ids: string[];
  created_at: string;
}
