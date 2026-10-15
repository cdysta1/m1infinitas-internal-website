import { useI18n } from '@/app/I18nProvider';
import { type CSSProperties, useEffect, useRef, useState } from 'react';
import { AtSign, ChevronDown, ChevronUp, Globe, Mail } from 'lucide-react';
import { SmartImage } from '@/components/common/SmartImage';
import { FavoriteButton } from '@/components/common/FavoriteButton';
import { getAvatarUrl } from '@/lib/media';
import type { MemberDirectoryProfile, MemberMeta } from '@/lib/memberDirectory';
import type { Project } from '@/types/models';
import { cn } from '@/lib/utils';
import { translateMemberLabel } from '@/i18n/memberLabels';

interface MemberCardProps {
  index: number;
  profile: MemberDirectoryProfile;
  projects: Project[];
  meta: MemberMeta;
  compact?: boolean;
  favorite?: boolean;
  favoritePending?: boolean;
  onFavoriteToggle?: () => void;
}

export function MemberCard({
  index,
  profile,
  projects,
  meta,
  compact = false,
  favorite = false,
  favoritePending = false,
  onFavoriteToggle,
}: MemberCardProps) {
  const { t, language } = useI18n();
  const labelFor = (value: string) => translateMemberLabel(language, value);
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  const [descriptionOverflows, setDescriptionOverflows] = useState(false);
  const descriptionRef = useRef<HTMLParagraphElement>(null);
  const avatarUrl = getAvatarUrl(profile.avatar_file_id, profile.$id);
  const transitionStyle = {
    viewTransitionName: `member-card-${profile.$id}`,
  } as CSSProperties;

  useEffect(() => {
    const paragraph = descriptionRef.current;
    if (!paragraph || descriptionExpanded) return;
    const measure = () => setDescriptionOverflows(paragraph.scrollHeight > paragraph.clientHeight + 1);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(paragraph);
    return () => observer.disconnect();
  }, [compact, descriptionExpanded, meta.description]);

  if (compact) {
    return (
      <article
        aria-label={`${profile.name}: ${meta.tags.map(labelFor).join(', ')}`}
        data-member-card={profile.$id}
        style={transitionStyle}
        className="relative flex min-h-24 items-center gap-3 overflow-hidden rounded-sm border bg-card p-2 shadow-[0_6px_18px_rgba(0,0,0,0.04)]"
      >
        <SmartImage
          src={avatarUrl}
          alt={profile.name}
          wrapperClassName="h-20 w-20 shrink-0 rounded-sm"
          imgClassName="object-cover"
        />
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-sm font-semibold">{profile.name}</h2>
          <div className="mt-2 flex flex-wrap gap-1.5" aria-label={t('{name} 的专长', { name: profile.name })}>
            {meta.tags.map((tag) => (
              <span
                key={tag}
                className="max-w-full break-words rounded-full border px-2.5 py-1 text-[11px] leading-snug text-foreground/80"
              >
                {labelFor(tag)}
              </span>
            ))}
          </div>
        </div>
        <FavoriteButton
          aria-label={`${favorite ? t('取消收藏') : t('收藏')} ${profile.name}`}
          title={`${favorite ? t('取消收藏') : t('收藏')} ${profile.name}`}
          favorite={favorite}
          disabled={favoritePending}
          onToggle={onFavoriteToggle}
        />
      </article>
    );
  }

  return (
    <article
      data-member-card={profile.$id}
      style={transitionStyle}
      className="relative flex h-full flex-col overflow-hidden rounded-sm border bg-card p-4 shadow-[0_8px_24px_rgba(0,0,0,0.06)]"
    >
      <div className="flex items-center justify-between gap-3">
        <span className="rounded-full bg-foreground px-2.5 py-1 text-[10px] font-medium text-background">
          {labelFor(meta.areas[0] ?? 'M1')}
        </span>
        <div className="flex items-center gap-2">
          <span className="flex items-center overflow-hidden rounded-full border font-mono text-[9px] text-muted-foreground">
            <span className="border-r px-2 py-1">M1</span>
            <span className="bg-muted px-2 py-1">{String(projects.length).padStart(2, '0')} {t('项目')}</span>
          </span>
          <FavoriteButton
            aria-label={`${favorite ? t('取消收藏') : t('收藏')} ${profile.name}`}
            title={`${favorite ? t('取消收藏') : t('收藏')} ${profile.name}`}
            favorite={favorite}
            disabled={favoritePending}
            onToggle={onFavoriteToggle}
          />
        </div>
      </div>

      <div className="mt-5">
        <div className="flex items-start justify-between gap-3">
          <h2 className="min-w-0 break-words text-[22px] font-semibold leading-tight">{profile.name}</h2>
          <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
            {String(index + 1).padStart(2, '0')}
          </span>
        </div>
        {meta.focus && <p className="mt-1 text-xs text-muted-foreground">{labelFor(meta.focus)}</p>}

        {meta.description && (
          <div className="mt-3">
            <p
              ref={descriptionRef}
              id={`member-description-${profile.$id}`}
              className={cn('whitespace-pre-line text-sm leading-6 text-foreground/70', !descriptionExpanded && 'line-clamp-4')}
            >
              {meta.description}
            </p>
            {(descriptionOverflows || descriptionExpanded) && (
              <button
                type="button"
                onClick={() => setDescriptionExpanded((current) => !current)}
                aria-expanded={descriptionExpanded}
                aria-controls={`member-description-${profile.$id}`}
                aria-label={t(descriptionExpanded ? '收起 {name} 的简介' : '展开 {name} 的简介', { name: profile.name })}
                title={descriptionExpanded ? t('收起简介') : t('展开简介')}
                className="mt-1 flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {descriptionExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
            )}
          </div>
        )}

        <div className="mt-4 flex flex-wrap gap-1.5" aria-label={t('{name} 的专长', { name: profile.name })}>
          {meta.tags.map((tag) => (
            <span
              key={tag}
              className="max-w-full break-words rounded-full border px-2.5 py-1 text-[11px] leading-snug text-foreground/80"
            >
              {labelFor(tag)}
            </span>
          ))}
        </div>

        {meta.contacts.length > 0 && (
          <div className="mt-4 space-y-2 border-t pt-3">
            {meta.contacts.map((contact) => {
              const Icon = contact.kind === 'email' ? Mail : contact.kind === 'website' ? Globe : AtSign;
              const content = (
                <>
                  <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span className="min-w-0 break-words">
                    <span className="block text-[10px] text-muted-foreground">{labelFor(contact.label)}</span>
                    <span className="block text-xs">{contact.value}</span>
                  </span>
                </>
              );
              return contact.url ? (
                <a
                  key={`${contact.label}:${contact.value}`}
                  href={contact.url}
                  target={contact.kind === 'email' ? undefined : '_blank'}
                  rel={contact.kind === 'email' ? undefined : 'noopener noreferrer'}
                  className="flex items-start gap-2 text-foreground/70 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {content}
                </a>
              ) : (
                <div key={`${contact.label}:${contact.value}`} className="flex items-start gap-2 text-foreground/70">
                  {content}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="mt-auto pt-5">
        <div className="relative overflow-hidden rounded-sm bg-muted">
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
            <span className="truncate">{profile.wechat ? `@${profile.wechat}` : 'M1 Infinitas'}</span>
            <span className="shrink-0 font-mono">{t('成员 {index}', { index: String(index + 1).padStart(2, '0') })}</span>
          </div>
        </div>
      </div>
    </article>
  );
}
