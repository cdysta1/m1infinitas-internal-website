import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { InviteCodeError } from '@/services/auth';

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    inviteCode: '',
    email: '',
    password: '',
    name: '',
    wechat: '',
  });
  const [pending, setPending] = useState(false);

  const setField = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
  };

  const canSubmit =
    form.inviteCode.trim().length > 0 &&
    form.email.trim().length > 0 &&
    form.password.length >= 8 &&
    form.name.trim().length > 0 &&
    form.wechat.trim().length > 0 &&
    !pending;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setPending(true);
    try {
      await register({
        inviteCode: form.inviteCode.trim(),
        email: form.email.trim(),
        password: form.password,
        name: form.name.trim(),
        wechat: form.wechat.trim(),
      });
      toast.success('注册成功，欢迎来到 M1');
      navigate('/', { replace: true });
    } catch (err) {
      console.error('[register] failed', err);
      if (err instanceof InviteCodeError) {
        toast.error('邀请码不正确，请向管理员索取');
      } else {
        toast.error((err as Error).message || '注册失败');
      }
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="flex min-h-[100dvh] flex-col justify-center bg-background px-6 py-12">
      <div className="mx-auto w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
            M1 Infinitas
          </div>
          <h1 className="mt-2 text-xl font-semibold tracking-tight">注册</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            仅限内部成员，需邀请码
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="invite">邀请码</Label>
            <Input
              id="invite"
              value={form.inviteCode}
              onChange={setField('inviteCode')}
              placeholder="向管理员索取"
              autoComplete="off"
              disabled={pending}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email">邮箱</Label>
            <Input
              id="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              value={form.email}
              onChange={setField('email')}
              placeholder="you@studio.com"
              disabled={pending}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password">密码</Label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              value={form.password}
              onChange={setField('password')}
              placeholder="至少 8 位"
              minLength={8}
              disabled={pending}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="name">昵称</Label>
              <Input
                id="name"
                value={form.name}
                onChange={setField('name')}
                placeholder="你的昵称"
                maxLength={64}
                disabled={pending}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="wechat">微信号</Label>
              <Input
                id="wechat"
                value={form.wechat}
                onChange={setField('wechat')}
                placeholder="用于内部联系"
                maxLength={64}
                disabled={pending}
                required
              />
            </div>
          </div>

          <Button
            type="submit"
            size="lg"
            className="w-full rounded-full"
            disabled={!canSubmit}
          >
            {pending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                注册中…
              </>
            ) : (
              '注册并进入'
            )}
          </Button>
        </form>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          已有账号？{' '}
          <Link to="/login" className="text-foreground underline underline-offset-4">
            直接登录
          </Link>
        </p>
      </div>
    </div>
  );
}
