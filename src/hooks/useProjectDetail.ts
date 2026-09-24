import { useQuery } from '@tanstack/react-query';
import { getProject } from '@/services/projects';
import { getProfile } from '@/services/profiles';
import type { Profile, Project } from '@/types/models';

export const projectDetailKey = (id: string) => ['projects', 'detail', id] as const;
export const projectOwnerKey = (id: string) => ['profiles', 'by-id', id] as const;

// Fetch a single project + resolve its owner profile in parallel.
export function useProjectDetail(projectId: string | undefined) {
  const projectQuery = useQuery<Project>({
    queryKey: projectDetailKey(projectId ?? ''),
    enabled: Boolean(projectId),
    queryFn: () => getProject(projectId!),
  });

  const ownerId = projectQuery.data?.owner_id;
  const ownerQuery = useQuery<Profile | null>({
    queryKey: projectOwnerKey(ownerId ?? ''),
    enabled: Boolean(ownerId),
    queryFn: () => getProfile(ownerId!),
  });

  return {
    project: projectQuery.data ?? null,
    owner: ownerQuery.data ?? null,
    isLoading: projectQuery.isLoading || (Boolean(ownerId) && ownerQuery.isLoading),
    error: projectQuery.error ?? ownerQuery.error,
    refetch: () => {
      projectQuery.refetch();
      if (ownerId) ownerQuery.refetch();
    },
  };
}
