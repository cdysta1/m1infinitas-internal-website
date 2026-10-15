import { useI18n } from '@/app/I18nProvider';
import { useId } from 'react';
import { ArrowUpRight, X } from 'lucide-react';

interface MemberEmptyStateProps {
  kind: 'unselected' | 'no-results' | 'no-combination';
  onShowAll: () => void;
  onReset?: () => void;
}

export function MemberEmptyState({ kind, onShowAll, onReset }: MemberEmptyStateProps) {
  const { t } = useI18n();
  const titleId = useId();
  const unselected = kind === 'unselected';
  const combination = kind === 'no-combination';

  return (
    <section
      role="status"
      aria-live="polite"
      aria-labelledby={titleId}
      data-member-empty-state={kind}
      className="member-empty-enter flex min-h-[25rem] flex-col items-center justify-center border-t px-4 py-10 text-center"
    >
      <h2 id={titleId} className="text-xl font-medium leading-snug sm:text-[22px]">
        {unselected ? t('选择一个分类') : combination ? t('这里，尚无交集') : t('这里，暂时留白')}
      </h2>
      <p className="mt-2 max-w-xs text-sm leading-6 text-muted-foreground">
        {unselected ? t('在人的疆域上') : combination
          ? t('暂时没有同时符合这些标签的成员，试着减少一个标签。')
          : t('暂时没有符合这些条件的成员。')}
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
        {!unselected && onReset && (
          <button
            type="button"
            onClick={onReset}
            className="flex h-9 items-center gap-1.5 border-b border-foreground/30 text-xs text-muted-foreground transition-colors hover:border-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X className="h-3.5 w-3.5" />{t("清除筛选")}</button>
        )}
        <button
          type="button"
          onClick={onShowAll}
          className="flex h-9 items-center gap-1.5 border-b border-foreground text-xs text-foreground transition-opacity hover:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >{t("浏览全部")}<ArrowUpRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </section>
  );
}
