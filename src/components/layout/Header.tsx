import { Link, useLocation, useNavigate } from 'react-router-dom';
import { CircleHelp, Inbox, LogOut, Plus } from 'lucide-react';
import { useI18n } from '@/app/I18nProvider';
import { Button } from '@/components/ui/button';
import { ONBOARDING_OPEN_EVENT } from '@/components/onboarding/OnboardingGuide';
import { useUnreadSubmissionsCount } from '@/components/project/ProjectInteractions';
import { useAuth } from '@/hooks/useAuth';
import { getAvatarUrl } from '@/lib/media';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { LanguageSwitcher } from '@/components/common/LanguageSwitcher';

interface HeaderProps {
  onCreateClick?: () => void;
  showCreate?: boolean;
}

export function Header({ onCreateClick, showCreate = true }: HeaderProps) {
  const { t } = useI18n();
  const { user, profile, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { unreadCount } = useUnreadSubmissionsCount();

  const displayName = profile?.name || user?.name || user?.email?.split('@')[0] || '';
  const initials = displayName.slice(0, 1).toUpperCase() || '?';
  const avatarUrl = getAvatarUrl(profile?.avatar_file_id, profile?.$id ?? user?.$id ?? displayName);
  const onInbox = location.pathname === '/me' && (
    !location.search || new URLSearchParams(location.search).get('tab') === 'inbox'
  );

  return (
    <header className="sticky top-0 z-30 w-full border-b bg-background/85 pt-[env(safe-area-inset-top)] backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-2 px-3.5 sm:px-4">
        <Link to="/" className="flex shrink-0 items-baseline gap-2">
          <span className="whitespace-nowrap text-[15px] font-semibold tracking-tight">M1 Infinitas</span>
          <span className="hidden text-xs text-muted-foreground sm:inline">{t('内部协作')}</span>
        </Link>

        <div className="flex shrink-0 items-center gap-1 sm:gap-1.5">
          <LanguageSwitcher />
          {showCreate && onCreateClick && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onCreateClick}
              aria-label={t('创建项目')}
              className="h-9 w-9 text-foreground sm:h-10 sm:w-10"
            >
              <Plus className="h-5 w-5" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="iconSm"
            onClick={() => window.dispatchEvent(new Event(ONBOARDING_OPEN_EVENT))}
            aria-label={t('查看功能引导')}
            title={t('功能引导')}
            className="h-9 w-9 text-muted-foreground sm:h-8 sm:w-8"
          >
            <CircleHelp className="h-4 w-4" />
          </Button>
          <Link
            to="/me?tab=inbox"
            data-onboarding="inbox-entry"
            aria-label={unreadCount > 0 ? t('收件箱（{count} 条未读）', { count: unreadCount }) : t('收件箱')}
            title={unreadCount > 0 ? t('收件箱（{count} 条未读）', { count: unreadCount }) : t('收件箱')}
            className={cn(
              'relative inline-flex h-9 w-9 items-center justify-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:h-8 sm:w-8',
              onInbox
                ? 'bg-muted text-foreground'
                : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground',
            )}
          >
            <Inbox className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className="absolute right-0 top-0 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-semibold leading-none text-white tabular-nums sm:-right-0.5 sm:-top-0.5">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </Link>
          <Link to="/me" aria-label={t('我的')} className="ml-0.5 flex items-center gap-2 sm:ml-1">
            <Avatar className="h-8 w-8">
              <AvatarImage src={avatarUrl} alt={displayName} />
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
            aria-label={t('退出登录')}
            className="h-9 w-9 text-muted-foreground sm:h-10 sm:w-10"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}
