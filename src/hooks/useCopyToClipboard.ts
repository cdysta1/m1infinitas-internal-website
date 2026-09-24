import { useCallback, useRef, useState } from 'react';
import { toast } from 'sonner';
import { copyToClipboard } from '@/lib/utils';

// Copy helper with transient "copied" state for UI feedback + toast.
export function useCopyToClipboard(resetMs = 1600) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | null>(null);

  const copy = useCallback(
    async (text: string, message = '已复制') => {
      const ok = await copyToClipboard(text);
      if (ok) {
        setCopied(true);
        toast.success(message);
        if (timer.current) window.clearTimeout(timer.current);
        timer.current = window.setTimeout(() => setCopied(false), resetMs);
      } else {
        toast.error('复制失败，请手动长按选择');
      }
      return ok;
    },
    [resetMs],
  );

  return { copy, copied };
}
