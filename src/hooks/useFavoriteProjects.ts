import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
  getFavoriteProjectIds,
  saveFavoriteProjectIds,
} from '@/services/projectFavorites';

export function useFavoriteProjects(userId?: string) {
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
    void getFavoriteProjectIds(userId)
      .then((ids) => {
        if (cancelled) return;
        favoriteIdsRef.current = ids;
        setFavoriteIds(ids);
      })
      .catch(() => {
        if (!cancelled) toast.error('收藏项目加载失败');
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
    async (projectId: string) => {
      if (!userId || pendingId) return;

      const previous = favoriteIdsRef.current;
      const next = previous.includes(projectId)
        ? previous.filter((id) => id !== projectId)
        : [projectId, ...previous];

      favoriteIdsRef.current = next;
      setFavoriteIds(next);
      setPendingId(projectId);

      try {
        const saved = await saveFavoriteProjectIds(userId, next);
        favoriteIdsRef.current = saved;
        setFavoriteIds(saved);
      } catch {
        favoriteIdsRef.current = previous;
        setFavoriteIds(previous);
        toast.error('项目收藏状态保存失败');
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
