import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface MasonryGridProps {
  children: ReactNode;
  className?: string;
}

// CSS columns create the staggered social-feed rhythm while each card keeps
// its own content-driven height.
export function MasonryGrid({ children, className }: MasonryGridProps) {
  return (
    <div
      className={cn(
        'columns-2 gap-3 sm:columns-2 md:columns-3 md:gap-4 lg:columns-4',
        className,
      )}
    >
      {children}
    </div>
  );
}

// Skeleton placeholders shown while the feed is loading.
export function MasonrySkeleton({ count = 8 }: { count?: number }) {
  return (
    <MasonryGrid>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="mb-4 break-inside-avoid rounded-2xl bg-card p-2.5 shadow-sm">
          <div className="px-1.5 pb-3 pt-1.5">
            <div className="flex justify-between">
              <div className="h-5 w-12 animate-pulse rounded-md bg-muted" />
              <div className="h-5 w-12 animate-pulse rounded-md bg-muted" />
            </div>
            <div className="mt-3 h-4 w-3/4 animate-pulse rounded bg-muted" />
            <div className="mt-2 h-3 w-full animate-pulse rounded bg-muted/70" />
          </div>
          <div
            className={cn(
              'animate-pulse rounded-xl bg-muted/70',
              i % 3 === 0 ? 'aspect-[4/5]' : i % 3 === 1 ? 'aspect-square' : 'aspect-[3/4]',
            )}
          />
        </div>
      ))}
    </MasonryGrid>
  );
}
