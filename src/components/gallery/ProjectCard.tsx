import { Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { buildPreviewUrl } from '@/lib/media';
import { cn } from '@/lib/utils';
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
  const updatedAt = new Date(project.updated_at);
  const month = updatedAt
    .toLocaleDateString('en-US', { month: 'short' })
    .toUpperCase();
  const day = String(updatedAt.getDate()).padStart(2, '0');

  return (
    <Link
      to={`/projects/${project.$id}`}
      className={cn(
        'group mb-4 block break-inside-avoid overflow-hidden rounded-2xl bg-card p-2.5',
        'shadow-sm ring-1 ring-black/[0.04] transition-[transform,box-shadow] duration-300',
        'hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        pending && 'pointer-events-none opacity-70',
      )}
      aria-busy={pending}
    >
      <div className="px-1.5 pb-3 pt-1.5">
        <div className="flex items-center justify-between gap-2">
          <span className="max-w-[7rem] truncate rounded-md bg-zinc-900 px-2 py-1 text-[9px] font-medium text-white shadow-sm sm:text-[10px]">
            进行中
          </span>
          <span className="inline-flex shrink-0 overflow-hidden rounded-md border border-zinc-800 text-[9px] font-medium shadow-sm sm:text-[10px]">
            <span className="bg-zinc-900 px-1.5 py-1 text-white">{month}</span>
            <span className="bg-white px-1.5 py-1 text-zinc-900">{day}</span>
          </span>
        </div>

        <h3 className="mt-3 line-clamp-2 text-[15px] font-medium leading-tight text-foreground sm:text-lg">
          {project.title}
        </h3>
        <p className="mt-1.5 line-clamp-3 text-[10px] leading-relaxed text-muted-foreground sm:text-xs">
          {project.summary}
        </p>
      </div>

      <div
        className={cn(
          'relative overflow-hidden rounded-xl bg-muted',
          imageRatioClass(project.$id),
        )}
      >
        {coverUrl ? (
          <SmartImage
            src={coverUrl}
            alt={project.title}
            wrapperClassName="absolute inset-0 h-full w-full"
            imgClassName="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.035]"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
            {pending ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <span className="text-xs">无封面</span>
            )}
          </div>
        )}

        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/65 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 flex min-w-0 items-center gap-2 px-3 pb-3 text-white sm:px-4 sm:pb-4">
          <Avatar className="h-7 w-7 shrink-0 border border-white/50 shadow-sm sm:h-8 sm:w-8">
            {avatarUrl && <AvatarImage src={avatarUrl} alt={ownerName} />}
            <AvatarFallback className="bg-white/90 text-[10px] font-semibold text-zinc-900">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <div className="truncate text-[10px] font-medium drop-shadow-sm sm:text-xs">
              {ownerName}
            </div>
            <div className="mt-0.5 text-[8px] text-white/75 sm:text-[10px]">
              项目负责人
            </div>
          </div>
        </div>

        {pending && coverUrl && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/25">
            <Loader2 className="h-5 w-5 animate-spin text-white" />
          </div>
        )}
        {failed && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/65 px-4 text-center text-xs font-medium text-white backdrop-blur-sm">
            发布失败，请重试
          </div>
        )}
      </div>
    </Link>
  );
}

function imageRatioClass(id: string): string {
  const variant = Array.from(id).reduce((sum, char) => sum + char.charCodeAt(0), 0) % 3;
  if (variant === 0) return 'aspect-[4/5]';
  if (variant === 1) return 'aspect-square';
  return 'aspect-[3/4]';
}
