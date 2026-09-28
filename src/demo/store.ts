import type { Models } from 'appwrite';
import { PAGE_SIZE, PROJECT_STATUS, TIMELINE_PAGE_SIZE, type ProjectStatus } from '@/lib/constants';
import type { Profile, Project, UpdateItem } from '@/types/models';

const STORAGE_KEY = 'm1-infinitas-demo-v5';
export const DEMO_USER_ID = 'demo-user-lin';

interface DemoState {
  version: 5;
  profiles: Profile[];
  projects: Project[];
  updates: UpdateItem[];
}

const projectListeners = new Set<() => void>();
const updateListeners = new Set<(update: UpdateItem) => void>();
let memoryState: DemoState | null = null;

const demoCover = (fileName: string) =>
  new URL(`${import.meta.env.BASE_URL}demo/covers/${fileName}`, window.location.origin).href;

const covers = {
  portrait: demoCover('green-portrait.png'),
  between: demoCover('between-poster.png'),
  thinking: demoCover('thinking-spring.png'),
  nurture: demoCover('nurture-poster-a.png'),
  culturehub: demoCover('culturehub-residency.png'),
  voronoi: demoCover('voronoi-poster.png'),
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
      title: '双生表面：绿色覆层实验',
      summary: '以 3D 扫描、石膏翻模与绿色介质叠加，研究身体图像的复制与共生。',
      cover_file_id: covers.portrait,
      owner_id: DEMO_USER_ID,
      status: PROJECT_STATUS.ACTIVE,
      updated_at: iso(2),
    },
    {
      ...metadata('demo-project-paper', 'projects', iso(180)),
      title: '之间 BETWEEN｜展览视觉',
      summary: '为双人展《之间》整理主视觉、印刷物和现场导视系统。',
      cover_file_id: covers.between,
      owner_id: 'demo-user-yu',
      status: PROJECT_STATUS.ACTIVE,
      updated_at: iso(7),
    },
    {
      ...metadata('demo-project-room', 'projects', iso(260)),
      title: 'Thinking Spring｜春日文字实验',
      summary: '把 Thinking 与 Spring 作为生长中的文本，在公园影像里建立一条上升路径。',
      cover_file_id: covers.thinking,
      owner_id: 'demo-user-su',
      status: PROJECT_STATUS.ACTIVE,
      updated_at: iso(22),
    },
    {
      ...metadata('demo-project-color', 'projects', iso(320)),
      title: 'NURTURE｜生长档案',
      summary: '用像素切片重组花地与身体，讨论照料、记忆和数字图像的生长方式。',
      cover_file_id: covers.nurture,
      owner_id: DEMO_USER_ID,
      status: PROJECT_STATUS.ACTIVE,
      updated_at: iso(50),
    },
    {
      ...metadata('demo-project-field', 'projects', iso(410)),
      title: 'Space & Algorithms｜驻留提案',
      summary: '围绕城市迁移、身体数据与算法空间，准备 2026–2027 驻留计划。',
      cover_file_id: covers.culturehub,
      owner_id: 'demo-user-he',
      status: PROJECT_STATUS.ACTIVE,
      updated_at: iso(88),
    },
    {
      ...metadata('demo-project-stage', 'projects', iso(500)),
      title: 'Voronoi 01｜邻域生成实验',
      summary: '以 Voronoi 分区为方法，把人物影像转译成由距离、种子点和噪声构成的视觉系统。',
      cover_file_id: covers.voronoi,
      owner_id: 'demo-user-yu',
      status: PROJECT_STATUS.ACTIVE,
      updated_at: iso(126),
    },
  ];

  const updates: UpdateItem[] = [
    {
      ...metadata('demo-update-light-3', 'updates', iso(2)),
      project_id: 'demo-project-light',
      content: '完成绿色覆层的第三轮测试。透明度降到 62% 后，两张面孔终于能在鼻梁和眼窝处同时成立。',
      author_id: DEMO_USER_ID,
      file_ids: [covers.portrait],
      created_at: iso(2),
    },
    {
      ...metadata('demo-update-light-2', 'updates', iso(30)),
      project_id: 'demo-project-light',
      content: '两组头部扫描和石膏翻模已对齐，保留扫描断层，让数字模型与实体表面的误差直接可见。',
      author_id: 'demo-user-su',
      file_ids: [],
      created_at: iso(30),
    },
    {
      ...metadata('demo-update-light-1', 'updates', iso(96)),
      project_id: 'demo-project-light',
      content: '项目启动：从“同一张脸能否同时属于两个身体”出发，先测试扫描、翻模与液态材料三种表面。',
      author_id: DEMO_USER_ID,
      file_ids: [],
      created_at: iso(96),
    },
    {
      ...metadata('demo-update-paper-2', 'updates', iso(7)),
      project_id: 'demo-project-paper',
      content: '主海报完成最终打样。荧光绿在未涂布纸上的层次保留下来了，人物肤色也没有被底色吃掉。',
      author_id: 'demo-user-yu',
      file_ids: [covers.between],
      created_at: iso(7),
    },
    {
      ...metadata('demo-update-paper-1', 'updates', iso(180)),
      project_id: 'demo-project-paper',
      content: '中英文字级、展期和艺术家信息已经统一，下一步按同一网格展开邀请函与现场导视。',
      author_id: 'demo-user-he',
      file_ids: [],
      created_at: iso(180),
    },
    {
      ...metadata('demo-update-room-2', 'updates', iso(22)),
      project_id: 'demo-project-room',
      content: '文字路径由横向改为向上生长，Thinking 和 Spring 的密度会随着高度逐渐增加。',
      author_id: 'demo-user-su',
      file_ids: [covers.thinking],
      created_at: iso(22),
    },
    {
      ...metadata('demo-update-room-1', 'updates', iso(64)),
      project_id: 'demo-project-room',
      content: '完成公园现场取景，保留人物的日常尺度，让文字像从草地和树线之间自然冒出来。',
      author_id: 'demo-user-he',
      file_ids: [],
      created_at: iso(64),
    },
    {
      ...metadata('demo-update-color-2', 'updates', iso(50)),
      project_id: 'demo-project-color',
      content: '像素边缘从规则矩形改成不连续切片，花地的轮廓更像一段正在加载的记忆。',
      author_id: DEMO_USER_ID,
      file_ids: [covers.nurture],
      created_at: iso(50),
    },
    {
      ...metadata('demo-update-color-1', 'updates', iso(104)),
      project_id: 'demo-project-color',
      content: '确定以大面积留白包围花地，人物保持低饱和，只留下几处高亮标记作为生长坐标。',
      author_id: 'demo-user-yu',
      file_ids: [],
      created_at: iso(104),
    },
    {
      ...metadata('demo-update-field-2', 'updates', iso(88)),
      project_id: 'demo-project-field',
      content: '驻留主视觉第一版完成：用点阵人群表现迁移路径，蓝绿两组角色代表实体空间与算法身份。',
      author_id: 'demo-user-he',
      file_ids: [covers.culturehub],
      created_at: iso(88),
    },
    {
      ...metadata('demo-update-field-1', 'updates', iso(150)),
      project_id: 'demo-project-field',
      content: '申请文本完成约 70%，已补齐合作方式、六个月时间线和从纽约到柏林的研究路线。',
      author_id: DEMO_USER_ID,
      file_ids: [],
      created_at: iso(150),
    },
    {
      ...metadata('demo-update-stage-2', 'updates', iso(126)),
      project_id: 'demo-project-stage',
      content: '完成第一组 Voronoi 参数测试。种子点减少后，人物轮廓从噪声里显现得更慢，空间感更接近预期。',
      author_id: 'demo-user-yu',
      file_ids: [covers.voronoi],
      created_at: iso(126),
    },
    {
      ...metadata('demo-update-stage-1', 'updates', iso(196)),
      project_id: 'demo-project-stage',
      content: '确定使用绿色半调与黑底，并保留公式说明，让视觉结果和生成逻辑同时出现在画面里。',
      author_id: 'demo-user-su',
      file_ids: [],
      created_at: iso(196),
    },
  ];

  return { version: 5, profiles, projects, updates };
}

function getState(): DemoState {
  if (memoryState) return memoryState;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved) as DemoState;
      if (parsed.version === 5) {
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
