import type { Models } from 'appwrite';
import { PAGE_SIZE, PROJECT_STATUS, TIMELINE_PAGE_SIZE, type ProjectStatus } from '@/lib/constants';
import type { Profile, Project, UpdateItem } from '@/types/models';

const STORAGE_KEY = 'm1-infinitas-demo-v1';
export const DEMO_USER_ID = 'demo-user-lin';

interface DemoState {
  version: 1;
  profiles: Profile[];
  projects: Project[];
  updates: UpdateItem[];
}

const projectListeners = new Set<() => void>();
const updateListeners = new Set<(update: UpdateItem) => void>();
let memoryState: DemoState | null = null;

const images = {
  studio: 'https://images.unsplash.com/photo-1549490349-8643362247b5?auto=format&fit=crop&w=1200&q=85',
  paper: 'https://images.unsplash.com/photo-1523726491678-bf852e717f6a?auto=format&fit=crop&w=1200&q=85',
  space: 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1200&q=85',
  paint: 'https://images.unsplash.com/photo-1561214115-f2f134cc4912?auto=format&fit=crop&w=1200&q=85',
  field: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=85',
  stage: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?auto=format&fit=crop&w=1200&q=85',
  tools: 'https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?auto=format&fit=crop&w=1200&q=85',
} as const;

export const demoUser = {
  $id: DEMO_USER_ID,
  $createdAt: new Date().toISOString(),
  $updatedAt: new Date().toISOString(),
  name: '林澈',
  registration: new Date().toISOString(),
  status: true,
  labels: [],
  passwordUpdate: new Date().toISOString(),
  email: 'lin@m1.demo',
  phone: '',
  emailVerification: true,
  phoneVerification: false,
  mfa: false,
  prefs: {},
  targets: [],
  accessedAt: new Date().toISOString(),
} as Models.User<Models.Preferences>;

function iso(hoursAgo: number): string {
  return new Date(Date.now() - hoursAgo * 60 * 60 * 1000).toISOString();
}

function metadata(id: string, collection: string, createdAt: string) {
  return {
    $id: id,
    $collectionId: collection,
    $databaseId: 'demo',
    $createdAt: createdAt,
    $updatedAt: createdAt,
    $permissions: [],
  };
}

