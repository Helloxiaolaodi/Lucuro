import { reactive } from 'vue'
import { i18n } from '../i18n'
import {
  DEFAULT_SETTINGS,
  DEFAULT_HITOKOTO,
  normalizeLinks,
  normalizeSettings,
  buildBackup,
  uid,
  splitTitle
} from '../data/defaults'
import { storage, syncStorage, readFileAsDataUrl, onStorageChanged } from '../utils/storage'
import {
  ensureBookmarkPermission,
  fetchBrowserBookmarkGroups,
  hasBookmarkPermission,
  mergeBookmarkGroups,
  revokeBookmarkPermission
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
  cardModal: null,
  categoryModal: null,
  toastMessage: '',
  syncStatus: '',
  syncIndicator: 'idle',
  shareCodeOpen: false,
  shareCode: '',
  shareCodeExpiresAt: 0,
  shareCodeLoading: false,
  shareCodeError: '',
  claimCodeOpen: false,
  claimCode: '',
  claimCodeLoading: false,
  claimCodeError: '',
  currentHitokoto: '',
  bookmarkImporting: false,
  history: []
})

function t(key, params) {
  return i18n.global.t(key, params)
}

const STORAGE_LINKS = 'lucuro_links_v1'
const STORAGE_SETTINGS = 'lucuro_settings_v1'
const STORAGE_STATS = 'lucuro_stats_v1'
const STORAGE_HISTORY = 'lucuro_history_v1'
const SYNC_LINKS = 'lucuro_links_v1'
const SYNC_SETTINGS = 'lucuro_settings_v1'
const SYNC_STATS = 'lucuro_stats_v1'

let toastTimer = null
let storageUnsubscribe = null
let applyingRemoteChange = false
let snapshotTimer = null
let notesTimer = null
let hitokotoTimer = null

function cloneDefault() {
  return JSON.parse(JSON.stringify(DEFAULT_SETTINGS))
}

function persistLinks() {
  return Promise.all([
    storage.set(STORAGE_LINKS, state.links),
    syncStorage.set(SYNC_LINKS, state.links)
  ]).then(() => queueSnapshot())
}

function persistSettings() {
  return Promise.all([
    storage.set(STORAGE_SETTINGS, state.settings),
    syncStorage.set(SYNC_SETTINGS, state.settings)
  ]).then(() => queueSnapshot())
}

function persistStats() {
  return Promise.all([
    storage.set(STORAGE_STATS, state.stats),
    syncStorage.set(SYNC_STATS, state.stats)
  ])
}

async function loadLinks() {
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
  try {
    const response = await fetch('./links.json')
    const data = await response.json()
    state.links = normalizeLinks(data.icons || data)
  } catch (error) {
    state.links = []
  }
  await persistLinks()
}

async function load() {
  const [savedSettings, savedStats] = await Promise.all([
    storage.get(STORAGE_SETTINGS),
    storage.get(STORAGE_STATS)
  ])
  const [syncedSettings, syncedStats] = await Promise.all([
    syncStorage.get(SYNC_SETTINGS),
    syncStorage.get(SYNC_STATS)
  ])
  state.settings = normalizeSettings(savedSettings || syncedSettings || {})
  state.stats = savedStats || syncedStats || {}
  if (!savedSettings && syncedSettings) await storage.set(STORAGE_SETTINGS, state.settings)
  if (!savedStats && syncedStats) await storage.set(STORAGE_STATS, state.stats)
  await loadLinks()
  state.loaded = true
  await loadHistory()
  refreshHitokoto()
  applySettings()
  watchStorage()
}

async function loadHistory() {
  const saved = await storage.get(STORAGE_HISTORY)
  state.history = Array.isArray(saved) ? saved.slice(0, 8) : []
}

function queueSnapshot() {
  if (!state.loaded) return
  clearTimeout(snapshotTimer)
  snapshotTimer = setTimeout(() => {
    const snapshot = {
      id: uid('snapshot'),
      createdAt: Date.now(),
      links: JSON.parse(JSON.stringify(state.links)),
      settings: JSON.parse(JSON.stringify(state.settings)),
      stats: JSON.parse(JSON.stringify(state.stats)),
      summary: `${state.links.length} ${t('settings.categories')} / ${state.links.reduce((sum, group) => sum + group.children.length, 0)} ${t('settings.cards')}`
    }
    state.history = [snapshot, ...state.history].slice(0, 8)
    storage.set(STORAGE_HISTORY, state.history)
  }, 1200)
}

async function restoreSnapshot(id) {
  const snapshot = state.history.find((item) => item.id === id)
  if (!snapshot) return
  if (!window.confirm(t('toast.restoreSnapshot'))) return
  state.links = normalizeLinks(snapshot.links || [])
  state.settings = normalizeSettings(snapshot.settings || {})
  state.stats = snapshot.stats || {}
  await Promise.all([persistLinks(), persistSettings(), persistStats()])
  applySettings()
  refreshHitokoto()
  toast(t('toast.historyRestored'))
}

