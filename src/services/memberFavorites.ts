import type { Models } from 'appwrite';
import { account } from '@/lib/appwrite';
import { env } from '@/lib/env';

const FAVORITE_MEMBER_IDS_KEY = 'favorite_member_ids';
const DEMO_STORAGE_PREFIX = 'm1-infinitas-favorite-members-v1';

type FavoritePreferences = Models.Preferences & {
  favorite_member_ids?: unknown;
};

function normalizeMemberIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return Array.from(
    new Set(value.filter((item): item is string => typeof item === 'string' && item.length > 0)),
  );
}

function demoStorageKey(userId: string): string {
  return `${DEMO_STORAGE_PREFIX}:${userId}`;
}

export async function getFavoriteMemberIds(userId: string): Promise<string[]> {
  if (env.demoMode) {
    const stored = localStorage.getItem(demoStorageKey(userId));
    if (!stored) return [];

    try {
      return normalizeMemberIds(JSON.parse(stored));
    } catch {
      return [];
    }
  }

  const preferences = await account.getPrefs<FavoritePreferences>();
  return normalizeMemberIds(preferences[FAVORITE_MEMBER_IDS_KEY]);
}

export async function saveFavoriteMemberIds(
  userId: string,
  memberIds: string[],
): Promise<string[]> {
  const normalized = normalizeMemberIds(memberIds);

  if (env.demoMode) {
    localStorage.setItem(demoStorageKey(userId), JSON.stringify(normalized));
    return normalized;
  }

  const preferences = await account.getPrefs<FavoritePreferences>();
  await account.updatePrefs<FavoritePreferences>({
    ...preferences,
    [FAVORITE_MEMBER_IDS_KEY]: normalized,
  });
  return normalized;
}
