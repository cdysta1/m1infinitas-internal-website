import { useI18n } from '@/app/I18nProvider';
import { useMutation, useQueryClient, type InfiniteData } from '@tanstack/react-query';
import { createProject, deleteProject } from '@/services/projects';
import { createUpdate } from '@/services/updates';
import { uploadMany } from '@/services/storage';
import { useAuth } from './useAuth';
import { membersDirectoryKey } from './useMembersDirectory';
import { ownedProjectsKey } from './useOwnedProjects';
import { projectsFeedFilterKey, projectsFeedKey, type FeedPage } from './useProjectsFeed';
import {
  MAX_PROJECT_SUMMARY_LENGTH,
  OPTIMISTIC,
  PROJECT_STATUS,
} from '@/lib/constants';
import { serializeProjectMediaRecord } from '@/lib/projectMedia';
import { tempId } from '@/lib/utils';
import type { Profile, Project, TimelineEntry } from '@/types/models';
import { timelineKey, type TimelinePage } from './useUpdatesTimeline';

export interface CreateProjectArgs {
  anonymous: boolean;
  title: string;
  summary: string;
  files: File[];
  // Preview URLs (blob:) used to render the optimistic timeline entry before
  // uploads finish. The first file's preview is also used for the cover.
  localPreviewUrls: string[];
}

export interface CreateProjectResult {
  project: Project;
}