async function clearHistory() {
  if (!window.confirm(t('toast.clearHistory'))) return
  state.history = []
  await storage.remove(STORAGE_HISTORY)
  toast(t('toast.historyCleared'))
}

function watchStorage() {
  if (storageUnsubscribe) return
  storageUnsubscribe = onStorageChanged((changes, areaName) => {
    if (areaName !== 'sync' || applyingRemoteChange) return
    if (changes[SYNC_LINKS]?.newValue) {
      applyingRemoteChange = true
      state.links = normalizeLinks(changes[SYNC_LINKS].newValue)
      storage.set(STORAGE_LINKS, state.links).finally(() => {
        applyingRemoteChange = false
      })
    }
    if (changes[SYNC_SETTINGS]?.newValue) {
      applyingRemoteChange = true
      state.settings = normalizeSettings(changes[SYNC_SETTINGS].newValue)
      storage.set(STORAGE_SETTINGS, state.settings).finally(() => {
        applyingRemoteChange = false
      })
      refreshHitokoto()
      applySettings()
    }
    if (changes[SYNC_STATS]?.newValue) {
      applyingRemoteChange = true
      state.stats = changes[SYNC_STATS].newValue || {}
      storage.set(STORAGE_STATS, state.stats).finally(() => {
        applyingRemoteChange = false
      })
    }
    state.syncIndicator = 'synced'
  })
}

function applySettings() {
  const root = document.documentElement
  root.dataset.theme = state.settings.theme === 'dark' ? 'dark' : 'light'
  root.dataset.cardSize = state.settings.cardSize || 'default'
  root.style.setProperty('--accent', state.settings.accent || '#0087eb')
  root.style.setProperty('--accent-soft', hexToRgba(state.settings.accent || '#0087eb', 0.14))
  root.style.setProperty('--card-radius', `${Number(state.settings.cardRadius) || 14}px`)

  const body = document.body
  if (state.settings.background) {
    body.classList.add('has-custom-bg')
    const overlay = state.settings.theme === 'dark'
      ? 'linear-gradient(rgba(15,23,42,0.55), rgba(15,23,42,0.55)), '
      : ''
    body.style.backgroundImage = `${overlay}url("${cssEscape(state.settings.background)}")`
  } else {
    body.classList.remove('has-custom-bg')
    body.style.backgroundImage = ''
  }
  document.title = state.settings.workspaceTitle || 'Lucuro'
}

