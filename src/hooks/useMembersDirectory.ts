import { useQuery } from '@tanstack/react-query';
import { listProfiles } from '@/services/profiles';
import { listProjects } from '@/services/projects';
import type { Profile, Project } from '@/types/models';

export interface MemberDirectoryEntry {
  profile: Profile;
  projects: Project[];
}

export const membersDirectoryKey = ['members', 'directory'] as const;

export function useMembersDirectory() {
  return useQuery<MemberDirectoryEntry[], Error>({
    queryKey: membersDirectoryKey,
    queryFn: async () => {
      const [profiles, projectResult] = await Promise.all([
        listProfiles(100),
        listProjects({ limit: 100 }),
      ]);

      const projectsByOwner = new Map<string, Project[]>();
      projectResult.projects.forEach((project) => {
        const owned = projectsByOwner.get(project.owner_id) ?? [];
        owned.push(project);
        projectsByOwner.set(project.owner_id, owned);
      });

      return profiles.map((profile) => ({
        profile,
        projects: projectsByOwner.get(profile.$id) ?? [],
      }));
    },
  });
}
