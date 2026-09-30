import { Link } from 'react-router-dom';
import { ArrowUpRight, Heart, Loader2 } from 'lucide-react';
import { buildPreviewUrl, getAvatarUrl } from '@/lib/media';
import { cn, formatRelativeTime } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { SmartImage } from '@/components/common/SmartImage';
import type { Profile, Project } from '@/types/models';

interface ProjectCardProps {
  project: Project;
  owner?: Profile | null;
  // Marks an optimistically-inserted card that is still uploading.
  pending?: boolean;
  failed?: boolean;
  favorite?: boolean;
  favoritePending?: boolean;
  onFavoriteToggle?: () => void;
}

export function ProjectCard({
  project,
  owner,
  pending,
  failed,
  favorite = false,
  favoritePending = false,
  onFavoriteToggle,
}: ProjectCardProps) {
  const coverUrl = project.cover_file_id
    ? buildPreviewUrl(project.cover_file_id, 'cover')
    : undefined;
  const ownerName = owner?.name ?? '匿名';
  const avatarUrl = getAvatarUrl(owner?.avatar_file_id, owner?.$id ?? project.owner_id);
  const initials = ownerName.slice(0, 1).toUpperCase() || '?';

  return (
    <article
      className={cn(
        'group mb-4 break-inside-avoid overflow-hidden rounded-xl bg-card',
        pending && 'opacity-70',
      )}
      aria-busy={pending}
    >
      <Link
        to={`/projects/${project.$id}`}
        className={cn('block focus-visible:outline-none', pending && 'pointer-events-none')}
      >
        <div className="relative w-full overflow-hidden rounded-xl bg-muted">
          {coverUrl ? (
            <SmartImage
              src={coverUrl}
              alt={project.title}
              wrapperClassName="w-full"
              imgClassName="object-cover transition-opacity duration-500 group-hover:opacity-95"
            />
          ) : (
            <div className="flex aspect-square w-full items-center justify-center text-muted-foreground">
              {pending ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <span className="text-xs">无封面</span>
              )}
            </div>
          )}
          {failed && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-xs font-medium text-white">
              发布失败，请重试
            </div>
          )}
          {!failed && !pending && (
            <div
              className={cn(
                'pointer-events-none absolute inset-0 flex flex-col justify-between bg-black/80 p-3 text-white',
                'opacity-0 transition-opacity duration-300 ease-out',
                'group-hover:opacity-100 group-focus-within:opacity-100',
              )}
              aria-hidden="true"
            >
              <div
                className={cn(
                  'flex items-center justify-between gap-2 transition-transform duration-300 ease-out',
                  '-translate-y-1 group-hover:translate-y-0 group-focus-within:translate-y-0',
                )}
              >
                <span className="rounded-full border border-white/30 bg-black/20 px-2 py-1 font-mono text-[9px] uppercase leading-none">
                  项目详情
                </span>
                <span className="shrink-0 text-[10px] text-white/70">
                  {formatRelativeTime(project.updated_at)}
                </span>
              </div>

              <div
                className={cn(
                  'translate-y-2 transition-transform duration-300 ease-out',
                  'group-hover:translate-y-0 group-focus-within:translate-y-0',
                )}
              >
                <p className="line-clamp-4 text-xs font-medium leading-5 sm:text-[13px]">
                  {project.summary}
                </p>
                <div className="mt-2 flex items-center justify-end gap-1 text-[10px] font-medium text-white">
                  查看项目
                  <ArrowUpRight className="h-3 w-3" />
                </div>
              </div>
            </div>
          )}
        </div>
      </Link>

      <div className="px-1 pb-1 pt-2">
        <div className="flex items-start gap-2">
          <Link
            to={`/projects/${project.$id}`}
            className={cn(
              'min-w-0 flex-1 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              pending && 'pointer-events-none',
            )}
          >
            <h3 className="line-clamp-2 text-[13px] font-medium leading-snug text-foreground">
              {project.title}
            </h3>
          </Link>
          {onFavoriteToggle && (
            <button
              type="button"
              data-onboarding="favorite-project"
              onPointerDown={(event) => event.stopPropagation()}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                onFavoriteToggle();
              }}
              disabled={favoritePending || pending}
              aria-label={`${favorite ? '取消收藏项目' : '收藏项目'} ${project.title}`}
              title={favorite ? '取消收藏项目' : '收藏项目'}
              aria-pressed={favorite}
              className={cn(
                'flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition-[background-color,color,transform] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-90',
                favorite
                  ? 'border-foreground bg-foreground text-background'
                  : 'border-border bg-background text-muted-foreground hover:border-foreground hover:text-foreground',
                (favoritePending || pending) && 'cursor-wait opacity-50',
              )}
            >
              <Heart className={cn('h-3.5 w-3.5', favorite && 'fill-current')} />
            </button>
          )}
        </div>
        <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Avatar className="h-4 w-4">
            <AvatarImage src={avatarUrl} alt={ownerName} />
            <AvatarFallback className="text-[9px]">{initials}</AvatarFallback>
          </Avatar>
          <span className="max-w-[7rem] truncate">{ownerName}</span>
          <span aria-hidden>·</span>
          <span className="shrink-0">{formatRelativeTime(project.updated_at)}</span>
        </div>
      </div>
    </article>
  );
}
