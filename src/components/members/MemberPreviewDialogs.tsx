import { Link } from 'react-router-dom';
import { ArrowUpRight, AtSign, Copy, Globe, Mail } from 'lucide-react';
import { useI18n } from '@/app/I18nProvider';
import { SmartImage } from '@/components/common/SmartImage';
import { ProjectStatusBadge } from '@/components/project/ProjectInteractions';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import { useCopyToClipboard } from '@/hooks/useCopyToClipboard';
import { translateMemberLabel } from '@/i18n/memberLabels';
import { buildPreviewUrl, getAvatarUrl } from '@/lib/media';
import type { MemberDirectoryEntry } from '@/lib/memberDirectory';
import { formatRelativeTime } from '@/lib/utils';
import type { Project } from '@/types/models';

export function MemberProjectsDialog({
  open,
  onOpenChange,
  memberName,
  projects,
  currentProjectId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  memberName: string;
  projects: Project[];
  currentProjectId?: string;
}) {
  const { t, language } = useI18n();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-2xl border-0 bg-background p-0 shadow-2xl">
        <header className="border-b bg-muted/40 px-5 py-4 pr-12">
          <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            {t('公开署名项目')} · {String(projects.length).padStart(2, '0')}
          </p>
          <DialogTitle className="mt-1 truncate text-lg font-semibold">
            {memberName}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {t('{name} 发布的公开署名项目列表', { name: memberName })}
          </DialogDescription>
        </header>

        <div className="max-h-[65vh] space-y-2 overflow-y-auto p-4">
          {projects.map((project) => {
            const isCurrent = project.$id === currentProjectId;
            return (
              <Link
                key={project.$id}
                to={`/projects/${project.$id}`}
                onClick={() => onOpenChange(false)}
                className="group flex items-center gap-3.5 rounded-xl bg-muted/35 p-3 transition-colors hover:bg-muted/65 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <SmartImage
                  src={buildPreviewUrl(project.cover_file_id, 'cover')}
                  alt={project.title}
                  wrapperClassName="h-16 w-14 shrink-0 rounded-xl bg-muted ring-1 ring-inset ring-black/[0.04]"
                  imgClassName="object-cover"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <ProjectStatusBadge status={project.status} size="xs" />
                    {isCurrent && (
                      <span className="rounded-full bg-background px-2 py-0.5 text-[10px] text-muted-foreground">
                        {t('当前浏览')}
                      </span>
                    )}
                    <span className="text-[11px] text-muted-foreground">
                      {formatRelativeTime(project.updated_at, language)}
                    </span>
                  </div>
                  <h3 className="mt-1 truncate text-sm font-semibold text-foreground group-hover:underline underline-offset-4">
                    {project.title}
                  </h3>
                  <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                    {project.summary}
                  </p>
                </div>
                <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-foreground" />
              </Link>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function MemberProfileDialog({
  open,
  onOpenChange,
  member,
  wechat,
  currentProjectId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: MemberDirectoryEntry;
  wechat?: string;
  currentProjectId?: string;
}) {
  const { t, language } = useI18n();
  const { copy } = useCopyToClipboard();
  const labelFor = (value: string) => translateMemberLabel(language, value);
  const avatarUrl = getAvatarUrl(member.profile.avatar_file_id, member.profile.$id);
  const resolvedWechat = wechat || member.profile.wechat;
  const publicProjects = member.projects;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg rounded-2xl border-0 bg-background p-0 shadow-2xl">
        <header className="flex items-center gap-4 border-b bg-muted/40 px-5 py-5 pr-12">
          <Avatar className="h-14 w-14 shrink-0 rounded-xl">
            <AvatarImage src={avatarUrl} alt={member.profile.name} className="object-cover" />
            <AvatarFallback className="rounded-xl">
              {member.profile.name.slice(0, 1).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            {member.meta.areas[0] && (
              <span className="inline-block rounded-full bg-foreground px-2.5 py-0.5 text-[10px] font-medium text-background">
                {labelFor(member.meta.areas[0])}
              </span>
            )}
            <DialogTitle className="mt-1 truncate text-xl font-semibold tracking-tight">
              {member.profile.name}
            </DialogTitle>
            {member.meta.focus ? (
              <DialogDescription className="mt-0.5 truncate text-xs text-muted-foreground">
                {labelFor(member.meta.focus)}
              </DialogDescription>
            ) : (
              <DialogDescription className="sr-only">
                {t('成员名片预览')}
              </DialogDescription>
            )}
          </div>
        </header>

        <div className="max-h-[68vh] space-y-5 overflow-y-auto px-5 py-5">
          {member.meta.description && (
            <p className="whitespace-pre-line break-words text-sm leading-6 text-foreground/85">
              {member.meta.description}
            </p>
          )}

          {member.meta.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {member.meta.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-muted/70 px-2.5 py-0.5 text-[11px] text-foreground/80"
                >
                  {labelFor(tag)}
                </span>
              ))}
            </div>
          )}

          {(resolvedWechat || member.meta.contacts.length > 0) && (
            <div className="space-y-2 border-t pt-4">
              {resolvedWechat && (
                <button
                  type="button"
                  onClick={() => void copy(resolvedWechat, t('微信号已复制'))}
                  className="flex w-full items-center justify-between gap-3 rounded-xl bg-muted/45 px-3.5 py-2.5 text-left text-xs transition-colors hover:bg-muted/75"
                >
                  <span className="truncate">
                    <span className="text-muted-foreground">{t('微信号')} · </span>
                    <span className="font-medium text-foreground">{resolvedWechat}</span>
                  </span>
                  <Copy className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                </button>
              )}

              {member.meta.contacts.map((contact) => {
                const Icon = contact.kind === 'email' ? Mail : contact.kind === 'website' ? Globe : AtSign;
                const inner = (
                  <>
                    <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <span className="min-w-0 flex-1 break-words">
                      <span className="text-[11px] text-muted-foreground">{labelFor(contact.label)} · </span>
                      <span className="text-xs text-foreground">{contact.value}</span>
                    </span>
                  </>
                );
                return contact.url ? (
                  <a
                    key={`${contact.label}:${contact.value}`}
                    href={contact.url}
                    target={contact.kind === 'email' ? undefined : '_blank'}
                    rel={contact.kind === 'email' ? undefined : 'noopener noreferrer'}
                    className="flex items-start gap-2 rounded-lg px-1.5 py-1 text-foreground/80 transition-colors hover:bg-muted/40 hover:text-foreground"
                  >
                    {inner}
                  </a>
                ) : (
                  <div key={`${contact.label}:${contact.value}`} className="flex items-start gap-2 px-1.5 py-1 text-foreground/80">
                    {inner}
                  </div>
                );
              })}
            </div>
          )}

          {publicProjects.length > 0 && (
            <div className="space-y-2.5 border-t pt-4">
              <div className="flex items-center justify-between">
                <h3 className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  {t('公开署名项目')} · {String(publicProjects.length).padStart(2, '0')}
                </h3>
              </div>
              <div className="space-y-2">
                {publicProjects.map((project) => (
                  <Link
                    key={project.$id}
                    to={`/projects/${project.$id}`}
                    onClick={() => onOpenChange(false)}
                    className="group flex items-center gap-3 rounded-xl bg-muted/35 p-2.5 transition-colors hover:bg-muted/65"
                  >
                    <SmartImage
                      src={buildPreviewUrl(project.cover_file_id, 'cover')}
                      alt={project.title}
                      wrapperClassName="h-12 w-10 shrink-0 rounded-lg bg-muted ring-1 ring-inset ring-black/[0.04]"
                      imgClassName="object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <ProjectStatusBadge status={project.status} size="xs" />
                        {project.$id === currentProjectId && (
                          <span className="text-[10px] text-muted-foreground">{t('当前浏览')}</span>
                        )}
                      </div>
                      <p className="mt-0.5 truncate text-xs font-semibold text-foreground group-hover:underline underline-offset-4">
                        {project.title}
                      </p>
                    </div>
                    <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>

        <footer className="flex items-center justify-end border-t bg-muted/25 px-5 py-3">
          <Button asChild variant="outline" size="sm" className="gap-1.5 rounded-full">
            <Link
              to={`/members?q=${encodeURIComponent(member.profile.name)}`}
              onClick={() => onOpenChange(false)}
            >
              {t('在成员目录中查看')}
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </footer>
      </DialogContent>
    </Dialog>
  );
}
