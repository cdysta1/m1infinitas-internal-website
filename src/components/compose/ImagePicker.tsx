import { useEffect, useRef, useState } from 'react';
import { Plus, X, ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import { MAX_IMAGES_PER_POST } from '@/lib/constants';
import { cn } from '@/lib/utils';

export interface PickedImage {
  file: File;
  previewUrl: string;
}

interface ImagePickerProps {
  value: PickedImage[];
  onChange: (next: PickedImage[]) => void;
  max?: number;
  disabled?: boolean;
  // Hint shown under the picker, e.g. "第 1 张为封面"
  hint?: string;
}

// Mobile-first image picker. The hidden <input> uses capture="environment"
// so iOS/Android surfaces the native camera / photo library chooser.
export function ImagePicker({
  value,
  onChange,
  max = MAX_IMAGES_PER_POST,
  disabled,
  hint,
}: ImagePickerProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Release blob URLs on unmount to avoid memory leaks.
  useEffect(() => {
    return () => {
      value.forEach((v) => URL.revokeObjectURL(v.previewUrl));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addFiles = (files: FileList | File[]) => {
    const incoming = Array.from(files).filter((f) => f.type.startsWith('image/') || f.type.startsWith('video/'));
    if (incoming.length === 0) {
      toast.error('请选择图片或视频');
      return;
    }
    const room = max - value.length;
    if (room <= 0) {
      toast.error(`最多选择 ${max} 张`);
      return;
    }
    const accepted = incoming.slice(0, room);
    if (incoming.length > room) {
      toast.message(`已截取前 ${room} 张`);
    }
    const next = accepted.map<PickedImage>((file) => ({
      file,
      previewUrl: URL.createObjectURL(file),
    }));
    onChange([...value, ...next]);
  };

  const removeAt = (idx: number) => {
    const target = value[idx];
    if (target) URL.revokeObjectURL(target.previewUrl);
    onChange(value.filter((_, i) => i !== idx));
  };

  return (
    <div>
      <div
        className={cn(
          'grid grid-cols-3 gap-2 sm:grid-cols-4',
          isDragging && 'opacity-70',
        )}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          if (disabled) return;
          addFiles(e.dataTransfer.files);
        }}
      >
        {value.map((img, idx) => (
          <div
            key={img.previewUrl}
            className="group relative aspect-square overflow-hidden rounded-lg bg-muted"
          >
            {img.file.type.startsWith('video/') ? (
              <video
                src={img.previewUrl}
                className="h-full w-full object-cover"
                muted
                playsInline
              />
            ) : (
              <img
                src={img.previewUrl}
                alt=""
                className="h-full w-full object-cover"
              />
            )}
            {idx === 0 && (
              <span className="absolute left-1 top-1 rounded-full bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white">
                封面
              </span>
            )}
            <button
              type="button"
              onClick={() => removeAt(idx)}
              aria-label={`移除第 ${idx + 1} 张`}
              className={cn(
                'absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white',
                'opacity-0 transition-opacity group-hover:opacity-100',
                // Always visible on touch devices.
                'touch-action-manipulation [@media(hover:none)]:opacity-100',
              )}
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}

        {value.length < max && !disabled && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className={cn(
              'flex aspect-square items-center justify-center rounded-lg border border-dashed',
              'text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground',
            )}
            aria-label="添加图片"
          >
            <div className="flex flex-col items-center gap-1">
              <Plus className="h-5 w-5" />
              <span className="text-[10px]">
                {value.length}/{max}
              </span>
            </div>
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*,video/*"
        multiple
        // `capture` is intentionally omitted so the OS chooser offers both
        // camera and library. Some Android builds show camera-only when
        // capture is set — testing shows the plain accept attr is best UX.
        className="hidden"
        onChange={(e) => {
          if (e.target.files) addFiles(e.target.files);
          // Reset so selecting the same file twice still fires onChange.
          e.target.value = '';
        }}
      />

      {hint && (
        <p className="mt-2 flex items-center gap-1 text-[11px] text-muted-foreground">
          <ImageIcon className="h-3 w-3" />
          {hint}
        </p>
      )}
    </div>
  );
}
