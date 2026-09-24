// Cross-module constants.

export const PAGE_SIZE = 24;
export const TIMELINE_PAGE_SIZE = 20;

// Appwrite image preview presets (used via ?width=&quality=&output=).
export const IMG_PRESETS = {
  cover: { width: 400, quality: 70, output: 'webp' as const },
  detail: { width: 1080, quality: 85, output: 'webp' as const },
  avatar: { width: 96, quality: 70, output: 'webp' as const },
  thumb: { width: 240, quality: 60, output: 'webp' as const },
} satisfies Record<string, { width: number; quality: number; output: 'webp' }>;

export type ImgPreset = keyof typeof IMG_PRESETS;

export const MAX_IMAGES_PER_POST = 9;

// Client-side compression target.
export const COMPRESSION = {
  maxSizeMB: 1,
  maxWidthOrHeight: 2048,
  initialQuality: 0.8,
  useWebWorker: true,
} as const;

// Project status enum (must match Appwrite attribute).
export const PROJECT_STATUS = {
  ACTIVE: 'active',
  DONE: 'done',
} as const;
export type ProjectStatus = (typeof PROJECT_STATUS)[keyof typeof PROJECT_STATUS];

// Local-only lifecycle for optimistic items.
export const OPTIMISTIC = {
  PENDING: 'pending',
  SENT: 'sent',
  FAILED: 'failed',
} as const;
export type OptimisticStatus = (typeof OPTIMISTIC)[keyof typeof OPTIMISTIC];
