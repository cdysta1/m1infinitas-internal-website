import { useInfiniteQuery, useQueryClient, type InfiniteData } from '@tanstack/react-query';
import { useEffect } from 'react';
import { listUpdatesByProject, subscribeUpdates, type RealtimeUpdatePayload } from '@/services/updates';
import { getProfilesByIds } from '@/services/profiles';
import type { Profile, TimelineEntry, UpdateItem } from '@/types/models';
import { OPTIMISTIC } from '@/lib/constants';

export interface TimelinePage {
  entries: TimelineEntry[];
  authors: Map<string, Profile>;
  cursor?: string;
  total: number;
}

export const timelineKey = (projectId: string) =>
  ['updates', 'timeline', projectId] as const;

// Convert an Appwrite document into a timeline entry (server-side variant).
export function toTimelineEntry(doc: UpdateItem): TimelineEntry {
  return {
    id: doc.$id,
    projectId: doc.project_id,
    authorId: doc.author_id,
    content: doc.content,
    createdAt: doc.created_at,
    fileIds: doc.file_ids ?? [],
    isLocal: false,
    status: OPTIMISTIC.SENT,
  };
}

export function realtimePayloadToEntry(p: RealtimeUpdatePayload): TimelineEntry {
  return {
    id: p.$id,
    projectId: p.project_id,
    authorId: p.author_id,
    content: p.content,
    createdAt: p.created_at ?? p.$createdAt,
    fileIds: p.file_ids ?? [],
    isLocal: false,
    status: OPTIMISTIC.SENT,
  };
}

// Paginated project media records (newest first) with realtime insertion.
// Project creation can seed a local optimistic entry on this query key.
export function useUpdatesTimeline(
  projectId: string | undefined,
  opts: { includeAuthors?: boolean } = {},
) {
  const includeAuthors = opts.includeAuthors ?? true;
  const qc = useQueryClient();

  const query = useInfiniteQuery<
    TimelinePage,
    Error,
    InfiniteData<TimelinePage>,
    ReturnType<typeof timelineKey>,
    string | undefined
  >({
    queryKey: timelineKey(projectId ?? ''),
    enabled: Boolean(projectId),
    initialPageParam: undefined,
    getNextPageParam: (last) => last.cursor,
    queryFn: async ({ pageParam }) => {
      const res = await listUpdatesByProject(projectId!, { cursor: pageParam });
      const authors = includeAuthors
        ? await getProfilesByIds(res.updates.map((u) => u.author_id))
        : new Map<string, Profile>();
      return {
        entries: res.updates.map(toTimelineEntry),
        authors,
        cursor: res.cursor,
        total: res.total,
      } satisfies TimelinePage;
    },
  });

  // Realtime: sync create/update/delete events for this project.
  useEffect(() => {
    if (!projectId) return;
    const unsub = subscribeUpdates((payload, action) => {
      if (payload.project_id !== projectId) return;
      const key = timelineKey(projectId);
      if (action === 'delete') {
        qc.setQueryData<InfiniteData<TimelinePage>>(key, (old) => {
          if (!old) return old;
          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              entries: page.entries.filter((e) => e.id !== payload.$id),
            })),
          };
        });
        return;
      }
      void (async () => {
        // Resolve the author profile if needed and not cached yet, so a live update
        // shows the real name instead of falling back to "匿名".
        let authorPatch: Map<string, Profile> | undefined;
        if (includeAuthors) {
          const current = qc.getQueryData<InfiniteData<TimelinePage>>(key);
          const known = mergeAuthors(current?.pages);
          if (payload.author_id && !known.has(payload.author_id)) {
            try {
              authorPatch = await getProfilesByIds([payload.author_id]);
            } catch (err) {
              console.warn('[timeline] failed to resolve realtime author', err);
            }
          }
        }
        qc.setQueryData<InfiniteData<TimelinePage>>(key, (old) => {
          if (!old || old.pages.length === 0) return old;
          const entry = realtimePayloadToEntry(payload);
          if (action === 'update') {
            const exists = old.pages.some((page) => page.entries.some((e) => e.id === payload.$id));
            if (exists) {
              return {
                ...old,
                pages: old.pages.map((page) => ({
                  ...page,
                  entries: page.entries.map((e) => (e.id === payload.$id ? entry : e)),
                })),
              };
            }
          }
          const first = old.pages[0];
          if (first.entries.some((e) => e.id === payload.$id)) return old;
          const authors =
            authorPatch && authorPatch.size > 0
              ? new Map([...first.authors, ...authorPatch])
              : first.authors;
          return {
            ...old,
            pages: [
              { ...first, entries: [entry, ...first.entries], authors },
              ...old.pages.slice(1),
            ],
          };
        });
      })();
    });
    return unsub;
  }, [includeAuthors, projectId, qc]);

  const entries = query.data?.pages.flatMap((p) => p.entries) ?? [];
  const authors = mergeAuthors(query.data?.pages);

  return {
    entries,
    authors,
    total: query.data?.pages[0]?.total ?? 0,
    isLoading: query.isLoading,
    isFetchingNextPage: query.isFetchingNextPage,
    hasNextPage: query.hasNextPage ?? false,
    fetchNextPage: query.fetchNextPage,
    refetch: query.refetch,
    error: query.error,
  };
}

function mergeAuthors(pages: TimelinePage[] | undefined): Map<string, Profile> {
  const merged = new Map<string, Profile>();
  if (!pages) return merged;
  for (const p of pages) for (const [k, v] of p.authors) merged.set(k, v);
  return merged;
}
