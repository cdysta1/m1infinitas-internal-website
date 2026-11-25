import { useQuery } from '@tanstack/react-query';
import { Query, type Models } from 'appwrite';
import { applyMemberBindings, buildMembersDirectory, type MemberDirectoryEntry } from '@/lib/memberDirectory';
import { DATABASE_ID, databases } from '@/lib/appwrite';
import { env } from '@/lib/env';
import { getProfilesByIds } from '@/services/profiles';
import { useAuth } from '@/hooks/useAuth';

export type { MemberDirectoryEntry } from '@/lib/memberDirectory';

export const membersDirectoryKey = ['members', 'directory', 'roster-v3'] as const;

async function loadDirectory(): Promise<MemberDirectoryEntry[]> {
  const members = buildMembersDirectory();
  if (env.demoMode) return members;
  const bindings = new Map<string, string>();
  for (let start = 0; start < members.length; start += 50) {
    const ids = members.slice(start, start + 50).map(member => member.profile.$id);
    const { documents } = await databases.listDocuments<Models.Document & { bound_user_id?: string }>(
      DATABASE_ID, env.appwrite.collections.members,
      [Query.equal('$id', ids), Query.limit(ids.length), Query.select(['$id', 'bound_user_id'])],
    );
    for (const row of documents) {
      if (row.bound_user_id) bindings.set(row.$id, row.bound_user_id);
    }
  }
  return applyMemberBindings(members, bindings, await getProfilesByIds([...bindings.values()]));
}

export function useMembersDirectory() {
  const { user } = useAuth();
  return useQuery({
    queryKey: [...membersDirectoryKey, user?.$id],
    enabled: Boolean(user),
    queryFn: loadDirectory,
    placeholderData: buildMembersDirectory,
  });
}
