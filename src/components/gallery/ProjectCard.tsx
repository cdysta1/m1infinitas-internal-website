import { Link } from 'react-router-dom';
import { ArrowUpRight, Loader2, Star } from 'lucide-react';
import { buildPreviewUrl } from '@/lib/media';
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
}

export function ProjectCard({ project, owner, pending, failed }: ProjectCardProps) {
  const coverUrl = project.cover_file_id
    ? buildPreviewUrl(project.cover_file_id, 'cover')
    : undefined;
  const avatarUrl = owner?.avatar_file_id
    ? buildPreviewUrl(owner.avatar_file_id, 'avatar')
    : undefined;
  const ownerName = owner?.name ?? '匿名';
  const initials = ownerName.slice(0, 1).toUpperCase() || '?';

  return (
    <Link
      to={`/projects/${project.$id}`}
      className={cn(
        'group relative block aspect-[3/4] min-w-0 overflow-hidden rounded-2xl bg-zinc-900 text-white',
        'shadow-sm transition-[transform,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-xl',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        pending && 'pointer-events-none opacity-70',
      )}
      aria-busy={pending}
    >
      {coverUrl ? (
        <SmartImage
          src={coverUrl}
          alt={project.title}
          wrapperClassName="absolute inset-0 h-full w-full bg-zinc-800"
          imgClassName="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.035]"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-zinc-800 text-white/65">
          {pending ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <span className="text-xs">无封面</span>
          )}
        </div>
      )}

      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/60 via-black/5 to-black/75" />

      <div className="absolute inset-x-0 top-0 flex flex-col items-center px-3 pb-8 pt-3.5 text-center sm:px-4 sm:pt-4">
        <div className="inline-flex max-w-full items-center gap-1 rounded-full bg-black/30 px-2 py-1 text-[9px] font-medium text-white/90 backdrop-blur-md sm:text-[10px]">
          <Star className="h-2.5 w-2.5 fill-current" aria-hidden />
          <span className="truncate">进行中 · {formatRelativeTime(project.updated_at)}</span>
        </div>
        <h3 className="mt-2 line-clamp-2 text-[13px] font-semibold leading-snug text-white drop-shadow-sm sm:text-base">
          {project.title}
        </h3>
      </div>

      <div className="absolute inset-x-0 bottom-0 flex min-w-0 items-end gap-2 px-3 pb-3 sm:gap-3 sm:px-4 sm:pb-4">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <Avatar className="h-7 w-7 shrink-0 border border-white/40 sm:h-8 sm:w-8">
            {avatarUrl && <AvatarImage src={avatarUrl} alt={ownerName} />}
            <AvatarFallback className="bg-white/90 text-[10px] font-semibold text-zinc-900">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1 text-left">
            <div className="truncate text-[10px] font-medium text-white sm:text-xs">
              {ownerName}
            </div>
            <div className="mt-0.5 line-clamp-1 text-[8px] leading-tight text-white/70 sm:text-[10px]">
              {project.summary}
            </div>
          </div>
        </div>

        <span className="inline-flex h-8 shrink-0 items-center gap-1 rounded-full bg-white px-2.5 text-[10px] font-semibold text-zinc-900 shadow-sm transition-transform group-hover:scale-[1.03] sm:h-9 sm:px-3 sm:text-xs">
          查看
          <ArrowUpRight className="h-3 w-3" aria-hidden />
        </span>
      </div>

      {failed && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/65 px-4 text-center text-xs font-medium text-white backdrop-blur-sm">
          发布失败，请重试
        </div>
      )}
    </Link>
  );
}
