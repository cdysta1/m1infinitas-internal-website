import type { MemberCategory } from '@/lib/memberCategories';

export const MEMBER_CATEGORIES: MemberCategory[] = [
  {
    id: 'music', label: '音乐与声音', area: '音乐',
    children: [
      {
        id: 'music-engineering', label: '音乐工程',
        children: [
          { id: 'recording', label: '录音', tags: ['录音'] },
          { id: 'mixing', label: '混音与后期', tags: ['混音', '声音后期'] },
          { id: 'music-technology', label: '音乐科技', tags: ['音乐科技', '音频工程'] },
          { id: 'music-ai', label: '音乐人工智能', tags: ['音乐人工智能'] },
          { id: 'audio-dsp', label: '音频 DSP', tags: ['音频 DSP'] },
          { id: 'music-interaction', label: '声音交互', tags: ['声音交互', '实时表演系统'] },
        ],
      },
      {
        id: 'popular-music', label: '流行音乐',
        children: [
          { id: 'pop-vocals', label: '流行演唱', tags: ['流行演唱'] },
          { id: 'pop-backing-vocals', label: '和声演唱', tags: ['和声演唱'] },
        ],
      },
      {
        id: 'performance', label: '演奏与演唱', tags: ['音乐演奏', '音乐表演', '流行演唱', '和声演唱'],
        children: [
          { id: 'violin', label: '小提琴', tags: ['小提琴'] },
          { id: 'yangqin', label: '扬琴', tags: ['扬琴'] },
          { id: 'piano', label: '钢琴', tags: ['钢琴演奏'] },
          { id: 'flute', label: '长笛', tags: ['长笛'] },
          { id: 'saxophone', label: '萨克斯', tags: ['萨克斯'] },
          { id: 'handpan', label: '手碟', tags: ['手碟'] },
          { id: 'synthesizer-performance', label: '合成器', tags: ['合成器演奏'] },
          { id: 'electric-zheng', label: '电筝', tags: ['电筝'] },
          { id: 'bel-canto', label: '美声', tags: ['美声'] },
          { id: 'throat-singing', label: '呼麦', tags: ['呼麦'] },
          { id: 'singer-songwriter', label: '唱作', tags: ['唱作人', '唱作'] },
        ],
      },
      {
        id: 'composition-production', label: '作曲与制作',
        children: [
          { id: 'composition', label: '作曲', tags: ['作曲'] },
          { id: 'arrangement', label: '编曲', tags: ['编曲'] },
          { id: 'music-production', label: '音乐制作', tags: ['音乐制作'] },
          { id: 'electronic-production', label: '电子音乐', tags: ['电子音乐', '电子音乐制作', '电子音乐作曲'] },
          { id: 'game-music', label: '游戏配乐', tags: ['游戏配乐'] },
          { id: 'film-music', label: '电影配乐', tags: ['电影配乐'] },
          { id: 'dj', label: 'DJ', tags: ['DJ'] },
          { id: 'chinese-music', label: '中国民族音乐', tags: ['中国民族音乐'] },
        ],
      },
      {
        id: 'music-research', label: '音乐研究', tags: ['音乐研究者'],
        children: [
          { id: 'musicology', label: '音乐学', tags: ['音乐学'] },
          { id: 'music-aesthetics', label: '音乐美学', tags: ['音乐美学', '乐评'] },
          { id: 'aesthetic-psychology', label: '审美心理学', tags: ['审美心理学'] },
          { id: 'composition-theory', label: '作曲理论', tags: ['作曲理论'] },
        ],
      },
      {
        id: 'sound-art', label: '声音艺术', area: '声音艺术',
        children: [
          { id: 'sound-design', label: '声音设计', tags: ['声音设计'] },
          { id: 'synthesizer-design', label: '合成器设计', tags: ['合成器设计'] },
          { id: 'cross-media', label: '跨媒介', tags: ['跨媒介'] },
        ],
      },
    ],
  },
  {
    id: 'theatre-spatial', label: '剧场与空间',
    children: [
      {
        id: 'theatre', label: '剧场', area: '剧场',
        children: [
          { id: 'screenwriting', label: '编剧', tags: ['编剧'] },
          { id: 'directing', label: '导演', tags: ['导演'] },
          { id: 'theatre-education', label: '戏剧教育', tags: ['戏剧教育', '应用戏剧'] },
          { id: 'art-education', label: '艺术教育', tags: ['艺术教育'] },
          { id: 'dance', label: '舞蹈', tags: ['舞者', '接触即兴'] },
        ],
      },
      {
        id: 'spatial', label: '空间', area: '空间',
        children: [
          { id: 'architecture', label: '建筑', tags: ['建筑'] },
          { id: 'stage-design', label: '舞台设计', tags: ['舞台设计'] },
          { id: 'installation', label: '互动装置', tags: ['互动装置设计'] },
        ],
      },
    ],
  },
  {
    id: 'visual', label: '视觉', area: '视觉',
    children: [
      { id: 'visual-design', label: '视觉设计', tags: ['视觉设计'] },
      { id: 'industrial-design', label: '工业与产品设计', tags: ['工业设计', '产品设计', '设计创新'] },
      { id: 'photography', label: '摄影', tags: ['摄影'] },
      { id: 'painting', label: '绘画', tags: ['绘画', '中国绘画'] },
      { id: 'film', label: '电影', tags: ['电影'] },
      { id: 'contemporary-art', label: '当代艺术', tags: ['当代艺术'] },
    ],
  },
  {
    id: 'digital', label: '数字媒体', area: '数字媒体',
    children: [
      { id: 'interaction', label: '交互设计', tags: ['交互', '人机交互', '感官交互'] },
      { id: 'new-media', label: '新媒体', tags: ['新媒体'] },
      { id: 'games', label: '游戏', tags: ['游戏'] },
      { id: 'cmf', label: 'CMF 材质工艺', tags: ['CMF材质工艺设计'] },
    ],
  },
  {
    id: 'research', label: '研究', area: '研究',
    children: [
      { id: 'language', label: '应用语言学', tags: ['应用语言学'] },
      { id: 'philosophy', label: '哲学', tags: ['哲学'] },
      { id: 'culture', label: '文化研究', tags: ['文化研究'] },
      { id: 'writing', label: '写作', tags: ['写作者'] },
    ],
  },
  {
    id: 'operations', label: '运营', area: '运营',
    children: [
      { id: 'art-management', label: '艺术管理', tags: ['艺术管理'] },
      { id: 'marketing', label: '市场与推广', tags: ['市场营销', '运营推广'] },
      { id: 'management', label: '经纪', tags: ['执行经纪'] },
      { id: 'planning', label: '策划', tags: ['策划'] },
    ],
  },
  {
    id: 'other', label: '其他', area: '其他',
    children: [
      { id: 'finance', label: '金融', tags: ['金融'] },
      { id: 'seafaring', label: '海员', tags: ['海员'] },
      { id: 'grappling', label: '柔术', tags: ['柔术（nogi）'] },
    ],
  },
];
