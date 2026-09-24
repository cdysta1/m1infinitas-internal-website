import { useMutation, useQueryClient, type InfiniteData } from '@tanstack/react-query';
import { createProject, touchProject } from '@/services/projects';
import { uploadMany } from '@/services/storage';
import { useAuth } from './useAuth';
import { projectsFeedKey, type FeedPage } from './useProjectsFeed';
import { OPTIMISTIC, PROJECT_STATUS } from '@/lib/constants';
import { tempId } from '@/lib/utils';
import type { Profile, Project, TimelineEntry } from '@/types/models';
import { timelineKey, type TimelinePage } from './useUpdatesTimeline';

export interface CreateProjectArgs {
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
// 3. Upload images, then create the real project + first update on server.
// 4. Replace the placeholder ids on success, or mark failed on error.
export function useCreateProject() {
  const qc = useQueryClient();
  const { user, profile } = useAuth();

  return useMutation<CreateProjectResult, Error, CreateProjectArgs, { tempProjectId: string; tempUpdateId: string }>({
    mutationFn: async ({ title, summary, files }) => {
      if (!user) throw new Error('未登录');
      if (files.length === 0) throw new Error('至少选择 1 张图片');
      const uploads = await uploadMany(files, user.$id);
      const cover = uploads[0].fileId;
      const project = await createProject({
        title,
        summary,
        cover_file_id: cover,
        owner_id: user.$id,
      });
      return { project };
    },
    onMutate: async ({ title, summary, localPreviewUrls }) => {
      const tempProjectId = tempId('proj');
      const tempUpdateId = tempId('upd');
      const nowIso = new Date().toISOString();
      const owner = profile ?? undefined;

      // Cancel in-flight feed refetch to avoid clobbering our optimistic data.
      await qc.cancelQueries({ queryKey: projectsFeedKey });

      const prevFeed = qc.getQueryData<InfiniteData<FeedPage>>(projectsFeedKey);
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
        owner_id: user?.$id ?? '',
        status: PROJECT_STATUS.ACTIVE,
        updated_at: nowIso,
      };
      if (prevFeed && prevFeed.pages.length > 0) {
        const first = prevFeed.pages[0];
        const nextOwners = new Map<string, Profile>(first.owners);
        if (owner && user) nextOwners.set(user.$id, owner);
        qc.setQueryData<InfiniteData<FeedPage>>(projectsFeedKey, {
          ...prevFeed,
          pages: [
            { ...first, projects: [optimisticProject, ...first.projects], owners: nextOwners },
            ...prevFeed.pages.slice(1),
          ],
        });
      }

      // Seed the detail timeline cache so the transition to detail page is instant.
      const optimisticEntry: TimelineEntry = {
        id: tempUpdateId,
        projectId: tempProjectId,
        authorId: user?.$id ?? '',
        content: summary,
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
      const prevFeed = qc.getQueryData<InfiniteData<FeedPage>>(projectsFeedKey);
      if (prevFeed) {
        qc.setQueryData<InfiniteData<FeedPage>>(projectsFeedKey, {
          ...prevFeed,
          pages: prevFeed.pages.map((page) => ({
            ...page,
            projects: page.projects.map((p) =>
              p.$id === ctx.tempProjectId ? project : p,
            ),
          })),
        });
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

      // Bump updated_at so the gallery re-sorts.
      await touchProject(project.$id);
      qc.invalidateQueries({ queryKey: projectsFeedKey });
    },
    onError: (_err, _vars, ctx) => {
      if (!ctx) return;
      // Mark the seeded timeline entry as failed so the UI can offer a retry.
      qc.setQueryData<InfiniteData<TimelinePage>>(
        timelineKey(ctx.tempProjectId),
        (old) => {
          if (!old) return old;
          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              entries: page.entries.map((e) =>
                e.id === ctx.tempUpdateId ? { ...e, status: OPTIMISTIC.FAILED } : e,
              ),
            })),
          };
        },
      );
      // Also mark the feed project as failed via a soft flag on the summary text.
      qc.setQueryData<InfiniteData<FeedPage>>(projectsFeedKey, (old) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page) => ({
            ...page,
            projects: page.projects.map((p) =>
              p.$id === ctx.tempProjectId
                ? { ...p, summary: `[发布失败] ${p.summary}` }
                : p,
            ),
          })),
        };
      });
    },
  });
}
