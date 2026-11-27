import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Camera, CheckCircle2, Heart, Layers, Loader2, LogOut, Pencil, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { useI18n } from '@/app/I18nProvider';
import { SmartImage } from '@/components/common/SmartImage';
import { FavoriteButton } from '@/components/common/FavoriteButton';
import { AppShell } from '@/components/layout/AppShell';
import { EditProjectDrawer } from '@/components/project/EditProjectDrawer';
import {
  ProjectStatusBadge,
  SubmissionInbox,
  useProjectFavoriteCounts,
  useSentSubmissions,
  useUnreadSubmissionsCount,
} from '@/components/project/ProjectInteractions';
import { MemberCardEditor } from '@/components/members/MemberCardEditor';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/hooks/useAuth';
import { useFavoriteMembers } from '@/hooks/useFavoriteMembers';
import { useFavoriteProjects } from '@/hooks/useFavoriteProjects';
import { membersDirectoryKey, useMembersDirectory } from '@/hooks/useMembersDirectory';
import { useOwnedProjects } from '@/hooks/useOwnedProjects';
import { useToggleProjectStatus } from '@/hooks/useToggleProjectStatus';
import { projectOwnerKey } from '@/hooks/useProjectDetail';
import { projectsFeedKey } from '@/hooks/useProjectsFeed';
import { getProject } from '@/services/projects';
import { createProfile, updateProfile } from '@/services/profiles';
import { uploadMedia } from '@/services/storage';
import { buildPreviewUrl, getAvatarUrl } from '@/lib/media';
import { requestGalleryScrollRestore } from '@/lib/galleryScroll';
import { cn, formatRelativeTime } from '@/lib/utils';
import { translateMemberLabel } from '@/i18n/memberLabels';

type MeTab = 'inbox' | 'projects' | 'favorites' | 'profile';
type OwnedFilter = 'all' | 'active' | 'done';

function parseMeTab(raw: string | null): MeTab {
  if (raw === 'projects' || raw === 'favorites' || raw === 'profile' || raw === 'inbox') {
    return raw;
  }
  return 'inbox';
}

