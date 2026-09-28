import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';

const tabs = [
  { label: '项目', to: '/', end: true },
  { label: '成员', to: '/members', end: false },
] as const;

export function DirectoryTabs() {
  return (
    <nav aria-label="内容浏览" className="border-b">
      <div className="mx-auto flex h-12 max-w-6xl items-end gap-7 px-4">
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
    </nav>
  );
}
