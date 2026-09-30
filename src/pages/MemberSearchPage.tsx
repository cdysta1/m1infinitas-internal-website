import { type CSSProperties, useEffect, useMemo, useState } from 'react';
import { flushSync } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Heart, Search, X } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { SmartImage } from '@/components/common/SmartImage';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/useAuth';
import { useFavoriteMembers } from '@/hooks/useFavoriteMembers';
import { useMembersDirectory, type MemberDirectoryEntry } from '@/hooks/useMembersDirectory';
import { getAvatarUrl } from '@/lib/media';
import { getMemberMeta, MEMBER_NAME_ORDER } from '@/lib/memberDirectory';
import { cn } from '@/lib/utils';

const POPULAR_TAGS = [
  '3D 扫描',
  '编辑设计',
  '字体实验',
  '摄影',
  '创意编程',
  '算法艺术',
  '展览设计',
  '动态影像',
] as const;

interface SearchViewTransition {
  finished: Promise<void>;
}

type SearchTransitionDocument = Document & {
  startViewTransition?: (update: () => void) => SearchViewTransition;
};

export function MemberSearchPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const { data: members = [], isLoading, error } = useMembersDirectory();
  const {
    favoriteSet,
    isLoading: favoritesLoading,
    pendingId,
    toggleFavorite,
  } = useFavoriteMembers(user?.$id);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, []);

  const orderedMembers = useMemo(() => sortMembers(members), [members]);
  const results = useMemo(() => {
    const search = query.trim().toLocaleLowerCase();
    return orderedMembers.filter(({ profile }) => {
      const meta = getMemberMeta(profile.$id);
      const matchesTag =
        selectedTags.length === 0 ||
        selectedTags.some((tag) => meta.tags.includes(tag));
      if (!matchesTag) return false;
      if (!search) return true;

      return [
        profile.name,
        profile.wechat,
        meta.focus,
        meta.description,
        ...meta.tags,
        ...meta.areas,
      ].some((value) => value.toLocaleLowerCase().includes(search));
    });
  }, [orderedMembers, query, selectedTags]);

  const hasFilter = Boolean(query.trim() || selectedTags.length > 0);

  const updateTags = (nextTags: string[]) => {
    runSearchResultsTransition(() => setSelectedTags(nextTags));
  };

  const returnToMembers = () => {
    const transitionDocument = document as SearchTransitionDocument;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion || !transitionDocument.startViewTransition) {
      navigate('/members');
      return;
    }

    document.documentElement.classList.add('search-route-transition');
    const transition = transitionDocument.startViewTransition(() => navigate('/members'));
    void transition.finished.finally(() => {
      document.documentElement.classList.remove('search-route-transition');
    });
  };

  return (
    <AppShell showCreate={false} onSwipeBack={returnToMembers}>
      <div className="search-page-enter mx-auto max-w-3xl px-4 pb-12 pt-4 sm:pt-6">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={returnToMembers}
            aria-label="返回成员目录"
            title="返回成员目录"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-sm font-medium">搜索成员</h1>
        </div>

        <label htmlFor="member-search-query" className="sr-only">
          搜索姓名、方向或专长
        </label>
        <div className="mt-5 flex h-12 items-center gap-2 rounded-full bg-muted px-3 transition-shadow focus-within:ring-2 focus-within:ring-ring">
          <Search className="h-5 w-5 shrink-0 text-muted-foreground" />
          <div className="no-scrollbar flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto py-2">
            {selectedTags.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => updateTags(selectedTags.filter((item) => item !== tag))}
                aria-label={`取消筛选：${tag}`}
                title={`取消筛选：${tag}`}
                className="flex h-7 shrink-0 animate-scale-in items-center gap-1 rounded-full bg-foreground px-2.5 text-[11px] text-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <span>{tag}</span>
                <X className="h-3 w-3" />
              </button>
            ))}
            <input
              id="member-search-query"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key !== 'Backspace' || query || selectedTags.length === 0) return;
                updateTags(selectedTags.slice(0, -1));
              }}
              placeholder={selectedTags.length > 0 ? '继续搜索' : '搜索姓名、方向或专长'}
              className="h-8 min-w-[8rem] flex-1 appearance-none border-0 bg-transparent px-1 text-base outline-none placeholder:text-muted-foreground/70 [&::-webkit-search-cancel-button]:hidden sm:text-sm"
            />
          </div>
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="清空搜索"
              title="清空搜索"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-background hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <section className="mt-7" aria-labelledby="popular-tags-heading">
          <h2 id="popular-tags-heading" className="text-lg font-semibold">
            按专长查找
          </h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {POPULAR_TAGS.map((tag) => {
              const active = selectedTags.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  aria-pressed={active}
                  onClick={() =>
                    updateTags(
                      active
                        ? selectedTags.filter((item) => item !== tag)
                        : [...selectedTags, tag],
                    )
                  }
                  className={cn(
                    'h-9 rounded-full border px-3.5 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    active
                      ? 'border-foreground bg-foreground text-background'
                      : 'border-transparent bg-muted text-muted-foreground hover:text-foreground',
                  )}
                >
                  {tag}
                </button>
              );
            })}
          </div>
        </section>

        <section className="mt-8" aria-labelledby="member-results-heading" aria-live="polite">
          <div className="flex items-baseline justify-between gap-4 border-b pb-3">
            <h2 id="member-results-heading" className="text-lg font-semibold">
              {hasFilter ? '搜索结果' : '全部成员'}
            </h2>
            {!isLoading && !error && (
              <span className="font-mono text-[10px] text-muted-foreground">
                {String(results.length).padStart(2, '0')} PEOPLE
              </span>
            )}
          </div>

          {isLoading ? (
            <SearchResultsSkeleton />
          ) : error ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              成员资料暂时无法加载
            </div>
          ) : results.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              没有找到匹配的成员
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 sm:gap-x-5">
              {results.map((member) => (
                <MemberSearchResult
                  key={member.profile.$id}
                  member={member}
                  favorite={favoriteSet.has(member.profile.$id)}
                  favoritePending={favoritesLoading || pendingId !== null}
                  onFavoriteToggle={() => void toggleFavorite(member.profile.$id)}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}

interface MemberSearchResultProps {
  member: MemberDirectoryEntry;
  favorite: boolean;
  favoritePending: boolean;
  onFavoriteToggle: () => void;
}

function MemberSearchResult({
  member,
  favorite,
  favoritePending,
  onFavoriteToggle,
}: MemberSearchResultProps) {
  const { profile } = member;
  const meta = getMemberMeta(profile.$id);
  const transitionStyle = {
    viewTransitionName: `member-search-${profile.$id}`,
  } as CSSProperties;

  return (
    <article
      data-member-search-result={profile.$id}
      style={transitionStyle}
      className="flex gap-3 border-b py-4"
    >
      <SmartImage
        src={getAvatarUrl(profile.avatar_file_id, profile.$id)}
        alt={profile.name}
        wrapperClassName="h-20 w-16 shrink-0 rounded-sm"
        imgClassName="object-cover"
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="break-words text-sm font-semibold">{profile.name}</h3>
            <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{meta.focus}</p>
          </div>
          <button
            type="button"
            onClick={onFavoriteToggle}
            disabled={favoritePending}
            aria-label={favorite ? `取消收藏 ${profile.name}` : `收藏 ${profile.name}`}
            title={favorite ? `取消收藏 ${profile.name}` : `收藏 ${profile.name}`}
            aria-pressed={favorite}
            className={cn(
              'flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition-[color,background-color,transform] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-90 disabled:cursor-wait disabled:opacity-50',
              favorite
                ? 'border-foreground bg-foreground text-background'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <Heart className={cn('h-4 w-4', favorite && 'fill-current')} />
          </button>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {meta.tags.map((tag) => (
            <span key={tag} className="rounded-full bg-muted px-2 py-1 text-[10px] leading-none">
              {tag}
            </span>
          ))}
        </div>
      </div>
    </article>
  );
}

function runSearchResultsTransition(update: () => void) {
  const transitionDocument = document as SearchTransitionDocument;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion) {
    update();
    return;
  }

  if (!transitionDocument.startViewTransition) {
    animateSearchResultsChange(update);
    return;
  }

  document.documentElement.classList.add('member-search-transition');
  const transition = transitionDocument.startViewTransition(() => {
    flushSync(update);
  });
  void transition.finished.finally(() => {
    document.documentElement.classList.remove('member-search-transition');
  });
}

function animateSearchResultsChange(update: () => void) {
  const currentResults = Array.from(
    document.querySelectorAll<HTMLElement>('[data-member-search-result]'),
  );
  const before = new Map(
    currentResults.map((result) => [
      result.dataset.memberSearchResult ?? '',
      result.getBoundingClientRect(),
    ]),
  );

  flushSync(update);

  document.querySelectorAll<HTMLElement>('[data-member-search-result]').forEach((result) => {
    const previous = before.get(result.dataset.memberSearchResult ?? '');
    if (!previous) {
      result.animate(
        [
          { opacity: 0, transform: 'translateY(8px)' },
          { opacity: 1, transform: 'translateY(0)' },
        ],
        { duration: 260, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' },
      );
      return;
    }

    const next = result.getBoundingClientRect();
    result.animate(
      [
        { transform: `translate(${previous.left - next.left}px, ${previous.top - next.top}px)` },
        { transform: 'translate(0, 0)' },
      ],
      { duration: 360, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' },
    );
  });
}

function SearchResultsSkeleton() {
  return (
    <div className="grid sm:grid-cols-2 sm:gap-x-5">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="flex gap-3 border-b py-4">
          <Skeleton className="h-20 w-16 shrink-0 rounded-sm" />
          <div className="flex-1 space-y-2 pt-1">
            <Skeleton className="h-4 w-2/5" />
            <Skeleton className="h-3 w-3/5" />
            <Skeleton className="h-6 w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

function sortMembers(members: MemberDirectoryEntry[]): MemberDirectoryEntry[] {
  return [...members].sort((a, b) => {
    const aIndex = MEMBER_NAME_ORDER.indexOf(a.profile.name as (typeof MEMBER_NAME_ORDER)[number]);
    const bIndex = MEMBER_NAME_ORDER.indexOf(b.profile.name as (typeof MEMBER_NAME_ORDER)[number]);
    const aRank = aIndex < 0 ? Number.MAX_SAFE_INTEGER : aIndex;
    const bRank = bIndex < 0 ? Number.MAX_SAFE_INTEGER : bIndex;
    return aRank - bRank || a.profile.name.localeCompare(b.profile.name);
  });
}
