import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
  getFavoriteMemberIds,
  saveFavoriteMemberIds,
} from '@/services/memberFavorites';

export function useFavoriteMembers(userId?: string) {
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
        if (!cancelled) toast.error('收藏成员加载失败');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [userId]);

  const favoriteSet = useMemo(() => new Set(favoriteIds), [favoriteIds]);

  const toggleFavorite = useCallback(
    async (memberId: string) => {
      if (!userId || pendingId) return;

      const previous = favoriteIdsRef.current;
      const next = previous.includes(memberId)
        ? previous.filter((id) => id !== memberId)
        : [memberId, ...previous];

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
        toast.error('收藏状态保存失败');
      } finally {
        setPendingId(null);
      }
    },
    [pendingId, userId],
  );

  return {
    favoriteIds,
    favoriteSet,
    isLoading,
    pendingId,
    toggleFavorite,
  };
}
