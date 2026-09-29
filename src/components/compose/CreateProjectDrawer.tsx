import { useEffect, useState } from 'react';
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
  const navigate = useNavigate();
  const createProject = useCreateProject();
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [images, setImages] = useState<PickedImage[]>([]);

  // Reset state each time the drawer opens.
  useEffect(() => {
    if (open) {
      setTitle('');
      setSummary('');
      setImages((prev) => {
        prev.forEach((p) => URL.revokeObjectURL(p.previewUrl));
        return [];
      });
    }
  }, [open]);

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
        title: title.trim(),
        summary: summary.trim(),
        files: images.map((i) => i.file),
        localPreviewUrls: images.map((i) => i.previewUrl),
      },
      {
        onSuccess: ({ project }) => {
          toast.success('已发布');
          onOpenChange(false);
          navigate(`/projects/${project.$id}`);
        },
        onError: (err) => {
          toast.error(err.message || '发布失败，请重试');
        },
      },
    );
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>发布新项目</DrawerTitle>
          <DrawerDescription>
            选择图片或视频，再写一段项目介绍
          </DrawerDescription>
        </DrawerHeader>

        <div className="space-y-4">
          <ImagePicker
            value={images}
            onChange={(next) => setImages(moveFirstImageToFront(next))}
            disabled={createProject.isPending}
            showFirstAsCover={Boolean(images[0]?.file.type.startsWith('image/'))}
            hint="至少 1 张图片作为封面；图片与视频合计最多 9 个"
          />

          <div className="space-y-1.5">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="项目标题"
              maxLength={80}
              disabled={createProject.isPending}
              autoFocus
            />
            <Textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="项目介绍（最多 500 字）"
              maxLength={MAX_PROJECT_SUMMARY_LENGTH}
              rows={5}
              disabled={createProject.isPending}
              aria-describedby="project-summary-count"
              className="min-h-[120px]"
            />
            <div
              id="project-summary-count"
              className="text-right font-mono text-[10px] text-muted-foreground"
            >
              {summary.length}/{MAX_PROJECT_SUMMARY_LENGTH}
            </div>
          </div>
        </div>

        <DrawerFooter>
          <Button
            size="lg"
            className="w-full rounded-full"
            disabled={!canSubmit}
            onClick={onSubmit}
          >
            {createProject.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                发布中…
              </>
            ) : (
              '发布'
            )}
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
