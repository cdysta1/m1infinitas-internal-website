import { useMutation, useQueryClient, type InfiniteData } from '@tanstack/react-query';
import { createUpdate } from '@/services/updates';
import { touchProject } from '@/services/projects';
import { uploadMany } from '@/services/storage';
import { useAuth } from './useAuth';
import { timelineKey, type TimelinePage } from './useUpdatesTimeline';
import { projectsFeedKey } from './useProjectsFeed';
import { OPTIMISTIC } from '@/lib/constants';
import { tempId } from '@/lib/utils';
import type { TimelineEntry, UpdateItem } from '@/types/models';

export interface CreateUpdateArgs {
  projectId: string;
  content: string;
  files: File[];
  localPreviewUrls: string[];
}

// Optimistic update mutation:
// 1. Insert a pending entry at the top of the timeline cache immediately.
// 2. Upload files → create update document → touch project.updated_at.
// 3. Replace temp entry with the server response on success,
//    or mark it failed on error so the user can retry.
export function useCreateUpdate() {
  const qc = useQueryClient();
  const { user, profile } = useAuth();

  return useMutation<UpdateItem, Error, CreateUpdateArgs, { tempEntryId: string; projectId: string }>({
    mutationFn: async ({ projectId, content, files }) => {
      if (!user) throw new Error('未登录');
      const uploads = files.length > 0 ? await uploadMany(files, user.$id) : [];
      const doc = await createUpdate({
        project_id: projectId,
        content,
        author_id: user.$id,
        file_ids: uploads.map((u) => u.fileId),
      });
      // Fire-and-forget: only the project owner can succeed here.
      void touchProject(projectId);
      return doc;
    },
    onMutate: async ({ projectId, content, files, localPreviewUrls }) => {
      const tempEntryId = tempId('upd');
      const nowIso = new Date().toISOString();
      await qc.cancelQueries({ queryKey: timelineKey(projectId) });

      const optimistic: TimelineEntry = {
        id: tempEntryId,
        projectId,
        authorId: user?.$id ?? '',
        content,
        createdAt: nowIso,
        fileIds: [],
        localPreviewUrls,
        isLocal: true,
        status: OPTIMISTIC.PENDING,
        // Keep original payload in memory so the UI can offer a retry on failure.
        // Note: not persisted — a page refresh drops the retry handle.
        retryPayload: { content, files },
      };

      qc.setQueryData<InfiniteData<TimelinePage>>(timelineKey(projectId), (old) => {
        if (!old || old.pages.length === 0) {
          return {
            pages: [
              {
                entries: [optimistic],
                authors:
                  user && profile
                    ? new Map([[user.$id, profile]])
                    : new Map<string, never>(),
                cursor: undefined,
                total: 1,
              },
            ],
            pageParams: [undefined],
          };
        }
        const first = old.pages[0];
        return {
          ...old,
          pages: [
            { ...first, entries: [optimistic, ...first.entries] },
            ...old.pages.slice(1),
          ],
        };
      });

      return { tempEntryId, projectId };
    },
    onSuccess: (doc, _vars, ctx) => {
      const serverEntry: TimelineEntry = {
        id: doc.$id,
        projectId: doc.project_id,
        authorId: doc.author_id,
        content: doc.content,
        createdAt: doc.created_at,
        fileIds: doc.file_ids ?? [],
        isLocal: false,
        status: OPTIMISTIC.SENT,
      };
      replaceEntryInCache(qc, ctx.projectId, ctx.tempEntryId, serverEntry);
      qc.invalidateQueries({ queryKey: projectsFeedKey });
    },
    onError: (_err, _vars, ctx) => {
      if (!ctx) return;
      markEntryFailed(qc, ctx.projectId, ctx.tempEntryId);
    },
  });
}

function replaceEntryInCache(
  qc: ReturnType<typeof useQueryClient>,
  projectId: string,
  tempId: string,
  serverEntry: TimelineEntry,
) {
  qc.setQueryData<InfiniteData<TimelinePage>>(timelineKey(projectId), (old) => {
    if (!old) return old;
    return {
      ...old,
      pages: old.pages.map((page) => ({
        ...page,
        entries: page.entries.map((e) => (e.id === tempId ? serverEntry : e)),
      })),
    };
  });
}

function markEntryFailed(
  qc: ReturnType<typeof useQueryClient>,
  projectId: string,
  tempId: string,
) {
  qc.setQueryData<InfiniteData<TimelinePage>>(timelineKey(projectId), (old) => {
    if (!old) return old;
    return {
      ...old,
      pages: old.pages.map((page) => ({
        ...page,
        entries: page.entries.map((e) =>
          e.id === tempId ? { ...e, status: OPTIMISTIC.FAILED } : e,
        ),
      })),
    };
  });
}