// Optimistic project creation:
// 1. Insert a placeholder project into the feed cache immediately.
// 2. Insert a first timeline entry marked "pending" for the initial post.
// 3. Upload images, then create the real project + its persisted media record.
// 4. Replace the placeholder ids on success, or mark failed on error.
export function useCreateProject() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const { user, profile } = useAuth();

  return useMutation<CreateProjectResult, Error, CreateProjectArgs, { tempProjectId: string; tempUpdateId: string }>({
    mutationFn: async ({ anonymous, title, summary, files }) => {
      if (!user) throw new Error(t('未登录'));
      if (files.length === 0) throw new Error(t('至少选择 1 张图片'));
      if (!files[0].type.startsWith('image/')) {
        throw new Error(t('项目需要至少 1 张图片作为封面'));
      }
      if (summary.length > MAX_PROJECT_SUMMARY_LENGTH) {
        throw new Error(t('项目介绍不能超过 {count} 字', { count: MAX_PROJECT_SUMMARY_LENGTH }));
      }
      const uploads = await uploadMany(files, user.$id);
      const cover = uploads[0].fileId;
      const project = await createProject({
        title,
        summary,
        cover_file_id: cover,
        is_anonymous: anonymous,
        owner_id: user.$id,
      });
      try {
        await createUpdate({
          project_id: project.$id,
          content: serializeProjectMediaRecord(
            files.map((file) => file.type.startsWith('video/') ? 'video' : 'image'),
          ),
          author_id: user.$id,
          file_ids: uploads.map((upload) => upload.fileId),
        });
      } catch (err) {
        await deleteProject(project.$id).catch(() => undefined);
        throw err;
      }
      return { project };
    },
    onMutate: async ({ anonymous, title, summary, files, localPreviewUrls }) => {
      const tempProjectId = tempId('proj');
      const tempUpdateId = tempId('upd');
      const nowIso = new Date().toISOString();
      const owner = profile ?? undefined;

      // Cancel in-flight feed refetch to avoid clobbering our optimistic data.
      await qc.cancelQueries({ queryKey: projectsFeedKey });

      const optimisticProject: Project = {
        $id: tempProjectId,
        $collectionId: '',
        $databaseId: '',
        $createdAt: nowIso,
        $updatedAt: nowIso,
        $permissions: [],
        title,
        summary,
        cover_file_id: '',
        is_anonymous: anonymous,
        owner_id: user?.$id ?? '',
        status: PROJECT_STATUS.ACTIVE,
        updated_at: nowIso,
      };
      for (const feedKey of [projectsFeedFilterKey('active'), projectsFeedFilterKey('all')]) {
        const prevFeed = qc.getQueryData<InfiniteData<FeedPage>>(feedKey);
        if (prevFeed && prevFeed.pages.length > 0) {
          const first = prevFeed.pages[0];
          const nextOwners = new Map<string, Profile>(first.owners);
          if (owner && user) nextOwners.set(user.$id, owner);
          qc.setQueryData<InfiniteData<FeedPage>>(feedKey, {
            ...prevFeed,
            pages: [
              { ...first, projects: [optimisticProject, ...first.projects], owners: nextOwners },
              ...prevFeed.pages.slice(1),
            ],
          });
        }
      }

      // Seed the detail timeline cache so the transition to detail page is instant.
      const optimisticEntry: TimelineEntry = {
        id: tempUpdateId,
        projectId: tempProjectId,
        authorId: user?.$id ?? '',
        content: serializeProjectMediaRecord(
          files.map((file) => file.type.startsWith('video/') ? 'video' : 'image'),
        ),
        createdAt: nowIso,
        fileIds: [],
        localPreviewUrls,
        isLocal: true,
        status: OPTIMISTIC.PENDING,
      };
      qc.setQueryData<InfiniteData<TimelinePage>>(timelineKey(tempProjectId), {
        pages: [
          {
            entries: [optimisticEntry],
            authors: owner && user ? new Map([[user.$id, owner]]) : new Map(),
            cursor: undefined,
            total: 1,
          },
        ],
        pageParams: [undefined],
      });

      return { tempProjectId, tempUpdateId };
    },
    onSuccess: async ({ project }, _vars, ctx) => {
      // Re-key caches: replace temp project id with real one.
      for (const feedKey of [projectsFeedFilterKey('active'), projectsFeedFilterKey('all')]) {
        const prevFeed = qc.getQueryData<InfiniteData<FeedPage>>(feedKey);
        if (prevFeed) {
          qc.setQueryData<InfiniteData<FeedPage>>(feedKey, {
            ...prevFeed,
            pages: prevFeed.pages.map((page) => ({
              ...page,
              projects: page.projects.map((p) =>
                p.$id === ctx.tempProjectId ? project : p,
              ),
            })),
          });
        }
      }

      // Move the optimistic timeline to the real project id.
      const prevTimeline = qc.getQueryData<InfiniteData<TimelinePage>>(
        timelineKey(ctx.tempProjectId),
      );
      if (prevTimeline) {
        qc.setQueryData<InfiniteData<TimelinePage>>(timelineKey(project.$id), {
          ...prevTimeline,
          pages: prevTimeline.pages.map((page) => ({
            ...page,
            entries: page.entries.map((e) => ({
              ...e,
              projectId: project.$id,
            })),
          })),
        });
        qc.removeQueries({ queryKey: timelineKey(ctx.tempProjectId) });
      }

      await Promise.all([
        qc.invalidateQueries({ queryKey: timelineKey(project.$id) }),
        qc.invalidateQueries({ queryKey: projectsFeedKey }),
        qc.invalidateQueries({ queryKey: ownedProjectsKey(project.owner_id) }),
        qc.invalidateQueries({ queryKey: membersDirectoryKey }),
      ]);
    },
    onError: (_err, _vars, ctx) => {
      if (!ctx) return;
      qc.removeQueries({ queryKey: timelineKey(ctx.tempProjectId) });
      // Remove the failed optimistic placeholder from the feed so no broken card lingers.
      for (const feedKey of [projectsFeedFilterKey('active'), projectsFeedFilterKey('all')]) {
        qc.setQueryData<InfiniteData<FeedPage>>(feedKey, (old) => {
          if (!old) return old;
          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              projects: page.projects.filter((p) => p.$id !== ctx.tempProjectId),
            })),
          };
        });
      }
    },
  });
}
