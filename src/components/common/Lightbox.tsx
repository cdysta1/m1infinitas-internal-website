import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, Loader2, X, ZoomIn, ZoomOut } from 'lucide-react';
import { useI18n } from '@/app/I18nProvider';
import { cn } from '@/lib/utils';

interface LightboxProps {
  sources: string[];
  index: number;
  onClose: () => void;
  onIndexChange: (next: number) => void;
}

interface Point {
  x: number;
  y: number;
}

const MIN_SCALE = 1;
const MAX_SCALE = 3;
const DOUBLE_TAP_SCALE = 2.2;
const SWIPE_NEXT_THRESHOLD = 56;
const SWIPE_CLOSE_THRESHOLD = 96;

function distanceBetween(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

// Viewport-locked fullscreen image viewer with portal isolation, safe-area controls,
// touch swipe navigation/dismissal, and pinch/double-tap/button zoom & pan.
export function Lightbox({ sources, index, onClose, onIndexChange }: LightboxProps) {
  const { t } = useI18n();
  const stageRef = useRef<HTMLDivElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState<Point>({ x: 0, y: 0 });
  const [swipe, setSwipe] = useState<Point>({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [loadedSrc, setLoadedSrc] = useState<string>();
  const [failedSrc, setFailedSrc] = useState<string>();

  const scaleRef = useRef(1);
  const offsetRef = useRef<Point>({ x: 0, y: 0 });
  const pointersRef = useRef<Map<number, Point>>(new Map());
  const pinchRef = useRef<{
    startDist: number;
    startScale: number;
    baseOffset: Point;
  } | null>(null);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    baseOffset: Point;
    mode: 'undecided' | 'pan' | 'swipe-x' | 'swipe-y';
    moved: boolean;
  } | null>(null);
  const lastTapRef = useRef<{ at: number; x: number; y: number } | null>(null);
  const suppressBackdropClickRef = useRef(false);

  scaleRef.current = scale;
  offsetRef.current = offset;

  const safeIndex = Math.max(0, Math.min(sources.length - 1, index));
  const currentSrc = sources[safeIndex] ?? '';
  const loaded = Boolean(currentSrc && loadedSrc === currentSrc);
  const failed = Boolean(currentSrc && failedSrc === currentSrc);
  const hasMultiple = sources.length > 1;
  const canPrev = safeIndex > 0;
  const canNext = safeIndex < sources.length - 1;

  const clampIndex = useCallback(
    (next: number) => Math.max(0, Math.min(sources.length - 1, next)),
    [sources.length],
  );

  const clampPanOffset = useCallback((x: number, y: number, nextScale: number): Point => {
    if (nextScale <= 1.01) return { x: 0, y: 0 };
    const img = imgRef.current;
    const stage = stageRef.current;
    if (!img || !stage) return { x: 0, y: 0 };
    const baseW = img.offsetWidth || img.clientWidth;
    const baseH = img.offsetHeight || img.clientHeight;
    const stageRect = stage.getBoundingClientRect();
    const maxX = Math.max(0, (baseW * nextScale - stageRect.width) / 2);
    const maxY = Math.max(0, (baseH * nextScale - stageRect.height) / 2);
    return {
      x: Math.max(-maxX, Math.min(maxX, x)),
      y: Math.max(-maxY, Math.min(maxY, y)),
    };
  }, []);

  const resetTransform = useCallback(() => {
    setScale(1);
    setOffset({ x: 0, y: 0 });
    setSwipe({ x: 0, y: 0 });
    setDragging(false);
    pinchRef.current = null;
    dragRef.current = null;
  }, []);

  const toggleZoom = useCallback(() => {
    setSwipe({ x: 0, y: 0 });
    setDragging(false);
    if (scaleRef.current > 1.05) {
      setScale(1);
      setOffset({ x: 0, y: 0 });
    } else {
      setScale(DOUBLE_TAP_SCALE);
      setOffset({ x: 0, y: 0 });
    }
  }, []);

  // Reset zoom/pan when switching images.
  useEffect(() => {
    resetTransform();
  }, [currentSrc, resetTransform, safeIndex]);

  // Immediately reveal cached images without skeleton flash.
  useLayoutEffect(() => {
    const img = imgRef.current;
    if (currentSrc && img && img.complete && img.naturalWidth > 0) {
      setLoadedSrc(currentSrc);
    }
  }, [currentSrc]);

  // Lock background page scroll (both <html> and <body>) and bind keyboard controls.
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const prevHtmlOverflow = html.style.overflow;
    const prevBodyOverflow = body.style.overflow;
    html.style.overflow = 'hidden';
    body.style.overflow = 'hidden';

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        onIndexChange(clampIndex(safeIndex - 1));
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        onIndexChange(clampIndex(safeIndex + 1));
      } else if (event.key === '+' || event.key === '=') {
        event.preventDefault();
        setScale((prev) => Math.min(MAX_SCALE, Number((prev + 0.5).toFixed(2))));
      } else if (event.key === '-' || event.key === '_') {
        event.preventDefault();
        setScale((prev) => {
          const next = Math.max(MIN_SCALE, Number((prev - 0.5).toFixed(2)));
          setOffset((curr) => clampPanOffset(curr.x, curr.y, next));
          return next;
        });
      } else if (event.key === '0') {
        event.preventDefault();
        resetTransform();
      }
    };

    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      html.style.overflow = prevHtmlOverflow;
      body.style.overflow = prevBodyOverflow;
    };
  }, [clampIndex, clampPanOffset, onClose, onIndexChange, resetTransform, safeIndex]);

  if (sources.length === 0 || typeof document === 'undefined') return null;

  const handleStagePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    if ((event.target as Element | null)?.closest('button')) return;

    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Ignore synthetic pointer events that cannot be captured.
    }

    if (pointersRef.current.size === 2) {
      const [first, second] = Array.from(pointersRef.current.values());
      pinchRef.current = {
        startDist: Math.max(1, distanceBetween(first, second)),
        startScale: scaleRef.current,
        baseOffset: offsetRef.current,
      };
      dragRef.current = null;
      setSwipe({ x: 0, y: 0 });
      setDragging(true);
      suppressBackdropClickRef.current = true;
      return;
    }

    if (pointersRef.current.size === 1) {
      dragRef.current = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        baseOffset: offsetRef.current,
        mode: scaleRef.current > 1.05 ? 'pan' : 'undecided',
        moved: false,
      };
    }
  };

  const handleStagePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!pointersRef.current.has(event.pointerId)) return;
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (pointersRef.current.size === 2 && pinchRef.current) {
      const [first, second] = Array.from(pointersRef.current.values());
      const dist = distanceBetween(first, second);
      const nextScale = Math.max(
        MIN_SCALE,
        Math.min(MAX_SCALE, pinchRef.current.startScale * (dist / pinchRef.current.startDist)),
      );
      setScale(nextScale);
      setOffset(clampPanOffset(pinchRef.current.baseOffset.x, pinchRef.current.baseOffset.y, nextScale));
      suppressBackdropClickRef.current = true;
      return;
    }

    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    if (!drag.moved && Math.hypot(dx, dy) < 8) return;

    drag.moved = true;
    suppressBackdropClickRef.current = true;
    setDragging(true);

    if (drag.mode === 'pan') {
      setOffset(clampPanOffset(drag.baseOffset.x + dx, drag.baseOffset.y + dy, scaleRef.current));
      return;
    }

    if (drag.mode === 'undecided') {
      if (Math.abs(dx) >= Math.abs(dy) && hasMultiple) {
        drag.mode = 'swipe-x';
      } else if (dy > 0) {
        drag.mode = 'swipe-y';
      } else {
        drag.mode = hasMultiple ? 'swipe-x' : 'swipe-y';
      }
    }

    if (drag.mode === 'swipe-x') {
      const atBoundary = (dx > 0 && !canPrev) || (dx < 0 && !canNext);
      setSwipe({ x: atBoundary ? dx * 0.28 : dx, y: 0 });
    } else if (drag.mode === 'swipe-y') {
      setSwipe({ x: 0, y: Math.max(0, dy) });
    }
  };

  const handleStagePointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    pointersRef.current.delete(event.pointerId);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    if (pointersRef.current.size < 2 && pinchRef.current) {
      pinchRef.current = null;
      setDragging(false);
      if (scaleRef.current < 1.08) {
        setScale(1);
        setOffset({ x: 0, y: 0 });
      }
      return;
    }

    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    dragRef.current = null;
    setDragging(false);

    if (drag.moved) {
      if (drag.mode === 'swipe-x') {
        const dx = event.clientX - drag.startX;
        setSwipe({ x: 0, y: 0 });
        if (dx <= -SWIPE_NEXT_THRESHOLD && canNext) {
          onIndexChange(clampIndex(safeIndex + 1));
        } else if (dx >= SWIPE_NEXT_THRESHOLD && canPrev) {
          onIndexChange(clampIndex(safeIndex - 1));
        }
      } else if (drag.mode === 'swipe-y') {
        const dy = event.clientY - drag.startY;
        setSwipe({ x: 0, y: 0 });
        if (dy >= SWIPE_CLOSE_THRESHOLD) {
          onClose();
        }
      }
      window.setTimeout(() => {
        suppressBackdropClickRef.current = false;
      }, 60);
      return;
    }

    // Detect clean double-tap / double-click on the image itself to toggle zoom.
    if (event.target === imgRef.current) {
      const now = performance.now();
      const prevTap = lastTapRef.current;
      if (
        prevTap
        && now - prevTap.at < 280
        && Math.hypot(event.clientX - prevTap.x, event.clientY - prevTap.y) < 28
      ) {
        lastTapRef.current = null;
        toggleZoom();
      } else {
        lastTapRef.current = { at: now, x: event.clientX, y: event.clientY };
      }
    }
  };

  const handleStagePointerCancel = (event: ReactPointerEvent<HTMLDivElement>) => {
    pointersRef.current.delete(event.pointerId);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    pinchRef.current = null;
    dragRef.current = null;
    setSwipe({ x: 0, y: 0 });
    setDragging(false);
    suppressBackdropClickRef.current = false;
  };

  const backdropAlpha = swipe.y > 0 ? Math.max(0.35, 0.98 - swipe.y / 360) : 0.99;
  const tx = offset.x + swipe.x;
  const ty = offset.y + swipe.y;
  const isZoomed = scale > 1.05;

  return createPortal(
    <div
      data-no-swipe-back
      role="dialog"
      aria-modal="true"
      aria-label={t('查看大图：{name}', { name: `${safeIndex + 1} / ${sources.length}` })}
      className="fixed inset-0 z-[70] flex h-[100dvh] w-screen select-none flex-col overflow-hidden overscroll-contain touch-none animate-fade-in"
      style={{ backgroundColor: `rgba(8, 8, 10, ${backdropAlpha})` }}
      onClick={(event) => {
        if (suppressBackdropClickRef.current) return;
        if (event.target === event.currentTarget || event.target === stageRef.current) {
          onClose();
        }
      }}
    >
      {/* Safe-area top bar with high-contrast controls */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-center justify-between gap-3 bg-gradient-to-b from-black/70 via-black/30 to-transparent px-3.5 pb-6 pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-5"
      >
        <div className="pointer-events-auto flex items-center gap-2">
          {hasMultiple && (
            <span className="rounded-full bg-black/60 px-3 py-1.5 font-mono text-xs tabular-nums text-white/95 backdrop-blur-md ring-1 ring-white/15">
              {safeIndex + 1} / {sources.length}
            </span>
          )}
          {isZoomed && (
            <span className="rounded-full bg-black/60 px-2.5 py-1.5 font-mono text-[11px] tabular-nums text-white/90 backdrop-blur-md ring-1 ring-white/15">
              {Math.round(scale * 100)}%
            </span>
          )}
        </div>

        <div className="pointer-events-auto flex items-center gap-2">
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              toggleZoom();
            }}
            aria-label={isZoomed ? t('还原图片大小') : t('放大图片')}
            title={isZoomed ? t('还原图片大小') : t('放大图片')}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-md ring-1 ring-white/15 transition-colors hover:bg-black/80 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            {isZoomed ? <ZoomOut className="h-5 w-5" /> : <ZoomIn className="h-5 w-5" />}
          </button>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onClose();
            }}
            aria-label={t('关闭')}
            title={t('关闭')}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-md ring-1 ring-white/15 transition-colors hover:bg-black/80 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Desktop side prev/next arrows (hidden on small phones so they never obscure artwork) */}
      {hasMultiple && (
        <>
          <button
            type="button"
            disabled={!canPrev}
            aria-label={t('上一张')}
            title={t('上一张')}
            onClick={(event) => {
              event.stopPropagation();
              onIndexChange(clampIndex(safeIndex - 1));
            }}
            className="absolute left-5 top-1/2 z-20 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-md ring-1 ring-white/15 transition-colors hover:bg-black/80 active:scale-95 disabled:pointer-events-none disabled:opacity-25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white sm:inline-flex"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            disabled={!canNext}
            aria-label={t('下一张')}
            title={t('下一张')}
            onClick={(event) => {
              event.stopPropagation();
              onIndexChange(clampIndex(safeIndex + 1));
            }}
            className="absolute right-5 top-1/2 z-20 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-md ring-1 ring-white/15 transition-colors hover:bg-black/80 active:scale-95 disabled:pointer-events-none disabled:opacity-25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white sm:inline-flex"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </>
      )}

      {/* Interactive media stage */}
      <div
        ref={stageRef}
        onPointerDown={handleStagePointerDown}
        onPointerMove={handleStagePointerMove}
        onPointerUp={handleStagePointerUp}
        onPointerCancel={handleStagePointerCancel}
        className={cn(
          'relative flex min-h-0 flex-1 items-center justify-center overflow-hidden px-3 pb-[calc(env(safe-area-inset-bottom)+4.5rem)] pt-[calc(env(safe-area-inset-top)+4.25rem)] sm:px-20 sm:py-16',
          isZoomed ? (dragging ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-zoom-in',
        )}
      >
        {!loaded && !failed && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-white/70">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="sr-only">{t('加载中…')}</span>
          </div>
        )}

        {failed ? (
          <div
            onClick={(event) => event.stopPropagation()}
            className="rounded-2xl bg-white/10 px-5 py-4 text-sm text-white/85 backdrop-blur-md"
          >
            {t('图片加载失败')}
          </div>
        ) : (
          <img
            ref={imgRef}
            key={currentSrc}
            src={currentSrc}
            alt=""
            draggable={false}
            onLoad={() => setLoadedSrc(currentSrc)}
            onError={() => setFailedSrc(currentSrc)}
            onClick={(event) => event.stopPropagation()}
            className={cn(
              'max-h-full max-w-full select-none object-contain',
              loaded ? 'opacity-100' : 'opacity-0',
              !dragging && 'transition-[transform,opacity] duration-200 ease-out',
            )}
            style={{
              transform: `translate3d(${tx}px, ${ty}px, 0) scale(${scale})`,
              willChange: dragging || isZoomed ? 'transform' : undefined,
            }}
          />
        )}
      </div>

      {/* Mobile thumb-zone bottom navigation bar (zero overlap with artwork) */}
      {hasMultiple && (
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex items-center justify-center bg-gradient-to-t from-black/70 via-black/30 to-transparent px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-6 sm:hidden"
        >
          <div
            onClick={(event) => event.stopPropagation()}
            className="pointer-events-auto inline-flex items-center gap-3 rounded-full bg-black/65 px-2 py-1 backdrop-blur-md ring-1 ring-white/15"
          >
            <button
              type="button"
              disabled={!canPrev}
              aria-label={t('上一张')}
              onClick={() => onIndexChange(clampIndex(safeIndex - 1))}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full text-white transition-colors hover:bg-white/10 active:scale-95 disabled:pointer-events-none disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-1.5 px-1" aria-hidden>
              {sources.map((src, dotIndex) => (
                <span
                  key={`${src}-${dotIndex}`}
                  className={cn(
                    'h-1.5 rounded-full transition-all duration-200',
                    dotIndex === safeIndex ? 'w-4 bg-white' : 'w-1.5 bg-white/35',
                  )}
                />
              ))}
            </div>

            <button
              type="button"
              disabled={!canNext}
              aria-label={t('下一张')}
              onClick={() => onIndexChange(clampIndex(safeIndex + 1))}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full text-white transition-colors hover:bg-white/10 active:scale-95 disabled:pointer-events-none disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}
    </div>,
    document.body,
  );
}
