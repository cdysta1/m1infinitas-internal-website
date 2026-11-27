import type { Models } from 'appwrite';
import { account } from '@/lib/appwrite';
import { env } from '@/lib/env';
import { updateAccountPreferences } from '@/services/preferences';

const DEMO_PREF_KEY = 'm1-email-on-submission-v1:';
const memoryCache = new Map<string, boolean>();

export function readEmailNotificationPref(
  user: Models.User<Models.Preferences> | null | undefined,
): boolean {
  if (!user) return true;
  if (memoryCache.has(user.$id)) return memoryCache.get(user.$id)!;
  if (env.demoMode) {
    try {
      const saved = localStorage.getItem(DEMO_PREF_KEY + user.$id);
      if (saved === '0') return false;
      if (saved === '1') return true;
    } catch {
      // Ignore storage errors in demo mode.
    }
    return true;
  }
  return user.prefs?.email_on_submission !== false;
}

export async function fetchEmailNotificationPref(userId: string): Promise<boolean> {
  if (memoryCache.has(userId)) return memoryCache.get(userId)!;
  if (env.demoMode) {
    try {
      const saved = localStorage.getItem(DEMO_PREF_KEY + userId);
      if (saved === '0') return false;
      if (saved === '1') return true;
    } catch {
      // Ignore storage errors in demo mode.
    }
    return true;
  }
  const prefs = await account.getPrefs();
  const enabled = prefs?.email_on_submission !== false;
  memoryCache.set(userId, enabled);
  return enabled;
}

export async function saveEmailNotificationPref(
  userId: string,
  enabled: boolean,
): Promise<void> {
  memoryCache.set(userId, enabled);
  if (env.demoMode) {
    try {
      localStorage.setItem(DEMO_PREF_KEY + userId, enabled ? '1' : '0');
    } catch {
      // Ignore storage errors in demo mode.
    }
    return;
  }
  try {
    await updateAccountPreferences({ email_on_submission: enabled });
  } catch (err) {
    memoryCache.delete(userId);
    throw err;
  }
}