function createSeedState(): DemoState {
  const profiles: Profile[] = [
    { ...metadata(DEMO_USER_ID, 'profiles', iso(720)), name: '林澈', wechat: 'linche_studio', avatar_file_id: '' },
    { ...metadata('demo-user-yu', 'profiles', iso(680)), name: '余望', wechat: 'yu_wang_art', avatar_file_id: '' },
    { ...metadata('demo-user-su', 'profiles', iso(640)), name: '苏珂', wechat: 'suke_space', avatar_file_id: '' },
    { ...metadata('demo-user-he', 'profiles', iso(600)), name: '何野', wechat: 'heye_field', avatar_file_id: '' },
  ];

  const projects: Project[] = [
    {
      ...metadata('demo-project-light', 'projects', iso(96)),
      title: '光线采样计划',
      summary: '记录一天中不同时间落在旧厂房里的光，准备转化成一组装置。',
      cover_file_id: images.studio,
      owner_id: DEMO_USER_ID,
      status: PROJECT_STATUS.ACTIVE,
      updated_at: iso(2),
    },
    {
      ...metadata('demo-project-paper', 'projects', iso(180)),
      title: '纸上城市：第二阶段',
      summary: '把成员收集的城市边角料做成可展开的手工书。',
      cover_file_id: images.paper,
      owner_id: 'demo-user-yu',
      status: PROJECT_STATUS.ACTIVE,
      updated_at: iso(7),
    },
    {
      ...metadata('demo-project-room', 'projects', iso(260)),
      title: '临时房间 No. 3',
      summary: '为十月开放日搭建一个能被声音改变的共享空间。',
      cover_file_id: images.space,
      owner_id: 'demo-user-su',
      status: PROJECT_STATUS.ACTIVE,
      updated_at: iso(22),
    },
    {
      ...metadata('demo-project-color', 'projects', iso(320)),
      title: '失焦色谱',
      summary: '继续测试大尺幅色层叠加，寻找更轻的边缘关系。',
      cover_file_id: images.paint,
      owner_id: DEMO_USER_ID,
      status: PROJECT_STATUS.ACTIVE,
      updated_at: iso(50),
    },
    {
      ...metadata('demo-project-field', 'projects', iso(410)),
      title: '河岸声音地图',
      summary: '沿河记录环境声与居民口述，计划制作步行聆听路线。',
      cover_file_id: images.field,
      owner_id: 'demo-user-he',
      status: PROJECT_STATUS.ACTIVE,
      updated_at: iso(88),
    },
    {
      ...metadata('demo-project-stage', 'projects', iso(500)),
      title: '身体与回声排练',
      summary: '三位表演者围绕延迟、重复和错位进行的阶段性实验。',
      cover_file_id: images.stage,
      owner_id: 'demo-user-yu',
      status: PROJECT_STATUS.ACTIVE,
      updated_at: iso(126),
    },
  ];

  const updates: UpdateItem[] = [
    {
      ...metadata('demo-update-light-3', 'updates', iso(2)),
      project_id: 'demo-project-light',
      content: '下午四点的光最接近想要的密度。今天把第三组反射板的位置定下来了，明天继续测材料。',
      author_id: DEMO_USER_ID,
      file_ids: [images.studio, images.tools],
      created_at: iso(2),
    },
    {
      ...metadata('demo-update-light-2', 'updates', iso(30)),
      project_id: 'demo-project-light',
      content: '第一次现场测量，墙面反光比预想中更强，决定保留这个偶然出现的亮区。',
      author_id: 'demo-user-su',
      file_ids: [images.space],
      created_at: iso(30),
    },
    {
      ...metadata('demo-update-light-1', 'updates', iso(96)),
      project_id: 'demo-project-light',
      content: '项目启动：先连续记录一周，再从影像里选择装置的时间线。',
      author_id: DEMO_USER_ID,
      file_ids: [],
      created_at: iso(96),
    },
    {
      ...metadata('demo-update-paper-2', 'updates', iso(7)),
      project_id: 'demo-project-paper',
      content: '装订方式改成了裸脊，展开后更像一条街。今晚完成了第一本样书。',
      author_id: 'demo-user-yu',
      file_ids: [images.paper, images.paint],
      created_at: iso(7),
    },
    {
      ...metadata('demo-update-paper-1', 'updates', iso(180)),
      project_id: 'demo-project-paper',
      content: '收到第一批成员寄来的票据、包装纸和手写路线。',
      author_id: 'demo-user-he',
      file_ids: [images.tools],
      created_at: iso(180),
    },
    {
      ...metadata('demo-update-room-2', 'updates', iso(22)),
      project_id: 'demo-project-room',
      content: '四块移动墙已经到场，走动时声音会从不同缝隙里穿出来。',
      author_id: 'demo-user-su',
      file_ids: [images.space],
      created_at: iso(22),
    },
    {
      ...metadata('demo-update-color-1', 'updates', iso(50)),
      project_id: 'demo-project-color',
      content: '新的罩染比例稳定下来了，保留这次偏冷的底色继续推进。',
      author_id: DEMO_USER_ID,
      file_ids: [images.paint],
      created_at: iso(50),
    },
    {
      ...metadata('demo-update-field-1', 'updates', iso(88)),
      project_id: 'demo-project-field',
      content: '完成北岸第一轮采集，意外录到了凌晨卸货和潮水交叠的声音。',
      author_id: 'demo-user-he',
      file_ids: [images.field],
      created_at: iso(88),
    },
    {
      ...metadata('demo-update-stage-1', 'updates', iso(126)),
      project_id: 'demo-project-stage',
      content: '第一次合排结束。下一轮会把观众的移动也纳入节奏。',
      author_id: 'demo-user-yu',
      file_ids: [images.stage],
      created_at: iso(126),
    },
  ];

  return { version: 1, profiles, projects, updates };
}

function getState(): DemoState {
  if (memoryState) return memoryState;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved) as DemoState;
      if (parsed.version === 1) {
        memoryState = parsed;
        return memoryState;
      }
    }
  } catch (err) {
    console.warn('[demo] failed to read local state', err);
  }
  memoryState = createSeedState();
  persist();
  return memoryState;
}

function persist(): void {
  if (!memoryState) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(memoryState));
  } catch (err) {
    console.warn('[demo] local storage is full; changes will last until refresh', err);
  }
}

function uniqueId(prefix: string): string {
  const id = typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `demo-${prefix}-${id}`;
}

export async function demoCreateProfile(userId: string, data: { name: string; wechat: string; avatar_file_id?: string }): Promise<Profile> {
  const now = new Date().toISOString();
  const profile: Profile = {
    ...metadata(userId, 'profiles', now),
    name: data.name,
    wechat: data.wechat,
    avatar_file_id: data.avatar_file_id ?? '',
  };
  const state = getState();
  state.profiles = [profile, ...state.profiles.filter((item) => item.$id !== userId)];
  persist();
  return profile;
}

