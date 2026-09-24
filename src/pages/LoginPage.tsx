import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { isAppwriteUnauthorized } from '@/services/auth';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pending, setPending] = useState(false);

  const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? '/';

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      toast.error('请填写邮箱和密码');
      return;
    }
    setPending(true);
    try {
      await login(email.trim(), password);
      navigate(from, { replace: true });
    } catch (err) {
      console.error('[login] failed', err);
      if (isAppwriteUnauthorized(err)) {
        toast.error('邮箱或密码不正确');
      } else {
        toast.error((err as Error).message || '登录失败');
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
          <h1 className="mt-2 text-xl font-semibold tracking-tight">登录</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            内部协作平台 · 邀请制
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">邮箱</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              inputMode="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
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
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              disabled={pending}
              required
            />
          </div>

          <Button
            type="submit"
            size="lg"
            className="w-full rounded-full"
            disabled={pending}
          >
            {pending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                登录中…
              </>
            ) : (
              '登录'
            )}
          </Button>
        </form>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          还没有账号？{' '}
          <Link to="/register" className="text-foreground underline underline-offset-4">
            用邀请码注册
          </Link>
        </p>
      </div>
    </div>
  );
}
