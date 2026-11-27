import { type CSSProperties, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowUpRight, Check, Copy, Heart, Inbox, LockKeyhole, Send } from 'lucide-react';
import { toast } from 'sonner';
import { useI18n } from '@/app/I18nProvider';
import { useAuth } from '@/hooks/useAuth';
import { useCopyToClipboard } from '@/hooks/useCopyToClipboard';
import { useMembersDirectory } from '@/hooks/useMembersDirectory';
import { translateMemberLabel } from '@/i18n/memberLabels';
import { Button } from '@/components/ui/button';
import { buildPreviewUrl } from '@/lib/media';
import { SmartImage } from '@/components/common/SmartImage';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import {
  countsKey,
  getFavoriteCounts,
  getInboxLastSeenAt,
  INBOX_SEEN_EVENT,
  isSubmissionUnread,
  listSubmissions,
  markInboxSeen,
  sendSubmission,
  submissionsKey,
  type Submission,
  type SubmissionCard,
} from '@/services/projectInteractions';
import type { Project } from '@/types/models';
import type { ProjectStatus } from '@/lib/constants';

export function useProjectFavoriteCounts() {
  const { user } = useAuth();
  return useQuery({
    queryKey: [...countsKey, user?.$id],
    queryFn: getFavoriteCounts,
    enabled: !!user,
    staleTime: 30000,
  });
}

export function useSentSubmissions(enabled = true) {
  const { user } = useAuth();
  return useQuery({
    queryKey: [...submissionsKey, 'sent', user?.$id],
    queryFn: () => listSubmissions(user!.$id, 'sender_id'),
    enabled: !!user && enabled,
    staleTime: 15000,
  });
}

export function useReceivedSubmissions(enabled = true) {
  const { user } = useAuth();
  return useQuery({
    queryKey: [...submissionsKey, 'received', user?.$id],
    queryFn: () => listSubmissions(user!.$id, 'recipient_id'),
    enabled: !!user && enabled,
    refetchInterval: 30000,
  });
}

export function useInboxLastSeen() {
  const { user } = useAuth();
  const userId = user?.$id;
  const [lastSeenAt, setLastSeenAt] = useState<string | null>(() => (
    userId ? getInboxLastSeenAt(userId) : null
  ));

  useEffect(() => {
    setLastSeenAt(userId ? getInboxLastSeenAt(userId) : null);
    if (!userId) return;
    const sync = () => setLastSeenAt(getInboxLastSeenAt(userId));
    window.addEventListener(INBOX_SEEN_EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(INBOX_SEEN_EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, [userId]);

  return lastSeenAt;
}

export function useUnreadSubmissionsCount() {
  const received = useReceivedSubmissions();
  const lastSeenAt = useInboxLastSeen();
  const unreadCount = useMemo(() => {
    const items = received.data ?? [];
    return items.filter((item) => isSubmissionUnread(item, lastSeenAt)).length;
  }, [lastSeenAt, received.data]);
  return { unreadCount, received };
}

export function ProjectStatusBadge({
  status,
  size = 'sm',
  className,
}: {
  status: ProjectStatus;
  size?: 'xs' | 'sm';
  className?: string;
}) {
  const { t } = useI18n();
  const active = status === 'active';
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1.5 font-mono uppercase tracking-wider',
        size === 'xs' ? 'text-[10px]' : 'text-[11px]',
        active ? 'text-foreground' : 'text-muted-foreground',
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          'rounded-full',
          size === 'xs' ? 'h-1.5 w-1.5' : 'h-1.5 w-1.5',
          active ? 'bg-emerald-500' : 'bg-muted-foreground/50',
        )}
      />
      {active ? t('进行中') : t('已完成')}
    </span>
  );
}

const FAVORITE_BURST_OFFSETS = [
  [0, -16], [11, -11], [16, 0], [11, 11],
  [0, 16], [-11, 11], [-16, 0], [-11, -11],
] as const;

