import { NavLink } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

const tabs = [
  { label: '项目', to: '/', end: true },
  { label: '成员', to: '/members', end: false },
] as const;

interface DirectoryTabsProps {
  onCreateClick?: () => void;
}

export function DirectoryTabs({ onCreateClick }: DirectoryTabsProps) {
  return (
    <nav aria-label="内容浏览" className="border-b">
      <div className="mx-auto flex h-12 max-w-6xl items-center px-4">
        <div className="flex h-full items-end gap-7">
          {tabs.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.end}
              className={({ isActive }) =>
                cn(
                  'relative flex h-12 items-center text-sm transition-colors',
                  isActive
                    ? 'font-medium text-foreground after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-foreground'
                    : 'text-muted-foreground hover:text-foreground',
                )
              }
            >
              {tab.label}
            </NavLink>
          ))}
        </div>

        {onCreateClick && (
          <button
            type="button"
            onClick={onCreateClick}
            aria-label="创建项目"
            title="创建项目"
            className="ml-auto flex h-9 w-9 items-center justify-center rounded-full border text-foreground transition-[background-color,transform] hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-90"
          >
            <Plus className="h-4 w-4" />
          </button>
        )}
      </div>
    </nav>
  );
}
