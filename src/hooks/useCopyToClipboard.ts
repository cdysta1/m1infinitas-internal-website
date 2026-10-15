import { useI18n } from '@/app/I18nProvider';
import { useCallback, useRef, useState } from 'react';
import { toast } from 'sonner';
import { copyToClipboard } from '@/lib/utils';

// Copy helper with transient "copied" state for UI feedback + toast.
export function useCopyToClipboard(resetMs = 1600) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | null>(null);

  const copy = useCallback(
    async (text: string, message = t('已复制')) => {
      const ok = await copyToClipboard(text);
      if (ok) {
        setCopied(true);
        toast.success(message);
        if (timer.current) window.clearTimeout(timer.current);
        timer.current = window.setTimeout(() => setCopied(false), resetMs);
      } else {
        toast.error(t('复制失败，请手动长按选择'));
      }
      return ok;
    },
    [resetMs, t],
  );

  return { copy, copied };
}
