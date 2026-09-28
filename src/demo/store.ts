import type { Models } from 'appwrite';
import { PAGE_SIZE, PROJECT_STATUS, TIMELINE_PAGE_SIZE, type ProjectStatus } from '@/lib/constants';
import type { Profile, Project, UpdateItem } from '@/types/models';

const STORAGE_KEY = 'm1-infinitas-demo-v8';
export const DEMO_USER_ID = 'demo-user-lin';

interface DemoState {
  version: 8;
  profiles: Profile[];
  projects: Project[];
  updates: UpdateItem[];
}

const projectListeners = new Set<() => void>();
const updateListeners = new Set<(update: UpdateItem) => void>();
let memoryState: DemoState | null = null;

const DEFAULT_USER_NAMES = [
  'Lucian',
  'Elias',
  'AdrianOphelia',
  'Sylvia',
  'Iris',
  'Elodie',
] as const;

const DEMO_USER_NAME_INDEX: Record<string, number> = {
  'demo-user-lin': 0,
  'demo-user-yu': 1,
  'demo-user-su': 2,
  'demo-user-he': 3,
};

function getDefaultUserName(userId: string): string {
  const assigned = DEMO_USER_NAME_INDEX[userId];
  if (assigned !== undefined) return DEFAULT_USER_NAMES[assigned];

  let hash = 0;
  for (let i = 0; i < userId.length; i += 1) {
    hash = (hash * 31 + userId.charCodeAt(i)) >>> 0;
  }
  return DEFAULT_USER_NAMES[hash % DEFAULT_USER_NAMES.length];
}

const demoCover = (fileName: string) =>
  new URL(`${import.meta.env.BASE_URL}demo/covers/${fileName}`, window.location.origin).href;

const demoProcess = (fileName: string) =>
  new URL(`${import.meta.env.BASE_URL}demo/process/${fileName}`, window.location.origin).href;

const demoInterlude = (fileName: string) =>
  new URL(`${import.meta.env.BASE_URL}demo/interludes/${fileName}`, window.location.origin).href;

const covers = {
  portrait: demoCover('green-portrait-bw.png'),
  between: demoCover('between-poster-bw.png'),
  thinking: demoCover('thinking-spring-bw.png'),
  nurture: demoCover('nurture-poster-bw.png'),
  culturehub: demoCover('culturehub-residency-bw.png'),
  voronoi: demoCover('voronoi-poster-bw.png'),
} as const;

const processImages = {
  portrait: demoProcess('double-surface-process.png'),
  between: demoProcess('between-process.png'),
  thinking: demoProcess('thinking-spring-process.png'),
  nurture: demoProcess('nurture-process.png'),
  culturehub: demoProcess('residency-process.png'),
  voronoi: demoProcess('voronoi-process.png'),
} as const;

const interludeCovers = {
  displaced: demoInterlude('sufra-displaced-objects.png'),
  lavra: demoInterlude('lavra-poster.png'),
  cyborg: demoInterlude('cyborg-system.png'),
  pixelHabitat: demoInterlude('pixel-roof.png'),
  organicType: demoInterlude('organic-letterforms.png'),
  futureSculpture: demoInterlude('future-sculpture.png'),
  shigeto: demoInterlude('shigeto-poster.png'),
} as const;

