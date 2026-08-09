export const DEFAULT_ENGINES = [
  { id: 'google', label: 'Google', url: 'https://www.google.com/search?q={q}', shortcut: 'g' },
  { id: 'bing', label: 'Bing', url: 'https://www.bing.com/search?q={q}', shortcut: 'b' },
  { id: 'baidu', label: 'Baidu', url: 'https://www.baidu.com/s?wd={q}', shortcut: '' },
  { id: 'duckduckgo', label: 'DuckDuckGo', url: 'https://duckduckgo.com/?q={q}', shortcut: 'd' },
  { id: 'github', label: 'GitHub', url: 'https://github.com/search?q={q}', shortcut: '' },
  { id: 'pubmed', label: 'PubMed', url: 'https://pubmed.ncbi.nlm.nih.gov/?term={q}', shortcut: 'p' }
]

export const DEFAULT_HITOKOTO = [
  '为国为民，侠之大者 —— 郭靖 ·《神雕侠侣》',
  '他强由他强，清风拂山岗 —— 张无忌 ·《倚天屠龙记》',
  '问世间情为何物，直教生死相许 —— 李莫愁 ·《神雕侠侣》',
  '沧海难为水，巫山不是云 —— 杨过 ·《神雕侠侣》',
  '沧海一声笑，滔滔两岸潮 —— 令狐冲 ·《笑傲江湖》',
  '有人的地方，就有江湖 —— 任我行 ·《笑傲江湖》',
  '风未动，旗也未动，是人的心自己在动 ——《笑傲江湖》',
  '人在江湖，身不由己 —— 楚留香 ·《楚留香传奇》',
  '一杯酒一个朋友，两杯酒一段交情 —— 离歌笑 ·《怪侠一枝梅》',
  '唯一不变的，就是大家都变了 —— 小鱼儿 ·《小鱼儿与花无缺》',
  '天地之间，唯有我刀 —— 归海一刀 ·《天下第一》',
  '天下第一又如何？不如和你相守一生 —— 上官海棠 ·《天下第一》',
  '我乔峰要走，你们谁能阻挡？ —— 乔峰 ·《天龙八部》',
  '红颜弹指老，刹那芳华 —— 天山童姥 ·《天龙八部》',
  '我命由我不由天 —— 董天宝 ·《太极张三丰》',
  '水虽至柔，却能克至刚 —— 张君宝 ·《太极张三丰》',
  '放下包袱，顺其自然 —— 张君宝 ·《太极张三丰》',
  '一个人的笑容，是骗不了人的 —— 李寻欢 ·《小李飞刀》',
  '他朝若是同淋雪，此生也算共白头 —— 黄药师 ·《东邪西毒》'
]

export const DEFAULT_SETTINGS = {
  theme: 'light',
  dataSource: 'browser',
  cardSize: 'default',
  cardRadius: 14,
  cardFontSize: 15,
  background: '',
  backgroundBlur: 0,
  profileName: 'Lucuro',
  profileAvatar: '',
  workspaceTitle: 'Lucuro - 鹿客司南',
  newTabEnabled: true,
  customTags: [],
  defaultEngineId: 'google',
  engines: DEFAULT_ENGINES,
  hitokoto: '',
  notes: '',
  layoutLocked: true
}

export function normalizeLinks(data) {
  const groups = Array.isArray(data) ? data : data?.icons || []
  return groups.map((group, index) => ({
    id: group.id || `category-${index}-${Date.now().toString(36)}`,
    title: group.title || 'Uncategorized',
    subtitle: group.subtitle || '',
    sort: Number(group.sort) || index,
    children: (group.children || []).map((child, childIndex) => normalizeChild(child, childIndex))
  }))
}

function normalizeChild(child, index = 0) {
  if (Array.isArray(child.children)) {
    return {
      id: child.id || `group-${Date.now().toString(36)}-${index}-${Math.random().toString(36).slice(2, 8)}`,
      title: child.title || 'Untitled folder',
      subtitle: child.subtitle || '',
      children: child.children.map((nested, nestedIndex) => normalizeCard(nested, nestedIndex))
    }
  }
  return normalizeCard(child, index)
}

export function normalizeCard(child, index = 0) {
  const icon = child.icon && typeof child.icon === 'object' ? child.icon : {}
  const rawSrc = String(icon.src || '')
  const src = /^(https?:|data:|blob:|\/\/)/i.test(rawSrc) ? rawSrc : ''
  return {
    id: child.id || `card-${Date.now().toString(36)}-${index}-${Math.random().toString(36).slice(2, 8)}`,
    icon: {
      text: icon.text || '',
      itemType: icon.itemType ?? 2,
      src,
      name: icon.name || '',
      source: icon.source || (src ? 'image' : 'auto'),
      backgroundColor: icon.backgroundColor || ''
    },
    title: child.title || 'Untitled',
    url: child.url || '',
    lanUrl: child.lanUrl || '',
    description: child.description || '',
    tags: Array.isArray(child.tags) ? child.tags : [],
    isVpnRequired: Boolean(child.isVpnRequired),
    clickCount: Number(child.clickCount) || 0,
    createdAt: Number(child.createdAt) || 0,
    sort: Number(child.sort) || 99999
  }
}

export function normalizeSettings(saved = {}) {
  const engines = Array.isArray(saved.engines) && saved.engines.length ? saved.engines : DEFAULT_ENGINES
  const { accent, ...safeSettings } = saved
  return {
    ...DEFAULT_SETTINGS,
    ...safeSettings,
    engines
  }
}

export function splitTitle(title) {
  if (!title) return { main: 'Uncategorized', sub: '' }
  if (title.includes(' - ')) {
    const [main, ...rest] = title.split(' - ')
    return { main, sub: rest.join(' - ') }
  }
  return { main: title, sub: '' }
}

export function uid(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`
}
