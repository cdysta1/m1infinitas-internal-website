import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { buildPreviewUrl } from '@/lib/media';
import type { Profile, Project } from '@/types/models';

interface ProjectHeaderProps {
  project: Project;
  owner?: Profile | null;
}

export function ProjectHeader({ project, owner }: ProjectHeaderProps) {
  const navigate = useNavigate();
  const ownerName = owner?.name ?? '匿名';
  const initials = ownerName.slice(0, 1).toUpperCase() || '?';
  const avatarUrl = owner?.avatar_file_id
    ? buildPreviewUrl(owner.avatar_file_id, 'avatar')
    : undefined;

  return (
    <div className="border-b bg-background">
      <div className="mx-auto max-w-3xl px-4 pb-5 pt-3">
        <Button
          variant="ghost"
          size="iconSm"
          onClick={() => navigate(-1)}
          aria-label="返回"
          className="-ml-2 mb-2 text-muted-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>

        <h1 className="text-xl font-semibold leading-tight tracking-tight">
          {project.title}
        </h1>
        {project.summary && (
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {project.summary}
          </p>
        )}

        <div className="mt-4 flex items-center gap-2.5">
          <Avatar className="h-9 w-9">
            {avatarUrl && <AvatarImage src={avatarUrl} alt={ownerName} />}
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <div className="truncate text-sm font-medium">{ownerName}</div>
            <div className="text-[11px] text-muted-foreground">项目负责人</div>
          </div>
        </div>
      </div>
    </div>
  );
}
