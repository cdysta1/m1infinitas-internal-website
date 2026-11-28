import { useI18n } from '@/app/I18nProvider';
import { useLayoutEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

interface SmartImageProps {
  src?: string;
  alt: string;
  // Wrapper classes: positioning + sizing (e.g. `aspect-square w-full`).
  wrapperClassName?: string;
  // Extra wrapper classes applied only while loading (e.g. `min-h-40`).
  loadingClassName?: string;
  // Applied to the <img> itself (object-fit, hover, etc).
  imgClassName?: string;
}

// An <img> with a pulse skeleton while loading and a graceful fallback on error.
// Media is loaded from a cross-origin Appwrite URL that can fail (permission /
// cookie issues); without onError the box would sit silently blank, so we surface
// an explicit "加载失败" state instead.
export function SmartImage({
  src,
  alt,
  wrapperClassName,
  loadingClassName,
  imgClassName,
}: SmartImageProps) {
  const { t } = useI18n();
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [loadedSrc, setLoadedSrc] = useState<string>();
  const [failedSrc, setFailedSrc] = useState<string>();
  const loaded = Boolean(src && src === loadedSrc);
  const failed = Boolean(src && src === failedSrc);

  useLayoutEffect(() => {
    const img = imgRef.current;
    if (src && img && img.complete && img.naturalWidth > 0) {
      setLoadedSrc(src);
    }
  }, [src]);

  return (
    <div
      className={cn(
        'relative overflow-hidden bg-muted',
        wrapperClassName,
        !loaded && !failed && loadingClassName,
      )}
    >
      {src && !failed && (
        <img
          ref={imgRef}
          src={src}
          alt={alt}
          loading="lazy"
          onLoad={() => setLoadedSrc(src)}
          onError={() => setFailedSrc(src)}
          className={cn(
            'block h-full w-full transition-opacity duration-300',
            loaded ? 'opacity-100' : 'opacity-0',
            imgClassName,
          )}
        />
      )}
      {!loaded && !failed && (
        <div className="absolute inset-0 animate-pulse bg-muted" aria-hidden />
      )}
      {failed && (
        <div className="absolute inset-0 flex items-center justify-center px-2 text-center text-[11px] text-muted-foreground">{t('图片加载失败')}</div>
      )}
    </div>
  );
}
