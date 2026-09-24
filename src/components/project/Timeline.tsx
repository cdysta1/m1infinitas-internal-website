import { TimelineItem } from './TimelineItem';
import { EmptyState } from '@/components/common/EmptyState';
import { Skeleton } from '@/components/ui/skeleton';
import type { Profile, TimelineEntry } from '@/types/models';

interface TimelineProps {
  entries: TimelineEntry[];
  authors: Map<string, Profile>;
  isLoading?: boolean;
  hasNextPage?: boolean;
  isFetchingNextPage?: boolean;
  onFetchMore?: () => void;
  onRetry?: (entry: TimelineEntry) => void;
}

export function Timeline({
  entries,
  authors,
  isLoading,
  hasNextPage,
  isFetchingNextPage,
  onFetchMore,
  onRetry,
}: TimelineProps) {
  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl space-y-6 px-4 py-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex gap-4">
            <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3 w-32" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-40 w-full rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <EmptyState
        title="还没有进度更新"
        description="点击下方 + 更新进度，发第一条动态"
      />
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <ol className="relative space-y-8">
        <span
          className="absolute left-[17px] top-2 bottom-2 w-px bg-border"
          aria-hidden
        />
        {entries.map((entry) => (
          <li key={entry.id} className="relative">
            <TimelineItem
              entry={entry}
              author={authors.get(entry.authorId)}
              onRetry={onRetry}
            />
          </li>
        ))}
      </ol>

      {hasNextPage && (
        <div className="mt-8 flex justify-center">
          <button
            type="button"
            onClick={onFetchMore}
            disabled={isFetchingNextPage}
            className="rounded-full border px-4 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-accent disabled:opacity-50"
          >
            {isFetchingNextPage ? '加载中…' : '加载更早的进度'}
          </button>
        </div>
      )}
    </div>
  );
}
