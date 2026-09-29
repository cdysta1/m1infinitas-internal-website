import { PROJECT_MEDIA_MARKER } from '@/lib/constants';

export type ProjectMediaKind = 'image' | 'video';

export interface ProjectMediaSource {
  content: string;
  fileIds: string[];
  localPreviewUrls?: string[];
}

export interface ProjectMediaAsset {
  source: string;
  kind: ProjectMediaKind;
}

export function isProjectMediaRecord(content: string): boolean {
  return content === PROJECT_MEDIA_MARKER || content.startsWith(`${PROJECT_MEDIA_MARKER}:`);
}

export function serializeProjectMediaRecord(kinds: ProjectMediaKind[]): string {
  return `${PROJECT_MEDIA_MARKER}:${JSON.stringify(kinds)}`;
}

function parseProjectMediaKinds(content: string, count: number): ProjectMediaKind[] {
  if (!content.startsWith(`${PROJECT_MEDIA_MARKER}:`)) {
    return Array.from({ length: count }, () => 'image');
  }

  try {
    const parsed = JSON.parse(content.slice(PROJECT_MEDIA_MARKER.length + 1));
    if (!Array.isArray(parsed)) throw new Error('invalid media metadata');
    return Array.from({ length: count }, (_, index) =>
      parsed[index] === 'video' ? 'video' : 'image',
    );
  } catch {
    return Array.from({ length: count }, () => 'image');
  }
}

function inferMediaKind(source: string): ProjectMediaKind {
  return /\.(mp4|webm|mov|m4v|ogv)(?:[?#]|$)/i.test(source) ? 'video' : 'image';
}

export function collectProjectMediaAssets(
  coverFileId: string,
  records: ProjectMediaSource[],
): ProjectMediaAsset[] {
  const canonical = records.find((record) => isProjectMediaRecord(record.content));
  const sources = canonical
    ? canonical.fileIds.length > 0
      ? canonical.fileIds
      : canonical.localPreviewUrls ?? []
    : [
        coverFileId,
        ...records.flatMap((record) =>
          record.fileIds.length > 0
            ? record.fileIds
            : record.localPreviewUrls ?? [],
        ),
      ];
  const kinds = canonical
    ? parseProjectMediaKinds(canonical.content, sources.length)
    : sources.map(inferMediaKind);

  const seen = new Set<string>();
  return sources.flatMap((source, index) => {
    if (!source || seen.has(source)) return [];
    seen.add(source);
    return [{ source, kind: kinds[index] ?? inferMediaKind(source) }];
  });
}

export function collectProjectMediaSources(
  coverFileId: string,
  records: ProjectMediaSource[],
): string[] {
  return collectProjectMediaAssets(coverFileId, records).map((asset) => asset.source);
}