export const demoUser = {
  $id: DEMO_USER_ID,
  $createdAt: new Date().toISOString(),
  $updatedAt: new Date().toISOString(),
  name: getDefaultUserName(DEMO_USER_ID),
  registration: new Date().toISOString(),
  status: true,
  labels: [],
  passwordUpdate: new Date().toISOString(),
  email: 'lucian@m1.demo',
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
    { ...metadata(DEMO_USER_ID, 'profiles', iso(720)), name: getDefaultUserName(DEMO_USER_ID), wechat: 'lucian_studio', avatar_file_id: '' },
    { ...metadata('demo-user-yu', 'profiles', iso(680)), name: getDefaultUserName('demo-user-yu'), wechat: 'elias_art', avatar_file_id: '' },
    { ...metadata('demo-user-su', 'profiles', iso(640)), name: getDefaultUserName('demo-user-su'), wechat: 'adrianophelia_space', avatar_file_id: '' },
    { ...metadata('demo-user-he', 'profiles', iso(600)), name: getDefaultUserName('demo-user-he'), wechat: 'sylvia_field', avatar_file_id: '' },
  ];

  const projects: Project[] = [
    {
      ...metadata('demo-project-light', 'projects', iso(96)),
      title: '双生表面：覆层实验',
      summary: '以 3D 扫描、石膏翻模与明暗介质叠加，研究身体图像的复制与共生。',
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
    {
      ...metadata('demo-project-displaced', 'projects', iso(110)),
      title: 'Displaced Objects｜移位物件',
      summary: '围绕迁徙、饮食记忆与物件位移，为跨地域展览建立主视觉与叙事线索。',
      cover_file_id: interludeCovers.displaced,
      owner_id: 'demo-user-yu',
      status: PROJECT_STATUS.ACTIVE,
      updated_at: iso(4),
    },
    {
      ...metadata('demo-project-lavra', 'projects', iso(190)),
      title: 'LAVRA｜接触与身体档案',
      summary: '以身体剪影、打字文本与轨迹节点组织一组关于接触和共同体的视觉档案。',
      cover_file_id: interludeCovers.lavra,
      owner_id: 'demo-user-su',
      status: PROJECT_STATUS.ACTIVE,
      updated_at: iso(12),
    },
    {
      ...metadata('demo-project-cyborg', 'projects', iso(240)),
      title: 'Cyborg System｜赛博形态研究',
      summary: '通过镜像扫描、流体边缘与机械结构，测试身体和数字系统之间的混合形态。',
      cover_file_id: interludeCovers.cyborg,
      owner_id: 'demo-user-he',
      status: PROJECT_STATUS.ACTIVE,
      updated_at: iso(32),
    },
    {
      ...metadata('demo-project-pixel-habitat', 'projects', iso(350)),
      title: 'Pixel Habitat｜像素栖居',
      summary: '将住宅立面与像素纹样叠合，观察装饰、建筑边界和数字图案的相互侵入。',
      cover_file_id: interludeCovers.pixelHabitat,
      owner_id: DEMO_USER_ID,
      status: PROJECT_STATUS.ACTIVE,
      updated_at: iso(66),
    },
    {
      ...metadata('demo-project-organic-type', 'projects', iso(430)),
      title: 'Saturated / Unsure｜有机字形实验',
      summary: '从液态膜、孔洞和拉伸结构出发，发展一组介于字形与生物组织之间的图像。',
      cover_file_id: interludeCovers.organicType,
      owner_id: 'demo-user-su',
      status: PROJECT_STATUS.ACTIVE,
      updated_at: iso(98),
    },
    {
      ...metadata('demo-project-future-sculpture', 'projects', iso(520)),
      title: 'Future is the Sculpture｜视觉研究',
      summary: '以光场、圆弧和时间轴构成视觉研究系列，讨论材料如何在过去与未来之间转换。',
      cover_file_id: interludeCovers.futureSculpture,
      owner_id: 'demo-user-he',
      status: PROJECT_STATUS.ACTIVE,
      updated_at: iso(142),
    },
    {
      ...metadata('demo-project-shigeto', 'projects', iso(610)),
      title: 'SHIGETO｜演出视觉',
      summary: '为现场演出建立由噪点曲面、留白与信息层级组成的海报和延展视觉。',
      cover_file_id: interludeCovers.shigeto,
      owner_id: 'demo-user-yu',
      status: PROJECT_STATUS.ACTIVE,
      updated_at: iso(168),
    },
  ];

  const updates: UpdateItem[] = [
    {
      ...metadata('demo-update-light-3', 'updates', iso(2)),
      project_id: 'demo-project-light',
      content: '完成深色覆层的第三轮测试。透明度降到 62% 后，两张面孔终于能在鼻梁和眼窝处同时成立。',
      author_id: DEMO_USER_ID,
      file_ids: [covers.portrait],
      created_at: iso(2),
    },
    {
      ...metadata('demo-update-light-2', 'updates', iso(30)),
      project_id: 'demo-project-light',
      content: '两组头部扫描和石膏翻模已对齐，保留扫描断层，让数字模型与实体表面的误差直接可见。',
      author_id: 'demo-user-su',
      file_ids: [processImages.portrait],
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
      content: '主海报完成灰阶打样。不同明度在未涂布纸上的层次保留下来了，人物轮廓也没有被底色吃掉。',
      author_id: 'demo-user-yu',
      file_ids: [covers.between],
      created_at: iso(7),
    },
    {
      ...metadata('demo-update-paper-1', 'updates', iso(180)),
      project_id: 'demo-project-paper',
      content: '中英文字级、展期和艺术家信息已经统一，下一步按同一网格展开邀请函与现场导视。',
      author_id: 'demo-user-he',
      file_ids: [processImages.between],
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
      file_ids: [processImages.thinking],
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
      file_ids: [processImages.nurture],
      created_at: iso(104),
    },
    {
      ...metadata('demo-update-field-2', 'updates', iso(88)),
      project_id: 'demo-project-field',
      content: '驻留主视觉第一版完成：用点阵人群表现迁移路径，明暗两组角色代表实体空间与算法身份。',
      author_id: 'demo-user-he',
      file_ids: [covers.culturehub],
      created_at: iso(88),
    },
    {
      ...metadata('demo-update-field-1', 'updates', iso(150)),
      project_id: 'demo-project-field',
      content: '申请文本完成约 70%，已补齐合作方式、六个月时间线和从纽约到柏林的研究路线。',
      author_id: DEMO_USER_ID,
      file_ids: [processImages.culturehub],
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
      content: '确定使用灰阶半调与黑底，并保留公式说明，让视觉结果和生成逻辑同时出现在画面里。',
      author_id: 'demo-user-su',
      file_ids: [processImages.voronoi],
      created_at: iso(196),
    },
    {
      ...metadata('demo-update-displaced-1', 'updates', iso(4)),
      project_id: 'demo-project-displaced',
      content: '主海报版式已经确定。放大的物件扫描与多语种信息保持冲突感，让“移位”直接发生在阅读顺序里。',
      author_id: 'demo-user-yu',
      file_ids: [interludeCovers.displaced],
      created_at: iso(4),
    },
    {
      ...metadata('demo-update-lavra-1', 'updates', iso(12)),
      project_id: 'demo-project-lavra',
      content: '完成身体剪影与字形的第一轮叠印，保留复印颗粒和节点标记，继续测试信息层级。',
      author_id: 'demo-user-su',
      file_ids: [interludeCovers.lavra],
      created_at: iso(12),
    },
    {
      ...metadata('demo-update-cyborg-1', 'updates', iso(32)),
      project_id: 'demo-project-cyborg',
      content: '完成第一轮镜像扫描实验。中心结构已经稳定，下一步会继续减少边缘噪声并测试动态版本。',
      author_id: 'demo-user-he',
      file_ids: [interludeCovers.cyborg],
      created_at: iso(32),
    },
    {
      ...metadata('demo-update-pixel-habitat-1', 'updates', iso(66)),
      project_id: 'demo-project-pixel-habitat',
      content: '把屋顶平面抽离成蓝色路径，再用红色像素纹样建立新的方向系统，建筑结构仍保持可辨认。',
      author_id: DEMO_USER_ID,
      file_ids: [interludeCovers.pixelHabitat],
      created_at: iso(66),
    },
    {
      ...metadata('demo-update-organic-type-1', 'updates', iso(98)),
      project_id: 'demo-project-organic-type',
      content: '完成第一组有机字形。孔洞、薄膜和拉伸节点已经形成统一语言，正在整理可重复使用的结构规则。',
      author_id: 'demo-user-su',
      file_ids: [interludeCovers.organicType],
      created_at: iso(98),
    },
    {
      ...metadata('demo-update-future-sculpture-1', 'updates', iso(142)),
      project_id: 'demo-project-future-sculpture',
      content: '视觉研究推进到 13/30。上下光场与交叉圆弧已经建立过去、现在和未来的阅读关系。',
      author_id: 'demo-user-he',
      file_ids: [interludeCovers.futureSculpture],
      created_at: iso(142),
    },
    {
      ...metadata('demo-update-shigeto-1', 'updates', iso(168)),
      project_id: 'demo-project-shigeto',
      content: '演出主视觉完成定稿。噪点曲面保持在信息区上方，底部日期、阵容和场地层级已经统一。',
      author_id: 'demo-user-yu',
      file_ids: [interludeCovers.shigeto],
      created_at: iso(168),
    },
  ];

  return { version: 8, profiles, projects, updates };
}

function getState(): DemoState {
  if (memoryState) return memoryState;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved) as DemoState;
      if (parsed.version === 8) {
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
    name: data.name.trim() || getDefaultUserName(userId),
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
