import { Permission, Role } from 'appwrite';
import { COLLECTIONS, DATABASE_ID, databases } from '@/lib/appwrite';
import type { Profile } from '@/types/models';

export interface ProfileInput {
  name: string;
  wechat: string;
  avatar_file_id?: string;
}

// Create the profile document; the document $id mirrors the auth user id
// so we can look up profiles directly by user id.
export async function createProfile(
  userId: string,
  data: ProfileInput,
): Promise<Profile> {
  return databases.createDocument<Profile>(
    DATABASE_ID,
    COLLECTIONS.profiles,
    userId,
    {
      name: data.name,
      wechat: data.wechat,
      avatar_file_id: data.avatar_file_id ?? '',
    },
    // Readable by all signed-in users, writable by its owner only.
    [
      Permission.read(Role.users()),
      Permission.update(Role.user(userId)),
      Permission.delete(Role.user(userId)),
    ],
  );
}

export async function getProfile(userId: string): Promise<Profile | null> {
  try {
    return await databases.getDocument<Profile>(
      DATABASE_ID,
      COLLECTIONS.profiles,
      userId,
    );
  } catch (err) {
    if (isNotFound(err)) return null;
    throw err;
  }
}

// Batch-fetch profiles for a list of user ids (deduped, missing ids skipped).
// Appwrite has no `IN` query so we fan out with Promise.allSettled. For the
// expected internal scale (30-40 members) this is fine.
export async function getProfilesByIds(
  userIds: string[],
): Promise<Map<string, Profile>> {
  const unique = Array.from(new Set(userIds.filter(Boolean)));
  if (unique.length === 0) return new Map();

  const map = new Map<string, Profile>();
  const results = await Promise.allSettled(
    unique.map((id) =>
      databases.getDocument<Profile>(DATABASE_ID, COLLECTIONS.profiles, id),
    ),
  );
  results.forEach((r, i) => {
    if (r.status === 'fulfilled' && r.value) {
      map.set(unique[i], r.value);
    }
  });
  return map;
}

export async function updateProfile(
  userId: string,
  patch: Partial<ProfileInput>,
): Promise<Profile> {
  return databases.updateDocument<Profile>(
    DATABASE_ID,
    COLLECTIONS.profiles,
    userId,
    patch,
  );
}

function isNotFound(err: unknown): boolean {
  return (
    typeof err === 'object' && err !== null && (err as { code?: number }).code === 404
  );
}
