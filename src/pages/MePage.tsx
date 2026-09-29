import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Loader2, Camera, Heart, LogOut, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { SmartImage } from '@/components/common/SmartImage';
import { AppShell } from '@/components/layout/AppShell';
import { EditProjectDrawer } from '@/components/project/EditProjectDrawer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/hooks/useAuth';
import { useFavoriteMembers } from '@/hooks/useFavoriteMembers';
import { useFavoriteProjects } from '@/hooks/useFavoriteProjects';
import { useMembersDirectory } from '@/hooks/useMembersDirectory';
import { useOwnedProjects } from '@/hooks/useOwnedProjects';
import { getProject } from '@/services/projects';
import { updateProfile } from '@/services/profiles';
import { uploadMedia } from '@/services/storage';
import { buildPreviewUrl, getAvatarUrl } from '@/lib/media';
import { getMemberMeta } from '@/lib/memberDirectory';
import { requestGalleryScrollRestore } from '@/lib/galleryScroll';
import { cn, formatRelativeTime } from '@/lib/utils';

export function MePage() {
  const { user, profile, refreshProfile, logout } = useAuth();
  const navigate = useNavigate();
  const returnToGallery = () => {
    requestGalleryScrollRestore();
    navigate('/');
  };
  const { data: members = [], isLoading: membersLoading } = useMembersDirectory();
  const {
    favoriteIds: favoriteMemberIds,
    isLoading: favoriteMembersLoading,
    pendingId: pendingMemberId,
    toggleFavorite: toggleFavoriteMember,
  } = useFavoriteMembers(user?.$id);
  const {
    favoriteIds: favoriteProjectIds,
    isLoading: favoriteProjectsLoading,
    pendingId: pendingProjectId,
    toggleFavorite: toggleFavoriteProject,
  } = useFavoriteProjects(user?.$id);
  const { data: ownedProjects = [], isLoading: ownedProjectsLoading } =
    useOwnedProjects(user?.$id);

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

  // Keep local state in sync when profile loads/refreshes.
  useEffect(() => {
    if (!profile) return;
    setName(profile.name ?? '');
    setWechat(profile.wechat ?? '');
  }, [profile]);

  const favoriteMembers = useMemo(
    () =>
      favoriteMemberIds.flatMap((memberId) => {
        const member = members.find(({ profile: memberProfile }) => memberProfile.$id === memberId);
        return member ? [member] : [];
      }),
    [favoriteMemberIds, members],
  );

  if (!user) {
    return (
      <AppShell showCreate={false} onSwipeBack={returnToGallery}>
        <div className="p-8 text-center text-sm text-muted-foreground">未登录</div>
      </AppShell>
    );
  }

  const avatarUrl = getAvatarUrl(profile?.avatar_file_id, user.$id);
  const initials = (name || user.name || user.email).slice(0, 1).toUpperCase();

  const onPickAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('请选择图片');
      return;
    }
    setUploadingAvatar(true);
    try {
      const uploaded = await uploadMedia(file, user.$id);
      await updateProfile(user.$id, { avatar_file_id: uploaded.fileId });
      await refreshProfile();
      toast.success('头像已更新');
    } catch (err) {
      toast.error((err as Error).message || '头像上传失败');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const onSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !wechat.trim()) {
      toast.error('昵称和微信号必填');
      return;
    }
    setSaving(true);
    try {
      await updateProfile(user.$id, {
        name: name.trim(),
        wechat: wechat.trim(),
      });
      await refreshProfile();
      toast.success('已保存');
    } catch (err) {
      toast.error((err as Error).message || '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const dirty =
    name !== (profile?.name ?? '') ||
    wechat !== (profile?.wechat ?? '');

  return (
    <AppShell showCreate={false} onSwipeBack={returnToGallery}>
      <div className="mx-auto max-w-md px-4 py-6">
        <div className="mb-4 flex items-center">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={returnToGallery}
            className="-ml-3 gap-2 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            返回首页
          </Button>
        </div>
        <div className="mb-6 flex flex-col items-center">
          <button
            type="button"
            onClick={() => avatarInputRef.current?.click()}
            className="group relative"
            aria-label="更换头像"
            disabled={uploadingAvatar}
          >
            <Avatar className="h-20 w-20">
              <AvatarImage src={avatarUrl} alt={name} />
              <AvatarFallback className="text-lg">{initials}</AvatarFallback>
            </Avatar>
            <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 text-white opacity-0 transition-opacity group-hover:opacity-100 [@media(hover:none)]:opacity-100">
              {uploadingAvatar ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Camera className="h-5 w-5" />
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
          <div className="mt-3 text-xs text-muted-foreground">{user.email}</div>
        </div>

        <form onSubmit={onSave} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="me-name">昵称</Label>
            <Input
              id="me-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={64}
              disabled={saving}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="me-wechat">微信号</Label>
            <Input
              id="me-wechat"
              value={wechat}
              onChange={(e) => setWechat(e.target.value)}
              maxLength={64}
              disabled={saving}
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
                <Loader2 className="h-4 w-4 animate-spin" />
                保存中…
              </>
            ) : (
              '保存'
            )}
          </Button>
        </form>

        <section className="mt-10 border-t pt-6" aria-labelledby="published-projects-heading">
          <div className="flex items-baseline justify-between gap-4">
            <h2 id="published-projects-heading" className="text-base font-semibold">
              发布项目
            </h2>
            <span className="font-mono text-[10px] text-muted-foreground">
              {String(ownedProjects.length).padStart(2, '0')} PROJECTS
            </span>
          </div>

          {ownedProjectsLoading ? (
            <div className="flex items-center justify-center py-10 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="sr-only">正在加载发布项目</span>
            </div>
          ) : ownedProjects.length === 0 ? (
            <div className="mt-4 rounded-sm border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
              还没有发布项目
            </div>
          ) : (
            <div className="mt-3 divide-y border-y">
              {ownedProjects.map((project) => (
                <article key={project.$id} className="flex items-center gap-3 py-3">
                  <Link
                    to={`/projects/${project.$id}`}
                    className="shrink-0 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <SmartImage
                      src={buildPreviewUrl(project.cover_file_id, 'cover')}
                      alt={project.title}
                      wrapperClassName="h-16 w-16 rounded-sm bg-muted"
                      imgClassName="object-cover"
                    />
                  </Link>
                  <Link
                    to={`/projects/${project.$id}`}
                    className="min-w-0 flex-1 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <h3 className="truncate text-sm font-semibold">{project.title}</h3>
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">
                      {project.summary}
                    </p>
                    <p className="mt-1 font-mono text-[9px] uppercase text-muted-foreground/70">
                      更新于 {formatRelativeTime(project.updated_at)}
                    </p>
                  </Link>
                  <EditProjectDrawer
                    project={project}
                    trigger={(
                      <button
                        type="button"
                        data-onboarding="edit-project"
                        aria-label={`编辑项目 ${project.title}`}
                        title="编辑项目"
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-muted-foreground transition-[border-color,color,transform] hover:border-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-90"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                    )}
                  />
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="mt-10 border-t pt-6" aria-labelledby="favorite-projects-heading">
          <div className="flex items-baseline justify-between gap-4">
            <h2 id="favorite-projects-heading" className="text-base font-semibold">
              收藏项目
            </h2>
            <span className="font-mono text-[10px] text-muted-foreground">
              {String(favoriteProjects.length).padStart(2, '0')} PROJECTS
            </span>
          </div>

          {favoriteProjectsLoading || favoriteProjectDetailsLoading ? (
            <div className="flex items-center justify-center py-10 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="sr-only">正在加载收藏项目</span>
            </div>
          ) : favoriteProjects.length === 0 ? (
            <div className="mt-4 rounded-sm border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
              还没有收藏项目
            </div>
          ) : (
            <div className="mt-3 divide-y border-y">
              {favoriteProjects.map((project) => (
                <article key={project.$id} className="flex items-center gap-3 py-3">
                  <Link
                    to={`/projects/${project.$id}`}
                    className="shrink-0 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <SmartImage
                      src={buildPreviewUrl(project.cover_file_id, 'cover')}
                      alt={project.title}
                      wrapperClassName="h-16 w-16 rounded-sm bg-muted"
                      imgClassName="object-cover"
                    />
                  </Link>
                  <Link
                    to={`/projects/${project.$id}`}
                    className="min-w-0 flex-1 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <h3 className="truncate text-sm font-semibold">{project.title}</h3>
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">
                      {project.summary}
                    </p>
                    <p className="mt-1 font-mono text-[9px] uppercase text-muted-foreground/70">
                      更新于 {formatRelativeTime(project.updated_at)}
                    </p>
                  </Link>
                  <button
                    type="button"
                    onClick={() => void toggleFavoriteProject(project.$id)}
                    disabled={pendingProjectId !== null}
                    aria-label={`取消收藏项目 ${project.title}`}
                    title={`取消收藏项目 ${project.title}`}
                    aria-pressed="true"
                    className={cn(
                      'flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-foreground bg-foreground text-background transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-90',
                      pendingProjectId !== null && 'cursor-wait opacity-50',
                    )}
                  >
                    <Heart className="h-4 w-4 fill-current" />
                  </button>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="mt-10 border-t pt-6" aria-labelledby="favorite-members-heading">
          <div className="flex items-baseline justify-between gap-4">
            <h2 id="favorite-members-heading" className="text-base font-semibold">
              收藏成员
            </h2>
            <span className="font-mono text-[10px] text-muted-foreground">
              {String(favoriteMembers.length).padStart(2, '0')} PEOPLE
            </span>
          </div>

          {membersLoading || favoriteMembersLoading ? (
            <div className="flex items-center justify-center py-10 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="sr-only">正在加载收藏成员</span>
            </div>
          ) : favoriteMembers.length === 0 ? (
            <div className="mt-4 rounded-sm border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
              还没有收藏成员
            </div>
          ) : (
            <div className="mt-3 divide-y border-y">
              {favoriteMembers.map(({ profile: memberProfile }) => {
                const meta = getMemberMeta(memberProfile.$id);
                return (
                  <article key={memberProfile.$id} className="flex items-center gap-3 py-3">
                    <SmartImage
                      src={getAvatarUrl(memberProfile.avatar_file_id, memberProfile.$id)}
                      alt={memberProfile.name}
                      wrapperClassName="h-14 w-14 shrink-0 rounded-sm"
                      imgClassName="object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-sm font-semibold">{memberProfile.name}</h3>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">{meta.focus}</p>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {meta.tags.slice(0, 2).map((tag) => (
                          <span key={tag} className="rounded-full bg-muted px-2 py-1 text-[10px] leading-none">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => void toggleFavoriteMember(memberProfile.$id)}
                      disabled={pendingMemberId !== null}
                      aria-label={`取消收藏 ${memberProfile.name}`}
                      title={`取消收藏 ${memberProfile.name}`}
                      aria-pressed="true"
                      className={cn(
                        'flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-foreground bg-foreground text-background transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-90',
                        pendingMemberId !== null && 'cursor-wait opacity-50',
                      )}
                    >
                      <Heart className="h-4 w-4 fill-current" />
                    </button>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <div className="mt-8 border-t pt-6">
          <Button
            variant="ghost"
            size="md"
            className="w-full text-muted-foreground"
            onClick={async () => {
              await logout();
              navigate('/login', { replace: true });
            }}
          >
            <LogOut className="mr-2 h-4 w-4" />
            退出登录
          </Button>
        </div>
      </div>

    </AppShell>
  );
}
