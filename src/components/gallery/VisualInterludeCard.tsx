import { SmartImage } from '@/components/common/SmartImage';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface VisualInterludeCardProps {
  src: string;
  alt: string;
  ownerName: string;
}

export function VisualInterludeCard({ src, alt, ownerName }: VisualInterludeCardProps) {
  const initials = ownerName.slice(0, 1).toUpperCase() || '?';

  return (
    <figure className="mb-4 break-inside-avoid overflow-hidden rounded-xl bg-card">
      <SmartImage
        src={src}
        alt={alt}
        wrapperClassName="w-full rounded-xl"
        imgClassName="object-cover"
      />
      <figcaption className="px-1 pb-1 pt-2">
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Avatar className="h-4 w-4">
            <AvatarFallback className="text-[9px]">{initials}</AvatarFallback>
          </Avatar>
          <span className="max-w-[7rem] truncate">{ownerName}</span>
        </div>
      </figcaption>
    </figure>
  );
}
