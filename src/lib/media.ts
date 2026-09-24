import imageCompression from 'browser-image-compression';
import { BUCKET_ID, client } from './appwrite';
import { COMPRESSION, IMG_PRESETS, type ImgPreset } from './constants';

// Build an Appwrite preview URL for a stored file with on-the-fly transform.
// Uses `view` endpoint so the response is inline-renderable by <img>.
export function buildPreviewUrl(
  fileId: string,
  preset: ImgPreset = 'cover',
): string {
  const { width, quality, output } = IMG_PRESETS[preset];
  const params = new URLSearchParams({
    project: client.config.project,
    width: String(width),
    quality: String(quality),
    output,
  });
  return `${client.config.endpoint}/storage/buckets/${BUCKET_ID}/files/${fileId}/view?${params.toString()}`;
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
