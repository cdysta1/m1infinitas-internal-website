import { useQuery } from '@tanstack/react-query';
import { listProjectsByOwner } from '@/services/projects';

export const ownedProjectsKey = (userId: string) =>
  ['projects', 'owned', userId] as const;

export function useOwnedProjects(userId: string | undefined) {
  return useQuery({
    queryKey: ownedProjectsKey(userId ?? ''),
    queryFn: () => listProjectsByOwner(userId!),
    enabled: Boolean(userId),
  });
}
