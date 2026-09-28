import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Minus, Plus, Search } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { DirectoryTabs } from '@/components/layout/DirectoryTabs';
import { MemberCard } from '@/components/members/MemberCard';
import { Skeleton } from '@/components/ui/skeleton';
import { useMembersDirectory } from '@/hooks/useMembersDirectory';
import {
  getMemberMeta,
  MEMBER_AREAS,
  MEMBER_NAME_ORDER,
} from '@/lib/memberDirectory';
import { cn } from '@/lib/utils';

export function MembersPage() {
  const [activeArea, setActiveArea] = useState<(typeof MEMBER_AREAS)[number]>('全部');
  const [viewMode, setViewMode] = useState<'cards' | 'compact'>('cards');
  const { data: members = [], isLoading, error } = useMembersDirectory();

  const visibleMembers = useMemo(() => {
    return members
      .filter(({ profile }) => {
        if (activeArea === '全部') return true;
        return getMemberMeta(profile.$id).areas.includes(activeArea);
      })
      .sort((a, b) => {
        const aIndex = MEMBER_NAME_ORDER.indexOf(a.profile.name as (typeof MEMBER_NAME_ORDER)[number]);
        const bIndex = MEMBER_NAME_ORDER.indexOf(b.profile.name as (typeof MEMBER_NAME_ORDER)[number]);
        const aRank = aIndex < 0 ? Number.MAX_SAFE_INTEGER : aIndex;
        const bRank = bIndex < 0 ? Number.MAX_SAFE_INTEGER : bIndex;
        return aRank - bRank || a.profile.name.localeCompare(b.profile.name);
      });
  }, [activeArea, members]);

  return (
    <AppShell showCreate={false}>
      <DirectoryTabs />
      <div className="mx-auto max-w-6xl px-4 pb-10 pt-7 sm:pt-9">
        <header className="flex flex-col justify-between gap-5 border-b pb-7 sm:flex-row sm:items-end">
          <div>
            <p className="font-mono text-[10px] uppercase text-muted-foreground">
              M1 / People Directory
            </p>
            <h1 className="mt-2 text-3xl font-semibold">成员目录</h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
              从创作方向和学科专长认识团队，找到下一次协作需要的人。
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="font-mono text-xs text-muted-foreground">
              {String(members.length).padStart(2, '0')} MEMBERS
            </div>
            <div
              className="flex items-center rounded-full border p-0.5"
              role="group"
              aria-label="成员卡片显示方式"
            >
              <button
                type="button"
                onClick={() => setViewMode('compact')}
                aria-label="收缩为条状视图"
                title="收缩为条状视图"
                aria-pressed={viewMode === 'compact'}
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  viewMode === 'compact'
                    ? 'bg-foreground text-background'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <Minus className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('cards')}
                aria-label="展开为卡片视图"
                title="展开为卡片视图"
                aria-pressed={viewMode === 'cards'}
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  viewMode === 'cards'
                    ? 'bg-foreground text-background'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
            <Link
              to="/members/search"
              aria-label="搜索成员"
              title="搜索成员"
              className="flex h-9 w-9 items-center justify-center rounded-full border text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Search className="h-4 w-4" />
            </Link>
          </div>
        </header>

        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 py-5" aria-label="按学科筛选">
          {MEMBER_AREAS.map((area) => {
            const active = area === activeArea;
            return (
              <button
                key={area}
                type="button"
                onClick={() => setActiveArea(area)}
                aria-pressed={active}
                className={cn(
                  'h-8 shrink-0 rounded-full border px-3 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  active
                    ? 'border-foreground bg-foreground text-background'
                    : 'bg-background text-muted-foreground hover:border-foreground/40 hover:text-foreground',
                )}
              >
                {area}
              </button>
            );
          })}
        </div>

        {isLoading ? (
          <MembersSkeleton compact={viewMode === 'compact'} />
        ) : error ? (
          <div className="border-y py-14 text-center text-sm text-muted-foreground">
            成员资料暂时无法加载
          </div>
        ) : visibleMembers.length === 0 ? (
          <div className="border-y py-14 text-center text-sm text-muted-foreground">
            这个方向暂时还没有成员
          </div>
        ) : (
          <div
            key={viewMode}
            className={cn(
              'grid animate-scale-in motion-reduce:animate-none',
              viewMode === 'compact'
                ? 'gap-2 sm:grid-cols-2'
                : 'gap-5 sm:grid-cols-2 lg:grid-cols-3',
            )}
          >
            {visibleMembers.map(({ profile, projects }, index) => (
              <MemberCard
                key={profile.$id}
                index={index}
                profile={profile}
                projects={projects}
                meta={getMemberMeta(profile.$id)}
                compact={viewMode === 'compact'}
              />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}

function MembersSkeleton({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <div className="grid gap-2 sm:grid-cols-2">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="flex h-24 gap-3 rounded-sm border p-2">
            <Skeleton className="h-20 w-20 shrink-0 rounded-sm" />
            <div className="flex flex-1 flex-wrap content-center gap-2">
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-5 w-20 rounded-full" />
              <Skeleton className="h-5 w-14 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="overflow-hidden rounded-sm border p-4">
          <div className="space-y-3">
            <Skeleton className="h-5 w-2/5" />
            <Skeleton className="h-3 w-3/5" />
            <Skeleton className="h-14 w-full" />
          </div>
          <Skeleton className="mt-5 aspect-[5/4] w-full rounded-sm" />
        </div>
      ))}
    </div>
  );
}
