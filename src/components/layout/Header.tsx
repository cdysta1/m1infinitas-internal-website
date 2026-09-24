import { Link, useNavigate } from 'react-router-dom';
import { LogOut, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { buildPreviewUrl } from '@/lib/media';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface HeaderProps {
  onCreateClick?: () => void;
  showCreate?: boolean;
}

export function Header({ onCreateClick, showCreate = true }: HeaderProps) {
  const { user, profile, logout } = useAuth();
  const navigate = useNavigate();

  const displayName = profile?.name || user?.name || user?.email?.split('@')[0] || '';
  const initials = displayName.slice(0, 1).toUpperCase() || '?';
  const avatarUrl = profile?.avatar_file_id ? buildPreviewUrl(profile.avatar_file_id, 'avatar') : undefined;

  return (
    <header className="sticky top-0 z-30 w-full border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <Link to="/" className="flex items-baseline gap-2">
          <span className="text-[15px] font-semibold tracking-tight">M1 Infinitas</span>
          <span className="hidden text-xs text-muted-foreground sm:inline">内部协作</span>
        </Link>

        <div className="flex items-center gap-1.5">
          {showCreate && onCreateClick && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onCreateClick}
              aria-label="创建项目"
              className="text-foreground"
            >
              <Plus className="h-5 w-5" />
            </Button>
          )}
          <Link to="/me" aria-label="我的" className="ml-1 flex items-center gap-2">
            <Avatar className="h-8 w-8">
              {avatarUrl && <AvatarImage src={avatarUrl} alt={displayName} />}
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <span className="hidden max-w-[8rem] truncate text-sm sm:inline">{displayName}</span>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            onClick={async () => {
              await logout();
              navigate('/login', { replace: true });
            }}
            aria-label="退出登录"
            className="text-muted-foreground"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}
