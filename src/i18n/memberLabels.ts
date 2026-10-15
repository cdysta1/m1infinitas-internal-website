import type { Language } from '@/i18n/messages';

export const EN_MEMBER_LABELS: Record<string, string> = {
  '全部': 'All', '音乐': 'Music', '音乐与声音': 'Music & sound', '声音艺术': 'Sound art',
  '剧场': 'Theatre', '剧场与空间': 'Theatre & space', '视觉': 'Visual arts', '空间': 'Space',
  '数字媒体': 'Digital media', '研究': 'Research', '运营': 'Operations', '其他': 'Other',
  '音乐工程': 'Music engineering', '录音': 'Recording', '混音': 'Mixing', '声音后期': 'Audio post-production',
  '混音与后期': 'Mixing & post', '音乐科技': 'Music technology', '音频工程': 'Audio engineering',
  '音乐人工智能': 'Music AI', '音频 DSP': 'Audio DSP', '声音交互': 'Sound interaction',
  '实时表演系统': 'Live performance systems', '流行音乐': 'Popular music', '流行演唱': 'Pop vocals',
  '和声演唱': 'Backing vocals', '演奏与演唱': 'Performance', '音乐演奏': 'Instrumental performance',
  '音乐表演': 'Music performance', '小提琴': 'Violin', '扬琴': 'Yangqin', '钢琴': 'Piano',
  '钢琴演奏': 'Piano performance', '长笛': 'Flute', '萨克斯': 'Saxophone', '手碟': 'Handpan',
  '合成器': 'Synthesizer', '合成器演奏': 'Synthesizer performance', '电筝': 'Electric zheng',
  '美声': 'Classical vocals', '呼麦': 'Throat singing', '唱作': 'Singer-songwriter', '唱作人': 'Singer-songwriter',
  '作曲与制作': 'Composition & production', '作曲': 'Composition', '编曲': 'Arrangement', '音乐制作': 'Music production',
  '电子音乐': 'Electronic music', '电子音乐制作': 'Electronic music production', '电子音乐作曲': 'Electronic composition',
  '游戏配乐': 'Game music', '电影配乐': 'Film scoring', '中国民族音乐': 'Traditional Chinese music',
  '音乐研究': 'Music research', '音乐研究者': 'Music researcher', '音乐学': 'Musicology', '音乐美学': 'Music aesthetics',
  '乐评': 'Music criticism', '审美心理学': 'Aesthetic psychology', '作曲理论': 'Composition theory',
  '声音设计': 'Sound design', '合成器设计': 'Synthesizer design', '跨媒介': 'Cross-media',
  '编剧': 'Playwriting', '导演': 'Directing', '戏剧教育': 'Drama education', '应用戏剧': 'Applied theatre',
  '艺术教育': 'Arts education', '舞蹈': 'Dance', '舞者': 'Dance', '接触即兴': 'Contact improvisation',
  '视觉设计': 'Visual design', '工业与产品设计': 'Industrial & product design', '工业设计': 'Industrial design',
  '产品设计': 'Product design', '设计创新': 'Design innovation', '摄影': 'Photography', '绘画': 'Painting',
  '中国绘画': 'Chinese painting', '电影': 'Film', '当代艺术': 'Contemporary art', '建筑': 'Architecture',
  '舞台设计': 'Stage design', '互动装置': 'Interactive installations', '互动装置设计': 'Interactive installation design',
  '交互设计': 'Interaction design', '交互': 'Interaction', '人机交互': 'Human-computer interaction',
  '感官交互': 'Sensory interaction', '新媒体': 'New media', '游戏': 'Games', 'CMF 材质工艺': 'CMF design',
  'CMF材质工艺设计': 'CMF design', '应用语言学': 'Applied linguistics', '哲学': 'Philosophy',
  '文化研究': 'Cultural studies', '写作': 'Writing', '写作者': 'Writing', '艺术管理': 'Arts management',
  '市场与推广': 'Marketing & promotion', '市场营销': 'Marketing', '运营推广': 'Operations & promotion',
  '经纪': 'Artist management', '执行经纪': 'Artist management', '策划': 'Planning', '金融': 'Finance',
  '海员': 'Seafaring', '柔术': 'Grappling', '柔术（nogi）': 'No-gi grappling', '工程': 'Engineering',
  '设计': 'Design', '研究者': 'Research', '审美计算设计': 'Computational aesthetics', '艺术制作': 'Arts production',
  '作曲家': 'Composer', '声音艺术家': 'Sound artist', '音乐制作人': 'Music producer', '音乐人': 'Musician',
  '艺术教育者': 'Arts educator', '流行歌手': 'Pop vocalist', '应用戏剧工作者': 'Applied theatre practitioner',
  '音乐科技工程师': 'Music technology engineer', '网站': 'Website', '邮箱': 'Email',
  '微信公众号': 'WeChat channel', '网易云音乐': 'NetEase Cloud Music', 'B站': 'Bilibili',
  'Bandcamp / SoundCloud / YouTube / 网易云音乐': 'Bandcamp / SoundCloud / YouTube / NetEase Cloud Music',
};

export function translateMemberLabel(language: Language, value: string): string {
  if (language === 'zh') return value;
  const direct = EN_MEMBER_LABELS[value];
  if (typeof direct === 'string') return direct;
  return value.split(' / ').map((part) => {
    const translated = EN_MEMBER_LABELS[part];
    return typeof translated === 'string' ? translated : part;
  }).join(' / ');
}
