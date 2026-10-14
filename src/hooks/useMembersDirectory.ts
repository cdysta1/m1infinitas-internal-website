import { useQuery } from '@tanstack/react-query';
import { listProfiles } from '@/services/profiles';
import { listProjects } from '@/services/projects';
import { buildMembersDirectory, type MemberDirectoryEntry } from '@/lib/memberDirectory';
import { env } from '@/lib/env';

export type { MemberDirectoryEntry } from '@/lib/memberDirectory';

export const membersDirectoryKey = ['members', 'directory', 'roster-v2'] as const;

export function useMembersDirectory() {
  return useQuery<MemberDirectoryEntry[], Error>({
    queryKey: membersDirectoryKey,
    queryFn: async () => {
      const [profiles, projectResult] = await Promise.all([
        listProfiles(100),
        listProjects({ limit: 100 }),
      ]);

      const directoryProfiles = env.demoMode
        ? profiles.filter((profile) => !profile.$id.startsWith('demo-user-'))
        : profiles;
      return buildMembersDirectory(directoryProfiles, projectResult.projects);
    },
  });
}
