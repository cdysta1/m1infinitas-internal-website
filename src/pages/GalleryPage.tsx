import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Loader2, Plus } from 'lucide-react';
import { useI18n } from '@/app/I18nProvider';
import { AppShell } from '@/components/layout/AppShell';
import { DirectoryTabs } from '@/components/layout/DirectoryTabs';
import { MasonryGrid, MasonrySkeleton } from '@/components/gallery/MasonryGrid';
import { ProjectCard } from '@/components/gallery/ProjectCard';
import { CreateProjectDrawer } from '@/components/compose/CreateProjectDrawer';
import { EmptyState } from '@/components/common/EmptyState';
import { useProjectFavoriteCounts } from '@/components/project/ProjectInteractions';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useFavoriteProjects } from '@/hooks/useFavoriteProjects';
import {
  useProjectsFeed,
  useProjectsRealtime,
  type ProjectStatusFilter,
} from '@/hooks/useProjectsFeed';
import {
  consumeGalleryScrollPosition,
  saveGalleryScrollPosition,
} from '@/lib/galleryScroll';
import { cn } from '@/lib/utils';

type GallerySort = 'latest' | 'hot';

const STATUS_OPTIONS: { id: ProjectStatusFilter; label: string }[] = [
  { id: 'active', label: '进行中' },
  { id: 'done', label: '已结束' },
  { id: 'all', label: '全部' },
];

const SCROLL_FAB_THRESHOLD = 52;

