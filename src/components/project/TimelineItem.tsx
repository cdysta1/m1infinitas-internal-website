import { useState } from 'react';
import { Loader2, RotateCw, AlertCircle } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { buildPreviewUrl } from '@/lib/media';
import { formatDateTime, formatRelativeTime, cn } from '@/lib/utils';
import { OPTIMISTIC } from '@/lib/constants';
import type { Profile, TimelineEntry } from '@/types/models';
import { Lightbox } from '@/components/common/Lightbox';

interface TimelineItemProps {
  entry: TimelineEntry;
  author?: Profile | null;
  onRetry?: (entry: TimelineEntry) => void;
}

export function TimelineItem({ entry, author, onRetry }: TimelineItemProps) {
  const isPending = entry.status === OPTIMISTIC.PENDING && entry.isLocal;
  const isFailed = entry.status === OPTIMISTIC.FAILED;

  const authorName = author?.name ?? (entry.isLocal ? '我' : '匿名');
  const initials = authorName.slice(0, 1).toUpperCase() || '?';
  const avatarUrl = author?.avatar_file_id
    ? buildPreviewUrl(author.avatar_file_id, 'avatar')
    : undefined;

  // Prefer local blob previews while uploading, fall back to CDN previews.
  const sources = entry.localPreviewUrls?.length
    ? entry.localPreviewUrls
    : entry.fileIds.map((id) => buildPreviewUrl(id, 'detail'));

  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  return (
    <article
      className={cn(
        'relative pl-12',
        isPending && 'opacity-70',
      )}
      aria-busy={isPending}
    >
      <div className="absolute left-0 top-0">
        <Avatar className="h-9 w-9">
          {avatarUrl && <AvatarImage src={avatarUrl} alt={authorName} />}
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
      </div>

      <div className="min-w-0">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span className="text-sm font-medium">{authorName}</span>
          <span className="text-[11px] text-muted-foreground">
            {formatRelativeTime(entry.createdAt)}
          </span>
          <span className="hidden text-[11px] text-muted-foreground/70 sm:inline">
            · {formatDateTime(entry.createdAt)}
          </span>
        </div>

        {entry.content && (
          <p className="mt-1.5 whitespace-pre-wrap break-words text-[15px] leading-relaxed">
            {entry.content}
          </p>
        )}

        {sources.length > 0 && (
          <div className={cn('mt-3 grid gap-1.5', gridClassFor(sources.length))}>
            {sources.slice(0, 9).map((src, idx) => (
              <button
                key={`${entry.id}-${idx}`}
                type="button"
                onClick={() => !isPending && setLightboxIndex(idx)}
                className="relative block overflow-hidden rounded-lg bg-muted disabled:cursor-default"
                disabled={isPending}
                aria-label={`查看图片 ${idx + 1}`}
              >
                <img
                  src={src}
                  alt=""
                  loading="lazy"
                  className="aspect-square w-full object-cover"
                />
                {isPending && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                    <Loader2 className="h-5 w-5 animate-spin text-white" />
                  </div>
                )}
              </button>
            ))}
          </div>
        )}

        {isPending && (
          <div className="mt-2 inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" />
            发布中…
          </div>
        )}
        {isFailed && (
          <div className="mt-2 flex items-center gap-2 rounded-md bg-destructive/10 px-2.5 py-1.5 text-[12px] text-destructive">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            <span className="flex-1">发布失败</span>
            {onRetry && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onRetry(entry)}
                className="h-6 gap-1 px-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
              >
                <RotateCw className="h-3 w-3" />
                重试
              </Button>
            )}
          </div>
        )}
      </div>

      {lightboxIndex !== null && (
        <Lightbox
          sources={sources}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onIndexChange={setLightboxIndex}
        />
      )}
    </article>
  );
}

// Tailwind needs static class names; map count -> grid-cols-N.
function gridClassFor(count: number): string {
  if (count === 1) return 'grid-cols-1';
  if (count === 2 || count === 4) return 'grid-cols-2';
  return 'grid-cols-3';
}
