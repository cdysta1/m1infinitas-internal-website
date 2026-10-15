import type { Models } from 'appwrite';
import { account } from '@/lib/appwrite';

let pendingWrite: Promise<unknown> = Promise.resolve();

export async function waitForAccountPreferenceWrites(): Promise<void> {
  await pendingWrite;
}

// Appwrite replaces preferences as a whole; serialize edits to preserve other fields.
export function updateAccountPreferences(patch: Models.Preferences): Promise<Models.Preferences> {
  const write = pendingWrite.then(async () => {
    const current = await account.getPrefs();
    return account.updatePrefs({ ...current, ...patch });
  });
  pendingWrite = write.catch(() => undefined);
  return write;
}