export function MePage() {
  const { t, language, errorText } = useI18n();
  const labelFor = (value: string) => translateMemberLabel(language, value);
  const { user, profile, refreshProfile, logout } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = parseMeTab(searchParams.get('tab'));
  const inboxProjectFilter = searchParams.get('project');
  const [ownedFilter, setOwnedFilter] = useState<OwnedFilter>('all');

  const selectTab = (tab: MeTab, projectId?: string | null) => {
    const next = new URLSearchParams();
    next.set('tab', tab);
    if (tab === 'inbox' && projectId) next.set('project', projectId);
    setSearchParams(next, { replace: true });
  };

  const returnToGallery = () => {
    requestGalleryScrollRestore();
    navigate('/');
  };

  const { data: members = [], isLoading: membersLoading, isSuccess: directoryLoaded, isPlaceholderData } = useMembersDirectory();
  const {
    favoriteIds: favoriteMemberIds,
    isLoading: favoriteMembersLoading,
    pendingId: pendingMemberId,
    toggleFavorite: toggleFavoriteMember,
  } = useFavoriteMembers(user?.$id, members);
  const {
    favoriteIds: favoriteProjectIds,
    isLoading: favoriteProjectsLoading,
    pendingId: pendingProjectId,
    toggleFavorite: toggleFavoriteProject,
  } = useFavoriteProjects(user?.$id);
  const { data: ownedProjects = [], isLoading: ownedProjectsLoading } =
    useOwnedProjects(user?.$id);
  const { pendingProjectId: statusPendingId, toggleStatus } = useToggleProjectStatus();

  const counts = useProjectFavoriteCounts();
  const { unreadCount, received } = useUnreadSubmissionsCount();
  const sent = useSentSubmissions();

  const {
    data: favoriteProjects = [],
    isLoading: favoriteProjectDetailsLoading,
  } = useQuery({
    queryKey: ['projects', 'favorites', favoriteProjectIds],
    queryFn: async () => {
      const results = await Promise.allSettled(
        favoriteProjectIds.map((projectId) => getProject(projectId)),
      );
      return results.flatMap((result) =>
        result.status === 'fulfilled' ? [result.value] : [],
      );
    },
    enabled: favoriteProjectIds.length > 0,
  });

  const [name, setName] = useState(profile?.name ?? '');
  const [wechat, setWechat] = useState(profile?.wechat ?? '');
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!profile) return;
    setName(profile.name ?? '');
    setWechat(profile.wechat ?? '');
  }, [profile]);

  const boundCard = members.find(member => user && member.accountId === user.$id);

  const favoriteMembers = useMemo(
    () =>
      favoriteMemberIds.flatMap((memberId) => {
        const member = members.find(({ profile: memberProfile }) => memberProfile.$id === memberId);
        return member ? [member] : [];
      }),
    [favoriteMemberIds, members],
  );

  const receivedByProject = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of received.data ?? []) {
      map.set(item.project_id, (map.get(item.project_id) ?? 0) + 1);
    }
    return map;
  }, [received.data]);

  const sentProjectIds = useMemo(
    () => new Set((sent.data ?? []).map((item) => item.project_id)),
    [sent.data],
  );

  const activeOwnedCount = useMemo(
    () => ownedProjects.filter((project) => project.status === 'active').length,
    [ownedProjects],
  );
  const doneOwnedCount = ownedProjects.length - activeOwnedCount;

  const visibleOwnedProjects = useMemo(() => {
    if (ownedFilter === 'all') return ownedProjects;
    return ownedProjects.filter((project) => project.status === ownedFilter);
  }, [ownedFilter, ownedProjects]);

  if (!user) {
    return (
      <AppShell showCreate={false} onSwipeBack={returnToGallery}>
        <div className="p-8 text-center text-sm text-muted-foreground">{t('未登录')}</div>
      </AppShell>
    );
  }

  const avatarUrl = getAvatarUrl(profile?.avatar_file_id, user.$id);
  const displayName = profile?.name || user.name || user.email.split('@')[0];
  const initials = (name || user.name || user.email).slice(0, 1).toUpperCase();

  const syncSavedProfile = async (updated: Awaited<ReturnType<typeof updateProfile>>) => {
    queryClient.setQueryData(projectOwnerKey(user.$id), updated);
    await Promise.all([
      refreshProfile(),
      queryClient.invalidateQueries({ queryKey: ['updates', 'timeline'] }),
      queryClient.invalidateQueries({ queryKey: membersDirectoryKey }),
      queryClient.invalidateQueries({ queryKey: projectsFeedKey }),
    ]);
  };

  const trimmedName = name.trim();
  const trimmedWechat = wechat.trim();

  const onPickAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error(t('请选择图片'));
      return;
    }
    if (!profile && (!trimmedName || !trimmedWechat)) {
      toast.error(t('昵称和微信号必填'));
      selectTab('profile');
      return;
    }
    setUploadingAvatar(true);
    try {
      const uploaded = await uploadMedia(file, user.$id);
      const updated = profile
        ? await updateProfile(user.$id, { avatar_file_id: uploaded.fileId })
        : await createProfile(user.$id, {
            name: trimmedName,
            wechat: trimmedWechat,
            avatar_file_id: uploaded.fileId,
          });
      await syncSavedProfile(updated);
      toast.success(t('头像已更新'));
    } catch (err) {
      toast.error(errorText(err, '头像上传失败'));
    } finally {
      setUploadingAvatar(false);
    }
  };

  const onSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trimmedName || !trimmedWechat) {
      toast.error(t('昵称和微信号必填'));
      return;
    }
    setSaving(true);
    try {
      let updated: Awaited<ReturnType<typeof updateProfile>>;
      if (!profile) {
        updated = await createProfile(user.$id, {
          name: trimmedName,
          wechat: trimmedWechat,
        });
      } else {
        const patch = {
          ...(trimmedName !== profile.name && { name: trimmedName }),
          ...(trimmedWechat !== profile.wechat && { wechat: trimmedWechat }),
        };
        if (Object.keys(patch).length === 0) return;
        updated = await updateProfile(user.$id, patch);
      }
      await syncSavedProfile(updated);
      toast.success(t('已保存'));
    } catch (err) {
      toast.error(errorText(err, '保存失败'));
    } finally {
      setSaving(false);
    }
  };

  const dirty = profile
    ? trimmedName !== (profile.name ?? '') || trimmedWechat !== (profile.wechat ?? '')
    : Boolean(trimmedName && trimmedWechat);

  const receivedCount = received.data?.length ?? 0;
  const totalFavoritesCount = favoriteProjects.length + favoriteMembers.length;

  const tabs: { id: MeTab; label: string; count?: number; dot?: boolean }[] = [
    { id: 'inbox', label: '收件箱', count: receivedCount, dot: unreadCount > 0 },
    { id: 'projects', label: '我的项目', count: ownedProjects.length },
    { id: 'favorites', label: '收藏', count: totalFavoritesCount },
    { id: 'profile', label: '资料' },
  ];

  const activeTabIndex = Math.max(0, tabs.findIndex((tab) => tab.id === activeTab));

  return (
    <AppShell showCreate={false} onSwipeBack={returnToGallery}>
      <div className="page-enter mx-auto max-w-4xl px-4 py-6">
        <div className="mb-5 flex items-center">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={returnToGallery}
            className="-ml-3 gap-2 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />{t('返回首页')}
          </Button>
        </div>

        {/* Soft Borderless Identity Surface */}
        <header className="flex flex-col gap-5 rounded-2xl bg-muted/45 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div className="flex min-w-0 items-center gap-4">
            <button
              type="button"
              onClick={() => avatarInputRef.current?.click()}
              className="group relative shrink-0"
              aria-label={t('更换头像')}
              disabled={uploadingAvatar}
            >
              <Avatar className="h-16 w-16 ring-2 ring-background">
                <AvatarImage src={avatarUrl} alt={displayName} />
                <AvatarFallback className="text-lg">{initials}</AvatarFallback>
              </Avatar>
              <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/45 text-white opacity-0 transition-opacity group-hover:opacity-100 [@media(hover:none)]:opacity-100">
                {uploadingAvatar ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Camera className="h-4 w-4" />
                )}
              </span>
            </button>
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={onPickAvatar}
            />

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="truncate text-xl font-semibold tracking-tight">{displayName}</h1>
                {boundCard && (
                  <span className="rounded-full bg-background/85 px-2.5 py-0.5 text-[11px] text-muted-foreground">
                    {t('已绑定名片：{name}', { name: boundCard.profile.name })}
                  </span>
                )}
              </div>
              <p className="mt-1 truncate text-xs text-muted-foreground">
                {user.email}
                {profile?.wechat && ` · ${t('微信号')} ${profile.wechat}`}
              </p>
            </div>
          </div>

          <div className="hidden flex-wrap items-center gap-x-4 gap-y-2 text-xs sm:flex sm:shrink-0">
            <button
              type="button"
              onClick={() => selectTab('inbox')}
              className="group inline-flex min-h-9 items-baseline gap-1.5 rounded-lg px-1.5 py-1.5 text-left transition-colors hover:bg-background/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="font-mono text-base font-semibold tabular-nums text-foreground">
                {receivedCount}
              </span>
              <span className="text-muted-foreground group-hover:text-foreground">
                {t('收到')}
              </span>
              {unreadCount > 0 && (
                <span className="h-1.5 w-1.5 self-center rounded-full bg-rose-500" aria-hidden />
              )}
            </button>
            <span aria-hidden className="text-border">·</span>
            <button
              type="button"
              onClick={() => selectTab('projects')}
              className="group inline-flex min-h-9 items-baseline gap-1.5 rounded-lg px-1.5 py-1.5 text-left transition-colors hover:bg-background/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="font-mono text-base font-semibold tabular-nums text-foreground">
                {ownedProjects.length}
              </span>
              <span className="text-muted-foreground group-hover:text-foreground">
                {t('项目')}
              </span>
            </button>
            <span aria-hidden className="text-border">·</span>
            <button
              type="button"
              onClick={() => selectTab('favorites')}
              className="group inline-flex min-h-9 items-baseline gap-1.5 rounded-lg px-1.5 py-1.5 text-left transition-colors hover:bg-background/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="font-mono text-base font-semibold tabular-nums text-foreground">
                {totalFavoritesCount}
              </span>
              <span className="text-muted-foreground group-hover:text-foreground">
                {t('收藏')}
              </span>
            </button>
          </div>
        </header>

        {/* Soft Borderless Segmented Tab Bar with smooth sliding indicator */}
        <nav
          data-onboarding="me-tabs"
          aria-label={t('个人看板分区')}
          className="relative mt-5 grid grid-cols-4 rounded-2xl bg-muted/50 p-1.5"
        >
          <span
            aria-hidden
            className="pointer-events-none absolute inset-y-1.5 left-1.5 rounded-xl bg-background shadow-sm transition-transform duration-300 motion-reduce:transition-none"
            style={{
              width: 'calc((100% - 0.75rem) / 4)',
              transform: `translateX(${activeTabIndex * 100}%)`,
              transitionTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)',
            }}
          />
          {tabs.map((tab) => {
            const selected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                aria-current={selected ? 'page' : undefined}
                onClick={() => selectTab(tab.id)}
                className={cn(
                  'relative z-10 flex min-h-11 items-center justify-center gap-1 rounded-xl px-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:min-h-10 sm:gap-1.5 sm:px-3 sm:text-sm',
                  language === 'en' ? 'text-xs' : 'text-[13px]',
                  selected
                    ? 'font-medium text-foreground'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <span className="truncate">{t(tab.label)}</span>
                {tab.count !== undefined && tab.count > 0 && (
                  <span
                    className={cn(
                      'shrink-0 font-mono text-[10px] tabular-nums sm:text-[11px]',
                      selected ? 'text-foreground/70' : 'text-muted-foreground/80',
                    )}
                  >
                    {tab.count}
                  </span>
                )}
                {tab.dot && (
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-rose-500" aria-hidden />
                )}
              </button>
            );
          })}
        </nav>

        <div key={activeTab} className="panel-enter">
        {/* Tab 1: Inbox */}
        {activeTab === 'inbox' && (
          <div className="mt-6">
            <SubmissionInbox
              compactHeader
              projectFilterId={inboxProjectFilter}
              onProjectFilterChange={(projectId) => selectTab('inbox', projectId)}
            />
          </div>
        )}

        {/* Tab 2: My Projects */}
        {activeTab === 'projects' && (
          <section className="mt-6 space-y-4" aria-labelledby="published-projects-heading">
            <div className="flex items-center justify-between gap-4">
              <h2 id="published-projects-heading" className="sr-only">{t('已发布项目')}</h2>
              <div className="flex flex-wrap items-center gap-2">
                {([
                  { id: 'all', label: '全部', count: ownedProjects.length },
                  { id: 'active', label: '进行中', count: activeOwnedCount },
                  { id: 'done', label: '已完成', count: doneOwnedCount },
                ] as const).map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    aria-pressed={ownedFilter === option.id}
                    onClick={() => setOwnedFilter(option.id)}
                    className={cn(
                      'inline-flex min-h-9 items-center gap-1.5 rounded-full px-3.5 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      ownedFilter === option.id
                        ? 'bg-foreground font-medium text-background'
                        : 'bg-muted/45 text-muted-foreground hover:bg-muted hover:text-foreground',
                    )}
                  >
                    <span>{t(option.label)}</span>
                    <span className="font-mono text-[11px] opacity-75 tabular-nums">{option.count}</span>
                  </button>
                ))}
              </div>
            </div>

            {ownedProjectsLoading ? (
              <div className="flex items-center justify-center rounded-2xl bg-muted/35 py-12 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span className="sr-only">{t('正在加载发布项目')}</span>
              </div>
            ) : visibleOwnedProjects.length === 0 ? (
              <div className="rounded-2xl bg-muted/35 px-6 py-14 text-center">
                <Layers className="mx-auto mb-2.5 h-6 w-6 text-muted-foreground/45" aria-hidden />
                <p className="text-sm text-muted-foreground">
                  {ownedFilter === 'done'
                    ? t('还没有已完成的项目')
                    : ownedFilter === 'active'
                      ? t('还没有进行中的项目')
                      : t('还没有发布项目')}
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {visibleOwnedProjects.map((project) => {
                  const favCount = counts.data ? counts.data[project.$id] || 0 : 0;
                  const subCount = receivedByProject.get(project.$id) ?? 0;
                  const statusUpdating = statusPendingId === project.$id;
                  const isActive = project.status === 'active';
                  return (
                    <article
                      key={project.$id}
                      className="flex flex-col gap-3 rounded-2xl bg-muted/35 p-3.5 transition-colors hover:bg-muted/55 sm:flex-row sm:items-center sm:gap-4 sm:px-4"
                    >
                      <div className="flex min-w-0 flex-1 items-center gap-3.5 sm:gap-4">
                        <Link
                          to={`/projects/${project.$id}`}
                          className="shrink-0 overflow-hidden rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          <SmartImage
                            src={buildPreviewUrl(project.cover_file_id, 'cover')}
                            alt={project.title}
                            wrapperClassName="h-16 w-14 rounded-xl bg-muted ring-1 ring-inset ring-black/[0.04]"
                            imgClassName="object-cover"
                          />
                        </Link>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                            <ProjectStatusBadge status={project.status} size="xs" />
                            {project.is_anonymous && (
                              <span>· {t('匿名')}</span>
                            )}
                            <span>· {formatRelativeTime(project.updated_at, language)}</span>
                          </div>

                          <Link
                            to={`/projects/${project.$id}`}
                            className="mt-1 block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          >
                            <h3 className="truncate text-sm font-semibold text-foreground">{project.title}</h3>
                            <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                              {project.summary}
                            </p>
                          </Link>

                          <div className="mt-1.5 flex items-center gap-3 text-xs text-muted-foreground">
                            <span className="tabular-nums">{t('{count} 人收藏', { count: favCount })}</span>
                            <span aria-hidden>·</span>
                            <button
                              type="button"
                              onClick={() => selectTab('inbox', project.$id)}
                              className="text-foreground/80 underline-offset-4 hover:text-foreground hover:underline"
                            >
                              {t('{count} 份投递', { count: subCount })}
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-2 border-t border-border/40 pt-2.5 sm:shrink-0 sm:border-t-0 sm:pt-0">
                        <button
                          type="button"
                          onClick={() => void toggleStatus(project)}
                          disabled={statusPendingId !== null}
                          aria-label={isActive ? `${t('标记为已完成')} ${project.title}` : `${t('恢复为进行中')} ${project.title}`}
                          className="inline-flex h-8 items-center gap-1.5 rounded-full bg-background/85 px-3 text-xs font-medium text-foreground/80 transition-colors hover:bg-background hover:text-foreground disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          {statusUpdating ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : isActive ? (
                            <CheckCircle2 className="h-3.5 w-3.5 text-muted-foreground" />
                          ) : (
                            <RotateCcw className="h-3.5 w-3.5 text-muted-foreground" />
                          )}
                          <span>{isActive ? t('标记完成') : t('恢复进行中')}</span>
                        </button>

                        <EditProjectDrawer
                          project={project}
                          trigger={(
                            <button
                              type="button"
                              data-onboarding="edit-project"
                              aria-label={t('编辑项目 {name}', { name: project.title })}
                              title={t('编辑项目')}
                              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-background/85 text-muted-foreground transition-colors hover:bg-background hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                          )}
                        />
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* Tab 3: Favorites */}
        {activeTab === 'favorites' && (
          <div className="mt-6 space-y-8">
            <section aria-labelledby="favorite-projects-heading">
              <div className="flex items-baseline justify-between gap-4 pb-3">
                <h2 id="favorite-projects-heading" className="text-sm font-medium">{t('已收藏项目')}</h2>
                <span className="font-mono text-[10px] text-muted-foreground">
                  {String(favoriteProjects.length).padStart(2, '0')}
                </span>
              </div>

              {favoriteProjectsLoading || favoriteProjectDetailsLoading ? (
                <div className="flex items-center justify-center rounded-2xl bg-muted/35 py-10 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span className="sr-only">{t('正在加载收藏项目')}</span>
                </div>
              ) : favoriteProjects.length === 0 ? (
                <div className="rounded-2xl bg-muted/35 px-6 py-12 text-center">
                  <Heart className="mx-auto mb-2 h-5 w-5 text-muted-foreground/45" aria-hidden />
                  <p className="text-sm text-muted-foreground">{t('还没有收藏项目')}</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {favoriteProjects.map((project) => (
                    <article
                      key={project.$id}
                      className="flex items-center gap-3.5 rounded-2xl bg-muted/35 p-3 transition-colors hover:bg-muted/55 sm:px-4"
                    >
                      <Link
                        to={`/projects/${project.$id}`}
                        className="shrink-0 overflow-hidden rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <SmartImage
                          src={buildPreviewUrl(project.cover_file_id, 'cover')}
                          alt={project.title}
                          wrapperClassName="h-14 w-12 rounded-xl bg-muted ring-1 ring-inset ring-black/[0.04]"
                          imgClassName="object-cover"
                        />
                      </Link>
                      <Link
                        to={`/projects/${project.$id}`}
                        className="min-w-0 flex-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                          <ProjectStatusBadge status={project.status} size="xs" />
                          {sentProjectIds.has(project.$id) && (
                            <span>· {t('已投递')}</span>
                          )}
                        </div>
                        <h3 className="mt-0.5 truncate text-sm font-medium">{project.title}</h3>
                      </Link>
                      <FavoriteButton
                        favorite
                        onToggle={() => void toggleFavoriteProject(project.$id)}
                        disabled={pendingProjectId !== null}
                        aria-label={t('取消收藏项目 {name}', { name: project.title })}
                        title={t('取消收藏项目 {name}', { name: project.title })}
                        className="h-8 w-8"
                      />
                    </article>
                  ))}
                </div>
              )}
            </section>

            <section aria-labelledby="favorite-members-heading">
              <div className="flex items-baseline justify-between gap-4 pb-3">
                <h2 id="favorite-members-heading" className="text-sm font-medium">{t('收藏成员')}</h2>
                <span className="font-mono text-[10px] text-muted-foreground">
                  {String(favoriteMembers.length).padStart(2, '0')}
                </span>
              </div>

              {membersLoading || favoriteMembersLoading ? (
                <div className="flex items-center justify-center rounded-2xl bg-muted/35 py-10 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span className="sr-only">{t('正在加载收藏成员')}</span>
                </div>
              ) : favoriteMembers.length === 0 ? (
                <div className="rounded-2xl bg-muted/35 px-6 py-12 text-center">
                  <Heart className="mx-auto mb-2 h-5 w-5 text-muted-foreground/45" aria-hidden />
                  <p className="text-sm text-muted-foreground">{t('还没有收藏成员')}</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {favoriteMembers.map(({ profile: memberProfile, meta }) => (
                    <article
                      key={memberProfile.$id}
                      className="flex items-center gap-3.5 rounded-2xl bg-muted/35 p-3 transition-colors hover:bg-muted/55 sm:px-4"
                    >
                      <SmartImage
                        src={getAvatarUrl(memberProfile.avatar_file_id, memberProfile.$id)}
                        alt={memberProfile.name}
                        wrapperClassName="h-12 w-12 shrink-0 rounded-xl bg-muted ring-1 ring-inset ring-black/[0.04]"
                        imgClassName="object-cover"
                      />
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate text-sm font-medium">{memberProfile.name}</h3>
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">{labelFor(meta.focus)}</p>
                      </div>
                      <FavoriteButton
                        favorite
                        onToggle={() => void toggleFavoriteMember(memberProfile.$id)}
                        disabled={pendingMemberId !== null}
                        aria-label={t('取消收藏 {name}', { name: memberProfile.name })}
                        title={t('取消收藏 {name}', { name: memberProfile.name })}
                        className="h-8 w-8"
                      />
                    </article>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}

        {/* Tab 4: Profile & Member Card */}
        {activeTab === 'profile' && (
          <div className="mt-6">
            {boundCard && profile?.$id === user.$id ? (
              <div className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2 md:items-start">
                  <section className="rounded-2xl bg-muted/40 p-5 sm:p-6">
                    <h2 className="text-base font-semibold">{t('账号信息')}</h2>
                    <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                      {t('我的卡片已绑定至「{name}」。修改昵称或头像后，人员页会同步显示。', { name: boundCard.profile.name })}
                    </p>

                    <form onSubmit={onSave} className="mt-5 space-y-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="me-name">{t('昵称')}</Label>
                        <Input
                          id="me-name"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          maxLength={64}
                          disabled={saving}
                          className="bg-background"
                          required
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="me-wechat">{t('微信号')}</Label>
                        <Input
                          id="me-wechat"
                          value={wechat}
                          onChange={(e) => setWechat(e.target.value)}
                          maxLength={64}
                          disabled={saving}
                          className="bg-background"
                          required
                        />
                      </div>

                      <Button
                        type="submit"
                        size="lg"
                        className="w-full rounded-full"
                        disabled={!dirty || saving}
                      >
                        {saving ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />{t('保存中…')}
                          </>
                        ) : (
                          t('保存')
                        )}
                      </Button>
                    </form>
                  </section>

                  <section className="rounded-2xl bg-muted/40 p-5 sm:p-6">
                    <div className="[&>form]:mt-0 [&>form]:border-t-0 [&>form]:pt-0 [&_input]:bg-background [&_textarea]:bg-background [&_details]:bg-background/80">
                      <MemberCardEditor key={user.$id} member={boundCard} />
                    </div>
                  </section>
                </div>

                <div className="flex justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="rounded-full px-4 text-muted-foreground hover:text-foreground"
                    onClick={async () => {
                      await logout();
                      navigate('/login', { replace: true });
                    }}
                  >
                    <LogOut className="mr-2 h-4 w-4" />{t('退出登录')}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="mx-auto max-w-md space-y-5">
                <section className="rounded-2xl bg-muted/40 p-5 sm:p-6">
                  <h2 className="text-base font-semibold">{t('账号信息')}</h2>
                  <form onSubmit={onSave} className="mt-4 space-y-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="me-name">{t('昵称')}</Label>
                      <Input
                        id="me-name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        maxLength={64}
                        disabled={saving}
                        className="bg-background"
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="me-wechat">{t('微信号')}</Label>
                      <Input
                        id="me-wechat"
                        value={wechat}
                        onChange={(e) => setWechat(e.target.value)}
                        maxLength={64}
                        disabled={saving}
                        className="bg-background"
                        required
                      />
                    </div>

                    <Button
                      type="submit"
                      size="lg"
                      className="w-full rounded-full"
                      disabled={!dirty || saving}
                    >
                      {saving ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />{t('保存中…')}
                        </>
                      ) : (
                        t('保存')
                      )}
                    </Button>
                  </form>
                </section>

                {directoryLoaded && !isPlaceholderData && !boundCard && (
                  <p className="rounded-2xl bg-muted/35 p-4 text-xs leading-relaxed text-muted-foreground">
                    {t('你的账号还没有匹配成员名片。请联系管理员匹配，完成后就可以编辑名片上的简介和标签。')}
                  </p>
                )}

                <div className="flex justify-center pt-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="rounded-full px-5 text-muted-foreground hover:text-foreground"
                    onClick={async () => {
                      await logout();
                      navigate('/login', { replace: true });
                    }}
                  >
                    <LogOut className="mr-2 h-4 w-4" />{t('退出登录')}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
        </div>
      </div>
    </AppShell>
  );
}