function hexToRgba(hex, alpha) {
  const clean = String(hex || '').replace('#', '')
  if (clean.length !== 6 || /[^0-9a-fA-F]/.test(clean)) return `rgba(0, 135, 235, ${alpha})`
  const r = parseInt(clean.slice(0, 2), 16)
  const g = parseInt(clean.slice(2, 4), 16)
  const b = parseInt(clean.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
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

async function importBrowserBookmarks() {
  if (state.bookmarkImporting) return
  state.bookmarkImporting = true
  try {
    const granted = await ensureBookmarkPermission()
    if (!granted) {
      toast(t('toast.bookmarksPermissionDenied'))
      return
    }
    const imported = await fetchBrowserBookmarkGroups()
    if (!imported.length) {
      toast(t('toast.bookmarksEmpty'))
      return
    }
    const merged = mergeBookmarkGroups(state.links, imported)
    const addedCount = merged.addedCount
    state.links = merged.links
    if (!addedCount) {
      toast(t('toast.bookmarksNoNew'))
      return
    }
    await persistLinks()
    toast(t('toast.bookmarksImported', { count: addedCount }))
  } catch {
    toast(t('toast.bookmarksFailed'))
  } finally {
    state.bookmarkImporting = false
  }
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

function filteredCategories() {
  const term = state.searchQuery.trim().toLowerCase()
  const engine = currentEngine()
  if (term && engine?.shortcut && term.startsWith(`${engine.shortcut} `)) return []

  return state.links
    .map((category, index) => {
      const items = sortCards(category.children)
        .map((card, cardIndex) => ({ card, cardIndex }))
        .filter(({ card }) => {
          const tagMatch = state.activeTag === 'all' || (card.tags || []).includes(state.activeTag)
          const categoryMatch = state.activeCategory === null || state.activeCategory === index
          const haystack = `${card.title} ${card.description || ''} ${(card.tags || []).join(' ')} ${card.url}`.toLowerCase()
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

function recommendedCards(limit = 8) {
  return state.links
    .flatMap((category) => category.children)
    .filter((card) => card.url)
    .sort((a, b) => totalClicks(b) - totalClicks(a))
    .slice(0, limit)
}

function allTags() {
  return [...new Set(state.links.flatMap((category) => category.children.flatMap((card) => card.tags || [])))]
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
    openMethod: data.openMethod || 1,
    lanUrl: data.lanUrl || '',
    description: data.description || '',
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
  const { index, title, subtitle } = payload
  if (index !== null && index !== undefined && state.links[index]) {
    state.links[index].title = title || 'Untitled'
    state.links[index].subtitle = subtitle || ''
    toast(t('toast.categoryUpdated'))
  } else {
    state.links.push({
      id: uid('category'),
      title: title || 'Untitled',
      subtitle: subtitle || '',
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

function shareEndpoint() {
  const custom = String(state.settings.sync?.shareEndpoint || '').trim().replace(/\/+$/, '')
  return custom || 'https://lucuro-share.helloxiaolaodi.workers.dev'
}

async function createShareCode() {
  state.shareCodeLoading = true
  state.shareCodeError = ''
  state.syncStatus = t('syncStatus.creatingShare')
  try {
    const response = await fetch(`${shareEndpoint()}/api/share`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: buildBackup(state.links, state.settings, state.stats) })
    })
    if (!response.ok) throw new Error('Share create failed')
    const result = await response.json()
    if (!result?.code) throw new Error('Missing code')
    state.shareCode = String(result.code)
    state.shareCodeExpiresAt = Number(result.expiresAt) || 0
    state.shareCodeOpen = true
    state.syncStatus = t('syncStatus.shareReady')
    toast(t('toast.shareCreated'))
  } catch {
    state.shareCodeError = t('toast.shareFailed')
    state.syncStatus = t('syncStatus.shareFailed')
    toast(t('toast.shareFailed'))
  } finally {
    state.shareCodeLoading = false
  }
}

async function claimShareCode() {
  const code = String(state.claimCode || '').trim()
  if (!/^\d{6}$/.test(code)) {
    state.claimCodeError = t('toast.shareCodeRequired')
    return
  }
  state.claimCodeLoading = true
  state.claimCodeError = ''
  state.syncStatus = t('syncStatus.claimingShare')
  try {
    const response = await fetch(`${shareEndpoint()}/api/share/${code}`)
    if (!response.ok) throw new Error('Share claim failed')
    const result = await response.json()
    const parsed = result?.data
    if (!parsed) throw new Error('Missing data')
    const links = parsed.links || parsed.icons || null
    if (!Array.isArray(links)) throw new Error('Missing links')
    state.links = normalizeLinks(links)
    if (parsed.settings) state.settings = normalizeSettings(parsed.settings)
    if (parsed.stats) state.stats = parsed.stats
    await Promise.all([persistLinks(), persistSettings(), persistStats()])
    applySettings()
    state.claimCodeOpen = false
    state.claimCode = ''
    state.syncStatus = t('syncStatus.shareClaimed')
    toast(t('toast.shareClaimed'))
    refreshHitokoto()
  } catch {
    state.claimCodeError = t('toast.shareExpired')
    state.syncStatus = t('syncStatus.shareFailed')
    toast(t('toast.shareExpired'))
  } finally {
    state.claimCodeLoading = false
  }
}

function closeShareCode() {
  state.shareCodeOpen = false
  state.shareCode = ''
  state.shareCodeExpiresAt = 0
}

function openClaimCode() {
  state.claimCodeOpen = true
  state.claimCodeError = ''
}

function closeClaimCode() {
  state.claimCodeOpen = false
  state.claimCode = ''
  state.claimCodeError = ''
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
    await persistSettings()
    applySettings()
    toast(t('toast.backgroundUpdated'))
  } catch {
    toast('Could not read image')
  }
}

async function uploadAvatar(file) {
  if (!file) return
  try {
    state.settings.profileAvatar = await readFileAsDataUrl(file)
    await persistSettings()
    toast(t('toast.avatarUpdated'))
  } catch {
    toast(t('toast.imageReadFailed'))
  }
}

function setSettings(patch) {
  Object.assign(state.settings, patch)
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
  state.currentHitokoto = pool[Math.floor(Math.random() * pool.length)] || ''
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
    filteredCategories,
    recommendedCards,
    currentEngine,
    doSearch,
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
    resetLinks,
    clearStats,
    createShareCode,
    claimShareCode,
    closeShareCode,
    openClaimCode,
    closeClaimCode,
    uploadBackground,
    uploadAvatar,
    setSettings,
    setHitokoto,
    setNotes,
    refreshHitokoto,
    importBrowserBookmarks,
    hasBookmarkPermission,
    revokeBookmarkPermission,
    restoreSnapshot,
    clearHistory,
    splitTitle
  }
}

async function resetLinks() {
  if (!window.confirm(t('toast.resetAll'))) return
  await loadLinks()
  state.activeTag = 'all'
  state.activeCategory = null
  toast(t('toast.linksReset'))
}

function clearStats() {
  if (!window.confirm(t('toast.clearAllStats'))) return
  state.stats = {}
  persistStats()
  queueSnapshot()
  toast(t('toast.statsCleared'))
}
