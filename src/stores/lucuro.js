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
  cardModal: null,
  categoryModal: null,
  toastMessage: '',
  currentHitokoto: '',
  bookmarkImporting: false
})

function t(key, params) {
  return i18n.global.t(key, params)
}

const STORAGE_LINKS = 'lucuro_links_v1'
const STORAGE_SETTINGS = 'lucuro_settings_v1'
const STORAGE_STATS = 'lucuro_stats_v1'
const SYNC_LINKS = 'lucuro_links_v1'
const SYNC_SETTINGS = 'lucuro_settings_v1'
const SYNC_STATS = 'lucuro_stats_v1'

let toastTimer = null
let storageUnsubscribe = null
let applyingRemoteChange = false
let notesTimer = null
let hitokotoTimer = null

function persistLinks() {
  return Promise.all([
    storage.set(STORAGE_LINKS, state.links),
    syncStorage.set(SYNC_LINKS, state.links)
  ])
}

function persistSettings() {
  return Promise.all([
    storage.set(STORAGE_SETTINGS, state.settings),
    syncStorage.set(SYNC_SETTINGS, state.settings)
  ])
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
  state.links = []
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
  refreshHitokoto()
  applySettings()
  watchStorage()
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
    const overlay = state.settings.theme === 'dark'
      ? 'linear-gradient(rgba(15,23,42,0.55), rgba(15,23,42,0.55)), '
      : ''
    root.style.setProperty('--bg-image', `${overlay}url("${cssEscape(state.settings.background)}")`)
    body.style.backgroundImage = ''
  } else {
    body.classList.remove('has-custom-bg')
    root.style.removeProperty('--bg-image')
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
  state.bookmarkImporting = true
  try {
    const imported = await fetchBrowserBookmarkGroups()
    if (!imported.length) {
      if (replace) {
        state.links = []
        await persistLinks().catch(() => {})
      }
      if (!silent) toast(t('toast.bookmarksEmpty'))
      return
    }
    if (replace) {
      state.links = imported
      await persistLinks().catch(() => {})
      if (!silent) toast(t('toast.bookmarksImported', { count: imported.reduce((total, group) => total + group.children.length, 0) }))
      return
    }
    const merged = mergeBookmarkGroups(state.links, imported)
    const addedCount = merged.addedCount
    state.links = merged.links
    if (!addedCount && !silent) {
      toast(t('toast.bookmarksNoNew'))
      return
    }
    await persistLinks().catch(() => {})
    if (!silent && addedCount) toast(t('toast.bookmarksImported', { count: addedCount }))
  } catch {
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
    state.settings.dataSource = 'json'
    await Promise.all([
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

function setDataSource(source) {
  const value = source === 'json' ? 'json' : 'browser'
  state.settings.dataSource = value
  persistSettings().catch(() => {})
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
        description: card.description || '',
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

function allTags() {
  const settingsTags = Array.isArray(state.settings.customTags) ? state.settings.customTags : []
  return [
    ...new Set([
      ...settingsTags,
      ...state.links.flatMap((category) => category.children.flatMap((card) => card.tags || []))
    ])
  ]
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
    addTag,
    removeTag,
    filteredCategories,
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
