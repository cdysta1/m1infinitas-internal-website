import { useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Copy, Heart, Loader2, Pencil } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { EmptyState } from '@/components/common/EmptyState';
import { SmartImage } from '@/components/common/SmartImage';
import { EditProjectDrawer } from '@/components/project/EditProjectDrawer';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useCopyToClipboard } from '@/hooks/useCopyToClipboard';
import { useFavoriteProjects } from '@/hooks/useFavoriteProjects';
import { useProjectDetail } from '@/hooks/useProjectDetail';
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

function formatProjectDate(value: string): string {
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(value));
}

export function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { copy, copied } = useCopyToClipboard();
  const { project, owner, isLoading: projectLoading } = useProjectDetail(id);
  const {
    entries,
    isLoading: mediaLoading,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useUpdatesTimeline(id);
  const {
    favoriteSet,
    isLoading: favoritesLoading,
    pendingId: favoritePendingId,
    toggleFavorite,
  } = useFavoriteProjects(user?.$id);

  const returnToGallery = () => {
    requestGalleryScrollRestore();
    navigate('/');
  };

  useEffect(() => {
    if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [id]);

  const media = useMemo<ProjectMedia[]>(() => {
    if (!project) return [];
    return collectProjectMediaAssets(project.cover_file_id, entries).map((asset) => ({
      key: asset.source,
      src: buildPreviewUrl(asset.source, 'detail'),
      kind: asset.kind,
    }));
  }, [entries, project]);

  if (projectLoading || !project) {
    return (
      <AppShell showCreate={false} onSwipeBack={returnToGallery}>
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-8 lg:grid-cols-[minmax(0,1.7fr)_minmax(300px,0.72fr)] lg:px-8">
          <div className="aspect-[4/5] animate-pulse bg-muted" />
          <div className="space-y-4">
            <div className="h-3 w-28 animate-pulse bg-muted" />
            <div className="h-10 w-4/5 animate-pulse bg-muted" />
            <div className="h-24 w-full animate-pulse bg-muted" />
          </div>
        </div>
      </AppShell>
    );
  }

  const ownerName = owner?.name ?? '匿名';
  const ownerAvatar = getAvatarUrl(owner?.avatar_file_id, owner?.$id ?? project.owner_id);
  const favorite = favoriteSet.has(project.$id);
  const favoriteBusy = favoritesLoading || favoritePendingId !== null;
  const canEdit = user?.$id === project.owner_id;

  return (
    <AppShell showCreate={false} onSwipeBack={returnToGallery}>
      <div className="border-b">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 lg:px-8">
          <Button
            variant="ghost"
            size="sm"
            onClick={returnToGallery}
            className="-ml-3 gap-2 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            返回首页
          </Button>
          <span className="font-mono text-[9px] uppercase text-muted-foreground">
            Project archive
          </span>
        </div>
      </div>

      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-6 lg:grid-cols-[minmax(0,1.7fr)_minmax(300px,0.72fr)] lg:items-start lg:gap-12 lg:px-8 lg:py-10">
        <section className="order-2 min-w-0 lg:order-1" aria-labelledby="project-media-heading">
          <div className="mb-3 flex items-center justify-between border-b pb-2 font-mono text-[9px] uppercase text-muted-foreground">
            <h2 id="project-media-heading" className="font-normal">
              项目媒体
            </h2>
            <span>{String(media.length).padStart(2, '0')} media</span>
          </div>

          <div className="grid grid-cols-2 items-start gap-2 lg:gap-4">
            {media.map((item, index) => (
              <figure
                key={item.key}
                className={cn(
                  'relative min-w-0 self-start bg-muted',
                  item.kind === 'video' && 'col-span-2',
                )}
              >
                {item.kind === 'video' ? (
                  <video
                    src={item.src}
                    aria-label={`${project.title}，项目视频 ${index + 1}`}
                    className="max-h-[82vh] min-h-40 w-full bg-black object-contain"
                    controls
                    playsInline
                    preload="metadata"
                  />
                ) : (
                  <SmartImage
                    src={item.src}
                    alt={`${project.title}，项目图像 ${index + 1}`}
                    wrapperClassName="w-full min-h-40"
                    imgClassName="h-auto w-full object-contain"
                  />
                )}
                <figcaption className="absolute bottom-2 right-2 bg-background/90 px-2 py-1 font-mono text-[9px] text-foreground backdrop-blur-sm">
                  {String(index + 1).padStart(2, '0')} / {String(media.length).padStart(2, '0')}
                </figcaption>
              </figure>
            ))}

            {mediaLoading && media.length <= 1 && (
              <div className="col-span-2 flex min-h-32 items-center justify-center bg-muted text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span className="sr-only">正在加载项目媒体</span>
              </div>
            )}
          </div>
        </section>

        <aside className="order-1 min-w-0 lg:sticky lg:top-20 lg:order-2">
          <div className="flex items-center justify-between gap-3 border-b pb-3">
            <span className="font-mono text-[9px] uppercase text-muted-foreground">
              Active project
            </span>
            <div className="flex items-center gap-2">
              {canEdit && (
                <EditProjectDrawer
                  project={project}
                  trigger={(
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      aria-label={`编辑项目 ${project.title}`}
                      title="编辑项目"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      编辑
                    </Button>
                  )}
                />
              )}
              <button
                type="button"
                onClick={() => void toggleFavorite(project.$id)}
                disabled={favoriteBusy}
                aria-label={`${favorite ? '取消收藏项目' : '收藏项目'} ${project.title}`}
                aria-pressed={favorite}
                title={favorite ? '取消收藏项目' : '收藏项目'}
                className={cn(
                  'flex h-9 w-9 items-center justify-center rounded-full border transition-[background-color,color,transform] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-90',
                  favorite
                    ? 'border-foreground bg-foreground text-background'
                    : 'border-border text-muted-foreground hover:border-foreground hover:text-foreground',
                  favoriteBusy && 'cursor-wait opacity-50',
                )}
              >
                <Heart className={cn('h-4 w-4', favorite && 'fill-current')} />
              </button>
            </div>
          </div>

          <h1 className="mt-6 text-3xl font-semibold leading-tight text-foreground sm:text-4xl">
            {project.title}
          </h1>
          <p className="mt-5 whitespace-pre-line text-[15px] leading-7 text-muted-foreground">
            {project.summary.slice(0, MAX_PROJECT_SUMMARY_LENGTH)}
          </p>

          <div className="mt-8 border-t pt-5">
            <p className="font-mono text-[9px] uppercase text-muted-foreground">项目负责人</p>
            <div className="mt-3 flex items-center gap-3">
              <Avatar className="h-11 w-11">
                <AvatarImage src={ownerAvatar} alt={ownerName} />
                <AvatarFallback>{ownerName.slice(0, 1).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{ownerName}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">Project lead</p>
              </div>
            </div>
          </div>

          {owner?.wechat && (
            <button
              type="button"
              onClick={() => copy(owner.wechat, '微信号已复制')}
              className="mt-5 flex w-full items-center justify-between gap-4 border-y py-4 text-left transition-colors hover:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label={`复制微信号 ${owner.wechat}`}
            >
              <span>
                <span className="block font-mono text-[9px] uppercase text-muted-foreground">
                  微信
                </span>
                <span className="mt-1 block text-sm font-medium">{owner.wechat}</span>
              </span>
              <Copy className={cn('h-4 w-4', copied && 'text-foreground')} />
            </button>
          )}

          <dl className="mt-5 grid grid-cols-2 gap-x-5 gap-y-4 border-b pb-5">
            <div>
              <dt className="font-mono text-[9px] uppercase text-muted-foreground">媒体</dt>
              <dd className="mt-1 text-sm">{String(media.length).padStart(2, '0')}</dd>
            </div>
            <div>
              <dt className="font-mono text-[9px] uppercase text-muted-foreground">更新日期</dt>
              <dd className="mt-1 text-sm">{formatProjectDate(project.updated_at)}</dd>
            </div>
          </dl>
        </aside>
      </div>
    </AppShell>
  );
}

export function ProjectNotFound() {
  return (
    <AppShell showCreate={false}>
      <EmptyState
        title="项目不存在或已被删除"
        description="返回画廊看看其他项目"
      />
    </AppShell>
  );
}
