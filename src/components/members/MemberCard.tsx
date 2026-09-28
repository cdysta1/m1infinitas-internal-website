import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { SmartImage } from '@/components/common/SmartImage';
import { buildPreviewUrl, getAvatarUrl } from '@/lib/media';
import type { MemberMeta } from '@/lib/memberDirectory';
import type { Profile, Project } from '@/types/models';

interface MemberCardProps {
  index: number;
  profile: Profile;
  projects: Project[];
  meta: MemberMeta;
}

export function MemberCard({ index, profile, projects, meta }: MemberCardProps) {
  const avatarUrl = getAvatarUrl(profile.avatar_file_id, profile.$id);
  const featuredProjects = projects.slice(0, 2);

  return (
    <article className="overflow-hidden rounded-sm border bg-card">
      <SmartImage
        src={avatarUrl}
        alt={profile.name}
        wrapperClassName="aspect-[4/5] w-full"
        imgClassName="object-cover"
      />

      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="break-words text-xl font-semibold leading-tight">{profile.name}</h2>
            <p className="mt-1 text-xs text-muted-foreground">{meta.focus}</p>
          </div>
          <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
            {String(index + 1).padStart(2, '0')}
          </span>
        </div>

        <p className="mt-4 text-sm leading-6 text-foreground/75">{meta.description}</p>

        <div className="mt-4 flex flex-wrap gap-1.5" aria-label={`${profile.name} 的专长`}>
          {meta.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full border px-2.5 py-1 text-[11px] leading-none text-foreground/80"
            >
              {tag}
            </span>
          ))}
        </div>

        <div className="mt-5 flex items-center justify-between border-t pt-3 text-[11px] text-muted-foreground">
          <span>@{profile.wechat}</span>
          <span>{projects.length} 个项目</span>
        </div>

        {featuredProjects.length > 0 && (
          <div className="mt-3 grid grid-cols-2 gap-2">
            {featuredProjects.map((project) => (
              <Link
                key={project.$id}
                to={`/projects/${project.$id}`}
                className="group relative overflow-hidden rounded-sm bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label={`查看项目：${project.title}`}
              >
                <SmartImage
                  src={buildPreviewUrl(project.cover_file_id, 'thumb')}
                  alt={project.title}
                  wrapperClassName="aspect-[4/3] w-full"
                  imgClassName="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                />
                <span className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-white/90 text-black opacity-0 shadow-sm transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </article>
  );
}
