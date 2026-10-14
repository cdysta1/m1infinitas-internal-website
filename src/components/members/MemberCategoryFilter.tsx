import { useI18n } from '@/app/I18nProvider';
import { type ReactNode, useEffect, useId, useMemo, useRef, useState } from 'react';
import { ChevronDown, X } from 'lucide-react';
import type { MemberDirectoryEntry } from '@/lib/memberDirectory';
import {
  MEMBER_CATEGORIES,
  ALL_MEMBERS_CATEGORY_ID,
  getCategoryAncestors,
  getMemberCategory,
  isCategoryWithin,
  matchesMemberCategory,
  removeMemberCategory,
  toggleMemberCategory,
  type MemberCategory,
} from '@/lib/memberCategories';
import { cn } from '@/lib/utils';
import { translateMemberLabel } from '@/i18n/memberLabels';

interface MemberCategoryFilterProps {
  members: MemberDirectoryEntry[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  showSelections?: boolean;
}

export function MemberCategoryFilter({ members, selectedIds, onChange, showSelections = false }: MemberCategoryFilterProps) {
  const { t, language } = useI18n();
  const labelFor = (value: string) => translateMemberLabel(language, value);
  const [expandedIds, setExpandedIds] = useState<string[]>([]);
  const filterRef = useRef<HTMLDivElement>(null);
  const previousSelections = useRef(selectedIds);
  const filterId = useId();
  const counts = useMemo(() => {
    const result = new Map<string, number>();
    const visit = (categories: MemberCategory[]) => categories.forEach((category) => {
      result.set(category.id, members.filter((member) => matchesMemberCategory(member, category)).length);
      if (category.children) visit(category.children);
    });
    visit(MEMBER_CATEGORIES);
    return result;
  }, [members]);

  useEffect(() => {
    const previousIds = previousSelections.current;
    previousSelections.current = selectedIds;
    if (selectedIds.includes(ALL_MEMBERS_CATEGORY_ID) || (previousIds.length > 0 && selectedIds.length === 0)) {
      setExpandedIds([]);
      return;
    }

    // Keep a branch open when replacing its broad filter with a finer selection.
    const canceledIds = previousIds.filter((id) => !selectedIds.some((nextId) =>
      isCategoryWithin(nextId, id) || isCategoryWithin(id, nextId)));
    const restoredParentIds = selectedIds.filter((id) => !previousIds.includes(id) &&
      previousIds.some((previousId) => previousId !== id && isCategoryWithin(previousId, id)));
    if (canceledIds.length === 0 && restoredParentIds.length === 0) return;

    const closedBranches = [
      ...restoredParentIds,
      ...canceledIds.flatMap((id) => [
        id,
        ...getCategoryAncestors(id).filter((ancestorId) =>
          !selectedIds.some((nextId) => isCategoryWithin(nextId, ancestorId))),
      ]),
    ];
    setExpandedIds((current) => current.filter((id) =>
      !closedBranches.some((branchId) => isCategoryWithin(id, branchId))));

    if (restoredParentIds.length > 0) {
      const shouldRestoreFocus = filterRef.current?.contains(document.activeElement);
      const frame = window.requestAnimationFrame(() => {
        const parentButton = filterRef.current?.querySelector<HTMLButtonElement>(
          `[data-member-category="${restoredParentIds[0]}"]`,
        );
        if (shouldRestoreFocus) parentButton?.focus({ preventScroll: true });
        parentButton?.scrollIntoView({
          block: 'center', inline: 'nearest',
          behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
        });
      });
      return () => window.cancelAnimationFrame(frame);
    }
  }, [selectedIds]);

  const toggleExpanded = (id: string) => {
    setExpandedIds((current) => current.includes(id)
      ? current.filter((item) => !isCategoryWithin(item, id))
      : [...current, id]);
  };

  const renderButton = (category: MemberCategory) => {
    const label = labelFor(category.label);
    const active = selectedIds.includes(category.id);
    const partial = !active && selectedIds.some((id) => isCategoryWithin(id, category.id));
    const expanded = expandedIds.includes(category.id);
    const count = counts.get(category.id) ?? 0;
    const hasChildren = Boolean(category.children?.length);
    const panelId = `${filterId}-${category.id}`;

    return (
      <div
        key={category.id}
        className={cn(
          'inline-flex shrink-0 items-center overflow-hidden rounded-full border transition-colors',
          active ? 'border-foreground bg-foreground text-background'
            : partial ? 'border-foreground bg-muted text-foreground' : 'bg-background text-muted-foreground',
        )}
      >
        <button
          type="button"
          data-member-category={category.id}
          aria-label={label}
          aria-pressed={partial ? 'mixed' : active}
          title={t('{category} · {count} 人', { category: label, count })}
          onClick={() => {
            onChange(toggleMemberCategory(selectedIds, category.id));
            if (!active && !partial && hasChildren && !expanded) setExpandedIds((current) => [...current, category.id]);
          }}
          className={cn(
            'flex h-8 items-center gap-2 px-3 text-xs hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
            count === 0 && !active && 'opacity-60',
          )}
        >
          <span>{label}</span>
          <span aria-hidden className="font-mono text-[9px] opacity-60">{count}</span>
        </button>
        {hasChildren && (
          <button
            type="button"
            aria-label={t(expanded ? '收起{category}分类' : '展开{category}分类', { category: label })}
            title={t(expanded ? '收起{category}分类' : '展开{category}分类', { category: label })}
            aria-expanded={expanded}
            aria-controls={panelId}
            onClick={() => toggleExpanded(category.id)}
            className="flex h-8 w-7 shrink-0 items-center justify-center border-l border-current/15 hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
          >
            <ChevronDown className={cn('h-3.5 w-3.5 transition-transform duration-300 motion-reduce:transition-none', expanded && 'rotate-180')} />
          </button>
        )}
      </div>
    );
  };

  const renderChildren = (category: MemberCategory) => {
    if (!category.children?.length) return null;
    return (
      <CategoryPanel key={category.id} id={`${filterId}-${category.id}`} open={expandedIds.includes(category.id)}>
        <div className="mb-3 ml-1 border-l pl-3">
          <div className="mb-2 text-[11px] font-medium text-muted-foreground">{labelFor(category.label)}</div>
          <div className="flex flex-wrap gap-2" role="group" aria-label={t('{category}细分类', { category: labelFor(category.label) })}>
            {category.children.map(renderButton)}
          </div>
          <div className="mt-3">{category.children.map(renderChildren)}</div>
        </div>
      </CategoryPanel>
    );
  };

  return (
    <div ref={filterRef} data-member-category-filter>
      <div className="no-scrollbar flex gap-2 overflow-x-auto py-4" role="group" aria-label={t("按学科筛选")}>
        <button
          type="button"
          aria-pressed={selectedIds.includes(ALL_MEMBERS_CATEGORY_ID)}
          onClick={() => onChange(toggleMemberCategory(selectedIds, ALL_MEMBERS_CATEGORY_ID))}
          className={cn(
            'h-8 shrink-0 rounded-full border px-3 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            selectedIds.includes(ALL_MEMBERS_CATEGORY_ID) ? 'border-foreground bg-foreground text-background' : 'bg-background text-muted-foreground',
          )}
        >{t("全部")}</button>
        {MEMBER_CATEGORIES.map(renderButton)}
      </div>
      {MEMBER_CATEGORIES.map(renderChildren)}
      {showSelections && selectedIds.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-1.5" aria-label={t("已选分类")}>
          {selectedIds.map((id) => (
            <button
              key={id}
              type="button"
              aria-label={t('取消筛选：{category}', { category: labelFor(getMemberCategory(id)?.label ?? '') })}
              title={t('取消筛选：{category}', { category: labelFor(getMemberCategory(id)?.label ?? '') })}
              onClick={() => onChange(removeMemberCategory(selectedIds, id))}
              className="flex h-7 items-center gap-1.5 rounded-full bg-foreground px-2.5 text-[11px] text-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <span>{labelFor(getMemberCategory(id)?.label ?? '')}</span>
              <X className="h-3 w-3" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function CategoryPanel({ id, open, children }: { id: string; open: boolean; children: ReactNode }) {
  const panelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (panelRef.current) panelRef.current.inert = !open;
  }, [open]);

  return (
    <div
      ref={panelRef}
      id={id}
      aria-hidden={!open}
      className={cn(
        'grid transition-[grid-template-rows,opacity] duration-300 ease-out motion-reduce:transition-none',
        open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
      )}
    >
      <div className="min-h-0 overflow-hidden">{children}</div>
    </div>
  );
}
