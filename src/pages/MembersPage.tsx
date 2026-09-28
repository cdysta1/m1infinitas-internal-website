import { useMemo, useState } from 'react';
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
          <div className="font-mono text-xs text-muted-foreground">
            {String(members.length).padStart(2, '0')} MEMBERS
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
          <MembersSkeleton />
        ) : error ? (
          <div className="border-y py-14 text-center text-sm text-muted-foreground">
            成员资料暂时无法加载
          </div>
        ) : visibleMembers.length === 0 ? (
          <div className="border-y py-14 text-center text-sm text-muted-foreground">
            这个方向暂时还没有成员
          </div>
        ) : (
          <div className="grid gap-x-4 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
            {visibleMembers.map(({ profile, projects }, index) => (
              <MemberCard
                key={profile.$id}
                index={index}
                profile={profile}
                projects={projects}
                meta={getMemberMeta(profile.$id)}
              />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}

function MembersSkeleton() {
  return (
    <div className="grid gap-x-4 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="overflow-hidden rounded-sm border">
          <Skeleton className="aspect-[4/5] w-full rounded-none" />
          <div className="space-y-3 p-4">
            <Skeleton className="h-5 w-2/5" />
            <Skeleton className="h-3 w-3/5" />
            <Skeleton className="h-14 w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}
