import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface UpdateFabProps {
  onClick: () => void;
  className?: string;
}

// Fixed bottom action bar with the primary "更新进度" CTA.
// Uses safe-area inset so it clears the iOS home indicator.
export function UpdateFab({ onClick, className }: UpdateFabProps) {
  return (
    <div
      className={cn(
        'fixed inset-x-0 bottom-0 z-30 mx-auto w-full max-w-xl',
        'px-4 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-3',
        'bg-gradient-to-t from-background via-background/95 to-transparent',
        className,
      )}
    >
      <Button
        size="lg"
        onClick={onClick}
        className="w-full gap-2 rounded-full shadow-sm"
      >
        <Plus className="h-5 w-5" />
        更新进度
      </Button>
    </div>
  );
}
