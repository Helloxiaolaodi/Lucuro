import { reactive } from 'vue'
import { i18n } from '../i18n'
import {
  DEFAULT_HITOKOTO,
  normalizeLinks,
  normalizeSettings,
  uid,
  splitTitle
} from '../data/defaults'
import { storage, syncStorage, readFileAsDataUrl, readFileAsText, downloadJson, onStorageChanged } from '../utils/storage'
import {
  fetchBrowserBookmarkGroups,
  mergeBookmarkGroups
} from '../utils/bookmarks'

const state = reactive({
  links: [],
  settings: normalizeSettings(),
  stats: {},
  loaded: false,
  activeTag: 'all',
  activeCategory: null,
  searchQuery: '',
  settingsOpen: false,
  settingsTab: 'links',
  initializing: true,
  cardModal: null,
  categoryModal: null,
  toastMessage: '',
  currentHitokoto: '',
  bookmarkImporting: false,
  bookmarkSyncStatus: 'idle',
  lastBookmarkSyncAt: 0
})

function t(key, params) {
  return i18n.global.t(key, params)
}

const STORAGE_LINKS = 'lucuro_links_v1'
const STORAGE_SETTINGS = 'lucuro_settings_v1'
const STORAGE_STATS = 'lucuro_stats_v1'
const STORAGE_LOCAL_JSON = 'lucuro_local_json_data'
const STORAGE_LOCAL_SOURCE = 'lucuro_data_source'
const SYNC_LINKS = 'lucuro_links_v1'
const SYNC_SETTINGS = 'lucuro_settings_v1'
const SYNC_STATS = 'lucuro_stats_v1'

let toastTimer = null
let storageUnsubscribe = null
let applyingRemoteChange = false
let ownSyncWrites = 0
let lastLocalJson = null
let notesTimer = null
let hitokotoTimer = null
const HITOKOTO_ROTATE_MS = 10_000
const SMART_TAG_COUNT = 10

const SMART_STOP_WORDS = new Set([
  '的', '和', '与', '及', '在', '是', '为', '对', '中', '之', '上', '下',
  '用', '到', '有', '或', '等', '第', '页', '首页', '官网', '教程', '大全',
  '搜索', '登录', '注册', '下载', '文档', '资料', '工具', '网站', '地址',
  '链接', '网址', '最新', '免费', '中文', '英文', '视频', '在线', '使用',
  '帮助', '中心', '平台', '系统', '管理', '设置', '支持', '服务', '项目',
  '学习', '课程', '文章', '文件', '模板', '指南', '介绍', '说明', '官方',
  '论坛', '社区', '博客',
  'index', 'home', 'login', 'sign', 'log', 'out', 'page', 'main', 'default',
  'www', 'http', 'https', 'com', 'org', 'net', 'cn', 'html', 'php', 'aspx',
  'jsp', 'pdf', 'jpg', 'png', 'css', 'js', 'jsx', 'ts', 'tsx', 'api', 'app',
  'web', 'site', 'online', 'download', 'search', 'docs', 'doc', 'help',
  'support', 'about', 'contact', 'news', 'newsletter', 'blog', 'wiki', 'readme',
  'read', 'the', 'and', 'for', 'with', 'from', 'your', 'you', 'this', 'that',
  'are', 'not', 'tools', 'tool', 'guide', 'tutorial', 'official', 'free',
  'latest', 'new', 'register', 'manage', 'management', 'setting', 'settings',
  'config', 'configuration', 'view', 'list', 'group', 'folder', 'bookmark',
  'bookmarks', 'favorite', 'favorites', 'top', 'more', 'open', 'newtab',
  'extension', 'lucuro', 'chrome', 'edge', 'firefox', 'browser'
])

