import imageCompression from 'browser-image-compression';
import { BUCKET_ID, client } from './appwrite';
import { COMPRESSION, IMG_PRESETS, type ImgPreset } from './constants';

// Image transformations are blocked on the current Appwrite plan (the
// `preview` endpoint returns 403 storage_image_transformations_blocked), and
// the `view` endpoint ignores width/quality/output anyway. Keep the preset
// plumbing behind a flag so it can be re-enabled after a plan upgrade.
const IMG_TRANSFORM_ENABLED = false;

// Build an Appwrite URL for a stored file, renderable inline by <img>.
// Uses the `view` endpoint. Media files are publicly readable (see storage.ts)
// so a raw cross-origin <img> — which cannot attach the session JWT header —
// still resolves without auth.
export function buildPreviewUrl(
  fileId: string,
  preset: ImgPreset = 'cover',
): string {
  if (/^(https?:|data:|blob:)/.test(fileId)) return fileId;
  const params = new URLSearchParams({ project: client.config.project });
  if (IMG_TRANSFORM_ENABLED) {
    const { width, quality, output } = IMG_PRESETS[preset];
    params.set('width', String(width));
    params.set('quality', String(quality));
    params.set('output', output);
  }
  return `${client.config.endpoint}/storage/buckets/${BUCKET_ID}/files/${fileId}/view?${params.toString()}`;
}

const DEFAULT_AVATAR_FILES = [
  'default-orange.webp',
  'default-flower.webp',
  'default-blue-mask.webp',
  'default-purple-face.webp',
  'default-mint-face.webp',
  'default-cyan-curls.webp',
] as const;

const DEMO_AVATAR_INDEX: Record<string, number> = {
  'demo-user-lin': 0,
  'demo-user-yu': 1,
  'demo-user-su': 2,
  'demo-user-he': 3,
  'demo-user-iris': 4,
  'demo-user-elodie': 5,
};

function stableAvatarIndex(seed: string): number {
  const assigned = DEMO_AVATAR_INDEX[seed];
  if (assigned !== undefined) return assigned;

  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return hash % DEFAULT_AVATAR_FILES.length;
}

export function getAvatarUrl(fileId: string | null | undefined, seed: string): string {
  if (fileId) return buildPreviewUrl(fileId, 'avatar');
  const fileName = DEFAULT_AVATAR_FILES[stableAvatarIndex(seed)];
  return new URL(
    `${import.meta.env.BASE_URL}demo/avatars/${fileName}`,
    window.location.origin,
  ).href;
}

// Compress a File to <= ~1MB and reasonable dimensions before upload.
// Videos are passed through untouched (MVP does not transcode).
export async function compressImage(file: File): Promise<File> {
  if (!file.type.startsWith('image/')) return file;
  try {
    const compressed = await imageCompression(file, {
      maxSizeMB: COMPRESSION.maxSizeMB,
      maxWidthOrHeight: COMPRESSION.maxWidthOrHeight,
      initialQuality: COMPRESSION.initialQuality,
      useWebWorker: COMPRESSION.useWebWorker,
    });
    // Preserve the original name for Appwrite to derive mime/extension.
    return new File([compressed], file.name, {
      type: compressed.type || file.type,
      lastModified: Date.now(),
    });
  } catch (err) {
    // On failure (e.g. unsupported codec) fall back to the original file.
    console.warn('[media] compression failed, using original', err);
    return file;
  }
}

// Read a File as a data URL for local preview.
export function fileToPreviewUrl(file: File): string {
  return URL.createObjectURL(file);
}

// Best-effort human-readable file size.
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