export function FavoriteCountButton({
  favorite,
  count,
  onToggle,
  disabled,
  size = 'sm',
  appearance = 'pill',
  className,
  ...rest
}: {
  favorite: boolean;
  count?: number;
  onToggle?: () => void;
  disabled?: boolean;
  size?: 'sm' | 'lg';
  appearance?: 'minimal' | 'pill';
  className?: string;
  'aria-label'?: string;
  title?: string;
  'data-onboarding'?: string;
}) {
  const sequence = useRef(0);
  const [feedback, setFeedback] = useState<{ id: number; kind: 'like' | 'unlike' } | null>(null);

  useEffect(() => {
    if (!feedback) return;
    if (favorite !== (feedback.kind === 'like')) {
      setFeedback(null);
      return;
    }
    const timer = window.setTimeout(() => setFeedback(null), 650);
    return () => window.clearTimeout(timer);
  }, [feedback, favorite]);

  const displayCount = count !== undefined ? count : '—';
  const minimal = appearance === 'minimal';

  return (
    <button
      type="button"
      data-favorite-button
      data-favorite-feedback={feedback?.kind}
      aria-pressed={favorite}
      disabled={disabled || !onToggle}
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => {
        if (disabled || !onToggle || event.defaultPrevented) return;
        event.preventDefault();
        event.stopPropagation();
        setFeedback({ id: ++sequence.current, kind: favorite ? 'unlike' : 'like' });
        onToggle();
      }}
      className={cn(
        'relative isolate inline-flex shrink-0 items-center justify-center tabular-nums transition-[color,border-color,background-color,transform] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-95 disabled:cursor-wait motion-reduce:transition-none motion-reduce:active:scale-100',
        minimal
          ? cn(
              'h-6 gap-1.5 text-xs',
              favorite ? 'text-rose-600' : 'text-muted-foreground hover:text-foreground',
            )
          : cn(
              'rounded-full border font-medium',
              size === 'lg' ? 'h-10 gap-2 px-4 text-sm' : 'h-7 gap-1.5 px-2.5 text-xs',
              favorite
                ? 'border-rose-200 bg-rose-50/70 text-rose-600'
                : 'border-border bg-background text-muted-foreground hover:border-foreground/50 hover:text-foreground',
            ),
        disabled && !feedback && 'opacity-50',
        className,
      )}
      {...rest}
    >
      <span className="relative inline-flex items-center justify-center">
        <span
          key={feedback?.id ?? 'idle'}
          aria-hidden="true"
          className={cn(
            'pointer-events-none relative z-10 inline-flex items-center justify-center',
            feedback?.kind === 'like' && 'favorite-heart-like',
            feedback?.kind === 'unlike' && 'favorite-heart-unlike',
          )}
        >
          <Heart className={cn(size === 'lg' ? 'h-4 w-4' : 'h-3.5 w-3.5', favorite && 'fill-current')} />
        </span>
        {feedback?.kind === 'like' && (
          <span key={`burst-${feedback.id}`} aria-hidden="true" className="favorite-burst pointer-events-none absolute inset-0">
            <span className="favorite-ring" />
            {FAVORITE_BURST_OFFSETS.map(([x, y], index) => (
              <span
                key={index}
                className="favorite-particle"
                style={{ '--favorite-x': `${x}px`, '--favorite-y': `${y}px` } as CSSProperties}
              />
            ))}
          </span>
        )}
      </span>
      <span>{displayCount}</span>
    </button>
  );
}

