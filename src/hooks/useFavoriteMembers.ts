import { useI18n } from '@/app/I18nProvider';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import type { MemberDirectoryEntry } from '@/lib/memberDirectory';
import {
  getFavoriteMemberIds,
  saveFavoriteMemberIds,
} from '@/services/memberFavorites';

export function useFavoriteMembers(userId?: string, members: MemberDirectoryEntry[] = []) {
  const { t } = useI18n();
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(Boolean(userId));
  const [pendingId, setPendingId] = useState<string | null>(null);
  const favoriteIdsRef = useRef<string[]>([]);

  useEffect(() => {
    let cancelled = false;

    if (!userId) {
      favoriteIdsRef.current = [];
      setFavoriteIds([]);
      setIsLoading(false);
      return undefined;
    }

    setIsLoading(true);
    void getFavoriteMemberIds(userId)
      .then((ids) => {
        if (cancelled) return;
        favoriteIdsRef.current = ids;
        setFavoriteIds(ids);
      })
      .catch(() => {
        if (!cancelled) toast.error(t('收藏成员加载失败'));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [userId]);

  const resolveIds = useCallback((ids: string[]) => {
    const aliases = new Map(
      members.flatMap((member) => member.accountId
        ? [[member.accountId, member.profile.$id] as const]
        : []),
    );
    return Array.from(new Set(ids.map((id) => aliases.get(id) ?? id)));
  }, [members]);
  const resolvedIds = useMemo(() => resolveIds(favoriteIds), [favoriteIds, resolveIds]);
  const favoriteSet = useMemo(() => new Set(resolvedIds), [resolvedIds]);

  const toggleFavorite = useCallback(
    async (memberId: string) => {
      if (!userId || pendingId) return;

      const previous = favoriteIdsRef.current;
      const current = resolveIds(previous);
      const next = current.includes(memberId)
        ? current.filter((id) => id !== memberId)
        : [memberId, ...current];

      favoriteIdsRef.current = next;
      setFavoriteIds(next);
      setPendingId(memberId);

      try {
        const saved = await saveFavoriteMemberIds(userId, next);
        favoriteIdsRef.current = saved;
        setFavoriteIds(saved);
      } catch {
        favoriteIdsRef.current = previous;
        setFavoriteIds(previous);
        toast.error(t('收藏状态保存失败'));
      } finally {
        setPendingId(null);
      }
    },
    [pendingId, userId, resolveIds, t],
  );

  return {
    favoriteIds: resolvedIds,
    favoriteSet,
    isLoading,
    pendingId,
    toggleFavorite,
  };
}
