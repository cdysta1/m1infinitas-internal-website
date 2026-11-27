import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, Check, X } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useI18n } from '@/app/I18nProvider';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

export const ONBOARDING_OPEN_EVENT = 'm1:open-onboarding';

const COACHMARK_VERSION = 'v9';
const EASING = 'cubic-bezier(0.22, 1, 0.36, 1)';

interface CoachmarkTip {
  id: string;
  target: string;
  title: string;
  description: string;
}

interface PageGuide {
  key: string;
  tips: CoachmarkTip[];
}

interface RectSnapshot {
  top: number;
  right: number;
  bottom: number;
  left: number;
  width: number;
  height: number;
  radius: number;
}

const PROJECT_GUIDE: PageGuide = {
  key: 'projects',
  tips: [
    {
      id: 'project-filters',
      target: 'project-filters',
      title: '筛选与排序',
      description: '切换进行中、已结束，或按热度查看。',
    },
    {
      id: 'favorite-project',
      target: 'favorite-project',
      title: '收藏项目',
      description: '点心收藏，同时累加项目热度。',
    },
    {
      id: 'apply-project',
      target: 'apply-project',
      title: '直接投递',
      description: '进行中的项目可直接投递名片参与。',
    },
    {
      id: 'inbox-entry',
      target: 'inbox-entry',
      title: '投递收件箱',
      description: '收到合作投递时会在这里提示。',
    },
    {
      id: 'create-project',
      target: 'create-project',
      title: '发布项目',
      description: '从这里创建署名或匿名项目。',
    },
  ],
};

const PROJECT_DETAIL_GUIDE: PageGuide = {
  key: 'project-detail',
  tips: [
    {
      id: 'detail-apply',
      target: 'detail-apply',
      title: '参与项目',
      description: '发送你的名片和留言给项目负责人。',
    },
    {
      id: 'detail-owner',
      target: 'detail-owner',
      title: '查看负责人',
      description: '点击可预览完整成员名片与作品。',
    },
  ],
};

const PROFILE_GUIDE: PageGuide = {
  key: 'profile',
  tips: [
    {
      id: 'me-tabs',
      target: 'me-tabs',
      title: '个人分区',
      description: '切换收件箱、我的项目、收藏与资料。',
    },
    {
      id: 'edit-project',
      target: 'edit-project',
      title: '编辑项目',
      description: '修改文案媒体、切换结束状态或删除。',
    },
  ],
};

const MEMBERS_GUIDE: PageGuide = {
  key: 'members',
  tips: [
    {
      id: 'member-density',
      target: 'member-density',
      title: '切换视图',
      description: '− 收起，+ 展开。',
    },
    {
      id: 'member-search',
      target: 'member-search',
      title: '搜索成员',
      description: '按姓名或标签查找。',
    },
    {
      id: 'member-projects',
      target: 'member-projects',
      title: '查看作品',
      description: '点击项目数可直达成员的公开项目。',
    },
  ],
};

function getPageGuide(pathname: string): PageGuide | null {
  if (pathname === '/') return PROJECT_GUIDE;
  if (pathname.startsWith('/projects/')) return PROJECT_DETAIL_GUIDE;
  if (pathname === '/me') return PROFILE_GUIDE;
  if (pathname === '/members') return MEMBERS_GUIDE;
  return null;
}

function getStorageKey(userId: string, pageKey: string) {
  return `m1:coachmarks:${COACHMARK_VERSION}:${userId}:${pageKey}`;
}

function getEnteredKey(storageKey: string) {
  return `${storageKey}:entered`;
}

