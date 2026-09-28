import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Camera, Heart, LogOut } from 'lucide-react';
import { toast } from 'sonner';
import { SmartImage } from '@/components/common/SmartImage';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/hooks/useAuth';
import { useFavoriteMembers } from '@/hooks/useFavoriteMembers';
import { useMembersDirectory } from '@/hooks/useMembersDirectory';
import { updateProfile } from '@/services/profiles';
import { uploadMedia } from '@/services/storage';
import { getAvatarUrl } from '@/lib/media';
import { getMemberMeta } from '@/lib/memberDirectory';
import { cn } from '@/lib/utils';

export function MePage() {
  const { user, profile, refreshProfile, logout } = useAuth();
  const navigate = useNavigate();
  const { data: members = [], isLoading: membersLoading } = useMembersDirectory();
  const {
    favoriteIds,
    isLoading: favoritesLoading,
    pendingId,
    toggleFavorite,
  } = useFavoriteMembers(user?.$id);

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
      favoriteIds.flatMap((memberId) => {
        const member = members.find(({ profile: memberProfile }) => memberProfile.$id === memberId);
        return member ? [member] : [];
      }),
    [favoriteIds, members],
  );

  if (!user) {
    return (
      <AppShell showCreate={false}>
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
    <AppShell showCreate={false}>
      <div className="mx-auto max-w-md px-4 py-6">
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

        <section className="mt-10 border-t pt-6" aria-labelledby="favorite-members-heading">
          <div className="flex items-baseline justify-between gap-4">
            <h2 id="favorite-members-heading" className="text-base font-semibold">
              收藏成员
            </h2>
            <span className="font-mono text-[10px] text-muted-foreground">
              {String(favoriteMembers.length).padStart(2, '0')} PEOPLE
            </span>
          </div>

          {membersLoading || favoritesLoading ? (
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
                      onClick={() => void toggleFavorite(memberProfile.$id)}
                      disabled={pendingId !== null}
                      aria-label={`取消收藏 ${memberProfile.name}`}
                      title={`取消收藏 ${memberProfile.name}`}
                      aria-pressed="true"
                      className={cn(
                        'flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-foreground bg-foreground text-background transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-90',
                        pendingId !== null && 'cursor-wait opacity-50',
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