const SMART_DOMAIN_RULES = [
  { label: 'Git', hosts: ['github.com', 'gitee.com', 'gitlab.com', 'bitbucket.org'] },
  { label: '文献', hosts: ['ncbi.nlm.nih.gov', 'pubmed.ncbi.nlm.nih.gov', 'nature.com', 'sciencedirect.com', 'springer.com', 'wiley.com', 'ieee.org', 'scholar.google.com', 'researchgate.net', 'arxiv.org', 'semanticscholar.org', 'cnki.net'] },
  { label: '视频', hosts: ['youtube.com', 'bilibili.com', 'vimeo.com', 'twitch.tv'] },
  { label: '搜索', hosts: ['google.com', 'bing.com', 'baidu.com', 'duckduckgo.com', 'yahoo.com'] },
  { label: '开发', hosts: ['stackoverflow.com', 'stackexchange.com', 'csdn.net', 'segmentfault.com', 'dev.to', 'npmjs.com', 'pypi.org', 'mozilla.org', 'developer.mozilla.org'] },
  { label: '社区', hosts: ['reddit.com', 'zhihu.com', 'v2ex.com', 'linux.do', 'discord.com', 'telegram.org'] },
  { label: '文档', hosts: ['notion.so', 'obsidian.md', 'evernote.com', 'yuque.com', 'feishu.cn', 'docs.google.com', 'learn.microsoft.com'] },
  { label: '云服务', hosts: ['cloudflare.com', 'aws.amazon.com', 'azure.microsoft.com', 'cloud.google.com', 'aliyun.com', 'tencentcloud.com'] },
  { label: '设计', hosts: ['figma.com', 'dribbble.com', 'behance.net', 'canva.com', 'photopea.com'] },
  { label: '邮箱', hosts: ['mail.google.com', 'outlook.com', 'mail.qq.com', 'mail.163.com', 'proton.me'] }
]

const SMART_KEYWORD_TAGS = [
  'AI', 'Python', 'JavaScript', 'TypeScript', 'Java', 'Rust', 'Go', 'Vue',
  'React', 'Node.js', 'Docker', 'Kubernetes', 'Linux', 'Git', 'Database',
  'SQL', 'Bioinformatics', 'Machine Learning', 'Deep Learning', 'Data Science'
]

function persistLinks() {
  const tasks = [storage.set(STORAGE_LINKS, state.links)]
  if (state.settings.dataSource === 'json') {
    tasks.push(storage.set(STORAGE_LOCAL_JSON, state.links))
  } else {
    tasks.push(writeSync(SYNC_LINKS, state.links))
  }
  return Promise.all(tasks).catch((error) => {
    console.warn('[Lucuro] Failed to persist links', error)
  })
}

async function writeSync(key, value) {
  ownSyncWrites += 1
  try {
    await syncStorage.set(key, value)
  } finally {
    ownSyncWrites -= 1
  }
}

function syncSettingsPayload() {
  const { background, backgroundMaskOpacity, profileAvatar, smartTagsVisible, ...syncable } = state.settings
  return syncable
}

function persistSettings() {
  return Promise.all([
    storage.set(STORAGE_SETTINGS, state.settings),
    writeSync(SYNC_SETTINGS, syncSettingsPayload())
  ]).catch((error) => {
    console.warn('[Lucuro] Failed to persist settings', error)
  })
}

function persistStats() {
  return Promise.all([
    storage.set(STORAGE_STATS, state.stats),
    writeSync(SYNC_STATS, state.stats)
  ]).catch((error) => {
    console.warn('[Lucuro] Failed to persist stats', error)
  })
}

async function loadLinks() {
  if (!state.settings.dataSource) {
    state.links = []
    return
  }
  if (state.settings.dataSource === 'json') {
    let localJson = await storage.get(STORAGE_LOCAL_JSON)
    const usingFallback = !Array.isArray(localJson) || !localJson.length
    if (usingFallback) localJson = lastLocalJson
    lastLocalJson = Array.isArray(localJson) ? localJson : lastLocalJson
    state.links = normalizeLinks(localJson)
    if (usingFallback && state.links.length) {
      await storage.set(STORAGE_LOCAL_JSON, state.links).catch(() => {})
    }
    return
  }

  const saved = await storage.get(STORAGE_LINKS)
  if (Array.isArray(saved) && saved.length) {
    state.links = normalizeLinks(saved)
    return
  }
  const synced = await syncStorage.get(SYNC_LINKS)
  if (Array.isArray(synced) && synced.length) {
    state.links = normalizeLinks(synced)
    await storage.set(STORAGE_LINKS, state.links)
    return
  }
  state.links = []
}

async function persistDataSource() {
  await Promise.all([
    storage.set(STORAGE_LOCAL_SOURCE, state.settings.dataSource).catch(() => {}),
    persistSettings().catch(() => {})
  ])
}