export function GalleryPage() {
  const { t, language } = useI18n();
  const { user } = useAuth();
  const [createOpen, setCreateOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<ProjectStatusFilter>('active');
  const [sortBy, setSortBy] = useState<GallerySort>('latest');
  const [scrolledPastTop, setScrolledPastTop] = useState(() => (
    typeof window !== 'undefined' ? window.scrollY >= SCROLL_FAB_THRESHOLD : false
  ));
  const restoredScrollRef = useRef(false);

  const {
    favoriteSet,
    isLoading: favoriteProjectsLoading,
    pendingId: favoriteProjectPendingId,
    toggleFavorite,
  } = useFavoriteProjects(user?.$id);

  const {
    projects,
    owners,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch,
  } = useProjectsFeed(statusFilter);

  const counts = useProjectFavoriteCounts();

  useProjectsRealtime();

  // When sorting by popularity, load remaining pages so rankings cover the full filtered set.
  useEffect(() => {
    if (sortBy === 'hot' && hasNextPage && !isFetchingNextPage) {
      void fetchNextPage();
    }
  }, [fetchNextPage, hasNextPage, isFetchingNextPage, sortBy]);

  const displayedProjects = useMemo(() => {
    if (sortBy !== 'hot') return projects;
    const map = counts.data ?? {};
    return [...projects].sort(
      (a, b) => (map[b.$id] || 0) - (map[a.$id] || 0) || b.updated_at.localeCompare(a.updated_at),
    );
  }, [counts.data, projects, sortBy]);

  useEffect(() => {
    let frame = 0;
    const onScroll = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        saveGalleryScrollPosition();
        setScrolledPastTop(window.scrollY >= SCROLL_FAB_THRESHOLD);
      });
    };
    setScrolledPastTop(window.scrollY >= SCROLL_FAB_THRESHOLD);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.cancelAnimationFrame(frame);
      saveGalleryScrollPosition();
    };
  }, []);

  useEffect(() => {
    setScrolledPastTop(window.scrollY >= SCROLL_FAB_THRESHOLD);
  }, [statusFilter, displayedProjects.length]);

  useEffect(() => {
    if (isLoading || restoredScrollRef.current) return;
    restoredScrollRef.current = true;
    const savedPosition = consumeGalleryScrollPosition();
    if (savedPosition === null) return;

    let attempts = 0;
    const restore = () => {
      window.scrollTo({ top: savedPosition, behavior: 'auto' });
      attempts += 1;
      if (window.scrollY + 1 < savedPosition && attempts < 6) {
        window.requestAnimationFrame(restore);
      }
    };
    window.requestAnimationFrame(restore);
  }, [isLoading, projects.length]);

  const [sentinel, setSentinel] = useState<HTMLElement | null>(null);
  useEffect(() => {
    if (!sentinel || !hasNextPage) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { rootMargin: '300px 0px' },
    );
    obs.observe(sentinel);
    return () => obs.disconnect();
  }, [sentinel, hasNextPage, isFetchingNextPage, fetchNextPage]);

  const emptyTitle = statusFilter === 'done'
    ? t('还没有已结束的项目')
    : statusFilter === 'all'
      ? t('还没有发布项目')
      : t('还没有进行中的项目');

  return (
    <AppShell
      showCreate={false}
      footer={createPortal(
        <button
          type="button"
          data-onboarding="create-project"
          onClick={() => setCreateOpen(true)}
          aria-label={t('发布项目')}
          title={t('发布项目')}
          aria-haspopup="dialog"
          aria-expanded={createOpen}
          className="create-project-fab fixed bottom-[calc(env(safe-area-inset-bottom)+1.25rem)] right-4 flex h-12 w-12 items-center justify-center rounded-full border-2 border-background bg-foreground text-background shadow-[0_8px_24px_rgba(0,0,0,0.2)] transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:hidden"
          style={{ zIndex: 40 }}
        >
          <Plus strokeWidth={2.2} className="h-5 w-5" />
        </button>,
        document.body,
      )}
    >
      <DirectoryTabs />
      <div className="page-enter relative mx-auto max-w-6xl px-4 py-4 sm:py-6">
        {/* Desktop sticky morphing publish CTA: top capsule at y=0, smoothly shrinks into a circle while scrolling */}
        <div className="pointer-events-none sticky top-[4.5rem] z-20 hidden h-0 justify-end sm:flex">
          <button
            type="button"
            data-onboarding="create-project"
            onClick={() => setCreateOpen(true)}
            aria-label={t('发布项目')}
            title={t('发布项目')}
            aria-haspopup="dialog"
            aria-expanded={createOpen}
            style={{ transitionTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)' }}
            className={cn(
              'pointer-events-auto inline-flex items-center justify-center overflow-hidden rounded-full bg-foreground text-xs font-medium text-background',
              'transition-[height,padding,box-shadow,transform] duration-300 motion-reduce:transition-none',
              'hover:opacity-90 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
              scrolledPastTop
                ? 'h-10 px-2.5 shadow-[0_8px_24px_rgba(0,0,0,0.18)] ring-2 ring-background'
                : 'h-9 px-3.5 shadow-none',
            )}
          >
            <Plus
              strokeWidth={2.2}
              style={{ transitionTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)' }}
              className={cn(
                'shrink-0 transition-[width,height] duration-300 motion-reduce:transition-none',
                scrolledPastTop ? 'h-5 w-5' : 'h-4 w-4',
              )}
            />
            <span
              style={{ transitionTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)' }}
              className={cn(
                'overflow-hidden whitespace-nowrap transition-[max-width,margin,opacity] duration-300 motion-reduce:transition-none',
                scrolledPastTop ? 'ml-0 max-w-0 opacity-0' : 'ml-1.5 max-w-[9.5rem] opacity-100',
              )}
            >
              {t('发布项目')}
            </span>
          </button>
        </div>

        {/* Quiet editorial filter & sort toolbar */}
        <div
          className={cn(
            'mb-5 flex min-h-9 items-center justify-between gap-4 text-xs sm:mb-7',
            language === 'en' ? 'sm:pr-40' : 'sm:pr-32',
          )}
        >
          <div
            role="group"
            data-onboarding="project-filters"
            aria-label={t('按项目状态筛选')}
            className="flex items-center gap-5"
          >
            {STATUS_OPTIONS.map((option) => (
              <button
                key={option.id}
                type="button"
                aria-pressed={statusFilter === option.id}
                onClick={() => setStatusFilter(option.id)}
                className={cn(
                  '-mx-2 inline-flex min-h-9 items-center rounded-lg px-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  statusFilter === option.id
                    ? 'font-medium text-foreground underline decoration-foreground/70 decoration-1 underline-offset-[6px]'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {t(option.label)}
              </button>
            ))}
          </div>

          <div role="group" aria-label={t('项目排序方式')} className="flex items-center gap-2 text-muted-foreground">
            <button
              type="button"
              aria-pressed={sortBy === 'latest'}
              onClick={() => setSortBy('latest')}
              className={cn(
                '-mx-1.5 inline-flex min-h-9 items-center rounded-lg px-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                sortBy === 'latest' ? 'font-medium text-foreground' : 'hover:text-foreground',
              )}
            >
              {t('最新')}
            </button>
            <span aria-hidden className="text-border">/</span>
            <button
              type="button"
              aria-pressed={sortBy === 'hot'}
              onClick={() => setSortBy('hot')}
              className={cn(
                '-mx-1.5 inline-flex min-h-9 items-center rounded-lg px-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                sortBy === 'hot' ? 'font-medium text-foreground' : 'hover:text-foreground',
              )}
            >
              {t('最热')}
            </button>
          </div>
        </div>

        {isLoading ? (
          <MasonrySkeleton count={8} />
        ) : displayedProjects.length === 0 ? (
          <EmptyState
            title={emptyTitle}
            description={statusFilter === 'done' ? t('已标记结束的项目会归档显示在这里。') : t('点击右下角 + 号，发布第一个项目')}
            action={statusFilter === 'done' ? (
              <Button size="sm" variant="outline" onClick={() => setStatusFilter('active')}>
                {t('查看进行中的项目')}
              </Button>
            ) : (
              <Button size="sm" variant="outline" onClick={() => setCreateOpen(true)}>{t('发布项目')}</Button>
            )}
          />
        ) : (
          <div key={`${statusFilter}:${sortBy}`} className="panel-enter">
            <MasonryGrid>
              {displayedProjects.map((p) => (
                <ProjectCard
                  key={p.$id}
                  project={p}
                  owner={p.is_anonymous ? undefined : owners.get(p.owner_id)}
                  pending={!p.cover_file_id}
                  failed={p.summary.startsWith('[发布失败]')}
                  favorite={favoriteSet.has(p.$id)}
                  favoriteCount={counts.data ? counts.data[p.$id] || 0 : undefined}
                  favoritePending={
                    favoriteProjectsLoading || favoriteProjectPendingId !== null
                  }
                  onFavoriteToggle={() => void toggleFavorite(p.$id)}
                />
              ))}
            </MasonryGrid>

            <div ref={setSentinel} className="h-4" aria-hidden />

            {isFetchingNextPage && (
              <div className="mt-6 flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" />{t('加载中…')}</div>
            )}

            {!hasNextPage && displayedProjects.length > 0 && (
              <div className="mt-10 text-center font-mono text-[11px] text-muted-foreground/60">{t('— 到底啦 —')}</div>
            )}
          </div>
        )}

        {!isLoading && displayedProjects.length > 0 && (
          <div className="mt-4 flex justify-center">
            <button
              type="button"
              onClick={() => refetch()}
              className="text-[11px] text-muted-foreground/70 underline-offset-4 hover:text-muted-foreground hover:underline"
            >{t('刷新')}</button>
          </div>
        )}
      </div>

      <CreateProjectDrawer open={createOpen} onOpenChange={setCreateOpen} />
    </AppShell>
  );
}
