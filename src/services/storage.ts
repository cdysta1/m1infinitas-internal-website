import { ID, Permission, Role } from 'appwrite';
import { BUCKET_ID, storage } from '@/lib/appwrite';
import { compressImage } from '@/lib/media';

export interface UploadResult {
  fileId: string;
  fileName: string;
  mimeType: string;
  size: number;
}

// Build a stable, sortable path prefix: {userId}/{yyyymmdd}/
// Appwrite ignores slashes in fileId (must be a plain string), but embedding
// the date+user in the filename helps manual cleanup later.
function buildFileName(userId: string, original: File): string {
  const now = new Date();
  const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(
    now.getDate(),
  ).padStart(2, '0')}`;
  const ext = (original.name.split('.').pop() || 'bin').toLowerCase().slice(0, 8);
  const safeUser = userId.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 24) || 'anon';
  return `${safeUser}_${stamp}_${ID.unique()}.${ext}`;
}

// Compress + upload a single file, returning the created Appwrite file id.
// File is readable by all signed-in users; owner can delete/update.
export async function uploadMedia(
  file: File,
  userId: string,
  onProgress?: (progress: number) => void,
): Promise<UploadResult> {
  const compressed = await compressImage(file);
  const name = buildFileName(userId, compressed);
  // Re-wrap so Appwrite stores the file under our prefixed name instead of the original.
  const payload = new File([compressed], name, { type: compressed.type });
  const created = await storage.createFile(
    BUCKET_ID,
    ID.unique(),
    payload,
    [
      Permission.read(Role.users()),
      Permission.update(Role.user(userId)),
      Permission.delete(Role.user(userId)),
    ],
    (event: { progress?: number }) => {
      if (onProgress && typeof event?.progress === 'number') {
        onProgress(event.progress);
      }
    },
  );
  return {
    fileId: created.$id,
    fileName: created.name,
    mimeType: created.mimeType,
    size: created.sizeOriginal,
  };
}

// Sequential-with-concurrency upload of multiple files.
// Returns results in the same order as input.
export async function uploadMany(
  files: File[],
  userId: string,
  concurrency = 3,
): Promise<UploadResult[]> {
  const results: UploadResult[] = new Array(files.length);
  let cursor = 0;

  async function worker() {
    while (true) {
      const idx = cursor++;
      if (idx >= files.length) return;
      results[idx] = await uploadMedia(files[idx], userId);
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, files.length) }, worker);
  await Promise.all(workers);
  return results;
}

export async function deleteMedia(fileId: string): Promise<void> {
  try {
    await storage.deleteFile(BUCKET_ID, fileId);
  } catch (err) {
    console.warn('[storage] delete failed', err);
  }
}
