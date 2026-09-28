import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Search,
  X,
} from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { SmartImage } from '@/components/common/SmartImage';
import { Skeleton } from '@/components/ui/skeleton';
import { useMembersDirectory, type MemberDirectoryEntry } from '@/hooks/useMembersDirectory';
import { buildPreviewUrl, getAvatarUrl } from '@/lib/media';
import { getMemberMeta, MEMBER_NAME_ORDER } from '@/lib/memberDirectory';
import { cn } from '@/lib/utils';
import type { Project } from '@/types/models';

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

export function MemberSearchPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [projectPage, setProjectPage] = useState(0);
  const { data: members = [], isLoading, error } = useMembersDirectory();

  const orderedMembers = useMemo(() => sortMembers(members), [members]);
  const featuredProjects = useMemo(() => {
    const unique = new Map<string, Project>();
    orderedMembers.forEach(({ projects }) => {
      projects.forEach((project) => unique.set(project.$id, project));
    });
    return Array.from(unique.values())
      .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
      .slice(0, 6);
  }, [orderedMembers]);

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

  return (
    <AppShell showCreate={false}>
      <div className="mx-auto max-w-3xl px-4 pb-12 pt-4 sm:pt-6">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/members')}
            aria-label="返回成员目录"
            title="返回成员目录"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <span className="text-sm font-medium">搜索成员</span>
        </div>

        <label className="relative mt-5 block">
          <span className="sr-only">搜索姓名、方向或专长</span>
          <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索姓名、方向或专长"
            className="h-12 w-full rounded-full border-0 bg-muted pl-12 pr-12 text-base outline-none placeholder:text-muted-foreground/70 focus-visible:ring-2 focus-visible:ring-ring sm:text-sm"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="清空搜索"
              title="清空搜索"
              className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground hover:bg-background hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </label>

        <ProjectPager
          projects={featuredProjects}
          page={projectPage}
          onPageChange={setProjectPage}
          isLoading={isLoading}
        />

        <section className="mt-8" aria-labelledby="popular-tags-heading">
          <h1 id="popular-tags-heading" className="text-lg font-semibold">
            按专长查找
          </h1>
          <div className="mt-3 flex flex-wrap gap-2">
            {POPULAR_TAGS.map((tag) => {
              const active = selectedTags.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  aria-pressed={active}
                  onClick={() =>
                    setSelectedTags((current) =>
                      current.includes(tag)
                        ? current.filter((item) => item !== tag)
                        : [...current, tag],
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

        <section className="mt-9" aria-labelledby="member-results-heading" aria-live="polite">
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
                <MemberSearchResult key={member.profile.$id} member={member} />
              ))}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}

interface ProjectPagerProps {
  projects: Project[];
  page: number;
  onPageChange: (page: number) => void;
  isLoading: boolean;
}

function ProjectPager({ projects, page, onPageChange, isLoading }: ProjectPagerProps) {
  if (isLoading) {
    return (
      <div className="mt-5 grid grid-cols-[88px_minmax(0,1fr)] gap-3 sm:grid-cols-[132px_minmax(0,1fr)]">
        <Skeleton className="h-full rounded-sm" />
        <Skeleton className="aspect-[4/3] w-full rounded-sm sm:aspect-[16/9]" />
      </div>
    );
  }

  if (projects.length === 0) return null;

  const safePage = page % projects.length;
  const activeProject = projects[safePage];
  const previousProject = projects[(safePage - 1 + projects.length) % projects.length];
  const goPrevious = () => onPageChange((safePage - 1 + projects.length) % projects.length);
  const goNext = () => onPageChange((safePage + 1) % projects.length);

  return (
    <section className="mt-5" aria-label="项目推荐">
      <div className="grid grid-cols-[88px_minmax(0,1fr)] gap-3 sm:grid-cols-[132px_minmax(0,1fr)]">
        <Link
          to={`/projects/${previousProject.$id}`}
          aria-label={`查看项目：${previousProject.title}`}
          className="group overflow-hidden rounded-sm bg-muted opacity-70 transition-opacity hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <SmartImage
            src={buildPreviewUrl(previousProject.cover_file_id, 'thumb')}
            alt={previousProject.title}
            wrapperClassName="h-full w-full"
            imgClassName="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
          />
        </Link>

        <Link
          to={`/projects/${activeProject.$id}`}
          aria-label={`查看项目：${activeProject.title}`}
          className="group relative block aspect-[4/3] overflow-hidden rounded-sm bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:aspect-[16/9]"
        >
          <SmartImage
            src={buildPreviewUrl(activeProject.cover_file_id, 'cover')}
            alt={activeProject.title}
            wrapperClassName="h-full w-full"
            imgClassName="object-cover transition-transform duration-300 group-hover:scale-[1.015]"
          />
          <span className="absolute bottom-2 left-2 right-2 flex items-end justify-between gap-3 bg-white/90 px-3 py-2 text-black backdrop-blur-sm">
            <span className="line-clamp-2 text-xs font-medium leading-4">{activeProject.title}</span>
            <ArrowUpRight className="h-4 w-4 shrink-0" />
          </span>
        </Link>
      </div>

      <div className="mt-3 flex items-center justify-between gap-4">
        <span className="font-mono text-[10px] text-muted-foreground">
          PROJECTS {String(safePage + 1).padStart(2, '0')} / {String(projects.length).padStart(2, '0')}
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={goPrevious}
            aria-label="上一个项目"
            title="上一个项目"
            className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-1.5 px-1" aria-label="项目分页">
            {projects.map((project, index) => (
              <button
                key={project.$id}
                type="button"
                onClick={() => onPageChange(index)}
                aria-label={`查看第 ${index + 1} 个推荐项目`}
                aria-current={index === safePage ? 'true' : undefined}
                className={cn(
                  'h-1.5 rounded-full transition-[width,background-color] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  index === safePage ? 'w-5 bg-foreground' : 'w-1.5 bg-border hover:bg-muted-foreground',
                )}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={goNext}
            aria-label="下一个项目"
            title="下一个项目"
            className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </section>
  );
}

function MemberSearchResult({ member }: { member: MemberDirectoryEntry }) {
  const { profile, projects } = member;
  const meta = getMemberMeta(profile.$id);

  return (
    <article className="flex gap-3 border-b py-4">
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
          <span className="shrink-0 font-mono text-[9px] text-muted-foreground">
            {projects.length} PROJECTS
          </span>
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
