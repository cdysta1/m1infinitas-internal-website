import { useI18n } from '@/app/I18nProvider';
import { useMemo, useState } from 'react';
import { flushSync } from 'react-dom';
import { Minus, Plus, Search, X } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { DirectoryTabs } from '@/components/layout/DirectoryTabs';
import { MemberCard } from '@/components/members/MemberCard';
import { MemberCategoryFilter } from '@/components/members/MemberCategoryFilter';
import { MemberEmptyState } from '@/components/members/MemberEmptyState';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/useAuth';
import { useFavoriteMembers } from '@/hooks/useFavoriteMembers';
import { useMembersDirectory } from '@/hooks/useMembersDirectory';
import { searchMembers, sortMembers } from '@/lib/memberDirectory';
import { ALL_MEMBERS_CATEGORY_ID, getMemberCategory, matchesMemberCategories, removeMemberCategory } from '@/lib/memberCategories';
import { translateMemberLabel } from '@/i18n/memberLabels';
import { cn } from '@/lib/utils';

interface MemberViewTransition {
  finished: Promise<void>;
}

type TransitionDocument = Document & {
  startViewTransition?: (update: () => void) => MemberViewTransition;
};

export function MembersPage() {
  const { t, language } = useI18n();
  const { user } = useAuth();
  const [query, setQuery] = useState('');
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

  const hasQuery = Boolean(query.trim());
  const hasCriteria = selectedCategoryIds.length > 0 || hasQuery;
  const orderedMembers = useMemo(() => sortMembers(members), [members]);
  const categoryMembers = useMemo(() => {
    return selectedCategoryIds.length === 0 ? orderedMembers
      : orderedMembers.filter((member) => matchesMemberCategories(member, selectedCategoryIds));
  }, [orderedMembers, selectedCategoryIds]);
  const visibleMembers = useMemo(() => {
    return hasCriteria ? searchMembers(categoryMembers, query) : [];
  }, [categoryMembers, hasCriteria, query]);

  const showAllMembers = () => {
    setQuery('');
    setSelectedCategoryIds([ALL_MEMBERS_CATEGORY_ID]);
  };

  const resetCriteria = () => {
    setQuery('');
    setSelectedCategoryIds([]);
  };

  return (
    <AppShell showCreate={false}>
      <DirectoryTabs />
      <div className="mx-auto max-w-6xl px-4 pb-10">
        <div role="search" aria-label={t('搜索成员')} className="sticky top-14 z-20 -mx-4 border-b bg-background/95 px-4 py-3 backdrop-blur">
          <label htmlFor="member-search-query" className="sr-only">{t('搜索姓名、方向或专长')}</label>
          <div data-onboarding="member-search" className="flex h-12 items-center gap-2 rounded-full bg-muted px-3 transition-shadow focus-within:ring-2 focus-within:ring-ring">
            <Search className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
            <div className="no-scrollbar flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto py-2">
              {selectedCategoryIds.map((id) => {
                const label = translateMemberLabel(language, getMemberCategory(id)?.label ?? '');
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setSelectedCategoryIds(removeMemberCategory(selectedCategoryIds, id))}
                    aria-label={t('取消筛选：{category}', { category: label })}
                    title={t('取消筛选：{category}', { category: label })}
                    className="flex h-7 shrink-0 animate-scale-in items-center gap-1 rounded-full bg-foreground px-2.5 text-[11px] text-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <span>{label}</span>
                    <X className="h-3 w-3" aria-hidden />
                  </button>
                );
              })}
              <input
                id="member-search-query"
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.nativeEvent.isComposing) return;
                  if (event.key === 'Escape' && query) {
                    event.preventDefault();
                    setQuery('');
                    return;
                  }
                  if (event.key !== 'Backspace' || query || selectedCategoryIds.length === 0) return;
                  setSelectedCategoryIds(removeMemberCategory(selectedCategoryIds, selectedCategoryIds[selectedCategoryIds.length - 1]));
                }}
                placeholder={selectedCategoryIds.some((id) => id !== ALL_MEMBERS_CATEGORY_ID) ? t('继续搜索') : t('搜索姓名、方向或专长')}
                className="h-8 min-w-[8rem] flex-1 appearance-none border-0 bg-transparent px-1 text-base outline-none placeholder:text-muted-foreground/70 [&::-webkit-search-cancel-button]:hidden sm:text-sm"
              />
            </div>
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                aria-label={t('清空搜索')}
                title={t('清空搜索')}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-background hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            )}
          </div>
        </div>
        <header className="flex items-center justify-between gap-3 border-b py-4">
          <div aria-live="polite" aria-atomic="true" className="font-mono text-xs text-muted-foreground">
            {(!selectedCategoryIds.includes(ALL_MEMBERS_CATEGORY_ID) || hasQuery) && `${String(visibleMembers.length).padStart(2, '0')} / `}
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
          </div>
        </header>

        <MemberCategoryFilter
          members={members}
          selectedIds={selectedCategoryIds}
          onChange={setSelectedCategoryIds}
        />

        {!hasCriteria ? (
          <MemberEmptyState kind="unselected" onShowAll={showAllMembers} />
        ) : isLoading ? (
          <MembersSkeleton compact={viewMode === 'compact'} />
        ) : error ? (
          <div className="border-y py-14 text-center text-sm text-muted-foreground">{t('成员资料暂时无法加载')}</div>
        ) : visibleMembers.length === 0 ? (
          <MemberEmptyState
            kind={selectedCategoryIds.length > 1 && categoryMembers.length === 0 ? 'no-combination' : 'no-results'}
            onReset={resetCriteria}
            onShowAll={showAllMembers}
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
