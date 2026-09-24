import { useInfiniteQuery, useQueryClient, type InfiniteData } from '@tanstack/react-query';
import { useEffect } from 'react';
import { listProjects, subscribeProjects } from '@/services/projects';
import { getProfilesByIds } from '@/services/profiles';
import type { Profile, Project } from '@/types/models';
import { PAGE_SIZE, PROJECT_STATUS } from '@/lib/constants';

export interface FeedPage {
  projects: Project[];
  owners: Map<string, Profile>;
  cursor?: string;
  total: number;
}

export const projectsFeedKey = ['projects', 'feed'] as const;

// Infinite feed of active projects ordered by updated_at desc.
// Also resolves owner profiles in the same query so cards can render avatar/name.
export function useProjectsFeed(enabled = true) {
  const query = useInfiniteQuery<
    FeedPage,
    Error,
    InfiniteData<FeedPage>,
    typeof projectsFeedKey,
    string | undefined
  >({
    queryKey: projectsFeedKey,
    enabled,
    initialPageParam: undefined,
    getNextPageParam: (last) => last.cursor,
    queryFn: async ({ pageParam }) => {
      const res = await listProjects({
        status: PROJECT_STATUS.ACTIVE,
        limit: PAGE_SIZE,
        cursor: pageParam,
      });
      const owners = await getProfilesByIds(res.projects.map((p) => p.owner_id));
      return {
        projects: res.projects,
        owners,
        cursor: res.cursor,
        total: res.total,
      } satisfies FeedPage;
    },
  });

  // Flatten pages for consumers.
  const projects = query.data?.pages.flatMap((p) => p.projects) ?? [];
  const owners = mergeOwners(query.data?.pages);

  return {
    projects,
    owners,
    total: query.data?.pages[0]?.total ?? 0,
    isLoading: query.isLoading,
    isFetchingNextPage: query.isFetchingNextPage,
    hasNextPage: query.hasNextPage ?? false,
    fetchNextPage: query.fetchNextPage,
    refetch: query.refetch,
    error: query.error,
  };
}

// Invalidate the feed (used after creating a project or update).
export function useInvalidateProjectsFeed() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: projectsFeedKey });
}

function mergeOwners(pages: FeedPage[] | undefined): Map<string, Profile> {
  const merged = new Map<string, Profile>();
  if (!pages) return merged;
  for (const p of pages) {
    for (const [k, v] of p.owners) merged.set(k, v);
  }
  return merged;
}

// Subscribe to realtime project updates so the gallery re-sorts without refresh.
export function useProjectsRealtime() {
  const qc = useQueryClient();
  useEffect(() => {
    const unsub = subscribeProjects(() => {
      qc.invalidateQueries({ queryKey: projectsFeedKey });
    });
    return unsub;
  }, [qc]);
}
