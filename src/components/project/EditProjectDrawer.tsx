import { useI18n } from '@/app/I18nProvider';
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
import { membersDirectoryKey } from '@/hooks/useMembersDirectory';
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
import { cn } from '@/lib/utils';
import { useLocation, useNavigate } from 'react-router-dom';
import { deleteProject, updateProject } from '@/services/projects';
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
  const { t, errorText } = useI18n();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const initializedProjectRef = useRef<string | null>(null);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [existingMedia, setExistingMedia] = useState<EditableMediaAsset[]>([]);
  const [initialMedia, setInitialMedia] = useState<EditableMediaAsset[]>([]);
  const [newImages, setNewImages] = useState<PickedImage[]>([]);
  const newImagesRef = useRef<PickedImage[]>([]);
  newImagesRef.current = newImages;
  const [status, setStatus] = useState(project.status);
  const [disclose, setDisclose] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const [saving, setSaving] = useState(false);

  useEffect(() => () => {
    newImagesRef.current.forEach((image) => URL.revokeObjectURL(image.previewUrl));
  }, []);

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
          authorId: update.author_id,
        })),
        project.owner_id,
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

    setDisclose(false);
    setStatus(project.status);
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
    disclose || status !== project.status || title.trim() !== project.title ||
    summary.trim() !== project.summary ||
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

  const removeProject = async () => {
    if (!user || user.$id !== project.owner_id || saving) return;
    if (!window.confirm(t('确定删除《{title}》？删除后无法恢复。', { title: project.title }))) return;
    setSaving(true);
    try {
      await deleteProject(project.$id);
      setOpen(false);
      queryClient.removeQueries({ queryKey: projectDetailKey(project.$id) });
      if (location.pathname === '/projects/' + project.$id) navigate('/', { replace: true });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['projects'] }),
        queryClient.invalidateQueries({ queryKey: membersDirectoryKey }),
      ]);
      toast.success(t('项目已删除'));
    } catch (error) {
      toast.error(errorText(error, '删除项目失败'));
    } finally {
      setSaving(false);
    }
  };

  const removeExistingImage = (index: number) => {
    setExistingMedia((current) => current.filter((_, itemIndex) => itemIndex !== index));
  };

  const save = async () => {
    if (!canSave || !user) return;
    if (project.owner_id !== user.$id) {
      toast.error(t('只能编辑自己发布的项目'));
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

      const mediaChanged = !sameMediaList(existingMedia, initialMedia) || newImages.length > 0;
      if (mediaChanged) {
        await saveProjectMediaRecord({
          projectId: project.$id,
          authorId: user.$id,
          fileIds: nextMediaIds,
          mediaKinds: nextMedia.map(asset => asset.kind),
        });
        // The saved media record now references these uploads, even if the next write fails.
        uploadedIds = [];
      }
      await updateProject(project.$id, {
        title: nextTitle,
        summary: nextSummary,
        cover_file_id: nextMediaIds[0],
        ...(disclose && { is_anonymous: false }),
        ...(status !== project.status && { status }),
      });

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
        queryClient.invalidateQueries({ queryKey: membersDirectoryKey }),
      ]);

      toast.success(t('项目已更新'));
      setOpen(false);
    } catch (error) {
      await Promise.all(uploadedIds.map((mediaId) => deleteMedia(mediaId)));
      toast.error(errorText(error, '项目更新失败'));
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
          <DrawerTitle>{t('编辑项目')}</DrawerTitle>
          <DrawerDescription>{t('修改项目文案、图片和视频；第一张图片会作为封面。')}</DrawerDescription>
          <DrawerClose asChild>
            <Button
              type="button"
              variant="ghost"
              size="iconSm"
              className="absolute right-0 top-0"
              aria-label={t('关闭项目编辑')}
              title={t('关闭')}
              disabled={saving}
            >
              <X className="h-4 w-4" />
            </Button>
          </DrawerClose>
        </DrawerHeader>

        {mediaQuery.isLoading ? (
          <div className="flex min-h-56 items-center justify-center text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="sr-only">{t('正在加载项目资料')}</span>
          </div>
        ) : mediaQuery.isError ? (
          <div className="rounded-sm border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">{t('项目资料加载失败，请关闭后重试。')}</div>
        ) : initializedProjectRef.current !== project.$id ? (
          <div className="flex min-h-56 items-center justify-center text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="sr-only">{t('正在整理项目资料')}</span>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-4">
                <Label>{t('现有媒体')}</Label>
                <span className="font-mono text-[10px] text-muted-foreground">
                  {totalMedia}/{MAX_IMAGES_PER_POST}
                </span>
              </div>
              {existingMedia.length > 0 && (
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {existingMedia.map((asset, index) => (
                    <div key={asset.id} className="group relative aspect-square overflow-hidden rounded-xl bg-muted ring-1 ring-inset ring-black/[0.04]">
                      {asset.kind === 'video' ? (
                        <video
                          src={buildPreviewUrl(asset.id, 'thumb')}
                          aria-label={t('{name} 视频 {index}', { name: project.title, index: index + 1 })}
                          className="h-full w-full object-cover"
                          muted
                          playsInline
                          preload="metadata"
                        />
                      ) : (
                        <SmartImage
                          src={buildPreviewUrl(asset.id, 'thumb')}
                          alt={t('{name} 图片 {index}', { name: project.title, index: index + 1 })}
                          wrapperClassName="h-full w-full"
                          imgClassName="object-cover"
                        />
                      )}
                      {index === existingCoverIndex && (
                        <span className="absolute left-1 top-1 bg-black/70 px-1.5 py-0.5 text-[10px] text-white">{t('封面')}</span>
                      )}
                      {asset.kind === 'video' && (
                        <span className="absolute bottom-1 left-1 bg-black/70 px-1.5 py-0.5 text-[10px] text-white">{t('视频')}</span>
                      )}
                      <button
                        type="button"
                        onClick={() => removeExistingImage(index)}
                        disabled={saving}
                        aria-label={t('移除第 {index} 个媒体', { index: index + 1 })}
                        title={t('移除媒体')}
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
                  hint={t('可继续添加 {count} 个媒体；保存后按当前顺序展示', { count: MAX_IMAGES_PER_POST - totalMedia })}
                />
              )}
              {!hasCoverImage && (
                <p className="text-xs text-destructive">{t('项目至少需要保留一张图片作为封面。')}</p>
              )}
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label id="edit-project-status-label">{t('项目状态')}</Label>
                <div
                  role="radiogroup"
                  aria-labelledby="edit-project-status-label"
                  className="grid grid-cols-2 gap-1.5 rounded-full bg-muted/60 p-1"
                >
                  <button
                    type="button"
                    role="radio"
                    aria-checked={status === 'active'}
                    disabled={saving}
                    onClick={() => setStatus('active')}
                    className={cn(
                      'flex h-9 items-center justify-center gap-1.5 rounded-full text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      status === 'active'
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden />
                    {t('进行中')}
                  </button>
                  <button
                    type="button"
                    role="radio"
                    aria-checked={status === 'done'}
                    disabled={saving}
                    onClick={() => setStatus('done')}
                    className={cn(
                      'flex h-9 items-center justify-center gap-1.5 rounded-full text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      status === 'done'
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50" aria-hidden />
                    {t('已结束')}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">
                  {status === 'active'
                    ? t('展示在画廊并接收成员投递')
                    : t('归档至已结束列表并停止接收投递')}
                </p>
              </div>

              {project.is_anonymous && (
                <label className="flex items-center gap-2 py-1 text-sm">
                  <input type="checkbox" checked={disclose} disabled={saving}
                    onChange={event => setDisclose(event.target.checked)} />
                  {t('改为署名（保存后无法再匿名）')}
                </label>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="edit-project-title">{t('项目名称')}</Label>
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
                  <Label htmlFor="edit-project-summary">{t('项目介绍')}</Label>
                  <span className="font-mono text-[11px] tabular-nums text-muted-foreground/80">
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
                  className="min-h-[148px]"
                />
              </div>
            </div>
          </div>
        )}

        <DrawerFooter>
          <Button size="lg" className="w-full rounded-full" onClick={() => void save()} disabled={!canSave}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />{t('保存中…')}</>
            ) : (
              t('保存修改')
            )}
          </Button>
          {user?.$id === project.owner_id && (
            <Button variant="ghost" className="text-destructive" disabled={saving} onClick={() => void removeProject()}>
              {t('删除项目')}
            </Button>
          )}
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
