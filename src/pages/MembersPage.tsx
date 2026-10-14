import { useI18n } from '@/app/I18nProvider';
import { useMemo, useState } from 'react';
import { flushSync } from 'react-dom';
import { Link } from 'react-router-dom';
import { Minus, Plus, Search } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { DirectoryTabs } from '@/components/layout/DirectoryTabs';
import { MemberCard } from '@/components/members/MemberCard';
import { MemberCategoryFilter } from '@/components/members/MemberCategoryFilter';
import { MemberEmptyState } from '@/components/members/MemberEmptyState';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/useAuth';
import { useFavoriteMembers } from '@/hooks/useFavoriteMembers';
import { useMembersDirectory } from '@/hooks/useMembersDirectory';
import { sortMembers } from '@/lib/memberDirectory';
import { ALL_MEMBERS_CATEGORY_ID, matchesMemberCategories } from '@/lib/memberCategories';
import { cn } from '@/lib/utils';

interface MemberViewTransition {
  finished: Promise<void>;
}

type TransitionDocument = Document & {
  startViewTransition?: (update: () => void) => MemberViewTransition;
};

export function MembersPage() {
  const { t } = useI18n();
  const { user } = useAuth();
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([ALL_MEMBERS_CATEGORY_ID]);
  const [viewMode, setViewMode] = useState<'cards' | 'compact'>('cards');
  const { data: members = [], isLoading, error } = useMembersDirectory();
  const {
    favoriteSet,
    isLoading: favoritesLoading,
    pendingId,
    toggleFavorite,
  } = useFavoriteMembers(user?.$id, members);

  const changeViewMode = (nextMode: 'cards' | 'compact') => {
    if (nextMode === viewMode) return;

    const transitionDocument = document as TransitionDocument;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) {
      setViewMode(nextMode);
      return;
    }

    if (!transitionDocument.startViewTransition) {
      animateMemberLayoutChange(() => setViewMode(nextMode));
      return;
    }

    document.documentElement.classList.add('member-layout-transition');
    const transition = transitionDocument.startViewTransition(() => {
      flushSync(() => setViewMode(nextMode));
    });
    void transition.finished.finally(() => {
      document.documentElement.classList.remove('member-layout-transition');
    });
  };

  const visibleMembers = useMemo(() => {
    return sortMembers(members.filter((member) => matchesMemberCategories(member, selectedCategoryIds)));
  }, [selectedCategoryIds, members]);

  return (
    <AppShell showCreate={false}>
      <DirectoryTabs />
      <div className="mx-auto max-w-6xl px-4 pb-10 pt-4 sm:pt-5">
        <header className="flex items-center justify-between gap-3 border-b pb-4">
          <div className="font-mono text-xs text-muted-foreground">
            {!selectedCategoryIds.includes(ALL_MEMBERS_CATEGORY_ID) && `${String(visibleMembers.length).padStart(2, '0')} / `}
            {String(members.length).padStart(2, '0')} {t('成员')}
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <div
              data-onboarding="member-density"
              className="flex items-center rounded-full border p-0.5"
              role="group"
              aria-label={t('成员卡片显示方式')}
            >
              <button
                type="button"
                onClick={() => changeViewMode('compact')}
                aria-label={t('收缩为条状视图')}
                title={t('收缩为条状视图')}
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
                onClick={() => changeViewMode('cards')}
                aria-label={t('展开为卡片视图')}
                title={t('展开为卡片视图')}
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
              data-onboarding="member-search"
              to="/members/search"
              aria-label={t('搜索成员')}
              title={t('搜索成员')}
              className="flex h-9 w-9 items-center justify-center rounded-full border text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Search className="h-4 w-4" />
            </Link>
          </div>
        </header>

        <MemberCategoryFilter
          members={members}
          selectedIds={selectedCategoryIds}
          onChange={setSelectedCategoryIds}
          showSelections
        />

        {selectedCategoryIds.length === 0 ? (
          <MemberEmptyState kind="unselected" onShowAll={() => setSelectedCategoryIds([ALL_MEMBERS_CATEGORY_ID])} />
        ) : isLoading ? (
          <MembersSkeleton compact={viewMode === 'compact'} />
        ) : error ? (
          <div className="border-y py-14 text-center text-sm text-muted-foreground">{t('成员资料暂时无法加载')}</div>
        ) : visibleMembers.length === 0 ? (
          <MemberEmptyState
            kind={selectedCategoryIds.length > 1 ? 'no-combination' : 'no-results'}
            onReset={() => setSelectedCategoryIds([])}
            onShowAll={() => setSelectedCategoryIds([ALL_MEMBERS_CATEGORY_ID])}
          />
        ) : (
          <div
            className={cn(
              'grid',
              viewMode === 'compact'
                ? 'gap-2 sm:grid-cols-2'
                : 'gap-5 sm:grid-cols-2 lg:grid-cols-3',
            )}
          >
            {visibleMembers.map(({ profile, projects, meta }, index) => (
              <MemberCard
                key={profile.$id}
                index={index}
                profile={profile}
                projects={projects}
                meta={meta}
                compact={viewMode === 'compact'}
                favorite={favoriteSet.has(profile.$id)}
                favoritePending={favoritesLoading || pendingId !== null}
                onFavoriteToggle={() => void toggleFavorite(profile.$id)}
              />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}

function animateMemberLayoutChange(update: () => void) {
  const currentCards = Array.from(
    document.querySelectorAll<HTMLElement>('[data-member-card]'),
  );
  currentCards.forEach((card) => card.getAnimations().forEach((animation) => animation.cancel()));

  const before = new Map(
    currentCards.map((card) => [card.dataset.memberCard ?? '', card.getBoundingClientRect()]),
  );

  flushSync(update);

  document.querySelectorAll<HTMLElement>('[data-member-card]').forEach((card) => {
    const previous = before.get(card.dataset.memberCard ?? '');
    if (!previous) return;

    const next = card.getBoundingClientRect();
    const deltaX = previous.left - next.left;
    const deltaY = previous.top - next.top;
    const scaleX = previous.width / next.width;
    const scaleY = previous.height / next.height;

    card.style.zIndex = '1';
    const animation = card.animate(
      [
        {
          transformOrigin: 'top left',
          transform: `translate(${deltaX}px, ${deltaY}px) scale(${scaleX}, ${scaleY})`,
          opacity: 0.82,
        },
        {
          transformOrigin: 'top left',
          transform: 'translate(0, 0) scale(1, 1)',
          opacity: 1,
        },
      ],
      {
        duration: 440,
        easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
        fill: 'both',
      },
    );
    animation.finished.finally(() => {
      card.style.zIndex = '';
    });
  });
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
