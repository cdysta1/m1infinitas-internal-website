import { useEffect, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LightboxProps {
  sources: string[];
  index: number;
  onClose: () => void;
  onIndexChange: (next: number) => void;
}

// Fullscreen image viewer with prev/next and ESC/backdrop close.
export function Lightbox({ sources, index, onClose, onIndexChange }: LightboxProps) {
  const clamp = useCallback(
    (n: number) => Math.max(0, Math.min(sources.length - 1, n)),
    [sources.length],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowLeft') onIndexChange(clamp(index - 1));
      else if (e.key === 'ArrowRight') onIndexChange(clamp(index + 1));
    };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [index, clamp, onClose, onIndexChange]);

  if (sources.length === 0) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/95 animate-fade-in"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="关闭"
        className="absolute right-3 top-3 z-10 rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
      >
        <X className="h-5 w-5" />
      </button>

      {sources.length > 1 && (
        <>
          <button
            type="button"
            aria-label="上一张"
            onClick={(e) => {
              e.stopPropagation();
              onIndexChange(clamp(index - 1));
            }}
            className="absolute left-2 z-10 rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20 sm:left-6"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            aria-label="下一张"
            onClick={(e) => {
              e.stopPropagation();
              onIndexChange(clamp(index + 1));
            }}
            className="absolute right-2 z-10 rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20 sm:right-6"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </>
      )}

      <img
        src={sources[index]}
        alt=""
        onClick={(e) => e.stopPropagation()}
        className={cn(
          'max-h-[92dvh] max-w-[96vw] select-none object-contain',
          'animate-scale-in',
        )}
      />

      {sources.length > 1 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 rounded-full bg-black/50 px-3 py-1 text-xs text-white">
          {index + 1} / {sources.length}
        </div>
      )}
    </div>
  );
}
