import { useEffect, useState } from 'react';
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
import { Textarea } from '@/components/ui/textarea';
import { ImagePicker, type PickedImage } from './ImagePicker';
import { useCreateUpdate } from '@/hooks/useCreateUpdate';
import { MAX_IMAGES_PER_POST } from '@/lib/constants';

interface UpdateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  // Prefill used by the retry action for failed optimistic entries.
  initialContent?: string;
  initialFiles?: File[];
}

export function UpdateDialog({
  open,
  onOpenChange,
  projectId,
  initialContent = '',
  initialFiles,
}: UpdateDialogProps) {
  const createUpdate = useCreateUpdate();
  const [content, setContent] = useState(initialContent);
  const [images, setImages] = useState<PickedImage[]>([]);

  // Reset / apply prefill each time the dialog opens.
  useEffect(() => {
    if (!open) return;
    setContent(initialContent);
    setImages((prev) => {
      prev.forEach((p) => URL.revokeObjectURL(p.previewUrl));
      if (!initialFiles || initialFiles.length === 0) return [];
      return initialFiles.slice(0, MAX_IMAGES_PER_POST).map((file) => ({
        file,
        previewUrl: URL.createObjectURL(file),
      }));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const canSubmit = content.trim().length > 0 && !createUpdate.isPending;

  const onSubmit = () => {
    if (!canSubmit) return;
    createUpdate.mutate(
      {
        projectId,
        content: content.trim(),
        files: images.map((i) => i.file),
        localPreviewUrls: images.map((i) => i.previewUrl),
      },
      {
        onSuccess: () => {
          toast.success('已发布');
          onOpenChange(false);
        },
        onError: (err) => {
          toast.error(err.message || '发布失败，可在时间轴重试');
          // Keep the dialog open on error so the user can retry immediately.
        },
      },
    );
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>更新进度</DrawerTitle>
          <DrawerDescription>写下几句话，可选配现场图</DrawerDescription>
        </DrawerHeader>

        <div className="space-y-4">
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="最近有什么新进展？"
            maxLength={1000}
            rows={3}
            disabled={createUpdate.isPending}
            autoFocus
            className="min-h-[96px]"
          />
          <ImagePicker
            value={images}
            onChange={setImages}
            disabled={createUpdate.isPending}
            hint="最多 9 张，可选"
          />
        </div>

        <DrawerFooter>
          <Button
            size="lg"
            className="w-full rounded-full"
            disabled={!canSubmit}
            onClick={onSubmit}
          >
            {createUpdate.isPending ? (
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
