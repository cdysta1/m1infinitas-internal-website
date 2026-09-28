import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Image, Loader2 } from 'lucide-react';
import { buildPreviewUrl, getAvatarUrl } from '@/lib/media';
import { cn, formatRelativeTime } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { SmartImage } from '@/components/common/SmartImage';
import { useLatestProjectUpdate } from '@/hooks/useLatestProjectUpdate';
import type { Profile, Project } from '@/types/models';

interface ProjectCardProps {
  project: Project;
  owner?: Profile | null;
  // Marks an optimistically-inserted card that is still uploading.
  pending?: boolean;
  failed?: boolean;
}

export function ProjectCard({ project, owner, pending, failed }: ProjectCardProps) {
  const [previewActive, setPreviewActive] = useState(false);
  const latestUpdate = useLatestProjectUpdate(project.$id, previewActive && !pending);
  const coverUrl = project.cover_file_id
    ? buildPreviewUrl(project.cover_file_id, 'cover')
    : undefined;
  const ownerName = owner?.name ?? '匿名';
  const avatarUrl = getAvatarUrl(owner?.avatar_file_id, owner?.$id ?? project.owner_id);
  const initials = ownerName.slice(0, 1).toUpperCase() || '?';

  return (
    <Link
      to={`/projects/${project.$id}`}
      className={cn(
        'group mb-4 block break-inside-avoid overflow-hidden rounded-xl bg-card',
        'transition-transform duration-200 hover:-translate-y-0.5',
        pending && 'pointer-events-none opacity-70',
      )}
      aria-busy={pending}
      onPointerEnter={() => setPreviewActive(true)}
      onPointerLeave={() => setPreviewActive(false)}
      onFocus={() => setPreviewActive(true)}
      onBlur={() => setPreviewActive(false)}
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
              'group-hover:opacity-100 group-focus-visible:opacity-100',
            )}
            aria-hidden="true"
          >
            <div
              className={cn(
                'flex items-center justify-between gap-2 transition-transform duration-300 ease-out',
                '-translate-y-1 group-hover:translate-y-0 group-focus-visible:translate-y-0',
              )}
            >
              <span className="rounded-full border border-white/30 bg-black/20 px-2 py-1 font-mono text-[9px] uppercase leading-none">
                最新进展
              </span>
              {latestUpdate.data && (
                <span className="shrink-0 text-[10px] text-white/70">
                  {formatRelativeTime(latestUpdate.data.created_at)}
                </span>
              )}
            </div>

            <div
              className={cn(
                'translate-y-2 transition-transform duration-300 ease-out',
                'group-hover:translate-y-0 group-focus-visible:translate-y-0',
              )}
            >
              {latestUpdate.isLoading ? (
                <div className="flex items-center gap-2 text-xs text-white/75">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  正在读取最新进展
                </div>
              ) : latestUpdate.isError ? (
                <p className="text-xs text-white/75">进展暂时无法读取</p>
              ) : latestUpdate.data ? (
                <>
                  <p className="line-clamp-4 text-xs font-medium leading-5 sm:text-[13px]">
                    {latestUpdate.data.content || '上传了一组新的项目资料。'}
                  </p>
                  <div className="mt-2 flex items-center justify-between gap-3 text-[10px] text-white/70">
                    <span className="flex items-center gap-1">
                      {latestUpdate.data.file_ids.length > 0 && (
                        <>
                          <Image className="h-3 w-3" />
                          {latestUpdate.data.file_ids.length} 张图片
                        </>
                      )}
                    </span>
                    <span className="flex shrink-0 items-center gap-1 font-medium text-white">
                      加入我们
                      <ArrowUpRight className="h-3 w-3" />
                    </span>
                  </div>
                </>
              ) : (
                <div className="flex items-end justify-between gap-3">
                  <p className="text-xs leading-5 text-white/75">这个项目还没有发布进展。</p>
                  <ArrowUpRight className="h-3.5 w-3.5 shrink-0" />
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="px-1 pb-1 pt-2">
        <h3 className="line-clamp-2 text-[13px] font-medium leading-snug text-foreground">
          {project.title}
        </h3>
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
    </Link>
  );
}
