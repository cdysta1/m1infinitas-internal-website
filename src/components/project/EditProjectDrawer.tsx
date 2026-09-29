import { useEffect, useMemo, useRef, useState, type ReactElement } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import { SmartImage } from '@/components/common/SmartImage';
import { ImagePicker, type PickedImage } from '@/components/compose/ImagePicker';
import { Button } from '@/components/ui/button';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/hooks/useAuth';
import { ownedProjectsKey } from '@/hooks/useOwnedProjects';
import { projectDetailKey } from '@/hooks/useProjectDetail';
import { projectsFeedKey } from '@/hooks/useProjectsFeed';
import { timelineKey } from '@/hooks/useUpdatesTimeline';
import {
  MAX_IMAGES_PER_POST,
  MAX_PROJECT_SUMMARY_LENGTH,
} from '@/lib/constants';
import { buildPreviewUrl } from '@/lib/media';
import {
  collectProjectMediaAssets,
  type ProjectMediaKind,
} from '@/lib/projectMedia';
import { updateProject } from '@/services/projects';
import { deleteMedia, uploadMany } from '@/services/storage';
import { listUpdatesByProject, saveProjectMediaRecord } from '@/services/updates';
import type { Project } from '@/types/models';

interface EditProjectDrawerProps {
  project: Project;
  trigger: ReactElement;
}

export const projectEditorMediaKey = (projectId: string) =>
  ['projects', 'editor-media', projectId] as const;

interface EditableMediaAsset {
  id: string;
  kind: ProjectMediaKind;
}

function sameMediaList(left: EditableMediaAsset[], right: EditableMediaAsset[]): boolean {
  return left.length === right.length && left.every(
    (item, index) => item.id === right[index]?.id && item.kind === right[index]?.kind,
  );
}

function mediaKindForFile(file: File): ProjectMediaKind {
  return file.type.startsWith('video/') ? 'video' : 'image';
}

function moveFirstImageToFront<T extends { kind: ProjectMediaKind }>(items: T[]): T[] {
  const coverIndex = items.findIndex((item) => item.kind === 'image');
  if (coverIndex <= 0) return items;
  return [items[coverIndex], ...items.filter((_, index) => index !== coverIndex)];
}

function moveFirstPickedImageToFront(items: PickedImage[]): PickedImage[] {
  const coverIndex = items.findIndex((item) => item.file.type.startsWith('image/'));
  if (coverIndex <= 0) return items;
  return [items[coverIndex], ...items.filter((_, index) => index !== coverIndex)];
}

function canDeleteStoredMedia(source: string): boolean {
  return !/^(https?:|data:|blob:)/.test(source);
}

