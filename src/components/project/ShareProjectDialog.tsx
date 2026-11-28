import { useEffect, useMemo, useState } from 'react';
import { Check, Copy, Download, Loader2, Share2 } from 'lucide-react';
import { toast } from 'sonner';
import { useI18n } from '@/app/I18nProvider';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import { useCopyToClipboard } from '@/hooks/useCopyToClipboard';
import { buildPreviewUrl } from '@/lib/media';
import { encodeQrMatrix } from '@/lib/qrcode';
import type { Project } from '@/types/models';

interface ShareProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: Project;
  ownerName: string;
}

const POSTER_W = 900;
const POSTER_H = 1260;

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function wrapTextLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number,
): string[] {
  const normalized = text.replace(/\r\n/g, '\n').trim();
  if (!normalized) return [];

  const paragraphs = normalized.split('\n');
  const lines: string[] = [];

  for (let p = 0; p < paragraphs.length; p += 1) {
    const chars = Array.from(paragraphs[p].trim());
    if (chars.length === 0) continue;
    let current = '';
    for (let i = 0; i < chars.length; i += 1) {
      const ch = chars[i];
      const next = current + ch;
      if (ctx.measureText(next).width > maxWidth && current.length > 0) {
        lines.push(current.trimEnd());
        current = ch.trimStart();
        if (lines.length === maxLines) {
          const last = lines[maxLines - 1];
          let clipped = last;
          while (clipped.length > 1 && ctx.measureText(`${clipped}…`).width > maxWidth) {
            clipped = clipped.slice(0, -1);
          }
          lines[maxLines - 1] = `${clipped}…`;
          return lines;
        }
      } else {
        current = next;
      }
    }
    if (current) {
      lines.push(current.trimEnd());
      if (lines.length === maxLines) {
        const hasMore = p < paragraphs.length - 1 && paragraphs.slice(p + 1).some((s) => s.trim().length > 0);
        if (hasMore) {
          let clipped = lines[maxLines - 1];
          while (clipped.length > 1 && ctx.measureText(`${clipped}…`).width > maxWidth) {
            clipped = clipped.slice(0, -1);
          }
          lines[maxLines - 1] = `${clipped}…`;
        }
        return lines;
      }
    }
  }
  return lines;
}

