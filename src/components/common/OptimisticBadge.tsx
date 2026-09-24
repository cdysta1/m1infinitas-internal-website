import { Loader2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { OPTIMISTIC, type OptimisticStatus } from '@/lib/constants';

interface OptimisticBadgeProps {
  status?: OptimisticStatus;
  className?: string;
}

// Compact status pill for optimistic items.
export function OptimisticBadge({ status, className }: OptimisticBadgeProps) {
  if (!status || status === OPTIMISTIC.SENT) return null;
  const isPending = status === OPTIMISTIC.PENDING;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium',
        isPending ? 'bg-muted text-muted-foreground' : 'bg-destructive/10 text-destructive',
        className,
      )}
    >
      {isPending ? (
        <>
          <Loader2 className="h-3 w-3 animate-spin" />
          发布中
        </>
      ) : (
        <>
          <AlertCircle className="h-3 w-3" />
          发布失败
        </>
      )}
    </span>
  );
}
