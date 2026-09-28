import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface MasonryGridProps {
  children: ReactNode;
  className?: string;
}

// Stable portrait grid keeps image-overlay labels and actions aligned across
// cards while still scaling from compact mobile columns to desktop.
export function MasonryGrid({ children, className }: MasonryGridProps) {
  return (
    <div
      className={cn(
        'grid grid-cols-2 gap-3 sm:grid-cols-2 md:grid-cols-3 md:gap-4 lg:grid-cols-4',
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
          className="aspect-[3/4] overflow-hidden rounded-2xl"
        >
          <div className="h-full w-full animate-pulse bg-muted/70" />
        </div>
      ))}
    </MasonryGrid>
  );
}