async function loadCorsSafeImage(url: string): Promise<HTMLImageElement | null> {
  // Prefer fetch -> Blob URL so same-origin & CORS-enabled assets never taint canvas.
  try {
    const response = await fetch(url, { mode: 'cors', credentials: 'omit' });
    if (response.ok) {
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      try {
        return await new Promise<HTMLImageElement>((resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve(img);
          img.onerror = () => reject(new Error('Image decode failed'));
          img.src = objectUrl;
        });
      } finally {
        URL.revokeObjectURL(objectUrl);
      }
    }
  } catch {
    // Fallback to crossOrigin image element below.
  }

  return new Promise<HTMLImageElement | null>((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

function drawQrCode(
  ctx: CanvasRenderingContext2D,
  matrix: boolean[][],
  x: number,
  y: number,
  size: number,
) {
  const count = matrix.length;
  const quiet = 2;
  const total = count + quiet * 2;
  const cell = Math.floor(size / total);
  const actual = cell * total;
  const offsetX = x + Math.floor((size - actual) / 2);
  const offsetY = y + Math.floor((size - actual) / 2);

  ctx.fillStyle = '#FFFFFF';
  drawRoundedRect(ctx, x, y, size, size, 16);
  ctx.fill();
  ctx.strokeStyle = '#E8E8E8';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.fillStyle = '#141414';
  for (let r = 0; r < count; r += 1) {
    for (let c = 0; c < count; c += 1) {
      if (!matrix[r][c]) continue;
      ctx.fillRect(offsetX + (c + quiet) * cell, offsetY + (r + quiet) * cell, cell, cell);
    }
  }
}

async function renderSharePoster(options: {
  project: Project;
  ownerLabel: string;
  statusLabel: string;
  shareUrl: string;
  dateLabel: string;
  brandSubtitle: string;
  scanHint: string;
}): Promise<string> {
  const { project, ownerLabel, statusLabel, shareUrl, dateLabel, brandSubtitle, scanHint } = options;
  const canvas = document.createElement('canvas');
  canvas.width = POSTER_W;
  canvas.height = POSTER_H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas unavailable');

  const pad = 60;
  const innerW = POSTER_W - pad * 2;
  const sans = '-apple-system, BlinkMacSystemFont, "PingFang SC", "Helvetica Neue", "Noto Sans SC", sans-serif';
  const mono = 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';

  // Pure gallery white canvas
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, POSTER_W, POSTER_H);

  // Top exhibition header row
  const active = project.status === 'active';
  ctx.beginPath();
  ctx.arc(pad + 6, 68, 5, 0, Math.PI * 2);
  ctx.fillStyle = active ? '#10B981' : '#A3A3A3';
  ctx.fill();

  ctx.fillStyle = active ? '#141414' : '#737373';
  ctx.font = `500 20px ${sans}`;
  ctx.textBaseline = 'middle';
  ctx.fillText(statusLabel, pad + 22, 68);

  ctx.fillStyle = '#8C8C8C';
  ctx.font = `500 18px ${mono}`;
  ctx.textAlign = 'right';
  ctx.fillText('M1 INFINITAS', POSTER_W - pad, 68);
  ctx.textAlign = 'left';

  // Artwork cover frame (4:3 rounded gallery matte)
  const coverX = pad;
  const coverY = 112;
  const coverW = innerW;
  const coverH = 576;

  ctx.save();
  drawRoundedRect(ctx, coverX, coverY, coverW, coverH, 24);
  ctx.fillStyle = '#F5F5F5';
  ctx.fill();
  ctx.clip();

  const coverUrl = project.cover_file_id ? buildPreviewUrl(project.cover_file_id, 'detail') : '';
  const coverImg = coverUrl ? await loadCorsSafeImage(coverUrl) : null;
  if (coverImg && coverImg.naturalWidth > 0 && coverImg.naturalHeight > 0) {
    const imgRatio = coverImg.naturalWidth / coverImg.naturalHeight;
    const boxRatio = coverW / coverH;
    let drawW = coverW;
    let drawH = coverH;
    let drawX = coverX;
    let drawY = coverY;
    if (imgRatio > boxRatio) {
      drawW = coverH * imgRatio;
      drawX = coverX - (drawW - coverW) / 2;
    } else {
      drawH = coverW / imgRatio;
      drawY = coverY - (drawH - coverH) / 2;
    }
    ctx.drawImage(coverImg, drawX, drawY, drawW, drawH);
  } else {
    // Clean minimal typographic fallback when cover cannot be exported cross-origin
    ctx.fillStyle = '#F3F3F3';
    ctx.fillRect(coverX, coverY, coverW, coverH);
    ctx.fillStyle = '#D4D4D4';
    ctx.font = `600 72px ${sans}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('M1', coverX + coverW / 2, coverY + coverH / 2);
    ctx.textAlign = 'left';
  }
  ctx.restore();

  // Subtle frame hairline
  drawRoundedRect(ctx, coverX, coverY, coverW, coverH, 24);
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.05)';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Title
  ctx.textBaseline = 'top';
  ctx.fillStyle = '#141414';
  ctx.font = `600 38px ${sans}`;
  const titleLines = wrapTextLines(ctx, project.title, innerW, 2);
  let cursorY = 728;
  for (const line of titleLines) {
    ctx.fillText(line, pad, cursorY);
    cursorY += 50;
  }

  // Summary
  cursorY += 8;
  ctx.fillStyle = '#666666';
  ctx.font = `400 22px ${sans}`;
  const summaryLines = wrapTextLines(ctx, project.summary, innerW, titleLines.length > 1 ? 3 : 4);
  for (const line of summaryLines) {
    ctx.fillText(line, pad, cursorY);
    cursorY += 35;
  }

  // Author line
  ctx.fillStyle = '#8C8C8C';
  ctx.font = `500 20px ${sans}`;
  ctx.fillText(ownerLabel, pad, Math.min(cursorY + 14, 982));

  // Hairline separator above QR footer
  const dividerY = 1026;
  ctx.beginPath();
  ctx.moveTo(pad, dividerY);
  ctx.lineTo(POSTER_W - pad, dividerY);
  ctx.strokeStyle = '#EAEAEA';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Footer text (left) & QR code (right)
  const qrSize = 158;
  const qrX = POSTER_W - pad - qrSize;
  const qrY = 1054;
  const qrMatrix = encodeQrMatrix(shareUrl);
  drawQrCode(ctx, qrMatrix, qrX, qrY, qrSize);

  ctx.fillStyle = '#141414';
  ctx.font = `600 24px ${sans}`;
  ctx.fillText('M1 Infinitas', pad, 1068);

  ctx.fillStyle = '#737373';
  ctx.font = `400 20px ${sans}`;
  ctx.fillText(brandSubtitle, pad, 1106);

  ctx.fillStyle = '#8C8C8C';
  ctx.font = `400 18px ${sans}`;
  ctx.fillText(scanHint, pad, 1146);

  ctx.fillStyle = '#A3A3A3';
  ctx.font = `400 16px ${mono}`;
  ctx.fillText(dateLabel, pad, 1184);

  return canvas.toDataURL('image/png');
}

export function ShareProjectDialog({
  open,
  onOpenChange,
  project,
  ownerName,
}: ShareProjectDialogProps) {
  const { t, locale } = useI18n();
  const { copy, copied } = useCopyToClipboard();
  const [posterUrl, setPosterUrl] = useState<string | null>(null);
  const [rendering, setRendering] = useState(false);

  const shareUrl = useMemo(() => {
    const base = `${window.location.origin}${window.location.pathname}`;
    return `${base}#/projects/${project.$id}`;
  }, [project.$id]);

  const shareText = useMemo(() => {
    const brief = project.summary.replace(/\s+/g, ' ').trim();
    const snippet = brief.length > 72 ? `${brief.slice(0, 72)}…` : brief;
    const prefix = project.status === 'active'
      ? t('【M1 项目】《{title}》', { title: project.title })
      : t('【M1 项目档案】《{title}》', { title: project.title });
    return `${prefix}\n${snippet}\n${t('查看详情：{url}', { url: shareUrl })}`;
  }, [project.status, project.summary, project.title, shareUrl, t]);

  const dateLabel = useMemo(() => {
    const d = new Date(project.updated_at);
    if (Number.isNaN(d.getTime())) return '';
    return new Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(d);
  }, [locale, project.updated_at]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setRendering(true);
    setPosterUrl(null);

    const statusLabel = project.status === 'active' ? t('进行中') : t('已结束');
    const ownerLabel = project.is_anonymous
      ? t('匿名项目')
      : `${t('项目负责人')} · ${ownerName}`;

    renderSharePoster({
      project,
      ownerLabel,
      statusLabel,
      shareUrl,
      dateLabel,
      brandSubtitle: t('内部协作'),
      scanHint: t('微信扫码或长按识别查看项目详情'),
    })
      .then((url) => {
        if (!cancelled) setPosterUrl(url);
      })
      .catch(() => {
        if (!cancelled) toast.error(t('分享海报生成失败'));
      })
      .finally(() => {
        if (!cancelled) setRendering(false);
      });

    return () => {
      cancelled = true;
    };
  }, [dateLabel, open, ownerName, project, shareUrl, t]);

  const handleSavePoster = async () => {
    if (!posterUrl) return;
    const safeName = project.title.replace(/[\\/:*?"<>|]+/g, '').trim().slice(0, 32) || 'm1-project';
    const fileName = `${safeName}.png`;

    // Prefer native share sheet with file on mobile browsers that support it.
    try {
      const response = await fetch(posterUrl);
      const blob = await response.blob();
      const file = new File([blob], fileName, { type: 'image/png' });
      if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: project.title,
        });
        return;
      }
    } catch (err) {
      if ((err as { name?: string })?.name === 'AbortError') return;
    }

    const link = document.createElement('a');
    link.href = posterUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    toast.success(t('分享海报已保存'));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90dvh] max-w-sm flex-col overflow-hidden rounded-2xl border-0 bg-background p-0 shadow-2xl">
        <header className="shrink-0 border-b bg-muted/40 px-5 py-4 pr-12">
          <div className="flex items-center gap-2">
            <Share2 className="h-4 w-4 text-muted-foreground" />
            <DialogTitle className="text-base font-semibold">{t('分享项目')}</DialogTitle>
          </div>
          <DialogDescription className="mt-1 text-xs text-muted-foreground">
            {t('生成展签海报或复制文案发到微信群')}
          </DialogDescription>
        </header>

        <div className="min-h-0 flex-1 space-y-3.5 overflow-y-auto overscroll-contain p-4 sm:p-5">
          <div className="flex justify-center overflow-hidden rounded-2xl bg-muted/45 p-2.5">
            {rendering || !posterUrl ? (
              <div className="flex aspect-[900/1260] max-h-[40dvh] w-full max-w-[260px] items-center justify-center rounded-xl bg-background text-muted-foreground sm:max-h-[44dvh]">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span className="sr-only">{t('正在生成分享海报')}</span>
              </div>
            ) : (
              <img
                src={posterUrl}
                alt={t('{name} 分享海报', { name: project.title })}
                className="mx-auto block max-h-[40dvh] w-auto max-w-full rounded-xl object-contain shadow-[0_8px_24px_rgba(0,0,0,0.08)] sm:max-h-[44dvh]"
              />
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Button
              type="button"
              size="md"
              className="h-10 w-full gap-2 rounded-full text-sm font-medium"
              onClick={() => void handleSavePoster()}
              disabled={!posterUrl || rendering}
            >
              <Download className="h-4 w-4" />
              {t('保存分享海报')}
            </Button>

            <Button
              type="button"
              variant="subtle"
              size="md"
              className="h-10 w-full gap-2 rounded-full text-sm font-medium"
              onClick={() => void copy(shareText, t('分享文案与链接已复制'))}
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {t('复制文案与链接')}
            </Button>
          </div>

          <p className="text-center text-[11px] leading-relaxed text-muted-foreground">
            {t('微信内也可长按海报直接保存或转发给好友')}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
