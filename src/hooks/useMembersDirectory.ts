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
      // Skip real-time data fetching, use only hardcoded roster
      return buildMembersDirectory([], []);
    },
  });
}
