import { SmartImage } from '@/components/common/SmartImage';
import { getAvatarUrl } from '@/lib/media';
import type { MemberMeta } from '@/lib/memberDirectory';
import type { Profile, Project } from '@/types/models';
import { cn } from '@/lib/utils';

interface MemberCardProps {
  index: number;
  profile: Profile;
  projects: Project[];
  meta: MemberMeta;
  compact?: boolean;
}

export function MemberCard({ index, profile, projects, meta, compact = false }: MemberCardProps) {
  const avatarUrl = getAvatarUrl(profile.avatar_file_id, profile.$id);

  if (compact) {
    return (
      <article
        aria-label={`${profile.name}：${meta.tags.join('、')}`}
        className="flex h-24 items-center gap-3 overflow-hidden rounded-sm border bg-card p-2 shadow-[0_6px_18px_rgba(0,0,0,0.04)]"
      >
        <SmartImage
          src={avatarUrl}
          alt={profile.name}
          wrapperClassName="h-20 w-20 shrink-0 rounded-sm"
          imgClassName="object-cover"
        />
        <div className="flex min-w-0 flex-1 flex-wrap content-center gap-1.5" aria-label={`${profile.name} 的专长`}>
          {meta.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full border px-2.5 py-1 text-[11px] leading-none text-foreground/80"
            >
              {tag}
            </span>
          ))}
        </div>
      </article>
    );
  }

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-sm border bg-card p-4 shadow-[0_8px_24px_rgba(0,0,0,0.06)]">
      <div className="flex items-center justify-between gap-3">
        <span className="rounded-full bg-foreground px-2.5 py-1 text-[10px] font-medium text-background">
          {meta.areas[0]}
        </span>
        <span className="flex items-center overflow-hidden rounded-full border font-mono text-[9px] text-muted-foreground">
          <span className="border-r px-2 py-1">M1</span>
          <span className="bg-muted px-2 py-1">{String(projects.length).padStart(2, '0')} PROJECTS</span>
        </span>
      </div>

      <div className="mt-5">
        <div className="flex items-start justify-between gap-3">
          <h2 className="min-w-0 break-words text-[22px] font-semibold leading-tight">{profile.name}</h2>
          <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
            {String(index + 1).padStart(2, '0')}
          </span>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">{meta.focus}</p>

        <p className="mt-3 text-sm leading-6 text-foreground/70">{meta.description}</p>

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
      </div>

      <div className="relative mt-5 overflow-hidden rounded-sm bg-muted">
        <SmartImage
          src={avatarUrl}
          alt={profile.name}
          wrapperClassName="aspect-[5/4] w-full"
          imgClassName="object-cover"
        />
        <div
          className={cn(
            'absolute bottom-2 left-2 right-2 flex items-center justify-between gap-2',
            'bg-white/90 px-3 py-2 text-[10px] text-black backdrop-blur-sm',
          )}
        >
          <span className="truncate">@{profile.wechat}</span>
          <span className="shrink-0 font-mono">MEMBER {String(index + 1).padStart(2, '0')}</span>
        </div>
      </div>
    </article>
  );
}
