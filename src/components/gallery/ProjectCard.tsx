import { Link } from 'react-router-dom';
import { ArrowUpRight, Loader2 } from 'lucide-react';
import { useI18n } from '@/app/I18nProvider';
import {
  ApplyButton,
  FavoriteCountButton,
} from '@/components/project/ProjectInteractions';
import { buildPreviewUrl, getAvatarUrl } from '@/lib/media';
import { cn, formatRelativeTime } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { SmartImage } from '@/components/common/SmartImage';
import type { Profile, Project } from '@/types/models';

interface ProjectCardProps {
  project: Project;
  owner?: Profile | null;
  pending?: boolean;
  failed?: boolean;
  favorite?: boolean;
  favoriteCount?: number;
  favoritePending?: boolean;
  onFavoriteToggle?: () => void;
}

export function ProjectCard({
  project,
  owner,
  pending,
  failed,
  favorite = false,
  favoriteCount,
  favoritePending = false,
  onFavoriteToggle,
}: ProjectCardProps) {
  const { t, language } = useI18n();
  const coverUrl = project.cover_file_id
    ? buildPreviewUrl(project.cover_file_id, 'cover')
    : undefined;
  const ownerName = project.is_anonymous ? t('匿名') : owner?.name || t('未能加载作者昵称');
  const avatarUrl = project.is_anonymous ? undefined : getAvatarUrl(owner?.avatar_file_id, owner?.$id ?? project.owner_id);
  const initials = ownerName.slice(0, 1).toUpperCase() || '?';
  const isDone = project.status === 'done';
  const timeText = formatRelativeTime(project.updated_at, language);

  return (
    <article
      className={cn(
        'group py-4 first:pt-0 sm:mb-7 sm:break-inside-avoid sm:py-0',
        pending && 'opacity-70',
      )}
      aria-busy={pending}
    >
      <div className="flex gap-3.5 sm:block">
        {/* Cover */}
        <Link
          to={`/projects/${project.$id}`}
          className={cn(
            'block w-24 shrink-0 focus-visible:outline-none sm:w-full',
            pending && 'pointer-events-none',
          )}
        >
          <div className="relative aspect-[4/5] w-full overflow-hidden rounded-xl bg-muted ring-1 ring-inset ring-black/[0.04] sm:aspect-auto">
            {coverUrl ? (
              <SmartImage
                src={coverUrl}
                alt={project.title}
                wrapperClassName="h-full w-full sm:h-auto"
                imgClassName="object-cover transition-opacity duration-500 group-hover:opacity-95"
              />
            ) : (
              <div className="flex aspect-[4/5] w-full items-center justify-center text-muted-foreground sm:aspect-square">
                {pending ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <span className="text-xs">{t('无封面')}</span>
                )}
              </div>
            )}

            {isDone && !pending && !failed && (
              <span className="pointer-events-none absolute left-2.5 top-2.5 rounded-full bg-black/65 px-2 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm">
                {t('已完成')}
              </span>
            )}

            {failed && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/55 px-2 text-center text-xs font-medium text-white">
                {t('发布失败，请重试')}
              </div>
            )}

            {!failed && !pending && (
              <div
                className={cn(
                  'pointer-events-none absolute inset-0 hidden flex-col justify-between bg-black/75 p-3.5 text-white sm:flex',
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
                  <span className="font-mono text-[9px] uppercase tracking-wider text-white/80">
                    {isDone ? t('已完成') : t('进行中')}
                  </span>
                  <span className="shrink-0 font-mono text-[10px] text-white/70">{timeText}</span>
                </div>

                <div
                  className={cn(
                    'translate-y-2 transition-transform duration-300 ease-out',
                    'group-hover:translate-y-0 group-focus-within:translate-y-0',
                  )}
                >
                  <p className="line-clamp-4 text-xs leading-5 text-white/95 sm:text-[13px]">
                    {project.summary}
                  </p>
                  <div className="mt-2.5 flex items-center justify-end gap-1 font-mono text-[10px] uppercase tracking-wider text-white">
                    {t('查看项目')}
                    <ArrowUpRight className="h-3 w-3" />
                  </div>
                </div>
              </div>
            )}
          </div>
        </Link>

        {/* Minimal Caption & Borderless Actions */}
        <div className="flex min-w-0 flex-1 flex-col justify-between sm:pt-2.5">
          <div>
            <Link
              to={`/projects/${project.$id}`}
              className={cn(
                'block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                pending && 'pointer-events-none',
              )}
            >
              <h3 className="line-clamp-2 text-[14px] font-medium leading-snug tracking-tight text-foreground sm:text-[13px]">
                {project.title}
              </h3>
              {project.summary && (
                <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground sm:hidden">
                  {project.summary}
                </p>
              )}
            </Link>

            <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <Avatar className="h-4 w-4 shrink-0">
                <AvatarImage src={avatarUrl} alt={ownerName} />
                <AvatarFallback className="text-[9px]">{initials}</AvatarFallback>
              </Avatar>
              <span className="max-w-[7rem] truncate">{ownerName}</span>
              <span aria-hidden>·</span>
              <span className="min-w-0 truncate">{timeText}</span>
            </div>
          </div>

          {!pending && !failed && (
            <div className="mt-2.5 flex items-center justify-between gap-2">
              <FavoriteCountButton
                appearance="minimal"
                data-onboarding="favorite-project"
                favorite={favorite}
                count={favoriteCount}
                onToggle={onFavoriteToggle}
                disabled={favoritePending || pending}
                aria-label={`${favorite ? t('取消收藏项目') : t('收藏项目')} ${project.title}`}
                title={favorite ? t('取消收藏项目') : t('收藏项目')}
              />

              <ApplyButton project={project} variant="minimal" />
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
