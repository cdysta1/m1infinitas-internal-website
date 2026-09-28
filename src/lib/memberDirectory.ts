export interface MemberMeta {
  focus: string;
  description: string;
  tags: string[];
  areas: string[];
}

const DEMO_MEMBER_META: Record<string, MemberMeta> = {
  'demo-user-lin': {
    focus: '影像雕塑 / Image Sculpture',
    description: '在数字扫描、身体图像与实体材料之间寻找新的表面关系。',
    tags: ['3D 扫描', '材料实验', '装置艺术'],
    areas: ['空间', '研究'],
  },
  'demo-user-yu': {
    focus: '视觉传达 / Visual Communication',
    description: '关注编辑系统、印刷语言，以及规则如何转化成开放的视觉结构。',
    tags: ['编辑设计', '印刷工艺', '生成图形'],
    areas: ['视觉', '研究'],
  },
  'demo-user-su': {
    focus: '文字与影像 / Type & Image',
    description: '以字体、摄影和图像档案组织叙事，保留媒介中的误差与颗粒。',
    tags: ['字体实验', '摄影', '视觉研究'],
    areas: ['视觉', '研究'],
  },
  'demo-user-he': {
    focus: '计算媒介 / Computational Media',
    description: '把算法、动态系统和交互行为转译成可被体验的视觉现场。',
    tags: ['创意编程', '算法艺术', '交互装置'],
    areas: ['数字媒体', '空间'],
  },
  'demo-user-iris': {
    focus: '空间叙事 / Spatial Narrative',
    description: '从场域、动线和观看关系出发，发展展览中的空间叙事。',
    tags: ['展览设计', '策展研究', '场域实践'],
    areas: ['空间', '研究'],
  },
  'demo-user-elodie': {
    focus: '声音与动态 / Sound & Motion',
    description: '连接声音、动态影像和表演现场，探索时间中的感知结构。',
    tags: ['动态影像', '声音设计', '表演艺术'],
    areas: ['数字媒体', '视觉'],
  },
};

const FALLBACK_META: MemberMeta[] = [
  DEMO_MEMBER_META['demo-user-lin'],
  DEMO_MEMBER_META['demo-user-yu'],
  DEMO_MEMBER_META['demo-user-su'],
  DEMO_MEMBER_META['demo-user-he'],
  DEMO_MEMBER_META['demo-user-iris'],
  DEMO_MEMBER_META['demo-user-elodie'],
];

export const MEMBER_AREAS = ['全部', '视觉', '空间', '数字媒体', '研究'] as const;

export const MEMBER_NAME_ORDER = [
  'Lucian',
  'Elias',
  'AdrianOphelia',
  'Sylvia',
  'Iris',
  'Elodie',
] as const;

export function getMemberMeta(userId: string): MemberMeta {
  const exact = DEMO_MEMBER_META[userId];
  if (exact) return exact;

  let hash = 0;
  for (let i = 0; i < userId.length; i += 1) {
    hash = (hash * 31 + userId.charCodeAt(i)) >>> 0;
  }
  return FALLBACK_META[hash % FALLBACK_META.length];
}
