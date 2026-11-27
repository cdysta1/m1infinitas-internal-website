import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useI18n } from '@/app/I18nProvider';
import { useAuth } from '@/hooks/useAuth';
import { membersDirectoryKey } from '@/hooks/useMembersDirectory';
import { ownedProjectsKey } from '@/hooks/useOwnedProjects';
import { projectDetailKey } from '@/hooks/useProjectDetail';
import { projectsFeedKey } from '@/hooks/useProjectsFeed';
import { PROJECT_STATUS, type ProjectStatus } from '@/lib/constants';
import { updateProjectStatus } from '@/services/projects';
import type { Project } from '@/types/models';

export function useToggleProjectStatus() {
  const { t, errorText } = useI18n();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [pendingProjectId, setPendingProjectId] = useState<string | null>(null);

  const toggleStatus = async (project: Project, nextStatus?: ProjectStatus) => {
    if (!user || project.owner_id !== user.$id || pendingProjectId !== null) return;
    const targetStatus: ProjectStatus =
      nextStatus ?? (project.status === PROJECT_STATUS.ACTIVE ? PROJECT_STATUS.DONE : PROJECT_STATUS.ACTIVE);
    if (targetStatus === project.status) return;

    setPendingProjectId(project.$id);
    try {
      const updated = await updateProjectStatus(project.$id, targetStatus);
      queryClient.setQueryData(projectDetailKey(project.$id), updated);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ownedProjectsKey(user.$id) }),
        queryClient.invalidateQueries({ queryKey: projectsFeedKey }),
        queryClient.invalidateQueries({ queryKey: projectDetailKey(project.$id) }),
        queryClient.invalidateQueries({ queryKey: ['projects', 'favorites'] }),
        queryClient.invalidateQueries({ queryKey: membersDirectoryKey }),
      ]);
      toast.success(
        targetStatus === PROJECT_STATUS.DONE ? t('已标记为已结束') : t('已恢复为进行中'),
      );
    } catch (err) {
      toast.error(errorText(err, '项目状态更新失败'));
    } finally {
      setPendingProjectId(null);
    }
  };

  return {
    pendingProjectId,
    toggleStatus,
  };
}