function ConfirmSubmission({ project, close }: { project: Project; close: () => void }) {
  const { t, language } = useI18n();
  const { user, profile } = useAuth();
  const directory = useMembersDirectory();
  const cache = useQueryClient();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [note, setNote] = useState('');
  const member = directory.data?.find(item => item.accountId === user?.$id);
  const card: SubmissionCard = {
    name: (profile?.name || user?.name || '').trim(), wechat: (profile?.wechat || '').trim(),
    bio: member?.meta.description || '', tags: member?.meta.tags || [], note: note.trim(),
  };
  const directoryReady = directory.isSuccess && !directory.isPlaceholderData;
  const ready = !!user && !!card.name && directoryReady;
  const send = useMutation({
    mutationFn: () => sendSubmission(user!.$id, project.$id, card),
    onSuccess: async () => {
      await cache.invalidateQueries({ queryKey: submissionsKey });
      toast.success(t('已投递'));
      close();
    },
    onError: () => toast.error(t('投递失败，请重试')),
  });
  return <Dialog open onOpenChange={open => { if (!open && !send.isPending) close(); }}>
    <DialogContent className="max-w-[29rem] overflow-y-auto rounded-2xl border-0 p-0 shadow-2xl"
      onOpenAutoFocus={event => { event.preventDefault(); headingRef.current?.focus(); }}>
      <header className="flex items-center gap-4 border-b bg-muted/50 px-5 py-5 pr-12 sm:px-6 sm:pr-12">
        <SmartImage src={project.cover_file_id ? buildPreviewUrl(project.cover_file_id, 'thumb') : undefined} alt=""
          wrapperClassName="h-16 w-14 shrink-0 rounded-lg" imgClassName="object-cover" />
        <div className="min-w-0">
          <p className="mb-1 text-xs text-muted-foreground">{t('投递至项目')}</p>
          <DialogTitle ref={headingRef} tabIndex={-1}
            className="break-words text-xl font-semibold leading-tight tracking-tight outline-none">{project.title}</DialogTitle>
        </div>
      </header>
      <div className="space-y-5 px-5 py-5 sm:px-6">
        <div>
          <DialogDescription className="mb-2 text-xs font-medium">{t('负责人将收到以下资料')}</DialogDescription>
          {ready ? <div className="rounded-xl bg-muted/60 p-4">
            <div className="flex items-center gap-3">
              <span aria-hidden className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-foreground font-serif text-lg text-background">
                {Array.from(card.name)[0]}
              </span>
              <div className="min-w-0">
                <p className="break-words text-base font-semibold leading-tight">{card.name}</p>
                {card.wechat && <p className="mt-1 break-all text-xs text-muted-foreground">{t('微信号')} · {card.wechat}</p>}
              </div>
            </div>
            {card.bio && <p className="mt-3 whitespace-pre-line break-words text-sm leading-relaxed">{card.bio}</p>}
            {card.tags.length > 0 && <ul className="mt-3 flex flex-wrap gap-1.5">{card.tags.map(tag =>
              <li key={tag} className="rounded-full border bg-background px-2 py-0.5 text-[11px]">{translateMemberLabel(language, tag)}</li>)}</ul>}
          </div> : <div className="flex items-center justify-between gap-3 py-3 text-sm">
            <p>{directory.isError || (directoryReady && !card.name) ? t('资料加载失败，请重试') : t('正在加载资料')}</p>
            {directory.isError && <Button type="button" variant="outline" size="sm" onClick={() => void directory.refetch()}>{t('刷新')}</Button>}
          </div>}
        </div>
        <div>
          <div className="mb-2 flex items-baseline justify-between">
            <label htmlFor="submission-message" className="text-sm font-medium">{t('留言（选填）')}</label>
            <span className="text-xs tabular-nums text-muted-foreground">{note.length}/500</span>
          </div>
          <Textarea id="submission-message" rows={2} value={note} maxLength={500} disabled={send.isPending}
            placeholder={t('说说你想怎样参与这个项目…')}
            className="min-h-[68px] rounded-lg text-sm leading-relaxed focus-visible:ring-1"
            onChange={e => setNote(e.target.value)} />
        </div>
      </div>
      <footer className="flex flex-wrap items-center justify-between gap-3 border-t px-5 py-4 sm:px-6">
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><LockKeyhole className="h-3.5 w-3.5" />{t('投递后无法撤回')}</p>
        <div className="ml-auto flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={close} disabled={send.isPending}>{t('取消')}</Button>
          <Button size="sm" className="gap-1.5 rounded-full px-4" disabled={!ready || send.isPending} onClick={() => send.mutate()}>
            {t('确认投递')}<ArrowUpRight className="h-4 w-4" />
          </Button>
        </div>
      </footer>
    </DialogContent>
  </Dialog>;
}

