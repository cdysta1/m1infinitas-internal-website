import { useQuery } from '@tanstack/react-query';
import { listUpdatesByProject } from '@/services/updates';
import type { UpdateItem } from '@/types/models';

export const latestProjectUpdatesKey = ['updates', 'latest'] as const;
export const latestProjectUpdateKey = (projectId: string) =>
  [...latestProjectUpdatesKey, projectId] as const;

export function useLatestProjectUpdate(projectId: string, enabled: boolean) {
  return useQuery<UpdateItem | null, Error>({
    queryKey: latestProjectUpdateKey(projectId),
    enabled,
    queryFn: async () => {
      const result = await listUpdatesByProject(projectId, { limit: 1 });
      return result.updates[0] ?? null;
    },
    staleTime: 15_000,
  });
}
