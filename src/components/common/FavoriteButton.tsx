import { type ButtonHTMLAttributes, type CSSProperties, useEffect, useRef, useState } from 'react';
import { Heart } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FavoriteButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onClick' | 'aria-pressed'> {
  favorite: boolean;
  onToggle?: () => void;
  iconClassName?: string;
}

const BURST_OFFSETS = [
  [0, -18], [13, -13], [18, 0], [13, 13],
  [0, 18], [-13, 13], [-18, 0], [-13, -13],
];

export function FavoriteButton({
  favorite,
  onToggle,
  disabled,
  className,
  iconClassName,
  onPointerDown,
  ...props
}: FavoriteButtonProps) {
  const sequence = useRef(0);
  const [feedback, setFeedback] = useState<{ id: number; kind: 'like' | 'unlike' } | null>(null);

  useEffect(() => {
    if (!feedback) return;
    if (favorite !== (feedback.kind === 'like')) {
      setFeedback(null);
      return;
    }
    const timer = window.setTimeout(() => setFeedback(null), 650);
    return () => window.clearTimeout(timer);
  }, [feedback, favorite]);

  if (!onToggle) return null;

  return (
    <button
      {...props}
      type="button"
      data-favorite-button
      data-favorite-feedback={feedback?.kind}
      disabled={disabled}
      aria-pressed={favorite}
      onPointerDown={(event) => {
        event.stopPropagation();
        onPointerDown?.(event);
      }}
      onClick={(event) => {
        if (disabled || event.defaultPrevented) return;
        event.preventDefault();
        event.stopPropagation();
        setFeedback({ id: ++sequence.current, kind: favorite ? 'unlike' : 'like' });
        onToggle();
      }}
      className={cn(
        'relative isolate flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition-[background-color,border-color,color,transform] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-90 disabled:cursor-wait motion-reduce:transition-none motion-reduce:active:scale-100',
        favorite
          ? 'border-rose-200 bg-rose-50 text-rose-600'
          : 'border-border bg-background text-muted-foreground hover:border-foreground hover:text-foreground',
        disabled && !feedback && 'opacity-50',
        className,
      )}
    >
      <span
        key={feedback?.id ?? 'idle'}
        aria-hidden="true"
        className={cn(
          'pointer-events-none relative z-10 flex items-center justify-center',
          feedback?.kind === 'like' && 'favorite-heart-like',
          feedback?.kind === 'unlike' && 'favorite-heart-unlike',
        )}
      >
        <Heart className={cn('h-4 w-4', favorite && 'fill-current', iconClassName)} />
      </span>
      {feedback?.kind === 'like' && (
        <span key={`burst-${feedback.id}`} aria-hidden="true" className="favorite-burst pointer-events-none absolute inset-0">
          <span className="favorite-ring" />
          {BURST_OFFSETS.map(([x, y], index) => (
            <span
              key={index}
              className="favorite-particle"
              style={{ '--favorite-x': `${x}px`, '--favorite-y': `${y}px` } as CSSProperties}
            />
          ))}
        </span>
      )}
    </button>
  );
}