export async function demoGetProfile(userId: string): Promise<Profile | null> {
  return getState().profiles.find((profile) => profile.$id === userId) ?? null;
}

export async function demoGetProfilesByIds(userIds: string[]): Promise<Map<string, Profile>> {
  const wanted = new Set(userIds);
  return new Map(
    getState().profiles
      .filter((profile) => wanted.has(profile.$id))
      .map((profile) => [profile.$id, profile]),
  );
}

export async function demoUpdateProfile(userId: string, patch: Partial<{ name: string; wechat: string; avatar_file_id: string }>): Promise<Profile> {
  const state = getState();
  const index = state.profiles.findIndex((profile) => profile.$id === userId);
  if (index < 0) throw new Error('演示成员不存在');
  const updated = { ...state.profiles[index], ...patch, $updatedAt: new Date().toISOString() };
  state.profiles[index] = updated;
  persist();
  return updated;
}

export async function demoListProjects(opts: { status?: ProjectStatus; limit?: number; cursor?: string } = {}) {
  const limit = opts.limit ?? PAGE_SIZE;
  const all = getState().projects
    .filter((project) => !opts.status || project.status === opts.status)
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at));
  const cursorIndex = opts.cursor ? all.findIndex((project) => project.$id === opts.cursor) : -1;
  const start = cursorIndex >= 0 ? cursorIndex + 1 : 0;
  const projects = all.slice(start, start + limit);
  return {
    projects,
    total: all.length,
    cursor: start + projects.length < all.length ? projects.at(-1)?.$id : undefined,
  };
}

export async function demoGetProject(id: string): Promise<Project> {
  const project = getState().projects.find((item) => item.$id === id);
  if (!project) throw new Error('演示项目不存在');
  return project;
}

export async function demoCreateProject(input: { title: string; summary: string; cover_file_id: string; owner_id: string }): Promise<Project> {
  const now = new Date().toISOString();
  const project: Project = {
    ...metadata(uniqueId('project'), 'projects', now),
    ...input,
    status: PROJECT_STATUS.ACTIVE,
    updated_at: now,
  };
  const state = getState();
  state.projects.unshift(project);
  persist();
  projectListeners.forEach((listener) => listener());
  return project;
}

export async function demoTouchProject(id: string): Promise<Project | null> {
  const state = getState();
  const project = state.projects.find((item) => item.$id === id);
  if (!project) return null;
  project.updated_at = new Date().toISOString();
  project.$updatedAt = project.updated_at;
  persist();
  projectListeners.forEach((listener) => listener());
  return project;
}

export async function demoUpdateProjectStatus(id: string, status: ProjectStatus): Promise<Project> {
  const project = await demoGetProject(id);
  project.status = status;
  await demoTouchProject(id);
  return project;
}

export function demoSubscribeProjects(listener: () => void): () => void {
  projectListeners.add(listener);
  return () => projectListeners.delete(listener);
}

export async function demoListUpdates(projectId: string, opts: { limit?: number; cursor?: string } = {}) {
  const limit = opts.limit ?? TIMELINE_PAGE_SIZE;
  const all = getState().updates
    .filter((update) => update.project_id === projectId)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
  const cursorIndex = opts.cursor ? all.findIndex((update) => update.$id === opts.cursor) : -1;
  const start = cursorIndex >= 0 ? cursorIndex + 1 : 0;
  const updates = all.slice(start, start + limit);
  return {
    updates,
    total: all.length,
    cursor: start + updates.length < all.length ? updates.at(-1)?.$id : undefined,
  };
}

export async function demoCreateUpdate(input: { project_id: string; content: string; author_id: string; file_ids: string[] }): Promise<UpdateItem> {
  const now = new Date().toISOString();
  const update: UpdateItem = {
    ...metadata(uniqueId('update'), 'updates', now),
    ...input,
    created_at: now,
  };
  const state = getState();
  state.updates.unshift(update);
  persist();
  updateListeners.forEach((listener) => listener(update));
  return update;
}

export async function demoDeleteUpdate(id: string): Promise<void> {
  const state = getState();
  state.updates = state.updates.filter((update) => update.$id !== id);
  persist();
}

export function demoSubscribeUpdates(listener: (update: UpdateItem) => void): () => void {
  updateListeners.add(listener);
  return () => updateListeners.delete(listener);
}