export function ApplyButton({
  project,
  variant = 'minimal',
  className,
  'data-onboarding': onboarding,
}: {
  project: Project;
  variant?: 'minimal' | 'primary';
  className?: string;
  'data-onboarding'?: string;
}) {
  const { t } = useI18n();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const own = project.owner_id === user?.$id;
  const active = project.status === 'active';
  const sent = useSentSubmissions(!!user && !own);
  const alreadySent = sent.data?.some(item => item.project_id === project.$id);

  if (!user || own || !active) return null;

  if (variant === 'minimal') {
    return (
      <>
        <button
          type="button"
          data-onboarding={onboarding ?? 'apply-project'}
          disabled={!!alreadySent || sent.isLoading}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            setOpen(true);
          }}
          className={cn(
            'inline-flex h-6 items-center gap-1 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            alreadySent
              ? 'cursor-default text-muted-foreground/70'
              : 'font-medium text-foreground/75 hover:text-foreground hover:underline underline-offset-4',
            className,
          )}
        >
          {alreadySent ? <Check className="h-3 w-3" /> : <ArrowUpRight className="h-3.5 w-3.5" />}
          <span>{alreadySent ? t('已投递') : t('投递')}</span>
        </button>
        {open && <ConfirmSubmission project={project} close={() => setOpen(false)} />}
      </>
    );
  }

  return (
    <>
      <Button
        type="button"
        data-onboarding={onboarding}
        size="md"
        variant={alreadySent ? 'subtle' : 'default'}
        className={cn(
          'h-10 flex-1 gap-2 rounded-full px-5 text-sm font-medium',
          className,
        )}
        disabled={!!alreadySent || sent.isLoading}
        onPointerDown={(event) => event.stopPropagation()}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setOpen(true);
        }}
      >
        {alreadySent ? <Check className="h-4 w-4" /> : <Send className="h-3.5 w-3.5" />}
        {alreadySent ? t('已投递') : t('投递')}
      </Button>
      {open && <ConfirmSubmission project={project} close={() => setOpen(false)} />}
    </>
  );
}

export function ProjectInteractions({ project }: { project: Project }) {
  const { t } = useI18n();
  const counts = useProjectFavoriteCounts();
  return (
    <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
      <span className="text-xs tabular-nums text-muted-foreground">
        {t('{count} 人收藏', { count: counts.data ? counts.data[project.$id] || 0 : '—' })}
      </span>
      <ApplyButton project={project} variant="minimal" />
    </div>
  );
}

function formatSubmissionTime(created: string, locale: string): string {
  if (!created) return '';
  const date = new Date(created);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleString(locale);
}

function SubmissionItemRow({
  item,
  kind,
  unread = false,
}: {
  item: Submission;
  kind: 'received' | 'sent';
  unread?: boolean;
}) {
  const { t, language, locale } = useI18n();
  const { copy } = useCopyToClipboard();
  const timeText = formatSubmissionTime(item.created, locale);

  return (
    <article
      className={cn(
        'rounded-2xl p-4 transition-colors sm:p-5',
        unread ? 'bg-muted/65' : 'bg-muted/35 hover:bg-muted/50',
      )}
    >
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          {unread && (
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-rose-500" aria-label={t('新')} />
          )}
          <Link
            to={`/projects/${item.project_id}`}
            className="truncate text-sm font-medium text-foreground underline-offset-4 hover:underline"
          >
            {item.project_title || t('未命名项目')}
          </Link>
        </div>
        {timeText && (
          <time dateTime={item.created} className="shrink-0 font-mono text-[11px] tabular-nums text-muted-foreground">
            {timeText}
          </time>
        )}
      </header>

      <div className="mt-2.5 space-y-2.5 text-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5 text-sm">
            <span className="font-semibold text-foreground">
              {kind === 'sent' ? t('投递资料：{name}', { name: item.card.name }) : item.card.name}
            </span>
            {item.card.wechat && (
              <span className="text-xs text-muted-foreground">
                {t('微信号')} · {item.card.wechat}
              </span>
            )}
          </div>

          {kind === 'received' && item.card.wechat && (
            <button
              type="button"
              onClick={() => void copy(item.card.wechat, t('微信号已复制'))}
              className="inline-flex items-center gap-1 rounded-full bg-background/80 px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
            >
              <Copy className="h-3 w-3" />
              {t('复制微信')}
            </button>
          )}
        </div>

        {item.card.bio && (
          <p className="whitespace-pre-line break-words text-[13px] leading-6 text-foreground/80">
            {item.card.bio}
          </p>
        )}

        {item.card.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {item.card.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-background/85 px-2.5 py-0.5 text-[11px] text-foreground/75"
              >
                {translateMemberLabel(language, tag)}
              </span>
            ))}
          </div>
        )}

        {item.card.note && (
          <blockquote className="rounded-xl bg-background/80 px-3.5 py-2.5 text-[13px] leading-6 text-foreground/90">
            <p className="whitespace-pre-line break-words">{item.card.note}</p>
          </blockquote>
        )}
      </div>
    </article>
  );
}

