const GALLERY_SCROLL_KEY = 'm1:gallery-scroll-y';
const GALLERY_RESTORE_KEY = 'm1:gallery-scroll-restore';

export function saveGalleryScrollPosition(): void {
  try {
    sessionStorage.setItem(GALLERY_SCROLL_KEY, String(window.scrollY));
  } catch {
    // Scroll restoration is an enhancement; navigation still works without storage.
  }
}

export function requestGalleryScrollRestore(): void {
  try {
    sessionStorage.setItem(GALLERY_RESTORE_KEY, '1');
  } catch {
    // Ignore unavailable session storage.
  }
}

export function consumeGalleryScrollPosition(): number | null {
  try {
    if (sessionStorage.getItem(GALLERY_RESTORE_KEY) !== '1') return null;
    sessionStorage.removeItem(GALLERY_RESTORE_KEY);
    const value = Number(sessionStorage.getItem(GALLERY_SCROLL_KEY));
    return Number.isFinite(value) && value >= 0 ? value : 0;
  } catch {
    return null;
  }
}
