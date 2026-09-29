import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Header } from './Header';

interface AppShellProps {
  children: ReactNode;
  onCreateClick?: () => void;
  showCreate?: boolean;
  footer?: ReactNode;
  onSwipeBack?: () => void;
}

interface SwipeGesture {
  pointerId: number;
  startX: number;
  startY: number;
  lastX: number;
  lastAt: number;
  decided: boolean;
  tracking: boolean;
}

const SWIPE_DURATION_MS = 220;

function isInteractiveTarget(target: EventTarget | null): boolean {
  return target instanceof Element && Boolean(
    target.closest('a, button, input, textarea, select, video, [role="button"], [data-no-swipe-back]'),
  );
}

export function AppShell({
  children,
  onCreateClick,
  showCreate,
  footer,
  onSwipeBack,
}: AppShellProps) {
  const gestureRef = useRef<SwipeGesture | null>(null);
  const offsetRef = useRef(0);
  const navigationTimerRef = useRef<number | null>(null);
  const settleTimerRef = useRef<number | null>(null);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [settling, setSettling] = useState(false);

  const updateOffset = (value: number) => {
    offsetRef.current = value;
    setSwipeOffset(value);
  };

  const resetSwipe = () => {
    gestureRef.current = null;
    setSettling(true);
    updateOffset(0);
    if (settleTimerRef.current !== null) window.clearTimeout(settleTimerRef.current);
    settleTimerRef.current = window.setTimeout(() => {
      settleTimerRef.current = null;
      setSettling(false);
    }, SWIPE_DURATION_MS);
  };

  useEffect(() => () => {
    if (navigationTimerRef.current !== null) window.clearTimeout(navigationTimerRef.current);
    if (settleTimerRef.current !== null) window.clearTimeout(settleTimerRef.current);
  }, []);

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (
      !onSwipeBack ||
      !event.isPrimary ||
      event.pointerType === 'mouse' ||
      isInteractiveTarget(event.target)
    ) return;
    if (navigationTimerRef.current !== null) return;

    gestureRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      lastX: event.clientX,
      lastAt: performance.now(),
      decided: false,
      tracking: true,
    };
    setSettling(false);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const gesture = gestureRef.current;
    if (!gesture?.tracking || gesture.pointerId !== event.pointerId) return;

    const deltaX = event.clientX - gesture.startX;
    const deltaY = event.clientY - gesture.startY;
    if (!gesture.decided) {
      if (Math.abs(deltaX) < 8 && Math.abs(deltaY) < 8) return;
      if (deltaX >= 0 || Math.abs(deltaY) > Math.abs(deltaX)) {
        gesture.tracking = false;
        return;
      }
      gesture.decided = true;
    }

    const nextOffset = Math.max(-window.innerWidth, Math.min(0, deltaX));
    updateOffset(nextOffset);
    gesture.lastX = event.clientX;
    gesture.lastAt = performance.now();
  };

  const handlePointerEnd = (event: ReactPointerEvent<HTMLDivElement>) => {
    const swipeBack = onSwipeBack;
    if (!swipeBack) return;
    const gesture = gestureRef.current;
    if (!gesture || gesture.pointerId !== event.pointerId) return;

    if (!gesture.decided || !gesture.tracking) {
      resetSwipe();
      return;
    }

    const elapsed = Math.max(1, performance.now() - gesture.lastAt);
    const velocity = (event.clientX - gesture.lastX) / elapsed;
    const progress = Math.abs(offsetRef.current) / Math.max(1, window.innerWidth);
    gestureRef.current = null;

    if (progress >= 0.22 || velocity <= -0.5) {
      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      setSettling(true);
      updateOffset(-window.innerWidth);
      navigationTimerRef.current = window.setTimeout(() => {
        navigationTimerRef.current = null;
        swipeBack();
      }, reduceMotion ? 0 : SWIPE_DURATION_MS);
      return;
    }

    resetSwipe();
  };

  const handlePointerCancel = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (gestureRef.current?.pointerId === event.pointerId) resetSwipe();
  };

  const swipeProgress = Math.min(1, Math.abs(swipeOffset) / Math.max(1, window.innerWidth));

  return (
    <div className="relative min-h-[100dvh] overflow-x-clip bg-muted/40">
      {onSwipeBack && (
        <div
          className="pointer-events-none fixed right-3 top-1/2 z-0 flex -translate-y-1/2 items-center gap-1 text-xs font-medium text-muted-foreground"
          style={{ opacity: Math.max(0, (swipeProgress - 0.08) * 2.4) }}
          aria-hidden
        >
          <ArrowLeft className="h-4 w-4" />
          返回
        </div>
      )}
      <div
        className={cn(
          'relative z-10 min-h-[100dvh] bg-background text-foreground',
          onSwipeBack && 'touch-pan-y will-change-transform',
        )}
        style={{
          transform: `translate3d(${swipeOffset}px, 0, 0)`,
          opacity: 1 - swipeProgress * 0.08,
          transition: settling
            ? `transform ${SWIPE_DURATION_MS}ms cubic-bezier(0.22, 1, 0.36, 1), opacity ${SWIPE_DURATION_MS}ms ease`
            : 'none',
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerCancel}
      >
        <Header onCreateClick={onCreateClick} showCreate={showCreate} />
        <main className={footer ? 'pb-28' : 'pb-8'}>{children}</main>
        {footer}
      </div>
    </div>
  );
}
