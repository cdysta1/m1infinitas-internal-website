import { useI18n } from '@/app/I18nProvider';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ImagePicker, type PickedImage } from './ImagePicker';
import { useCreateProject } from '@/hooks/useCreateProject';
import { MAX_PROJECT_SUMMARY_LENGTH } from '@/lib/constants';

interface CreateProjectDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function moveFirstImageToFront(items: PickedImage[]): PickedImage[] {
  const coverIndex = items.findIndex((item) => item.file.type.startsWith('image/'));
  if (coverIndex <= 0) return items;
  return [items[coverIndex], ...items.filter((_, index) => index !== coverIndex)];
}

export function CreateProjectDrawer({ open, onOpenChange }: CreateProjectDrawerProps) {
  const { t, errorText } = useI18n();
  const navigate = useNavigate();
  const createProject = useCreateProject();
  const [anonymous, setAnonymous] = useState(false);
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [images, setImages] = useState<PickedImage[]>([]);
  const imagesRef = useRef<PickedImage[]>([]);
  imagesRef.current = images;

  // Release blob URLs on unmount.
  useEffect(() => () => {
    imagesRef.current.forEach((p) => URL.revokeObjectURL(p.previewUrl));
  }, []);

  // Reset state whenever the drawer closes (and is not uploading) or opens fresh.
  useEffect(() => {
    if (!open && !createProject.isPending) {
      setAnonymous(false);
      setTitle('');
      setSummary('');
      setImages((prev) => {
        prev.forEach((p) => URL.revokeObjectURL(p.previewUrl));
        return [];
      });
    }
  }, [createProject.isPending, open]);

  const canSubmit =
    title.trim().length > 0 &&
    summary.trim().length > 0 &&
    images.length > 0 &&
    images.some((image) => image.file.type.startsWith('image/')) &&
    !createProject.isPending;

  const onSubmit = () => {
    if (!canSubmit) return;
    createProject.mutate(
      {
        anonymous,
        title: title.trim(),
        summary: summary.trim(),
        files: images.map((i) => i.file),
        localPreviewUrls: images.map((i) => i.previewUrl),
      },
      {
        onSuccess: ({ project }) => {
          toast.success(t('已发布'));
          onOpenChange(false);
          navigate(`/projects/${project.$id}`);
        },
        onError: (err) => {
          toast.error(errorText(err, '发布失败，请重试'));
        },
      },
    );
  };

  return (
    <Drawer
      open={open}
      onOpenChange={(nextOpen) => {
        if (!createProject.isPending) onOpenChange(nextOpen);
      }}
    >
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>{t('发布新项目')}</DrawerTitle>
          <DrawerDescription>{t('选择图片或视频，再写一段项目介绍')}</DrawerDescription>
        </DrawerHeader>

        <div className="space-y-4">
          <ImagePicker
            value={images}
            onChange={(next) => setImages(moveFirstImageToFront(next))}
            disabled={createProject.isPending}
            showFirstAsCover={Boolean(images[0]?.file.type.startsWith('image/'))}
            hint={t('至少 1 张图片作为封面；图片与视频合计最多 9 个')}
          />

          <div className="space-y-2.5">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('项目标题')}
              maxLength={80}
              disabled={createProject.isPending}
              autoFocus
            />
            <Textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder={t('项目介绍（最多 {count} 字）', { count: MAX_PROJECT_SUMMARY_LENGTH })}
              maxLength={MAX_PROJECT_SUMMARY_LENGTH}
              rows={5}
              disabled={createProject.isPending}
              aria-describedby="project-summary-count"
              className="min-h-[136px]"
            />
            <div
              id="project-summary-count"
              className="text-right font-mono text-[11px] tabular-nums text-muted-foreground/80"
            >
              {summary.length}/{MAX_PROJECT_SUMMARY_LENGTH}
            </div>
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={anonymous} disabled={createProject.isPending}
            onChange={event => setAnonymous(event.target.checked)} />
          {t('匿名发布')}
        </label>
        <p className="text-xs text-muted-foreground">{t('匿名时隐藏昵称、头像和微信。署名后无法再改为匿名。')}</p>
        <DrawerFooter>
          <Button
            size="lg"
            className="w-full rounded-full"
            disabled={!canSubmit}
            onClick={onSubmit}
          >
            {createProject.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />{t('发布中…')}</>
            ) : (
              t('发布')
            )}
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
