import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowUpRight, CheckCircle2, Copy, Loader2, Pencil, RotateCcw, Share2 } from 'lucide-react';
import { useI18n } from '@/app/I18nProvider';
import { AppShell } from '@/components/layout/AppShell';
import { EmptyState } from '@/components/common/EmptyState';
import { Lightbox } from '@/components/common/Lightbox';
import { SmartImage } from '@/components/common/SmartImage';
import { MemberProfileDialog } from '@/components/members/MemberPreviewDialogs';
import { EditProjectDrawer } from '@/components/project/EditProjectDrawer';
import { ShareProjectDialog } from '@/components/project/ShareProjectDialog';
import {
  ApplyButton,
  FavoriteCountButton,
  ProjectStatusBadge,
  useProjectFavoriteCounts,
} from '@/components/project/ProjectInteractions';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useCopyToClipboard } from '@/hooks/useCopyToClipboard';
import { useFavoriteProjects } from '@/hooks/useFavoriteProjects';
import { useMembersDirectory } from '@/hooks/useMembersDirectory';
import { useProjectDetail } from '@/hooks/useProjectDetail';
import { useToggleProjectStatus } from '@/hooks/useToggleProjectStatus';
import { useUpdatesTimeline } from '@/hooks/useUpdatesTimeline';
import { MAX_PROJECT_SUMMARY_LENGTH } from '@/lib/constants';
import { requestGalleryScrollRestore } from '@/lib/galleryScroll';
import { buildPreviewUrl, getAvatarUrl } from '@/lib/media';
import {
  collectProjectMediaAssets,
  type ProjectMediaKind,
} from '@/lib/projectMedia';
import { cn } from '@/lib/utils';

interface ProjectMedia {
  key: string;
  src: string;
  kind: ProjectMediaKind;
}

