import { useEffect, useMemo, useState } from 'react';
import { MousePointerClick, X } from 'lucide-react';
import { useLocation } from 'react-router-dom';

import { useAuth } from '@/hooks/useAuth';

export const ONBOARDING_OPEN_EVENT = 'm1:open-onboarding';

const COACHMARK_VERSION = 'v8';

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
}

const PROJECT_GUIDE: PageGuide = {
  key: 'projects',
  tips: [
    {
      id: 'favorite-project',
      target: 'favorite-project',
      title: '收藏项目',
      description: '稍后在「我的」里查看。',
    },
    {
      id: 'create-project',
      target: 'create-project',
      title: '发布项目',
      description: '从这里创建新项目。',
    },
  ],
};

const PROFILE_GUIDE: PageGuide = {
  key: 'profile',
  tips: [
    {
      id: 'edit-project',
      target: 'edit-project',
      title: '编辑项目',
      description: '修改文案、图片和视频。',
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
  ],
};

function getPageGuide(pathname: string): PageGuide | null {
  if (pathname === '/') return PROJECT_GUIDE;
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
    && !element.hasAttribute('disabled')
  );
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
  };
}

export function OnboardingGuide() {
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

  useEffect(() => {
    setHydratedStorageKey(null);
    setActiveTip(null);
    setTarget(null);
    setTargetRect(null);

    if (!storageKey || !guide) {
      setSeenIds([]);
      return;
    }

    const enteredKey = getEnteredKey(storageKey);
    const hasEntered = window.localStorage.getItem(enteredKey) === '1';
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

        const candidates = Array.from(
          document.querySelectorAll<HTMLElement>(`[data-onboarding="${tip.target}"]`),
        );
        const element = candidates.find(isUsableTarget);
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

    target.scrollIntoView({ behavior: 'auto', block: 'center', inline: 'nearest' });
    root.style.overflowY = 'hidden';
    updateRect();
    settleTimer = window.setTimeout(updateRect, 360);

    window.addEventListener('resize', updateRect);
    window.addEventListener('scroll', updateRect, true);

    return () => {
      if (settleTimer) window.clearTimeout(settleTimer);
      root.style.overflowY = previousOverflowY;
      window.removeEventListener('resize', updateRect);
      window.removeEventListener('scroll', updateRect, true);
    };
  }, [activeTip, storageKey, target]);

  if (!guide || !storageKey || !activeTip || !targetRect) return null;

  const advanceGuide = () => {
    setSeenIds((current) => {
      const next = current.includes(activeTip.id) ? current : [...current, activeTip.id];
      window.localStorage.setItem(storageKey, JSON.stringify(next));
      return next;
    });
    setActiveTip(null);
    setTarget(null);
    setTargetRect(null);
  };

  const skipPageGuide = () => {
    const allIds = guide.tips.map((tip) => tip.id);
    window.localStorage.setItem(storageKey, JSON.stringify(allIds));
    setSeenIds(allIds);
    setActiveTip(null);
    setTarget(null);
    setTargetRect(null);
  };

  const currentIndex = guide.tips.findIndex((tip) => tip.id === activeTip.id);
  const gap = 4;
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const spotlightTop = Math.max(0, targetRect.top - gap);
  const spotlightLeft = Math.max(0, targetRect.left - gap);
  const spotlightRight = Math.min(viewportWidth, targetRect.right + gap);
  const spotlightBottom = Math.min(viewportHeight, targetRect.bottom + gap);
  const tooltipWidth = Math.min(224, viewportWidth - 24);
  const tooltipHeightEstimate = 94;
  const targetCenter = targetRect.left + targetRect.width / 2;
  const tooltipLeft = Math.min(
    Math.max(12, targetCenter - tooltipWidth / 2),
    viewportWidth - tooltipWidth - 12,
  );
  const placeBelow = spotlightBottom + tooltipHeightEstimate + 12 <= viewportHeight;
  const tooltipTop = placeBelow
    ? spotlightBottom + 10
    : Math.max(12, spotlightTop - tooltipHeightEstimate - 10);
  const arrowLeft = Math.min(
    Math.max(18, targetCenter - tooltipLeft - 5),
    tooltipWidth - 28,
  );

  return (
    <div aria-live="polite">
      <button
        type="button"
        aria-label="下一个功能提示"
        onClick={advanceGuide}
        className="fixed inset-0 cursor-default bg-transparent focus-visible:outline-none"
        style={{ zIndex: 80 }}
      />
      <div
        className="pointer-events-none fixed border border-white/90 transition-all duration-300"
        style={{
          top: spotlightTop,
          left: spotlightLeft,
          width: Math.max(0, spotlightRight - spotlightLeft),
          height: Math.max(0, spotlightBottom - spotlightTop),
          zIndex: 81,
          borderRadius: 9999,
          boxShadow: [
            '0 0 0 4px rgba(255, 255, 255, 0.18)',
            '0 0 22px 7px rgba(255, 255, 255, 0.2)',
            '0 0 0 9999px rgba(0, 0, 0, 0.46)',
          ].join(', '),
        }}
      />

      <section
        role="dialog"
        aria-label={activeTip.title}
        className="pointer-events-none fixed rounded-md bg-foreground px-3 py-2.5 text-background shadow-[0_12px_34px_rgba(0,0,0,0.28)] transition-all duration-300"
        style={{ top: tooltipTop, left: tooltipLeft, width: tooltipWidth, zIndex: 83 }}
      >
        <span
          aria-hidden
          className="absolute h-2.5 w-2.5 rotate-45 bg-foreground"
          style={placeBelow ? { top: -5, left: arrowLeft } : { bottom: -5, left: arrowLeft }}
        />
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <h2 className="text-[13px] font-semibold leading-5">{activeTip.title}</h2>
            <p className="text-[11px] leading-4 text-background/65">{activeTip.description}</p>
          </div>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              skipPageGuide();
            }}
            aria-label="关闭本页提示"
            title="关闭本页提示"
            className="pointer-events-auto -mr-1 -mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-background/60 transition-colors hover:bg-background/10 hover:text-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-background"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="mt-2 flex items-center justify-between border-t border-background/15 pt-2">
          <span className="flex items-center gap-1 text-[10px] text-background/55">
            <MousePointerClick className="h-3 w-3" />
            任意处继续
          </span>
          <div className="flex items-center gap-1" aria-hidden>
            {guide.tips.map((tip, index) => (
              <span
                key={tip.id}
                className={index === currentIndex ? 'h-1 w-3 bg-background' : 'h-1 w-1 bg-background/30'}
              />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