function readSeenTips(storageKey: string) {
  try {
    const value = JSON.parse(window.localStorage.getItem(storageKey) ?? '[]');
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

function isUsableTarget(element: HTMLElement) {
  const rect = element.getBoundingClientRect();
  const style = window.getComputedStyle(element);
  return (
    element.isConnected
    && rect.width > 0
    && rect.height > 0
    && style.display !== 'none'
    && style.visibility !== 'hidden'
    && style.opacity !== '0'
    && !element.hasAttribute('disabled')
  );
}

function findTargetElement(targetName: string): HTMLElement | null {
  const candidates = Array.from(
    document.querySelectorAll<HTMLElement>(`[data-onboarding="${targetName}"]`),
  );
  return candidates.find(isUsableTarget) ?? null;
}

function resolveSpotlightRadius(element: HTMLElement, width: number, height: number): number {
  const raw = window.getComputedStyle(element).borderRadius;
  const parsed = Number.parseFloat(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 14;
  }
  if (parsed >= 999 || parsed >= Math.min(width, height) / 2) {
    return width / Math.max(height, 1) <= 4.5 ? 9999 : Math.min(Math.round(height / 2) + 5, 22);
  }
  return Math.min(24, Math.max(12, Math.round(parsed) + 5));
}

function snapshotRect(element: HTMLElement): RectSnapshot {
  const rect = element.getBoundingClientRect();
  return {
    top: rect.top,
    right: rect.right,
    bottom: rect.bottom,
    left: rect.left,
    width: rect.width,
    height: rect.height,
    radius: resolveSpotlightRadius(element, rect.width, rect.height),
  };
}

export function OnboardingGuide() {
  const { t } = useI18n();
  const { user } = useAuth();
  const location = useLocation();
  const guide = useMemo(() => getPageGuide(location.pathname), [location.pathname]);
  const storageKey = user && guide ? getStorageKey(user.$id, guide.key) : null;

  const [seenIds, setSeenIds] = useState<string[]>([]);
  const [activeTip, setActiveTip] = useState<CoachmarkTip | null>(null);
  const [target, setTarget] = useState<HTMLElement | null>(null);
  const [targetRect, setTargetRect] = useState<RectSnapshot | null>(null);
  const [replayNonce, setReplayNonce] = useState(0);
  const [hydratedStorageKey, setHydratedStorageKey] = useState<string | null>(null);
  const [tooltipHeight, setTooltipHeight] = useState(142);
  const tooltipRef = useRef<HTMLElement | null>(null);
  const enteredSnapshot = useRef<{ storageKey: string; hasEntered: boolean } | null>(null);

  useEffect(() => {
    setHydratedStorageKey(null);
    setActiveTip(null);
    setTarget(null);
    setTargetRect(null);

    if (!storageKey || !guide) {
      enteredSnapshot.current = null;
      setSeenIds([]);
      return;
    }

    const enteredKey = getEnteredKey(storageKey);
    // Strict Mode repeats initial effects; keep the first-entry decision for that hydration.
    const hasEntered = enteredSnapshot.current?.storageKey === storageKey
      ? enteredSnapshot.current.hasEntered
      : window.localStorage.getItem(enteredKey) === '1';
    enteredSnapshot.current = { storageKey, hasEntered };
    const savedTips = readSeenTips(storageKey);

    window.localStorage.setItem(enteredKey, '1');
    setSeenIds(hasEntered ? guide.tips.map((tip) => tip.id) : savedTips);
    setHydratedStorageKey(storageKey);
  }, [guide, replayNonce, storageKey]);

  useEffect(() => {
    const replayCurrentPage = () => {
      if (!storageKey) return;
      window.localStorage.removeItem(storageKey);
      window.localStorage.removeItem(getEnteredKey(storageKey));
      enteredSnapshot.current = null;
      setReplayNonce((value) => value + 1);
    };

    window.addEventListener(ONBOARDING_OPEN_EVENT, replayCurrentPage);
    return () => window.removeEventListener(ONBOARDING_OPEN_EVENT, replayCurrentPage);
  }, [storageKey]);

  useEffect(() => {
    if (!guide || !storageKey || hydratedStorageKey !== storageKey || activeTip) return;

    let observer: MutationObserver | null = null;

    const findNextTarget = () => {
      for (const tip of guide.tips) {
        if (seenIds.includes(tip.id)) continue;
        const element = findTargetElement(tip.target);
        if (!element) continue;

        setTarget(element);
        setActiveTip(tip);
        observer?.disconnect();
        return;
      }
    };

    findNextTarget();
    observer = new MutationObserver(findNextTarget);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true });

    return () => observer?.disconnect();
  }, [activeTip, guide, hydratedStorageKey, seenIds, storageKey]);

  useEffect(() => {
    if (!activeTip || !target || !storageKey) return;

    let settleTimer: number | undefined;
    const root = document.documentElement;
    const previousOverflowY = root.style.overflowY;

    const updateRect = () => {
      if (!target.isConnected) {
        setActiveTip(null);
        setTarget(null);
        setTargetRect(null);
        return;
      }
      setTargetRect(snapshotRect(target));
    };

    const initialRect = target.getBoundingClientRect();
    const comfortablyVisible =
      initialRect.top >= 76 && initialRect.bottom <= window.innerHeight - 180;
    if (!comfortablyVisible) {
      target.scrollIntoView({ behavior: 'auto', block: 'center', inline: 'nearest' });
    }
    root.style.overflowY = 'hidden';
    updateRect();
    settleTimer = window.setTimeout(updateRect, 220);

    window.addEventListener('resize', updateRect);
    window.addEventListener('scroll', updateRect, true);

    return () => {
      if (settleTimer) window.clearTimeout(settleTimer);
      root.style.overflowY = previousOverflowY;
      window.removeEventListener('resize', updateRect);
      window.removeEventListener('scroll', updateRect, true);
    };
  }, [activeTip, storageKey, target]);

  useLayoutEffect(() => {
    const node = tooltipRef.current;
    if (!node) return;
    const measure = () => {
      const next = Math.ceil(node.getBoundingClientRect().height);
      if (next > 0) setTooltipHeight(next);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, [activeTip, targetRect]);

  const advanceGuide = useCallback(() => {
    if (!guide || !storageKey || !activeTip) return;
    const nextSeen = seenIds.includes(activeTip.id) ? seenIds : [...seenIds, activeTip.id];
    window.localStorage.setItem(storageKey, JSON.stringify(nextSeen));
    setSeenIds(nextSeen);

    // Transition seamlessly to the next usable target without tearing down the backdrop.
    for (const tip of guide.tips) {
      if (nextSeen.includes(tip.id)) continue;
      const nextEl = findTargetElement(tip.target);
      if (nextEl) {
        setTarget(nextEl);
        setActiveTip(tip);
        return;
      }
    }

    setActiveTip(null);
    setTarget(null);
    setTargetRect(null);
  }, [activeTip, guide, seenIds, storageKey]);

  const skipPageGuide = useCallback(() => {
    if (!guide || !storageKey) return;
    const allIds = guide.tips.map((tip) => tip.id);
    window.localStorage.setItem(storageKey, JSON.stringify(allIds));
    setSeenIds(allIds);
    setActiveTip(null);
    setTarget(null);
    setTargetRect(null);
  }, [guide, storageKey]);

  useEffect(() => {
    if (!activeTip) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        skipPageGuide();
      } else if (event.key === 'ArrowRight' || event.key === 'Enter') {
        event.preventDefault();
        advanceGuide();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activeTip, advanceGuide, skipPageGuide]);

  if (!guide || !storageKey || !activeTip || !targetRect) return null;

  // Include active tip + any currently present tips so step numbers never jump over missing controls.
  const availableTips = guide.tips.filter(
    (tip) => tip.id === activeTip.id || seenIds.includes(tip.id) || Boolean(findTargetElement(tip.target)),
  );
  const currentIndex = Math.max(0, availableTips.findIndex((tip) => tip.id === activeTip.id));
  const totalSteps = Math.max(1, availableTips.length);
  const isLastStep = currentIndex >= totalSteps - 1;

  const padX = targetRect.radius >= 999 ? 5 : 7;
  const padY = 5;
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const spotlightTop = Math.max(4, targetRect.top - padY);
  const spotlightLeft = Math.max(4, targetRect.left - padX);
  const spotlightRight = Math.min(viewportWidth - 4, targetRect.right + padX);
  const spotlightBottom = Math.min(viewportHeight - 4, targetRect.bottom + padY);
  const spotlightWidth = Math.max(0, spotlightRight - spotlightLeft);
  const spotlightHeight = Math.max(0, spotlightBottom - spotlightTop);

  const tooltipWidth = Math.min(288, viewportWidth - 24);
  const offset = 14;
  const targetCenter = spotlightLeft + spotlightWidth / 2;
  const centeredLeft = targetCenter - tooltipWidth / 2;
  const preferredLeft =
    centeredLeft < spotlightLeft - 12 && spotlightLeft + tooltipWidth <= viewportWidth - 12
      ? spotlightLeft
      : centeredLeft + tooltipWidth > spotlightRight + 12 && spotlightRight - tooltipWidth >= 12
        ? spotlightRight - tooltipWidth
        : centeredLeft;
  const tooltipLeft = Math.min(
    Math.max(12, preferredLeft),
    viewportWidth - tooltipWidth - 12,
  );
  const spaceBelow = viewportHeight - spotlightBottom - offset - 12;
  const spaceAbove = spotlightTop - offset - 12;
  const placeBelow = spaceBelow >= tooltipHeight || spaceBelow >= spaceAbove;
  const tooltipTop = placeBelow
    ? Math.min(viewportHeight - tooltipHeight - 12, spotlightBottom + offset)
    : Math.max(12, spotlightTop - tooltipHeight - offset);
  const arrowLeft = Math.min(
    Math.max(22, targetCenter - tooltipLeft - 6),
    tooltipWidth - 34,
  );

  return (
    <div aria-live="polite">
      {/* Click-anywhere scrim layer */}
      <button
        type="button"
        aria-label={t('下一个功能提示')}
        onClick={advanceGuide}
        className="fixed inset-0 cursor-default bg-transparent focus-visible:outline-none"
        style={{ zIndex: 80 }}
      />

      {/* Concentric spotlight frame */}
      <div
        className="pointer-events-none fixed transition-[top,left,width,height,border-radius] duration-300 motion-reduce:transition-none"
        style={{
          top: spotlightTop,
          left: spotlightLeft,
          width: spotlightWidth,
          height: spotlightHeight,
          zIndex: 81,
          borderRadius: targetRect.radius,
          transitionTimingFunction: EASING,
          boxShadow: [
            '0 0 0 2px rgba(255, 255, 255, 0.94)',
            '0 0 0 6px rgba(255, 255, 255, 0.16)',
            '0 0 0 9999px rgba(10, 10, 12, 0.44)',
          ].join(', '),
        }}
      />

      {/* Crisp pure-white floating coachmark card */}
      <section
        ref={tooltipRef}
        role="dialog"
        aria-label={t(activeTip.title)}
        className="pointer-events-auto fixed rounded-2xl bg-background/95 p-4 text-foreground backdrop-blur-xl transition-[top,left] duration-300 motion-reduce:transition-none"
        style={{
          top: tooltipTop,
          left: tooltipLeft,
          width: tooltipWidth,
          zIndex: 83,
          transitionTimingFunction: EASING,
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.2), 0 0 0 1px rgba(0, 0, 0, 0.06)',
        }}
      >
        <span
          aria-hidden
          className="pointer-events-none absolute h-3 w-3 rotate-45 rounded-[2px] bg-background/95"
          style={placeBelow ? { top: -6, left: arrowLeft } : { bottom: -6, left: arrowLeft }}
        />

        <div key={activeTip.id} className="coachmark-card-enter">
          <div className="flex items-center justify-between gap-2">
            <span className="rounded-full bg-muted px-2 py-0.5 font-mono text-[10px] font-medium tabular-nums tracking-wider text-muted-foreground">
              {String(currentIndex + 1).padStart(2, '0')} / {String(totalSteps).padStart(2, '0')}
            </span>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                skipPageGuide();
              }}
              aria-label={t('关闭本页提示')}
              title={t('关闭本页提示')}
              className="-mr-1 -mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          <h2 className="mt-2.5 text-[15px] font-semibold leading-snug tracking-tight text-foreground">
            {t(activeTip.title)}
          </h2>
          <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
            {t(activeTip.description)}
          </p>

          <div className="mt-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-1.5" aria-hidden>
              {availableTips.map((tip, index) => (
                <span
                  key={tip.id}
                  className={cn(
                    'h-1.5 rounded-full transition-all duration-300',
                    index === currentIndex
                      ? 'w-5 bg-foreground'
                      : index < currentIndex
                        ? 'w-1.5 bg-foreground/40'
                        : 'w-1.5 bg-foreground/15',
                  )}
                />
              ))}
            </div>

            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                advanceGuide();
              }}
              className="inline-flex h-8 items-center gap-1 rounded-full bg-foreground px-3.5 text-xs font-medium text-background transition-[opacity,transform] hover:opacity-90 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <span>{isLastStep ? t('知道了') : t('下一步')}</span>
              {isLastStep ? (
                <Check className="h-3.5 w-3.5" />
              ) : (
                <ArrowRight className="h-3.5 w-3.5" />
              )}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
