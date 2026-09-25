import { useState } from 'react';
import { cn } from '@/lib/utils';

interface SmartImageProps {
  src?: string;
  alt: string;
  // Wrapper classes: positioning + sizing (e.g. `aspect-square w-full`).
  wrapperClassName?: string;
  // Applied to the <img> itself (object-fit, hover, etc).
  imgClassName?: string;
}

// An <img> with a pulse skeleton while loading and a graceful fallback on error.
// Media is loaded from a cross-origin Appwrite URL that can fail (permission /
// cookie issues); without onError the box would sit silently blank, so we surface
// an explicit "加载失败" state instead.
export function SmartImage({ src, alt, wrapperClassName, imgClassName }: SmartImageProps) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  return (
    <div className={cn('relative overflow-hidden bg-muted', wrapperClassName)}>
      {src && !failed && (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
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
        <div className="absolute inset-0 flex items-center justify-center px-2 text-center text-[11px] text-muted-foreground">
          图片加载失败
        </div>
      )}
    </div>
  );
}