export function SubmissionInbox({
  projectFilterId = null,
  onProjectFilterChange,
  defaultBox = 'received',
  autoMarkSeen = true,
  compactHeader = false,
}: {
  projectFilterId?: string | null;
  onProjectFilterChange?: (projectId: string | null) => void;
  defaultBox?: 'received' | 'sent';
  autoMarkSeen?: boolean;
  compactHeader?: boolean;
} = {}) {
  const { t } = useI18n();
  const { user } = useAuth();
  const [box, setBox] = useState<'received' | 'sent'>(defaultBox);
  const [internalFilter, setInternalFilter] = useState<string | null>(null);
  const activeFilter = onProjectFilterChange ? projectFilterId : internalFilter;
  const setFilter = onProjectFilterChange ?? setInternalFilter;

  const received = useReceivedSubmissions();
  const sent = useSentSubmissions();

  const initialSeenRef = useRef<string | null | undefined>(undefined);
  if (initialSeenRef.current === undefined && user?.$id) {
    initialSeenRef.current = getInboxLastSeenAt(user.$id);
  }

  useEffect(() => {
    if (projectFilterId) setBox('received');
  }, [projectFilterId]);

  useEffect(() => {
    if (!autoMarkSeen || box !== 'received' || !user?.$id || !received.isSuccess) return;
    const latest = received.data[0]?.created;
    markInboxSeen(user.$id, latest);
  }, [autoMarkSeen, box, received.data, received.isSuccess, user?.$id]);

  const receivedItems = received.data ?? [];
  const sentItems = sent.data ?? [];

  const projectFilters = useMemo(() => {
    const map = new Map<string, { id: string; title: string; count: number }>();
    for (const item of receivedItems) {
      const existing = map.get(item.project_id);
      if (existing) existing.count += 1;
      else map.set(item.project_id, { id: item.project_id, title: item.project_title || t('未命名项目'), count: 1 });
    }
    return Array.from(map.values());
  }, [receivedItems, t]);

  const visibleReceived = activeFilter
    ? receivedItems.filter((item) => item.project_id === activeFilter)
    : receivedItems;

  return (
    <section className={compactHeader ? 'space-y-4' : 'mt-10 border-t pt-6 space-y-4'}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div
          role="tablist"
          aria-label={t('投递收件箱')}
          className="flex items-center gap-5 text-xs"
        >
          <button
            type="button"
            role="tab"
            aria-selected={box === 'received'}
            onClick={() => setBox('received')}
            className={cn(
              'py-1 transition-colors',
              box === 'received'
                ? 'font-medium text-foreground underline decoration-foreground/70 decoration-1 underline-offset-[6px]'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {t('收到的投递')}
            {receivedItems.length > 0 && ` · ${receivedItems.length}`}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={box === 'sent'}
            onClick={() => setBox('sent')}
            className={cn(
              'py-1 transition-colors',
              box === 'sent'
                ? 'font-medium text-foreground underline decoration-foreground/70 decoration-1 underline-offset-[6px]'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {t('我发出的投递')}
            {sentItems.length > 0 && ` · ${sentItems.length}`}
          </button>
        </div>

        {box === 'received' && (projectFilters.length > 1 || activeFilter) && (
          <div className="no-scrollbar flex items-center gap-3 overflow-x-auto text-xs">
            <button
              type="button"
              onClick={() => setFilter(null)}
              className={cn(
                'shrink-0 transition-colors',
                !activeFilter ? 'font-medium text-foreground' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {t('全部')}
            </button>
            {projectFilters.map((proj) => (
              <button
                key={proj.id}
                type="button"
                onClick={() => setFilter(activeFilter === proj.id ? null : proj.id)}
                className={cn(
                  'max-w-[12rem] shrink-0 truncate transition-colors',
                  activeFilter === proj.id ? 'font-medium text-foreground' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {proj.title} ({proj.count})
              </button>
            ))}
          </div>
        )}
      </div>

      {box === 'received' ? (
        received.isError ? (
          <div className="rounded-2xl bg-muted/35 px-6 py-12 text-center text-sm text-muted-foreground">
            <p>{t('收件箱加载失败，请重试')}</p>
            <button
              type="button"
              onClick={() => void received.refetch()}
              className="mt-2 text-xs text-foreground underline underline-offset-4"
            >
              {t('刷新')}
            </button>
          </div>
        ) : received.isLoading ? (
          <p className="rounded-2xl bg-muted/35 py-12 text-center text-sm text-muted-foreground">{t('加载中…')}</p>
        ) : visibleReceived.length === 0 ? (
          <div className="rounded-2xl bg-muted/35 px-6 py-14 text-center">
            <Inbox className="mx-auto mb-2.5 h-6 w-6 text-muted-foreground/45" aria-hidden />
            <p className="text-sm font-medium text-foreground/80">
              {activeFilter ? t('该项目还没有收到投递') : t('还没有收到投递')}
            </p>
            {!activeFilter && (
              <p className="mx-auto mt-1.5 max-w-sm text-xs leading-relaxed text-muted-foreground">
                {t('成员向你负责的项目发起投递后，会在这里看到对方的名片与留言。')}
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {visibleReceived.map((item) => (
              <SubmissionItemRow
                key={JSON.stringify([item.sender_id, item.project_id])}
                item={item}
                kind="received"
                unread={isSubmissionUnread(item, initialSeenRef.current ?? null)}
              />
            ))}
          </div>
        )
      ) : sent.isError ? (
        <div className="rounded-2xl bg-muted/35 px-6 py-12 text-center text-sm text-muted-foreground">
          <p>{t('收件箱加载失败，请重试')}</p>
          <button
            type="button"
            onClick={() => void sent.refetch()}
            className="mt-2 text-xs text-foreground underline underline-offset-4"
          >
            {t('刷新')}
          </button>
        </div>
      ) : sent.isLoading ? (
        <p className="rounded-2xl bg-muted/35 py-12 text-center text-sm text-muted-foreground">{t('加载中…')}</p>
      ) : sentItems.length === 0 ? (
        <div className="rounded-2xl bg-muted/35 px-6 py-14 text-center">
          <Send className="mx-auto mb-2.5 h-6 w-6 text-muted-foreground/45" aria-hidden />
          <p className="text-sm font-medium text-foreground/80">{t('还没有发出投递')}</p>
          <p className="mx-auto mt-1.5 max-w-sm text-xs leading-relaxed text-muted-foreground">
            {t('在画廊或项目详情页遇到感兴趣且进行中的项目，可以点击「投递」参与合作。')}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {sentItems.map((item) => (
            <SubmissionItemRow
              key={JSON.stringify([item.sender_id, item.project_id])}
              item={item}
              kind="sent"
            />
          ))}
        </div>
      )}
    </section>
  );
}
