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

export function buildMembersDirectory(): MemberDirectoryEntry[] {
  // Hide all real-time data from Appwrite, use only hardcoded roster
  const members: MemberDirectoryEntry[] = MEMBER_ROSTER.map((record) => ({
    profile: {
      $id: record.id,
      name: record.name,
      wechat: '',
      avatar_file_id: undefined,
    },
    meta: record,
    aliases: record.aliases,
    projects: [],
    accountId: undefined,
    priority: record.priority,
  }));

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

function normalizeMemberSearch(value: string): string {
  return value.normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase().trim();
}

function matchesSearchField(value: string, search: string): boolean {
  const normalized = normalizeMemberSearch(value);
  const needsWordStart = /^[a-z0-9]/.test(search);
  let index = normalized.indexOf(search);
  while (index !== -1) {
    // Latin terms can start a word, but "dia" must not match the end of "media".
    if (!needsWordStart || index === 0 || !/[a-z0-9]/.test(normalized[index - 1])) return true;
    index = normalized.indexOf(search, index + 1);
  }
  return false;
}

function memberQueryRank(member: MemberDirectoryEntry, search: string): number {
  if (!search) return 0;
  const names = [member.profile.name, ...member.aliases].map(normalizeMemberSearch);
  if (names.some((name) => name === search)) return 0;
  if (names.some((name) => name.startsWith(search))) return 1;
  if (names.some((name) => name.includes(search))) return 2;

  return [
    member.profile.wechat,
    member.meta.focus,
    member.meta.description,
    ...member.meta.tags,
    ...member.meta.areas,
    ...member.meta.contacts.flatMap(({ label, value }) => [label, value]),
    ...[member.meta.focus, ...member.meta.tags, ...member.meta.areas].map((value) => translateMemberLabel('en', value)),
  ].some((value) => matchesSearchField(value, search)) ? 3 : -1;
}

export function matchesMemberQuery(member: MemberDirectoryEntry, query: string): boolean {
  return memberQueryRank(member, normalizeMemberSearch(query)) >= 0;
}

export function searchMembers(members: MemberDirectoryEntry[], query: string): MemberDirectoryEntry[] {
  const search = normalizeMemberSearch(query);
  if (!search) return [...members];
  return members
    .map((member) => ({ member, rank: memberQueryRank(member, search) }))
    .filter(({ rank }) => rank >= 0)
    .sort((a, b) => a.rank - b.rank)
    .map(({ member }) => member);
}
