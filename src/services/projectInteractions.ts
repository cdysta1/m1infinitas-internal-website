import { Functions, Query, type Models } from 'appwrite';
import { client, DATABASE_ID, databases } from '@/lib/appwrite';
import { env } from '@/lib/env';
import { demoGetProject } from '@/demo/store';
import { DEMO_STORAGE_PREFIX, getFavoriteProjectIds } from './projectFavorites';

export interface SubmissionCard {
  name: string;
  wechat: string;
  bio: string;
  tags: string[];
  note: string;
}
export interface Submission {
  project_id: string;
  project_title: string;
  sender_id: string;
  recipient_id: string;
  created: string;
  card: SubmissionCard;
}

const demoPrefix = 'm1-submission-v1:';
const inboxSeenPrefix = 'm1-inbox-last-seen-v1:';
export const INBOX_SEEN_EVENT = 'm1:inbox-seen';
const functions = new Functions(client);
export const countsKey = ['project-favorite-counts'] as const;
export const submissionsKey = ['project-submissions'] as const;

export function getInboxLastSeenAt(userId: string): string | null {
  try {
    return localStorage.getItem(inboxSeenPrefix + userId);
  } catch {
    return null;
  }
}

export function markInboxSeen(userId: string, latestCreated?: string): void {
  const stamp = latestCreated && !Number.isNaN(new Date(latestCreated).getTime())
    ? latestCreated
    : new Date().toISOString();
  try {
    const current = localStorage.getItem(inboxSeenPrefix + userId);
    if (!current || stamp > current) {
      localStorage.setItem(inboxSeenPrefix + userId, stamp);
    }
  } catch {
    // Keep app functional if localStorage is unavailable.
  }
  window.dispatchEvent(new CustomEvent(INBOX_SEEN_EVENT, { detail: { userId } }));
}

export function isSubmissionUnread(item: Submission, lastSeenAt: string | null): boolean {
  if (!item.created) return false;
  if (!lastSeenAt) return true;
  return item.created > lastSeenAt;
}

function parseSnapshot(raw: string): SubmissionCard {
  try {
    const parsed = JSON.parse(raw) as Partial<SubmissionCard> | null;
    return {
      name: typeof parsed?.name === 'string' ? parsed.name : '',
      wechat: typeof parsed?.wechat === 'string' ? parsed.wechat : '',
      bio: typeof parsed?.bio === 'string' ? parsed.bio : '',
      tags: Array.isArray(parsed?.tags)
        ? parsed.tags.filter((tag): tag is string => typeof tag === 'string')
        : [],
      note: typeof parsed?.note === 'string' ? parsed.note : '',
    };
  } catch {
    return { name: '', wechat: '', bio: '', tags: [], note: '' };
  }
}

async function execute<T>(data: object): Promise<T> {
  const run = await functions.createExecution('project-interactions', JSON.stringify(data));
  if (run.status !== 'completed' || run.responseStatusCode !== 200 || !run.responseBody) {
    throw new Error('Project interaction failed');
  }
  return JSON.parse(run.responseBody) as T;
}

export async function getFavoriteCounts(): Promise<Record<string, number>> {
  if (!env.demoMode) return execute({ action: 'counts' });
  const result: Record<string, number> = {};
  for (const key of Object.keys(localStorage)) {
    if (!key.startsWith(DEMO_STORAGE_PREFIX + ':')) continue;
    const ids = await getFavoriteProjectIds(key.slice(DEMO_STORAGE_PREFIX.length + 1));
    for (const id of ids) result[id] = (result[id] || 0) + 1;
  }
  return result;
}

type SubmissionRow = Models.Document & Omit<Submission, 'created' | 'card'> & { snapshot: string };

export async function listSubmissions(userId: string, field: 'sender_id' | 'recipient_id'): Promise<Submission[]> {
  if (env.demoMode) {
    const items: Submission[] = [];
    for (const key of Object.keys(localStorage)) {
      if (!key.startsWith(demoPrefix)) continue;
      try {
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        const parsed = JSON.parse(raw) as Partial<Submission> | null;
        if (!parsed || parsed[field] !== userId || typeof parsed.project_id !== 'string') continue;
        items.push({
          sender_id: typeof parsed.sender_id === 'string' ? parsed.sender_id : '',
          recipient_id: typeof parsed.recipient_id === 'string' ? parsed.recipient_id : '',
          project_id: parsed.project_id,
          project_title: typeof parsed.project_title === 'string' ? parsed.project_title : '',
          created: typeof parsed.created === 'string' ? parsed.created : '',
          card: parseSnapshot(JSON.stringify(parsed.card ?? {})),
        });
      } catch {
        // Ignore malformed demo entries in localStorage.
      }
    }
    return items.sort((a, b) => b.created.localeCompare(a.created));
  }
  const results: Submission[] = [];
  let cursor: string | undefined;
  do {
    const queries = [Query.equal(field, userId), Query.limit(100), Query.orderDesc('$createdAt')];
    if (cursor) queries.push(Query.cursorAfter(cursor));
    const page = await databases.listDocuments<SubmissionRow>(DATABASE_ID, 'project_submissions', queries);
    for (const row of page.documents) results.push({
      sender_id: row.sender_id, recipient_id: row.recipient_id, project_id: row.project_id,
      project_title: row.project_title, created: row.$createdAt, card: parseSnapshot(row.snapshot),
    });
    cursor = page.documents.length === 100 ? page.documents.at(-1)?.$id : undefined;
  } while (cursor);
  return results;
}

export async function sendSubmission(userId: string, projectId: string, card: SubmissionCard) {
  if (!env.demoMode) return execute({ action: 'send', projectId, snapshot: card });
  const project = await demoGetProject(projectId);
  if (project.status !== 'active') throw new Error('Project is not active');
  if (project.owner_id === userId) throw new Error('Cannot apply to own project');
  const key = demoPrefix + JSON.stringify([userId, projectId]);
  if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify({
    sender_id: userId, recipient_id: project.owner_id, project_id: projectId,
    project_title: project.title, created: new Date().toISOString(), card,
  } satisfies Submission));
}