export function EditProjectDrawer({
  project,
  trigger,
}: EditProjectDrawerProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const initializedProjectRef = useRef<string | null>(null);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [existingMedia, setExistingMedia] = useState<EditableMediaAsset[]>([]);
  const [initialMedia, setInitialMedia] = useState<EditableMediaAsset[]>([]);
  const [newImages, setNewImages] = useState<PickedImage[]>([]);
  const [saving, setSaving] = useState(false);

  const mediaQuery = useQuery({
    queryKey: projectEditorMediaKey(project.$id),
    queryFn: () => listUpdatesByProject(project.$id, { limit: 100 }),
    enabled: open,
  });

  const loadedMedia = useMemo<EditableMediaAsset[]>(() => {
    if (!mediaQuery.data) return [];
    return moveFirstImageToFront(
      collectProjectMediaAssets(
        project.cover_file_id,
        mediaQuery.data.updates.map((update) => ({
          content: update.content,
          fileIds: update.file_ids,
        })),
      ).map((asset) => ({ id: asset.source, kind: asset.kind })),
    );
  }, [mediaQuery.data, project]);

  useEffect(() => {
    if (!open) {
      initializedProjectRef.current = null;
      setNewImages((previous) => {
        previous.forEach((image) => URL.revokeObjectURL(image.previewUrl));
        return [];
      });
      return;
    }
    if (!mediaQuery.isSuccess || initializedProjectRef.current === project.$id) {
      return;
    }

    setTitle(project.title);
    setSummary(project.summary);
    setExistingMedia(loadedMedia);
    setInitialMedia(loadedMedia);
    setNewImages([]);
    initializedProjectRef.current = project.$id;
  }, [loadedMedia, mediaQuery.isSuccess, open, project]);

  const totalMedia = existingMedia.length + newImages.length;
  const existingCoverIndex = existingMedia.findIndex((asset) => asset.kind === 'image');
  const hasCoverImage =
    existingMedia.some((asset) => asset.kind === 'image') ||
    newImages.some((image) => image.file.type.startsWith('image/'));
  const dirty =
    title !== project.title ||
    summary !== project.summary ||
    newImages.length > 0 ||
    !sameMediaList(existingMedia, initialMedia);
  const canSave =
    Boolean(user) &&
    title.trim().length > 0 &&
    summary.trim().length > 0 &&
    summary.length <= MAX_PROJECT_SUMMARY_LENGTH &&
    totalMedia > 0 &&
    hasCoverImage &&
    dirty &&
    mediaQuery.isSuccess &&
    !saving;

  const removeExistingImage = (index: number) => {
    setExistingMedia((current) => current.filter((_, itemIndex) => itemIndex !== index));
  };

  const save = async () => {
    if (!canSave || !user) return;
    if (project.owner_id !== user.$id) {
      toast.error('只能编辑自己发布的项目');
      return;
    }

    setSaving(true);
    let uploadedIds: string[] = [];
    try {
      const uploads = await uploadMany(newImages.map((image) => image.file), user.$id);
      uploadedIds = uploads.map((upload) => upload.fileId);
      const uploadedMedia = uploads.map<EditableMediaAsset>((upload, index) => ({
        id: upload.fileId,
        kind: mediaKindForFile(newImages[index].file),
      }));
      const nextMedia = moveFirstImageToFront([...existingMedia, ...uploadedMedia]);
      const nextMediaIds = nextMedia.map((asset) => asset.id);
      const nextTitle = title.trim();
      const nextSummary = summary.trim();

      await updateProject(project.$id, {
        title: nextTitle,
        summary: nextSummary,
        cover_file_id: nextMediaIds[0],
      });

      try {
        await saveProjectMediaRecord({
          projectId: project.$id,
          authorId: user.$id,
          fileIds: nextMediaIds,
          mediaKinds: nextMedia.map((asset) => asset.kind),
        });
      } catch (error) {
        await updateProject(project.$id, {
          title: project.title,
          summary: project.summary,
          cover_file_id: project.cover_file_id,
        });
        throw error;
      }

      const removedIds = initialMedia
        .map((asset) => asset.id)
        .filter((mediaId) => !nextMediaIds.includes(mediaId));
      await Promise.all(
        removedIds
          .filter(canDeleteStoredMedia)
          .map((mediaId) => deleteMedia(mediaId)),
      );

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ownedProjectsKey(user.$id) }),
        queryClient.invalidateQueries({ queryKey: projectsFeedKey }),
        queryClient.invalidateQueries({ queryKey: projectDetailKey(project.$id) }),
        queryClient.invalidateQueries({ queryKey: timelineKey(project.$id) }),
        queryClient.invalidateQueries({ queryKey: ['projects', 'favorites'] }),
        queryClient.invalidateQueries({ queryKey: projectEditorMediaKey(project.$id) }),
      ]);

      toast.success('项目已更新');
      setOpen(false);
    } catch (error) {
      await Promise.all(uploadedIds.map((mediaId) => deleteMedia(mediaId)));
      toast.error((error as Error).message || '项目更新失败');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Drawer
      open={open}
      onOpenChange={(nextOpen) => {
        if (!saving) setOpen(nextOpen);
      }}
    >
      <DrawerTrigger asChild>{trigger}</DrawerTrigger>
      <DrawerContent>
        <DrawerHeader className="relative pr-10">
          <DrawerTitle>编辑项目</DrawerTitle>
          <DrawerDescription>
            修改项目文案、图片和视频；第一张图片会作为封面。
          </DrawerDescription>
          <DrawerClose asChild>
            <Button
              type="button"
              variant="ghost"
              size="iconSm"
              className="absolute right-0 top-0"
              aria-label="关闭项目编辑"
              title="关闭"
              disabled={saving}
            >
              <X className="h-4 w-4" />
            </Button>
          </DrawerClose>
        </DrawerHeader>

        {mediaQuery.isLoading ? (
          <div className="flex min-h-56 items-center justify-center text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="sr-only">正在加载项目资料</span>
          </div>
        ) : mediaQuery.isError ? (
          <div className="rounded-sm border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
            项目资料加载失败，请关闭后重试。
          </div>
        ) : initializedProjectRef.current !== project.$id ? (
          <div className="flex min-h-56 items-center justify-center text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="sr-only">正在整理项目资料</span>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-4">
                <Label>现有媒体</Label>
                <span className="font-mono text-[10px] text-muted-foreground">
                  {totalMedia}/{MAX_IMAGES_PER_POST}
                </span>
              </div>
              {existingMedia.length > 0 && (
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {existingMedia.map((asset, index) => (
                    <div key={asset.id} className="group relative aspect-square overflow-hidden rounded-sm bg-muted">
                      {asset.kind === 'video' ? (
                        <video
                          src={buildPreviewUrl(asset.id, 'thumb')}
                          aria-label={`${project.title} 视频 ${index + 1}`}
                          className="h-full w-full object-cover"
                          muted
                          playsInline
                          preload="metadata"
                        />
                      ) : (
                        <SmartImage
                          src={buildPreviewUrl(asset.id, 'thumb')}
                          alt={`${project.title} 图片 ${index + 1}`}
                          wrapperClassName="h-full w-full"
                          imgClassName="object-cover"
                        />
                      )}
                      {index === existingCoverIndex && (
                        <span className="absolute left-1 top-1 bg-black/70 px-1.5 py-0.5 text-[10px] text-white">
                          封面
                        </span>
                      )}
                      {asset.kind === 'video' && (
                        <span className="absolute bottom-1 left-1 bg-black/70 px-1.5 py-0.5 text-[10px] text-white">
                          视频
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => removeExistingImage(index)}
                        disabled={saving}
                        aria-label={`移除第 ${index + 1} 个媒体`}
                        title="移除媒体"
                        className="absolute right-1 top-1 flex h-7 w-7 items-center justify-center rounded-full bg-black/70 text-white opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white [@media(hover:none)]:opacity-100"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {totalMedia < MAX_IMAGES_PER_POST && (
                <ImagePicker
                  value={newImages}
                  onChange={(next) => setNewImages(
                    existingCoverIndex >= 0 ? next : moveFirstPickedImageToFront(next),
                  )}
                  max={MAX_IMAGES_PER_POST - existingMedia.length}
                  disabled={saving}
                  showFirstAsCover={existingCoverIndex < 0 && Boolean(newImages[0]?.file.type.startsWith('image/'))}
                  hint={`可继续添加 ${MAX_IMAGES_PER_POST - totalMedia} 个媒体；保存后按当前顺序展示`}
                />
              )}
              {!hasCoverImage && (
                <p className="text-xs text-destructive">项目至少需要保留一张图片作为封面。</p>
              )}
            </div>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="edit-project-title">项目名称</Label>
                <Input
                  id="edit-project-title"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  maxLength={80}
                  disabled={saving}
                />
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-4">
                  <Label htmlFor="edit-project-summary">项目介绍</Label>
                  <span className="font-mono text-[10px] text-muted-foreground">
                    {summary.length}/{MAX_PROJECT_SUMMARY_LENGTH}
                  </span>
                </div>
                <Textarea
                  id="edit-project-summary"
                  value={summary}
                  onChange={(event) => setSummary(event.target.value)}
                  maxLength={MAX_PROJECT_SUMMARY_LENGTH}
                  rows={6}
                  disabled={saving}
                  className="min-h-36"
                />
              </div>
            </div>
          </div>
        )}

        <DrawerFooter>
          <Button size="lg" className="w-full" onClick={() => void save()} disabled={!canSave}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                保存中…
              </>
            ) : (
              '保存修改'
            )}
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