async function load() {
  try {
    const [savedSettings, savedStats] = await Promise.all([
      storage.get(STORAGE_SETTINGS),
      storage.get(STORAGE_STATS)
    ])
    const [syncedSettings, syncedStats] = await Promise.all([
      syncStorage.get(SYNC_SETTINGS),
      syncStorage.get(SYNC_STATS)
    ])
    state.settings = normalizeSettings(savedSettings || syncedSettings || {})
    const savedSource = await storage.get(STORAGE_LOCAL_SOURCE)
    const nextSource = savedSource === 'json' ? 'json' : 'browser'
    state.settings.dataSource = nextSource
    if (nextSource === 'json') {
      const localJson = await storage.get(STORAGE_LOCAL_JSON)
      if (!Array.isArray(localJson) || !localJson.length) {
        // A stale empty JSON selection is the common cause of a blank new tab.
        // Revert to browser bookmarks so startup populates automatically.
        state.settings.dataSource = 'browser'
        await Promise.all([
          storage.set(STORAGE_LOCAL_SOURCE, 'browser').catch(() => {}),
          persistSettings().catch(() => {})
        ])
      }
    } else if (nextSource !== savedSource) {
      await storage.set(STORAGE_LOCAL_SOURCE, nextSource).catch(() => {})
    }
    state.stats = savedStats || syncedStats || {}
    if (!savedSettings && syncedSettings) await storage.set(STORAGE_SETTINGS, state.settings)
    if (!savedStats && syncedStats) await storage.set(STORAGE_STATS, state.stats)
    await loadLinks()
    if (state.settings.dataSource === 'browser') {
      await importBrowserBookmarks({ silent: true, replace: true, startup: true })
    }
  } finally {
    state.initializing = false
    state.loaded = true
    refreshHitokoto()
    applySettings()
    watchStorage()
  }
}

function watchStorage() {
  if (storageUnsubscribe) return
  storageUnsubscribe = onStorageChanged(async (changes, areaName) => {
    if (areaName !== 'sync' || ownSyncWrites > 0 || applyingRemoteChange) return
    applyingRemoteChange = true
    let settingsChanged = false
    try {
      if (changes[SYNC_LINKS]?.newValue && state.settings.dataSource !== 'json') {
        const incomingLinks = normalizeLinks(changes[SYNC_LINKS].newValue)
        if (JSON.stringify(incomingLinks) !== JSON.stringify(state.links)) {
          state.links = incomingLinks
          await storage.set(STORAGE_LINKS, state.links)
        }
      }
      if (changes[SYNC_SETTINGS]?.newValue) {
        settingsChanged = true
        const remoteSettings = changes[SYNC_SETTINGS].newValue
        if (JSON.stringify(remoteSettings) !== JSON.stringify(syncSettingsPayload())) {
          const localSettings = await storage.get(STORAGE_SETTINGS)
          state.settings = normalizeSettings({
            ...(localSettings || {}),
            ...remoteSettings
          })
          await storage.set(STORAGE_SETTINGS, state.settings)
          const savedSource = await storage.get(STORAGE_LOCAL_SOURCE)
          const nextSource = savedSource === 'json' || savedSource === 'browser' ? savedSource : null
          state.settings.dataSource = nextSource
          if (nextSource === 'json') await loadLinks()
        }
      }
      if (changes[SYNC_STATS]?.newValue) {
        state.stats = changes[SYNC_STATS].newValue || {}
        await storage.set(STORAGE_STATS, state.stats)
      }
    } catch (error) {
      console.warn('[Lucuro] Failed to apply synced storage', error)
    } finally {
      applyingRemoteChange = false
      if (settingsChanged) {
        refreshHitokoto()
        applySettings()
      }
    }
  })
}

