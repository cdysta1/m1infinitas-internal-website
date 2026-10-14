import { MEMBER_ROSTER } from '@/data/memberRoster';
import type { Profile, Project } from '@/types/models';
import { translateMemberLabel } from '@/i18n/memberLabels';

export interface MemberContact {
  kind: 'email' | 'website' | 'social';
  label: string;
  value: string;
  url?: string;
}

export interface MemberMeta {
  focus: string;
  description: string;
  tags: string[];
  areas: string[];
  contacts: MemberContact[];
}

export interface MemberRosterRecord extends MemberMeta {
  id: string;
  name: string;
  aliases: string[];
  priority?: number;
}

export type MemberDirectoryProfile = Pick<Profile, '$id' | 'name' | 'wechat' | 'avatar_file_id'>;

export interface MemberDirectoryEntry {
  profile: MemberDirectoryProfile;
  meta: MemberMeta;
  aliases: string[];
  projects: Project[];
  accountId?: string;
  priority?: number;
}

export const MEMBER_AREAS = [
  '全部', '音乐', '声音艺术', '剧场', '视觉', '空间', '数字媒体', '研究', '运营', '其他',
] as const;

const memberNameCollator = new Intl.Collator('zh-CN-u-co-pinyin');

function normalizeName(value: string): string {
  return value.normalize('NFC').trim().toLocaleLowerCase();
}

export function buildMembersDirectory(profiles: Profile[], projects: Project[]): MemberDirectoryEntry[] {
  const projectsByOwner = new Map<string, Project[]>();
  projects.forEach((project) => {
    const owned = projectsByOwner.get(project.owner_id) ?? [];
    owned.push(project);
    projectsByOwner.set(project.owner_id, owned);
  });

  const matchedAccountIds = new Set<string>();
  const members: MemberDirectoryEntry[] = MEMBER_ROSTER.map((record) => {
    const names = new Set([record.name, ...record.aliases].map(normalizeName));
    const candidates = profiles.filter((profile) => names.has(normalizeName(profile.name)));
    const account = candidates.length === 1 ? candidates[0] : undefined;
    if (account) matchedAccountIds.add(account.$id);

    return {
      // Roster identities stay stable when members register or change their avatar.
      profile: {
        $id: record.id,
        name: record.name,
        wechat: account?.wechat ?? '',
        avatar_file_id: account?.avatar_file_id,
      },
      meta: record,
      aliases: record.aliases,
      projects: account ? projectsByOwner.get(account.$id) ?? [] : [],
      accountId: account?.$id,
      priority: record.priority,
    };
  });

  profiles.forEach((profile) => {
    if (matchedAccountIds.has(profile.$id)) return;
    members.push({
      profile,
      meta: { focus: '', description: '', tags: [], areas: [], contacts: [] },
      aliases: [],
      projects: projectsByOwner.get(profile.$id) ?? [],
      accountId: profile.$id,
    });
  });

  return members;
}

export function sortMembers(members: MemberDirectoryEntry[]): MemberDirectoryEntry[] {
  return [...members].sort((a, b) =>
    (a.priority ?? Number.MAX_SAFE_INTEGER) - (b.priority ?? Number.MAX_SAFE_INTEGER) ||
    memberNameCollator.compare(a.profile.name, b.profile.name),
  );
}

export function getMemberTags(members: MemberDirectoryEntry[]): string[] {
  const counts = new Map<string, number>();
  members.forEach(({ meta }) => {
    meta.tags.forEach((tag) => counts.set(tag, (counts.get(tag) ?? 0) + 1));
  });
  return [...counts.keys()].sort((a, b) =>
    (counts.get(b) ?? 0) - (counts.get(a) ?? 0) || memberNameCollator.compare(a, b),
  );
}

export function matchesMemberQuery(member: MemberDirectoryEntry, query: string): boolean {
  const normalize = (value: string) => value.normalize('NFKD').replace(/\p{M}/gu, '').toLocaleLowerCase();
  const search = normalize(query.trim());
  if (!search) return true;

  return [
    member.profile.name,
    member.profile.wechat,
    ...member.aliases,
    member.meta.focus,
    member.meta.description,
    ...member.meta.tags,
    ...member.meta.areas,
    ...member.meta.contacts.flatMap(({ label, value }) => [label, value]),
    ...[member.meta.focus, ...member.meta.tags, ...member.meta.areas].map((value) => translateMemberLabel('en', value)),
  ].some((value) => normalize(value).includes(search));
}
