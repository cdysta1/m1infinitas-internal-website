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

interface CreateProjectDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
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
            选几张图，写一句话，就这么简单
          </DrawerDescription>
        </DrawerHeader>

        <div className="space-y-4">
          <ImagePicker
            value={images}
            onChange={setImages}
            disabled={createProject.isPending}
            hint="第 1 张自动作为封面，最多 9 张"
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
              placeholder="一句话简介这个项目…"
              maxLength={200}
              rows={2}
              disabled={createProject.isPending}
              className="min-h-[64px]"
            />
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
