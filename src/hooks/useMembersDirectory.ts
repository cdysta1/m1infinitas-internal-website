import { useQuery } from '@tanstack/react-query';
import { Query, type Models } from 'appwrite';
import { applyMemberBindings, buildMembersDirectory, type MemberDirectoryEntry } from '@/lib/memberDirectory';
import { DATABASE_ID, databases } from '@/lib/appwrite';
import { env } from '@/lib/env';
import { getProfilesByIds } from '@/services/profiles';
import { DEMO_USER_ID } from '@/demo/store';
import { useAuth } from '@/hooks/useAuth';

export type { MemberDirectoryEntry } from '@/lib/memberDirectory';

export const membersDirectoryKey = ['members', 'directory', 'roster-v3'] as const;

const novaCardId = 'member-zhang-tianyi';

function initialDirectory() {
  const members = buildMembersDirectory();
  const nova = members.find(member => member.profile.$id === novaCardId);
  if (nova) {
    nova.meta = { ...nova.meta, contacts: nova.meta.contacts.filter(contact => contact.kind !== 'email') };
  }
  return members;
}

async function loadDirectory(): Promise<MemberDirectoryEntry[]> {
  const members = initialDirectory();
  if (env.demoMode) {
    const id = 'demo-member-lucian';
    members.push({
      profile: { $id: id, name: 'Lucian', wechat: '' },
      meta: { description: '分享我的音乐与创作。', focus: '', tags: ['电子音乐'], areas: ['音乐'], contacts: [] },
      aliases: [], projects: [],
    });
    return applyMemberBindings(members, new Map([[id, DEMO_USER_ID]]), await getProfilesByIds([DEMO_USER_ID]));
  }
  const bindings = new Map<string, string>();
  for (let start = 0; start < members.length; start += 50) {
    const ids = members.slice(start, start + 50).map(member => member.profile.$id);
    const { documents } = await databases.listDocuments<Models.Document & { bound_user_id?: string; contacts?: string }>(
      DATABASE_ID, env.appwrite.collections.members,
      [Query.equal('$id', ids), Query.limit(ids.length), Query.select(['$id', 'bound_user_id', 'contacts'])],
    );
    for (const row of documents) {
      if (row.$id === novaCardId && row.contacts) {
        const nova = members.find(member => member.profile.$id === row.$id);
        try {
          const contacts: unknown = JSON.parse(row.contacts);
          const email = Array.isArray(contacts) && contacts.find(contact => contact?.kind === 'email')?.value;
          if (nova && typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            nova.meta.contacts.push({ kind: 'email', label: '邮箱', value: email, url: 'mailto:' + email });
          }
        } catch {
          // Keep other contact methods when the stored contact list is malformed.
        }
      }
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
    placeholderData: initialDirectory,
  });
}
