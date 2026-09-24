import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Camera, LogOut } from 'lucide-react';
import { toast } from 'sonner';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/hooks/useAuth';
import { updateProfile } from '@/services/profiles';
import { uploadMedia } from '@/services/storage';
import { buildPreviewUrl } from '@/lib/media';

export function MePage() {
  const { user, profile, refreshProfile, logout } = useAuth();
  const navigate = useNavigate();

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

  if (!user) {
    return (
      <AppShell showCreate={false}>
        <div className="p-8 text-center text-sm text-muted-foreground">未登录</div>
      </AppShell>
    );
  }

  const avatarUrl = profile?.avatar_file_id
    ? buildPreviewUrl(profile.avatar_file_id, 'avatar')
    : undefined;
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
              {avatarUrl && <AvatarImage src={avatarUrl} alt={name} />}
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
