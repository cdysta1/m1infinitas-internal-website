import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface MasonryGridProps {
  children: ReactNode;
  className?: string;
}

// Mobile uses a quiet hairline-divided horizontal list; sm+ uses an airy masonry gallery.
export function MasonryGrid({ children, className }: MasonryGridProps) {
  return (
    <div
      className={cn(
        'divide-y sm:block sm:columns-2 sm:gap-6 sm:divide-y-0 md:columns-3 lg:columns-4 lg:gap-7',
        className,
      )}
    >
      {children}
    </div>
  );
}

// Minimal skeleton placeholders for mobile list and desktop masonry.
export function MasonrySkeleton({ count = 8 }: { count?: number }) {
  return (
    <MasonryGrid>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="py-4 first:pt-0 sm:mb-7 sm:break-inside-avoid sm:py-0">
          <div className="flex gap-3.5 sm:hidden">
            <div className="aspect-[4/5] w-24 shrink-0 animate-pulse rounded-xl bg-muted/70" />
            <div className="flex flex-1 flex-col justify-between py-0.5">
              <div className="space-y-2">
                <div className="h-4 w-4/5 animate-pulse rounded-md bg-muted/70" />
                <div className="h-3 w-full animate-pulse rounded-md bg-muted/50" />
              </div>
              <div className="flex items-center justify-between pt-2">
                <div className="h-3.5 w-10 animate-pulse rounded-md bg-muted/60" />
                <div className="h-3.5 w-10 animate-pulse rounded-md bg-muted/60" />
              </div>
            </div>
          </div>
          <div
            className="hidden overflow-hidden rounded-xl sm:block"
            style={{ aspectRatio: i % 3 === 0 ? '3/4' : i % 3 === 1 ? '1/1' : '4/5' }}
          >
            <div className="h-full w-full animate-pulse bg-muted/70" />
          </div>
        </div>
      ))}
    </MasonryGrid>
  );
}