function formatProjectDate(value: string, locale: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

export function ProjectDetailPage() {
  const { t, locale } = useI18n();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { copy, copied } = useCopyToClipboard();
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [ownerDialogOpen, setOwnerDialogOpen] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const { project, owner, isLoading: projectLoading } = useProjectDetail(id);
  const { pendingProjectId: statusPendingId, toggleStatus } = useToggleProjectStatus();
  const { data: members = [] } = useMembersDirectory();
  const {
    entries,
    isLoading: mediaLoading,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useUpdatesTimeline(id, { includeAuthors: false });
  const {
    favoriteSet,
    isLoading: favoritesLoading,
    pendingId: favoritePendingId,
    toggleFavorite,
  } = useFavoriteProjects(user?.$id);
  const counts = useProjectFavoriteCounts();

  const returnToGallery = () => {
    requestGalleryScrollRestore();
    navigate('/');
  };

  useEffect(() => {
    if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
    setLightboxIndex(null);
    setOwnerDialogOpen(false);
    setShareDialogOpen(false);
  }, [id]);

  const media = useMemo<ProjectMedia[]>(() => {
    if (!project) return [];
    return collectProjectMediaAssets(project.cover_file_id, entries, project.owner_id).map((asset) => ({
      key: asset.source,
      src: buildPreviewUrl(asset.source, 'detail'),
      kind: asset.kind,
    }));
  }, [entries, project]);

  const imageSources = useMemo(
    () => media.filter((item) => item.kind === 'image').map((item) => item.src),
    [media],
  );

  const ownerMember = useMemo(() => {
    if (!project || project.is_anonymous) return null;
    return members.find((entry) => entry.accountId === project.owner_id) ?? null;
  }, [members, project]);

  if (!projectLoading && !project) return <ProjectNotFound />;

  if (projectLoading || !project) {
    return (
      <AppShell showCreate={false} onSwipeBack={returnToGallery}>
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-8 md:grid-cols-[minmax(0,1.35fr)_minmax(260px,0.85fr)] lg:grid-cols-[minmax(0,1.65fr)_minmax(300px,0.78fr)]">
          <div className="aspect-[4/5] animate-pulse rounded-xl bg-muted" />
          <div className="space-y-4">
            <div className="h-3 w-24 animate-pulse rounded bg-muted" />
            <div className="h-10 w-4/5 animate-pulse rounded-lg bg-muted" />
            <div className="h-24 w-full animate-pulse rounded-xl bg-muted" />
          </div>
        </div>
      </AppShell>
    );
  }

  const ownerName = project.is_anonymous ? t('匿名') : owner?.name || t('未能加载作者昵称');
  const ownerAvatar = project.is_anonymous ? undefined : getAvatarUrl(owner?.avatar_file_id, owner?.$id ?? project.owner_id);
  const favorite = favoriteSet.has(project.$id);
  const favoriteBusy = favoritesLoading || favoritePendingId !== null;
  const favoriteCount = counts.data ? counts.data[project.$id] || 0 : undefined;
  const canEdit = user?.$id === project.owner_id;
  const isDone = project.status === 'done';
  const coverUrl = project.cover_file_id ? buildPreviewUrl(project.cover_file_id, 'cover') : undefined;
  const updatedDateText = formatProjectDate(project.updated_at, locale);

  const openImageLightbox = (src: string) => {
    const idx = imageSources.indexOf(src);
    if (idx >= 0) setLightboxIndex(idx);
  };

  return (
    <AppShell showCreate={false} onSwipeBack={returnToGallery}>
      <div className="border-b">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={returnToGallery}
            className="-ml-3 gap-2 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />{t('返回首页')}
          </Button>
          <div className="flex items-center gap-3">
            <span className="hidden font-mono text-[9px] uppercase tracking-wider text-muted-foreground sm:inline">
              {t('项目档案')}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShareDialogOpen(true)}
              className="-mr-2 gap-1.5 rounded-full text-muted-foreground hover:text-foreground"
              aria-label={t('分享项目')}
              title={t('分享项目')}
            >
              <Share2 className="h-4 w-4" />
              <span>{t('分享')}</span>
            </Button>
          </div>
        </div>
      </div>

      <div className="page-detail-enter mx-auto grid max-w-6xl gap-8 px-4 py-6 md:grid-cols-[minmax(0,1.35fr)_minmax(260px,0.85fr)] md:items-start md:gap-10 md:py-8 lg:grid-cols-[minmax(0,1.65fr)_minmax(300px,0.78fr)] lg:gap-14 lg:py-10">
        {/* Minimal Exhibition Media */}
        <section className="order-2 min-w-0 md:order-1" aria-labelledby="project-media-heading">
          <div className="mb-3 flex items-center justify-between border-b pb-2 font-mono text-[9px] uppercase text-muted-foreground">
            <h2 id="project-media-heading" className="font-normal">{t('项目媒体')}</h2>
            <span>{String(media.length).padStart(2, '0')} {t('媒体')}</span>
          </div>

          <div
            className={cn(
              'grid items-start gap-3 md:gap-4',
              media.length <= 2 ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2',
            )}
          >
            {media.map((item, index) => (
              <figure
                key={item.key}
                className={cn(
                  'group relative min-w-0 self-start overflow-hidden rounded-xl bg-muted ring-1 ring-inset ring-black/[0.04]',
                  media.length > 2 && (index === 0 || item.kind === 'video') && 'sm:col-span-2',
                )}
              >
                {item.kind === 'video' ? (
                  <video
                    src={item.src}
                    aria-label={t('{name}，项目视频 {index}', { name: project.title, index: index + 1 })}
                    className="max-h-[75dvh] min-h-40 w-full bg-black object-contain sm:max-h-[82dvh]"
                    controls
                    playsInline
                    preload="metadata"
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => openImageLightbox(item.src)}
                    aria-label={t('查看大图：{name}', { name: `${project.title} ${index + 1}` })}
                    className="block w-full cursor-zoom-in text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <SmartImage
                      src={item.src}
                      alt={t('{name}，项目图像 {index}', { name: project.title, index: index + 1 })}
                      wrapperClassName="w-full"
                      loadingClassName="min-h-40"
                      imgClassName="h-auto w-full object-contain"
                    />
                  </button>
                )}
                {media.length > 1 && (
                  <figcaption className="pointer-events-none absolute bottom-2.5 right-2.5 rounded-full bg-background/90 px-2.5 py-0.5 font-mono text-[9px] text-foreground backdrop-blur-sm">
                    {String(index + 1).padStart(2, '0')} / {String(media.length).padStart(2, '0')}
                  </figcaption>
                )}
              </figure>
            ))}

            {mediaLoading && media.length <= 1 && (
              <div className="col-span-full flex min-h-32 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span className="sr-only">{t('正在加载项目媒体')}</span>
              </div>
            )}
          </div>
        </section>

        {/* Minimal Editorial Sidebar */}
        <aside className="order-1 min-w-0 md:sticky md:top-20 md:order-2">
          {/* Mobile horizontal hero: cover left, title & status right */}
          <div className="flex gap-4 md:block">
            {coverUrl && (
              <button
                type="button"
                onClick={() => {
                  if (imageSources.length > 0) setLightboxIndex(0);
                }}
                aria-label={t('查看大图：{name}', { name: project.title })}
                className="relative aspect-[4/5] w-24 shrink-0 overflow-hidden rounded-xl bg-muted ring-1 ring-inset ring-black/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:w-28 md:hidden"
              >
                <SmartImage
                  src={coverUrl}
                  alt={project.title}
                  wrapperClassName="h-full w-full"
                  imgClassName="object-cover"
                />
              </button>
            )}

            <div className="flex min-w-0 flex-1 flex-col justify-between">
              <div>
                <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 border-b pb-2.5">
                  <div className="flex items-center gap-2.5">
                    <ProjectStatusBadge status={project.status} size="xs" />
                    {canEdit && project.is_anonymous && (
                      <span className="font-mono text-[10px] text-muted-foreground">
                        · {t('匿名')}
                      </span>
                    )}
                  </div>
                  <span className="font-mono text-[10px] tabular-nums text-muted-foreground">
                    {updatedDateText}
                  </span>
                </div>

                <h1 className="mt-3 break-words text-xl font-semibold leading-snug tracking-tight text-foreground sm:text-2xl md:mt-4 lg:mt-5 lg:text-3xl">
                  {project.title}
                </h1>
              </div>

              <div className="mt-2.5 flex items-center gap-2 md:hidden">
                <Avatar className="h-5 w-5">
                  <AvatarImage src={ownerAvatar} alt={ownerName} />
                  <AvatarFallback className="text-[9px]">{ownerName.slice(0, 1).toUpperCase()}</AvatarFallback>
                </Avatar>
                <span className="truncate text-xs text-muted-foreground">{ownerName}</span>
              </div>
            </div>
          </div>

          {/* Summary */}
          <p className="mt-5 whitespace-pre-line break-words text-[15px] leading-7 text-muted-foreground">
            {project.summary.slice(0, MAX_PROJECT_SUMMARY_LENGTH)}
          </p>

          {/* Clean Action Row */}
          <div className="mt-6 space-y-2.5">
            <div className="flex items-center gap-3">
              {canEdit ? (
                <EditProjectDrawer
                  project={project}
                  trigger={(
                    <Button
                      variant="default"
                      size="md"
                      className="h-10 flex-1 gap-2 rounded-full px-5 text-sm font-medium"
                      aria-label={t('编辑项目 {name}', { name: project.title })}
                      title={t('编辑项目')}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      {t('编辑项目')}
                    </Button>
                  )}
                />
              ) : isDone ? (
                <p className="flex-1 text-xs text-muted-foreground">
                  {t('项目已结束，已停止投递')}
                </p>
              ) : (
                <ApplyButton project={project} variant="primary" data-onboarding="detail-apply" />
              )}

              <FavoriteCountButton
                size="lg"
                appearance="pill"
                showCount={false}
                favorite={favorite}
                count={favoriteCount}
                onToggle={() => void toggleFavorite(project.$id)}
                disabled={favoriteBusy}
                aria-label={`${favorite ? t('取消收藏项目') : t('收藏项目')} ${project.title}`}
                title={favorite ? t('取消收藏项目') : t('收藏项目')}
              />

              <button
                type="button"
                onClick={() => setShareDialogOpen(true)}
                aria-label={t('分享项目')}
                title={t('分享项目')}
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted/60 text-foreground/70 transition-[background-color,color,transform] hover:bg-muted hover:text-foreground active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Share2 className="h-[18px] w-[18px]" />
              </button>
            </div>

            {canEdit && (
              <button
                type="button"
                onClick={() => void toggleStatus(project)}
                disabled={statusPendingId !== null}
                className="flex h-9 w-full items-center justify-center gap-1.5 rounded-full bg-muted/55 px-4 text-xs font-medium text-foreground/80 transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {statusPendingId === project.$id ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : isDone ? (
                  <RotateCcw className="h-3.5 w-3.5 text-muted-foreground" />
                ) : (
                  <CheckCircle2 className="h-3.5 w-3.5 text-muted-foreground" />
                )}
                <span>{isDone ? t('恢复为进行中') : t('标记为已结束')}</span>
              </button>
            )}
          </div>

          {/* Hairline-separated Owner & Soft WeChat Action */}
          <div className="mt-8 border-t pt-5">
            <p className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
              {t('项目负责人')}
            </p>
            {ownerMember ? (
              <button
                type="button"
                data-onboarding="detail-owner"
                onClick={() => setOwnerDialogOpen(true)}
                className="group -mx-2 mt-2 flex w-[calc(100%+1rem)] items-center gap-3 rounded-xl p-2 text-left transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Avatar className="h-10 w-10 shrink-0">
                  <AvatarImage src={ownerAvatar} alt={ownerName} />
                  <AvatarFallback>{ownerName.slice(0, 1).toUpperCase()}</AvatarFallback>
                </Avatar>
                <span className="min-w-0 flex-1 truncate text-sm font-medium group-hover:underline underline-offset-4">
                  {ownerName}
                </span>
                <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-foreground" />
              </button>
            ) : (
              <div className="mt-3 flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={ownerAvatar} alt={ownerName} />
                  <AvatarFallback>{ownerName.slice(0, 1).toUpperCase()}</AvatarFallback>
                </Avatar>
                <p className="truncate text-sm font-medium">{ownerName}</p>
              </div>
            )}
          </div>

          {!project.is_anonymous && owner?.wechat && (
            <button
              type="button"
              onClick={() => copy(owner.wechat, t('微信号已复制'))}
              className="mt-4 flex w-full items-center justify-between gap-4 rounded-xl bg-muted/45 px-4 py-3.5 text-left transition-colors hover:bg-muted/75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label={t('复制微信号 {id}', { id: owner.wechat })}
            >
              <span className="min-w-0">
                <span className="block font-mono text-[9px] uppercase text-muted-foreground">{t('微信')}</span>
                <span className="mt-1 block truncate text-sm font-medium">{owner.wechat}</span>
              </span>
              <Copy className={cn('h-4 w-4 shrink-0 text-muted-foreground', copied && 'text-foreground')} />
            </button>
          )}
        </aside>
      </div>

      {lightboxIndex !== null && imageSources.length > 0 && (
        <Lightbox
          sources={imageSources}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onIndexChange={setLightboxIndex}
        />
      )}

      {ownerMember && (
        <MemberProfileDialog
          open={ownerDialogOpen}
          onOpenChange={setOwnerDialogOpen}
          member={ownerMember}
          wechat={owner?.wechat}
          currentProjectId={project.$id}
        />
      )}

      <ShareProjectDialog
        open={shareDialogOpen}
        onOpenChange={setShareDialogOpen}
        project={project}
        ownerName={ownerName}
      />
    </AppShell>
  );
}

export function ProjectNotFound() {
  const { t } = useI18n();
  return (
    <AppShell showCreate={false}>
      <EmptyState
        title={t('项目不存在或已被删除')}
        description={t('返回画廊看看其他项目')}
      />
    </AppShell>
  );
}
