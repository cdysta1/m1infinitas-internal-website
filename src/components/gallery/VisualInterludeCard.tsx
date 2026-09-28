import { SmartImage } from '@/components/common/SmartImage';

interface VisualInterludeCardProps {
  src: string;
  alt: string;
}

export function VisualInterludeCard({ src, alt }: VisualInterludeCardProps) {
  return (
    <figure className="mb-4 break-inside-avoid overflow-hidden rounded-xl bg-card">
      <SmartImage
        src={src}
        alt={alt}
        wrapperClassName="w-full rounded-xl"
        imgClassName="object-cover"
      />
    </figure>
  );
}
