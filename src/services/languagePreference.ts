import { account } from '@/lib/appwrite';
import { env } from '@/lib/env';
import type { Language } from '@/i18n/messages';
import { updateAccountPreferences } from '@/services/preferences';

export const LANGUAGE_STORAGE_PREFIX = 'm1:language:v1';
const LAST_LANGUAGE_KEY = `${LANGUAGE_STORAGE_PREFIX}:last`;

export function isLanguage(value: unknown): value is Language {
  return value === 'zh' || value === 'en';
}

export function getLanguageStorageKey(userId: string): string {
  return `${LANGUAGE_STORAGE_PREFIX}:${userId}`;
}

export function readCachedLanguage(userId?: string): Language | null {
  try {
    const value = localStorage.getItem(userId ? getLanguageStorageKey(userId) : LAST_LANGUAGE_KEY);
    return isLanguage(value) ? value : null;
  } catch {
    return null;
  }
}

export function cacheLanguage(language: Language, userId?: string): boolean {
  try {
    if (userId) localStorage.setItem(getLanguageStorageKey(userId), language);
    localStorage.setItem(LAST_LANGUAGE_KEY, language);
    return true;
  } catch {
    return false;
  }
}

export function getInitialLanguage(): Language {
  return readCachedLanguage() ?? (navigator.language.toLowerCase().startsWith('zh') ? 'zh' : 'en');
}

export async function getLanguagePreference(userId: string): Promise<Language | null> {
  const cached = readCachedLanguage(userId);
  if (cached || env.demoMode) return cached;
  const preferences = await account.getPrefs();
  return isLanguage(preferences.ui_language) ? preferences.ui_language : null;
}

export async function saveLanguagePreference(userId: string, language: Language): Promise<void> {
  const cached = cacheLanguage(language, userId);
  if (env.demoMode) {
    if (!cached) throw new Error('Language preference could not be saved');
    return;
  }
  await updateAccountPreferences({ ui_language: language });
}
