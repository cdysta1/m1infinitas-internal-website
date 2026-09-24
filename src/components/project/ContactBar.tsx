import { Copy } from 'lucide-react';
import { useCopyToClipboard } from '@/hooks/useCopyToClipboard';
import type { Profile } from '@/types/models';

interface ContactBarProps {
  owner: Profile | null | undefined;
}

// Prominent wechat block. Click to copy the wechat id.
export function ContactBar({ owner }: ContactBarProps) {
  const { copy, copied } = useCopyToClipboard();
  if (!owner?.wechat) return null;

  return (
    <div className="mx-auto max-w-3xl px-4 py-4">
      <button
        type="button"
        onClick={() => copy(owner.wechat, '微信号已复制')}
        className="group flex w-full items-center justify-between gap-3 rounded-xl border bg-card px-4 py-3 text-left transition-colors hover:bg-accent/50"
        aria-label={`复制微信号 ${owner.wechat}`}
      >
        <div className="min-w-0">
          <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
            微信
          </div>
          <div className="truncate text-base font-medium">{owner.wechat}</div>
        </div>
        <Copy
          className={
            'h-4 w-4 shrink-0 text-muted-foreground transition-colors ' +
            (copied ? 'text-primary' : 'group-hover:text-foreground')
          }
        />
      </button>
    </div>
  );
}
