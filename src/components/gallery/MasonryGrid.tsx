import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface MasonryGridProps {
  children: ReactNode;
  className?: string;
}

// CSS-columns based masonry. Simple, no JS measurement, works well for
// internal scale (a few dozen to a few hundred projects).
// Cards inside must have `break-inside-avoid` (see ProjectCard).
export function MasonryGrid({ children, className }: MasonryGridProps) {
  return (
    <div
      className={cn(
        'columns-2 gap-3 sm:columns-2 md:columns-3 lg:columns-4 md:gap-4',
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
        <div
          key={i}
          className="mb-4 break-inside-avoid overflow-hidden rounded-xl"
          style={{ aspectRatio: i % 3 === 0 ? '3/4' : i % 3 === 1 ? '1/1' : '4/5' }}
        >
          <div className="h-full w-full animate-pulse bg-muted/70" />
        </div>
      ))}
    </MasonryGrid>
  );
}