function applySettings() {
  const root = document.documentElement
  root.dataset.theme = state.settings.theme === 'dark' ? 'dark' : 'light'
  root.dataset.cardSize = state.settings.cardSize || 'default'
  root.style.setProperty('--accent', '#0087eb')
  root.style.setProperty('--accent-soft', 'rgba(0, 135, 235, 0.14)')
  root.style.setProperty('--card-radius', `${Number(state.settings.cardRadius) || 14}px`)
  root.style.setProperty('--card-font-size', `${Number(state.settings.cardFontSize) || 15}px`)
  root.style.setProperty('--bg-blur', `${Number(state.settings.backgroundBlur) || 0}px`)

  const body = document.body
  if (state.settings.background) {
    body.classList.add('has-custom-bg')
    body.classList.toggle('bg-blurred', Number(state.settings.backgroundBlur) > 0)
    root.style.setProperty('--bg-image', `url("${cssEscape(state.settings.background)}")`)
    const maskOpacity = Number(state.settings.backgroundMaskOpacity)
    root.style.setProperty('--bg-mask-opacity', isNaN(maskOpacity) ? '0.4' : String(maskOpacity))
    body.style.backgroundImage = ''
  } else {
    body.classList.remove('has-custom-bg')
    body.classList.remove('bg-blurred')
    root.style.removeProperty('--bg-image')
    root.style.removeProperty('--bg-mask-opacity')
    body.style.backgroundImage = ''
  }
  document.title = state.settings.workspaceTitle || 'Lucuro'
}

