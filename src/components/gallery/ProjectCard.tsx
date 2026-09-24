import { Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { buildPreviewUrl } from '@/lib/media';
import { cn, formatRelativeTime } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
        'group mb-4 block break-inside-avoid overflow-hidden rounded-xl bg-card',
        'transition-transform duration-200 hover:-translate-y-0.5',
        pending && 'pointer-events-none opacity-70',
      )}
      aria-busy={pending}
    >
      <div className="relative w-full overflow-hidden rounded-xl bg-muted">
        {coverUrl ? (
          <img
            src={coverUrl}
            alt={project.title}
            loading="lazy"
            className="w-full object-cover transition-opacity duration-500 group-hover:opacity-95"
            style={{ display: 'block' }}
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
      </div>

      <div className="px-1 pb-1 pt-2">
        <h3 className="line-clamp-2 text-[13px] font-medium leading-snug text-foreground">
          {project.title}
        </h3>
        <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Avatar className="h-4 w-4">
            {avatarUrl && <AvatarImage src={avatarUrl} alt={ownerName} />}
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
