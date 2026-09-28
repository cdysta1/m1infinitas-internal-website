import { Fragment, useEffect, useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { MasonryGrid, MasonrySkeleton } from '@/components/gallery/MasonryGrid';
import { ProjectCard } from '@/components/gallery/ProjectCard';
import { VisualInterludeCard } from '@/components/gallery/VisualInterludeCard';
import { CreateProjectDrawer } from '@/components/compose/CreateProjectDrawer';
import { EmptyState } from '@/components/common/EmptyState';
import { Button } from '@/components/ui/button';
import { useProjectsFeed, useProjectsRealtime } from '@/hooks/useProjectsFeed';
import { Loader2 } from 'lucide-react';

const interludeImage = (fileName: string) =>
  new URL(`${import.meta.env.BASE_URL}demo/interludes/${fileName}`, window.location.origin).href;

const visualInterludes = [
  {
    afterProject: 0,
    src: interludeImage('sufra-displaced-objects.png'),
    alt: 'Sufra Displaced Objects 展览海报',
  },
  {
    afterProject: 1,
    src: interludeImage('lavra-poster.png'),
    alt: 'Lavra 实验排版海报',
  },
  {
    afterProject: 3,
    src: interludeImage('pixel-roof.png'),
    alt: '建筑与像素图形拼贴',
  },
  {
    afterProject: 4,
    src: interludeImage('organic-letterforms.png'),
    alt: '黑色背景上的有机字形实验',
  },
] as const;

export function GalleryPage() {
  const [createOpen, setCreateOpen] = useState(false);
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
    <AppShell onCreateClick={() => setCreateOpen(true)}>
      <div className="mx-auto max-w-6xl px-3 py-4 sm:px-4">
        {isLoading ? (
          <MasonrySkeleton count={8} />
        ) : projects.length === 0 ? (
          <EmptyState
            title="还没有进行中的项目"
            description="点击右上角 + 号，发布第一个项目"
            action={
              <Button size="sm" variant="outline" onClick={() => setCreateOpen(true)}>
                发布项目
              </Button>
            }
          />
        ) : (
          <>
            <MasonryGrid>
              {projects.map((p, index) => {
                const interlude = visualInterludes.find((item) => item.afterProject === index);

                return (
                  <Fragment key={p.$id}>
                    <ProjectCard
                      project={p}
                      owner={owners.get(p.owner_id)}
                      // Optimistic cards have empty cover_file_id until uploads finish.
                      pending={!p.cover_file_id}
                      failed={p.summary.startsWith('[发布失败]')}
                    />
                    {interlude && <VisualInterludeCard src={interlude.src} alt={interlude.alt} />}
                  </Fragment>
                );
              })}
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