function cssEscape(value) {
  return String(value || '').replace(/["\\\n\r]/g, '')
}

function toast(message) {
  state.toastMessage = message
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => {
    state.toastMessage = ''
  }, 2400)
}

function totalClicks(card) {
  return Number(card.clickCount || 0) + Number(state.stats[card.url] || 0)
}

function trackClick(card) {
  if (!card?.url) return
  state.stats[card.url] = (Number(state.stats[card.url]) || 0) + 1
  persistStats()
  if (state.settings.sortByClicks) state.links = [...state.links]
}

async function importBrowserBookmarks(options = {}) {
  if (state.bookmarkImporting) return
  const silent = Boolean(options?.silent)
  const replace = options?.replace !== false
  const startup = Boolean(options?.startup)
  state.bookmarkImporting = true
  state.bookmarkSyncStatus = 'syncing'
  try {
    const imported = await fetchBrowserBookmarkGroups()
    if (!imported.length) {
      if (replace && !startup) {
        state.links = []
        await persistLinks().catch(() => {})
      }
      state.bookmarkSyncStatus = 'empty'
      if (!silent) toast(t('toast.bookmarksEmpty'))
      return
    }
    if (replace) {
      state.links = imported
      await persistLinks().catch(() => {})
      state.bookmarkSyncStatus = 'synced'
      state.lastBookmarkSyncAt = Date.now()
      if (!silent) toast(t('toast.bookmarksImported', { count: imported.reduce((total, group) => total + group.children.length, 0) }))
      return
    }
    const merged = mergeBookmarkGroups(state.links, imported)
    const addedCount = merged.addedCount
    state.links = merged.links
    state.bookmarkSyncStatus = 'synced'
    state.lastBookmarkSyncAt = Date.now()
    if (!addedCount && !silent) {
      toast(t('toast.bookmarksNoNew'))
      return
    }
    await persistLinks().catch(() => {})
    if (!silent && addedCount) toast(t('toast.bookmarksImported', { count: addedCount }))
  } catch (error) {
    state.bookmarkSyncStatus = 'error'
    console.error('[Lucuro] Browser bookmark sync failed:', error)
    if (!silent) toast(t('toast.bookmarksFailed'))
  } finally {
    state.bookmarkImporting = false
  }
}

async function importLinksFile(file) {
  if (!file || state.bookmarkImporting) return
  state.bookmarkImporting = true
  try {
    const text = await readFileAsText(file)
    const parsed = JSON.parse(text)
    const imported = normalizeLinks(parsed)
    if (!imported.length) {
      toast(t('toast.jsonImportEmpty'))
      return
    }
    state.links = imported
    lastLocalJson = imported
    state.settings.dataSource = 'json'
    await Promise.all([
      storage.set(STORAGE_LOCAL_JSON, imported),
      storage.set(STORAGE_LOCAL_SOURCE, 'json'),
      persistLinks().catch(() => {}),
      persistSettings().catch(() => {})
    ])
    toast(t('toast.jsonImported', { count: imported.reduce((total, group) => total + group.children.length, 0) }))
  } catch {
    toast(t('toast.jsonImportFailed'))
  } finally {
    state.bookmarkImporting = false
  }
}

async function setDataSource(source) {
  const value = source === 'json' ? 'json' : 'browser'
  state.settings.dataSource = value
  await persistDataSource()
  if (value === 'json') {
    let localJson = await storage.get(STORAGE_LOCAL_JSON)
    if (!Array.isArray(localJson) || !localJson.length) localJson = lastLocalJson
    if (Array.isArray(localJson) && localJson.length) {
      state.links = normalizeLinks(localJson)
      lastLocalJson = localJson
      await persistLinks().catch(() => {})
    } else {
      state.links = []
    }
    return
  }
  if (value === 'browser') {
    return importBrowserBookmarks({ silent: true, replace: true })
  }
}

function exportJson() {
  const now = new Date()
  const pad = (value) => String(value).padStart(2, '0')
  const exportTime = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`
  const date = exportTime.slice(0, 10)
  const payload = {
    version: 1,
    appName: 'Lucuro',
    exportTime,
    appVersion: '',
    icons: state.links.map((category) => ({
      title: category.title,
      sort: Number(category.sort) || 0,
      children: (category.children || []).map((card) => ({
        icon: {
          text: card.icon?.text || '',
          itemType: card.icon?.itemType ?? 2,
          src: card.icon?.src || '',
          name: card.icon?.name || '',
          backgroundColor: card.icon?.backgroundColor || ''
        },
        sort: Number(card.sort) || 99999,
        title: card.title,
        url: card.url,
        openMethod: 1,
        lanUrl: card.lanUrl || '',
        tags: Array.isArray(card.tags) ? card.tags : [],
        isVpnRequired: Boolean(card.isVpnRequired),
        clickCount: Number(card.clickCount) || 0
      }))
    }))
  }
  downloadJson(`lucuro-${date}.json`, payload)
  toast(t('toast.jsonExported'))
}

function currentEngine() {
  return state.settings.engines.find((engine) => engine.id === state.settings.defaultEngineId)
    || state.settings.engines[0]
}

function doSearch() {
  const engine = currentEngine()
  const raw = state.searchQuery.trim()
  if (!raw || !engine?.url) return
  const shortcut = engine.shortcut ? `${engine.shortcut.trim()} ` : ''
  const query = raw.startsWith(shortcut) ? raw.slice(shortcut.length) : raw
  const url = engine.url.replace(/\{q\}/g, encodeURIComponent(query))
  window.open(url, '_blank', 'noopener,noreferrer')
}

function localSearch(raw) {
  const command = String(raw || '').trim()
  if (command.startsWith('/') && command.length < 2) return []
  const term = (command.startsWith('/') ? command.slice(1) : command).trim().toLowerCase()
  if (!term) return []

  const tokens = term.split(/\s+/).filter(Boolean)
  const results = []
  state.links.forEach((category, categoryIndex) => {
    (category.children || []).forEach((card, cardIndex) => {
      if (!card?.title && !card?.url) return
      const haystack = [
        card.title,
        (card.tags || []).join(' '),
        card.url,
        card.lanUrl,
        category.title
      ].filter(Boolean).join(' ').toLowerCase()
      if (!tokens.every((token) => haystack.includes(token))) return

      const lowerTitle = String(card.title || '').toLowerCase()
      const titleMatch = tokens.some((token) => lowerTitle.includes(token))
      const tagMatch = (card.tags || []).some((tag) => tokens.some((token) => String(tag).toLowerCase().includes(token)))
      results.push({
        type: 'card',
        card,
        categoryTitle: category.title,
        categoryIndex,
        cardIndex,
        score: (titleMatch ? 0 : 1) + (tagMatch ? 0 : 2)
      })
    })
  })
  return results
    .sort((a, b) => a.score - b.score || String(a.card.title || '').localeCompare(String(b.card.title || ''), undefined, { sensitivity: 'base' }))
    .slice(0, 24)
}

function filteredCategories() {
  const term = state.searchQuery.trim().toLowerCase()
  const engine = currentEngine()
  if (term && engine?.shortcut && term.startsWith(`${engine.shortcut} `)) return []
  const smartTagList = smartTags()
  const smartTagSet = new Set(smartTagList)

  return state.links
    .map((category, index) => {
      const items = sortCards(category.children)
        .map((card, cardIndex) => ({ card, cardIndex }))
        .filter(({ card }) => {
          const tagMatch = state.activeTag === 'all' || (
            smartTagSet.has(state.activeTag)
              ? matchesSmartTag(card, category, state.activeTag)
              : (card.tags || []).includes(state.activeTag)
          )
          const categoryMatch = state.activeCategory === null || state.activeCategory === index
          const haystack = `${card.title} ${(card.tags || []).join(' ')} ${card.url}`.toLowerCase()
          const searchMatch = !term || haystack.includes(term)
          return tagMatch && categoryMatch && searchMatch
        })
      return { category, index, items }
    })
    .filter((entry) => entry.items.length > 0)
}

function sortCards(cards) {
  const mode = state.settings.sortMode || 'default'
  const sorted = [...cards]
  if (mode === 'frequency') {
    sorted.sort((a, b) => totalClicks(b) - totalClicks(a))
  } else if (mode === 'alphabetical') {
    sorted.sort((a, b) => String(a.title || '').localeCompare(String(b.title || ''), undefined, { sensitivity: 'base' }))
  } else if (mode === 'added') {
    sorted.sort((a, b) => (Number(b.createdAt) || 0) - (Number(a.createdAt) || 0))
  }
  return sorted
}

function allTags() {
  const settingsTags = Array.isArray(state.settings.customTags) ? state.settings.customTags : []
  return [
    ...new Set([
      ...settingsTags,
      ...state.links.flatMap((category) => category.children.flatMap((card) => card.tags || []))
    ])
  ]
}

function smartTagDomainRuleForUrl(rawUrl) {
  if (!rawUrl) return null
  try {
    const hostname = new URL(rawUrl).hostname.replace(/^www\./, '').toLowerCase()
    const matches = SMART_DOMAIN_RULES
      .map((entry) => {
        const host = entry.hosts.find((item) => {
          const normalized = item.toLowerCase()
          return hostname === normalized || hostname.endsWith(`.${normalized}`)
        })
        return host ? { entry, host } : null
      })
      .filter(Boolean)
      .sort((a, b) => b.host.length - a.host.length)
    return matches[0]?.entry?.label || null
  } catch {
    return null
  }
}

function containsKeyword(text, keyword) {
  const escaped = String(keyword || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, 'i').test(String(text || ''))
}

function smartTagForText(text) {
  return SMART_KEYWORD_TAGS.find((tag) => containsKeyword(text, tag)) || null
}

function smartWordCandidates(text) {
  const value = String(text || '').toLowerCase()
  const words = new Set()

  for (const block of value.match(/[\u4e00-\u9fa5]{2,}/g) || []) {
    if (!SMART_STOP_WORDS.has(block)) words.add(block)
    if (block.length > 3) {
      words.add(block.slice(0, 2))
      words.add(block.slice(-2))
    }
  }

  for (const token of value.match(/[a-z][a-z0-9_-]*/g) || []) {
    if (token.length >= 2 && !SMART_STOP_WORDS.has(token)) words.add(token)
  }

  return [...words]
}

function smartUrlWordCandidates(rawUrl) {
  if (!rawUrl) return []
  try {
    const parsed = new URL(rawUrl)
    const tokens = [
      ...parsed.hostname.replace(/^www\./, '').split(/[.-]+/),
      ...parsed.pathname.split(/[/._-]+/)
    ]
      .map((token) => String(token || '').toLowerCase())
      .filter((token) => token.length >= 2 && !SMART_STOP_WORDS.has(token))
    return [...new Set(tokens)]
  } catch {
    return []
  }
}

function smartTags() {
  const counts = new Map()
  const bump = (tag, weight = 1) => {
    const name = String(tag || '').trim()
    if (!name) return
    counts.set(name, (counts.get(name) || 0) + weight)
  }

  state.links.forEach((category) => {
    const categoryText = String(category.title || '')
    ;(category.children || []).forEach((card) => {
      const title = String(card.title || '')
      const url = String(card.url || '')
      const text = `${categoryText} ${title}`.trim()
      const domainTag = smartTagDomainRuleForUrl(url)
      const keywordTag = smartTagForText(text)

      if (domainTag) bump(domainTag, 4)
      if (keywordTag) bump(keywordTag, 3)
      smartWordCandidates(text).forEach((word) => bump(word, 1))
      smartUrlWordCandidates(url).forEach((word) => bump(word, 1))
    })
  })

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0]), undefined, { sensitivity: 'base' }))
    .slice(0, SMART_TAG_COUNT)
    .map(([tag]) => tag)
}

function matchesSmartTag(card, category, rawTag) {
  const tag = String(rawTag || '').trim()
  if (!tag) return false
  const title = String(card.title || '')
  const categoryTitle = String(category?.title || '')
  const url = String(card.url || '')
  const lowerTag = tag.toLowerCase()
  const text = `${categoryTitle} ${title}`.toLowerCase()

  if (smartTagDomainRuleForUrl(url) === tag) return true
  if (smartTagForText(`${categoryTitle} ${title}`) === tag) return true
  if (text.includes(lowerTag)) return true
  if ((card.tags || []).some((item) => String(item).toLowerCase() === lowerTag)) return true
  return smartUrlWordCandidates(url).some((word) => word === lowerTag)
}

function addTag(raw) {
  const name = String(raw || '').trim().replace(/\s+/g, ' ')
  if (!name) return false
  const tags = Array.isArray(state.settings.customTags) ? [...state.settings.customTags] : []
  if (!tags.includes(name)) {
    tags.push(name)
    state.settings.customTags = tags
    persistSettings()
  }
  return true
}

function removeTag(name) {
  state.settings.customTags = (Array.isArray(state.settings.customTags) ? state.settings.customTags : [])
    .filter((tag) => tag !== name)
  state.links.forEach((category) => {
    category.children.forEach((card) => {
      if (Array.isArray(card.tags)) {
        card.tags = card.tags.filter((tag) => tag !== name)
      }
    })
  })
  if (state.activeTag === name) state.activeTag = 'all'
  persistLinks()
  persistSettings()
}

function saveCard(payload) {
  const { section, index, data } = payload
  const category = state.links[section]
  if (!category) {
    toast(t('toast.addCategoryFirst'))
    return
  }
  if (!category.children) category.children = []
  const card = {
    id: data.id || uid('card'),
    icon: data.icon || {},
    title: data.title || 'Untitled',
    url: data.url || '',
    lanUrl: data.lanUrl || '',
    tags: data.tags || [],
    isVpnRequired: Boolean(data.isVpnRequired),
    clickCount: 0,
    createdAt: data.createdAt || Date.now(),
    sort: data.sort ?? 99999
  }
  if (index !== null && index !== undefined && category.children[index]) {
    card.clickCount = category.children[index].clickCount || 0
    category.children[index] = card
  } else {
    category.children.push(card)
  }
  state.cardModal = null
  persistLinks()
  toast(index === null || index === undefined ? t('toast.cardAdded') : t('toast.cardUpdated'))
}

function deleteCard(section, index) {
  const items = state.links[section]?.children
  if (!items?.[index]) return
  if (!window.confirm(t('toast.deleteCard'))) return
  items.splice(index, 1)
  persistLinks()
  toast(t('toast.cardDeleted'))
}

function saveCategory(payload) {
  const { index, title } = payload
  if (index !== null && index !== undefined && state.links[index]) {
    state.links[index].title = title || 'Untitled'
    state.links[index].subtitle = state.links[index].subtitle || ''
    toast(t('toast.categoryUpdated'))
  } else {
    state.links.push({
      id: uid('category'),
      title: title || 'Untitled',
      subtitle: '',
      sort: state.links.length,
      children: []
    })
    toast(t('toast.categoryAdded'))
  }
  state.categoryModal = null
  persistLinks()
}

function deleteCategory(index) {
  const category = state.links[index]
  if (!category) return
  if (!window.confirm(t('toast.deleteCategory', { name: category.title }))) return
  state.links.splice(index, 1)
  if (state.activeCategory === index) state.activeCategory = null
  persistLinks()
  toast(t('toast.categoryDeleted'))
}

function moveCategory(index, delta) {
  const target = index + delta
  if (target < 0 || target >= state.links.length) return
  const [moved] = state.links.splice(index, 1)
  state.links.splice(target, 0, moved)
  persistLinks()
}

function reorderCategories(oldIndex, newIndex) {
  if (oldIndex === newIndex) return
  if (oldIndex < 0 || oldIndex >= state.links.length) return
  if (newIndex < 0 || newIndex >= state.links.length) return
  const [moved] = state.links.splice(oldIndex, 1)
  state.links.splice(newIndex, 0, moved)
  persistLinks()
}

function moveCardWithin(section, index, delta) {
  const items = state.links[section]?.children
  const target = index + delta
  if (!items || target < 0 || target >= items.length) return
  const [moved] = items.splice(index, 1)
  items.splice(target, 0, moved)
  persistLinks()
}

function reorderCards(section, oldIndex, newIndex) {
  const items = state.links[section]?.children
  if (!items || oldIndex === newIndex) return
  if (oldIndex < 0 || oldIndex >= items.length) return
  if (newIndex < 0 || newIndex >= items.length) return
  const [moved] = items.splice(oldIndex, 1)
  items.splice(newIndex, 0, moved)
  persistLinks()
}

function moveCard({ fromSection, fromIndex, toSection, toIndex }) {
  if (fromSection === undefined || fromIndex === undefined || toSection === undefined || toIndex === undefined) return
  if (fromSection < 0 || fromSection >= state.links.length || toSection < 0 || toSection >= state.links.length) return
  const fromItems = state.links[fromSection].children
  const toItems = state.links[toSection].children
  if (fromIndex < 0 || fromIndex >= fromItems.length) return
  const [moved] = fromItems.splice(fromIndex, 1)
  toItems.splice(Math.max(0, Math.min(toIndex, toItems.length)), 0, moved)
  persistLinks()
}

function openCardModal(section, index = null) {
  state.cardModal = { section, index }
}

function openCategoryModal(index = null) {
  state.categoryModal = { index }
}

async function uploadBackground(file) {
  if (!file) return
  try {
    state.settings.background = await readFileAsDataUrl(file)
    state.settings.backgroundBlur = 0
    state.settings.backgroundMaskOpacity = 0.4
    applySettings()
    toast(t('toast.backgroundUpdated'))
    persistSettings().catch(() => {})
  } catch {
    toast(t('toast.imageReadFailed'))
  }
}

async function uploadAvatar(file) {
  if (!file) return
  try {
    state.settings.profileAvatar = await readFileAsDataUrl(file)
    toast(t('toast.avatarUpdated'))
    persistSettings().catch(() => {})
  } catch {
    toast(t('toast.imageReadFailed'))
  }
}

function setSettings(patch) {
  Object.assign(state.settings, patch)
  if (patch.smartTagsVisible === false && smartTags().includes(state.activeTag)) {
    state.activeTag = 'all'
  }
  persistSettings()
  applySettings()
}

function hitokotoPool() {
  const custom = String(state.settings.hitokoto || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
  return custom.length ? custom : DEFAULT_HITOKOTO
}

function refreshHitokoto() {
  const pool = hitokotoPool()
  if (!pool.length) {
    state.currentHitokoto = ''
    clearTimeout(hitokotoTimer)
    return
  }
  if (pool.length === 1) {
    state.currentHitokoto = pool[0]
    clearTimeout(hitokotoTimer)
    return
  }
  let next = state.currentHitokoto
  while (next === state.currentHitokoto) {
    next = pool[Math.floor(Math.random() * pool.length)]
  }
  state.currentHitokoto = next
  clearTimeout(hitokotoTimer)
  hitokotoTimer = setTimeout(refreshHitokoto, HITOKOTO_ROTATE_MS)
}

function setHitokoto(value) {
  state.settings.hitokoto = value
  clearTimeout(hitokotoTimer)
  hitokotoTimer = setTimeout(() => {
    persistSettings()
    refreshHitokoto()
  }, 600)
}

function setNotes(value) {
  state.settings.notes = value
  clearTimeout(notesTimer)
  notesTimer = setTimeout(() => persistSettings(), 600)
}

export function useLucuro() {
  return {
    state,
    load,
    applySettings,
    toast,
    allTags,
    smartTags,
    addTag,
    removeTag,
    filteredCategories,
    currentEngine,
    doSearch,
    localSearch,
    trackClick,
    totalClicks,
    saveCard,
    deleteCard,
    saveCategory,
    deleteCategory,
    moveCategory,
    reorderCategories,
    moveCardWithin,
    reorderCards,
    moveCard,
    openCardModal,
    openCategoryModal,
    uploadBackground,
    uploadAvatar,
    setSettings,
    setDataSource,
    setHitokoto,
    setNotes,
    refreshHitokoto,
    importBrowserBookmarks,
    importLinksFile,
    exportJson,
    splitTitle
  }
}
