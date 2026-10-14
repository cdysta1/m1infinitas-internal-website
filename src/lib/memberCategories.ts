import { MEMBER_CATEGORIES } from '@/data/memberCategories';
import type { MemberDirectoryEntry } from '@/lib/memberDirectory';

export interface MemberCategory {
  id: string;
  label: string;
  area?: string;
  tags?: string[];
  children?: MemberCategory[];
}

export { MEMBER_CATEGORIES };

export const ALL_MEMBERS_CATEGORY_ID = 'all';
const allMembersCategory: MemberCategory = { id: ALL_MEMBERS_CATEGORY_ID, label: '全部' };
const categoriesById = new Map<string, MemberCategory>([[ALL_MEMBERS_CATEGORY_ID, allMembersCategory]]);
const parentById = new Map<string, string>();

function indexCategories(categories: MemberCategory[], parentId?: string) {
  categories.forEach((category) => {
    categoriesById.set(category.id, category);
    if (parentId) parentById.set(category.id, parentId);
    if (category.children) indexCategories(category.children, category.id);
  });
}
indexCategories(MEMBER_CATEGORIES);

export function getMemberCategory(id: string): MemberCategory | undefined {
  return categoriesById.get(id);
}

export function getCategoryAncestors(id: string): string[] {
  const ancestors: string[] = [];
  let parentId = parentById.get(id);
  while (parentId) {
    ancestors.push(parentId);
    parentId = parentById.get(parentId);
  }
  return ancestors;
}

export function isCategoryWithin(id: string, ancestorId: string): boolean {
  return id === ancestorId || getCategoryAncestors(id).includes(ancestorId);
}

export function matchesMemberCategory(member: MemberDirectoryEntry, category: MemberCategory): boolean {
  if (category.id === ALL_MEMBERS_CATEGORY_ID) return true;
  if (category.area && member.meta.areas.includes(category.area)) return true;
  if (category.tags?.some((tag) => member.meta.tags.includes(tag))) return true;
  return category.children?.some((child) => matchesMemberCategory(member, child)) ?? false;
}

export function matchesMemberCategories(member: MemberDirectoryEntry, selectedIds: string[]): boolean {
  if (selectedIds.length === 0) return false;
  return selectedIds.every((id) => {
    const category = getMemberCategory(id);
    return category ? matchesMemberCategory(member, category) : false;
  });
}

export function removeMemberCategory(selectedIds: string[], id: string): string[] {
  if (!selectedIds.some((item) => isCategoryWithin(item, id))) return selectedIds;

  const remainingIds = selectedIds.filter((item) => !isCategoryWithin(item, id));
  const parentId = parentById.get(id);
  if (!parentId || remainingIds.some((item) =>
    isCategoryWithin(item, parentId) || isCategoryWithin(parentId, item))) {
    return remainingIds;
  }

  // Removing the last refinement restores its parent without clearing other branches.
  return [...remainingIds, parentId];
}

export function toggleMemberCategory(selectedIds: string[], id: string): string[] {
  if (!getMemberCategory(id)) return selectedIds;
  if (id === ALL_MEMBERS_CATEGORY_ID) {
    return selectedIds.includes(id) ? [] : [id];
  }
  if (selectedIds.some((item) => isCategoryWithin(item, id))) {
    return removeMemberCategory(selectedIds, id);
  }

  // Selecting a finer category replaces its broad ancestor, not unrelated selections.
  return [
    ...selectedIds.filter((item) => item !== ALL_MEMBERS_CATEGORY_ID && !isCategoryWithin(id, item) && !isCategoryWithin(item, id)),
    id,
  ];
}
