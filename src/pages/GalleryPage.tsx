import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AppShell } from '@/components/layout/AppShell';
import { DirectoryTabs } from '@/components/layout/DirectoryTabs';
import { MasonryGrid, MasonrySkeleton } from '@/components/gallery/MasonryGrid';
import { ProjectCard } from '@/components/gallery/ProjectCard';
import { CreateProjectDrawer } from '@/components/compose/CreateProjectDrawer';
import { EmptyState } from '@/components/common/EmptyState';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useFavoriteProjects } from '@/hooks/useFavoriteProjects';
import { useProjectsFeed, useProjectsRealtime } from '@/hooks/useProjectsFeed';
import {
  consumeGalleryScrollPosition,
  saveGalleryScrollPosition,
} from '@/lib/galleryScroll';
import { Loader2, Plus } from 'lucide-react';

export function GalleryPage() {
  const { user } = useAuth();
  const [createOpen, setCreateOpen] = useState(false);
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
  } = useProjectsFeed();

  // Keep the gallery in sync with server-side changes.
  useProjectsRealtime();

  useEffect(() => {
    let frame = 0;
    const rememberPosition = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(saveGalleryScrollPosition);
    };
    window.addEventListener('scroll', rememberPosition, { passive: true });
    return () => {
      window.removeEventListener('scroll', rememberPosition);
      window.cancelAnimationFrame(frame);
      saveGalleryScrollPosition();
    };
  }, []);

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

  // Infinite scroll sentinel.
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

  return (
    <AppShell
      showCreate={false}
      footer={createPortal(
        <button
          type="button"
          data-onboarding="create-project"
          onClick={() => setCreateOpen(true)}
          aria-label="创建项目"
          title="创建项目"
          className="fixed bottom-[calc(env(safe-area-inset-bottom)+1rem)] right-4 flex h-14 w-14 items-center justify-center rounded-full bg-foreground text-background shadow-[0_10px_30px_rgba(0,0,0,0.24)] transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-[0_14px_34px_rgba(0,0,0,0.3)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 active:scale-95 sm:bottom-6 sm:right-6"
          style={{ zIndex: 40 }}
        >
          <Plus className="h-6 w-6" />
        </button>,
        document.body,
      )}
    >
      <DirectoryTabs />
      <div className="mx-auto max-w-6xl px-3 py-4 sm:px-4">
        {isLoading ? (
          <MasonrySkeleton count={8} />
        ) : projects.length === 0 ? (
          <EmptyState
            title="还没有进行中的项目"
            description="点击右下角 + 号，发布第一个项目"
            action={
              <Button size="sm" variant="outline" onClick={() => setCreateOpen(true)}>
                发布项目
              </Button>
            }
          />
        ) : (
          <>
            <MasonryGrid>
              {projects.map((p) => (
                <ProjectCard
                  key={p.$id}
                  project={p}
                  owner={owners.get(p.owner_id)}
                  // Optimistic cards have empty cover_file_id until uploads finish.
                  pending={!p.cover_file_id}
                  failed={p.summary.startsWith('[发布失败]')}
                  favorite={favoriteSet.has(p.$id)}
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
                <Loader2 className="h-3 w-3 animate-spin" />
                加载中…
              </div>
            )}

            {!hasNextPage && projects.length > 0 && (
              <div className="mt-10 text-center text-[11px] text-muted-foreground/70">
                — 到底啦 —
              </div>
            )}
          </>
        )}

        {/* Pull-to-refresh substitute on desktop: a tiny refresh hint */}
        {!isLoading && projects.length > 0 && (
          <div className="mt-4 flex justify-center">
            <button
              type="button"
              onClick={() => refetch()}
              className="text-[11px] text-muted-foreground/70 underline-offset-4 hover:text-muted-foreground hover:underline"
            >
              刷新
            </button>
          </div>
        )}
      </div>

      <CreateProjectDrawer open={createOpen} onOpenChange={setCreateOpen} />
    </AppShell>
  );
}
