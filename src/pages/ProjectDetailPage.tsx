import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { ProjectHeader } from '@/components/project/ProjectHeader';
import { ContactBar } from '@/components/project/ContactBar';
import { Timeline } from '@/components/project/Timeline';
import { UpdateFab } from '@/components/project/UpdateFab';
import { UpdateDialog } from '@/components/compose/UpdateDialog';
import { EmptyState } from '@/components/common/EmptyState';
import { useProjectDetail } from '@/hooks/useProjectDetail';
import { useUpdatesTimeline } from '@/hooks/useUpdatesTimeline';
import type { TimelineEntry } from '@/types/models';

export function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { project, owner, isLoading: projectLoading } = useProjectDetail(id);
  const {
    entries,
    authors,
    isLoading: timelineLoading,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useUpdatesTimeline(id);

  const [updateOpen, setUpdateOpen] = useState(false);
  const [retryPrefill, setRetryPrefill] = useState<{
    content: string;
    files: File[];
  } | null>(null);

  const handleRetry = (entry: TimelineEntry) => {
    if (!entry.retryPayload) return;
    setRetryPrefill({
      content: entry.retryPayload.content,
      files: entry.retryPayload.files,
    });
    setUpdateOpen(true);
  };

  if (projectLoading || !project) {
    return (
      <AppShell showCreate={false}>
        <div className="mx-auto max-w-3xl space-y-3 px-4 py-6">
          <div className="h-4 w-24 animate-pulse rounded bg-muted" />
          <div className="h-6 w-2/3 animate-pulse rounded bg-muted" />
          <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
          <div className="mt-6 h-40 w-full animate-pulse rounded-lg bg-muted" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell
      showCreate={false}
      footer={<UpdateFab onClick={() => { setRetryPrefill(null); setUpdateOpen(true); }} />}
    >
      <ProjectHeader project={project} owner={owner} />
      <ContactBar owner={owner} />
      <Timeline
        entries={entries}
        authors={authors}
        isLoading={timelineLoading}
        hasNextPage={hasNextPage}
        isFetchingNextPage={isFetchingNextPage}
        onFetchMore={fetchNextPage}
        onRetry={handleRetry}
      />

      {id && (
        <UpdateDialog
          open={updateOpen}
          onOpenChange={(open) => {
            setUpdateOpen(open);
            if (!open) setRetryPrefill(null);
          }}
          projectId={id}
          initialContent={retryPrefill?.content}
          initialFiles={retryPrefill?.files}
        />
      )}
    </AppShell>
  );
}

export function ProjectNotFound() {
  return (
    <AppShell showCreate={false}>
      <EmptyState
        title="项目不存在或已被删除"
        description="返回画廊看看其他项目"
      />
    </AppShell>
  );
}
