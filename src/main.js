import { createApp } from 'vue'
import App from './App.vue'
import { i18n, loadSavedLocale } from './i18n'
import './styles/main.css'
import { storage, syncStorage } from './utils/storage'
import { normalizeSettings } from './data/defaults'

const DEFAULT_NTP_REDIRECT_KEY = 'lucuro-default-ntp-redirect'
const SETTINGS_KEY = 'lucuro_settings_v1'

Promise.all([
  loadSavedLocale(),
  storage.get('lucuro_settings_v1'),
  syncStorage.get('lucuro_settings_v1')
]).then(async ([, settings, syncedSettings]) => {
  const saved = normalizeSettings(settings || syncedSettings || {})
  if (saved.newTabEnabled !== false) {
    await writeRedirectStore(false)
    createApp(App).use(i18n).mount('#app')
    return
  }

  const redirected = await restoreBrowserDefaultNewTab()
  if (!redirected) {
    showDisabledFallback()
  } else {
    scheduleDisabledFallback()
  }
})

function scheduleDisabledFallback() {
  setTimeout(() => {
    if (!isBrowserNewTabHref(window.location.href) && document.visibilityState !== 'hidden' && document.body) {
      showDisabledFallback()
    }
  }, 500)
}

function isBrowserNewTabHref(href = '') {
  const value = String(href || '').toLowerCase()
  return value.startsWith('edge://newtab') ||
    value.startsWith('chrome://newtab') ||
    value.startsWith('chrome://new-tab-page') ||
    value.startsWith('about:newtab')
}

async function restoreBrowserDefaultNewTab() {
  const browserApi = globalThis.browser || globalThis.chrome

  if (isSameTabRedirectAttempted()) {
    clearSameTabRedirectAttempt()
    await writeRedirectStore(false)
    return redirectCurrentTabToBrowserDefault(browserApi)
  }

  const previouslyAttempted = await readRedirectStore()
  if (previouslyAttempted) {
    markSameTabRedirectAttempt()
    await writeRedirectStore(false)
    return redirectCurrentTabToBrowserDefault(browserApi)
  }

  await writeRedirectStore(true)
  return redirectToNewBrowserTab(browserApi)
}

async function redirectToNewBrowserTab(browserApi) {
  if (!browserApi?.tabs?.create) return false
  const [activeTab] = await queryActiveTab(browserApi)

  const created = await createDefaultTab(browserApi)
  if (created?.id == null) {
    if (activeTab?.id != null) {
      return redirectActiveTab(browserApi, activeTab.id)
    }
    return redirectLocation()
  }

  if (activeTab?.id != null && created.id !== activeTab.id) {
    try {
      await removeTab(browserApi, activeTab.id)
    } catch {}
  }
  return true
}

async function redirectCurrentTabToBrowserDefault(browserApi) {
  if (!browserApi?.tabs) {
    return redirectLocation()
  }

  const [activeTab] = await queryActiveTab(browserApi)
  if (activeTab?.id != null) {
    const redirected = await redirectActiveTab(browserApi, activeTab.id)
    if (redirected) return true
  }
  return redirectLocation()
}

async function createDefaultTab(browserApi) {
  try {
    const tab = await createTab(browserApi)
    if (tab?.id != null) return tab
  } catch {}

  for (const url of defaultNewTabUrls()) {
    try {
      const tab = await createTab(browserApi, url)
      if (tab?.id != null) return tab
    } catch {}
  }
  return null
}

async function redirectActiveTab(browserApi, tabId) {
  for (const url of defaultNewTabUrls()) {
    try {
      await updateTab(browserApi, tabId, url)
      return true
    } catch {}
  }
  return false
}

function redirectLocation() {
  for (const url of defaultNewTabUrls()) {
    try {
      window.location.replace(url)
      return true
    } catch {}
  }
  return false
}

function showDisabledFallback() {
  const root = document.getElementById('app')
  if (!root) return

  root.replaceChildren()
  const page = document.createElement('div')
  page.className = 'lucuro-disabled-page'

  const card = document.createElement('div')
  card.className = 'lucuro-disabled-card'

  const mark = document.createElement('div')
  mark.className = 'lucuro-disabled-mark'
  mark.setAttribute('aria-hidden', 'true')
  mark.innerHTML = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="10"></circle>
      <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"></polygon>
    </svg>
  `

  const badge = document.createElement('span')
  badge.className = 'lucuro-disabled-badge'
  badge.textContent = disabledMessage('badge')

  const title = document.createElement('h1')
  title.textContent = disabledMessage('title')

  const description = document.createElement('p')
  description.className = 'lucuro-disabled-description'
  description.textContent = disabledMessage('description')

  const enableButton = document.createElement('button')
  enableButton.type = 'button'
  enableButton.className = 'lucuro-disabled-enable'
  enableButton.textContent = disabledMessage('enable')
  enableButton.addEventListener('click', enableLucuro)

  const note = document.createElement('p')
  note.className = 'lucuro-disabled-note'
  note.textContent = disabledMessage('note')

  card.append(mark, badge, title, description, enableButton, note)
  page.append(card)
  root.append(page)
}

async function enableLucuro() {
  try {
    const [saved, synced] = await Promise.all([
      storage.get(SETTINGS_KEY),
      syncStorage.get(SETTINGS_KEY)
    ])
    const settings = normalizeSettings(saved || synced || {})
    settings.newTabEnabled = true
    await storage.set(SETTINGS_KEY, settings)
    await syncStorage.set(SETTINGS_KEY, settings).catch(() => {})
    window.location.reload()
  } catch {
    const button = document.querySelector('.lucuro-disabled-enable')
    if (button) button.textContent = disabledMessage('saveError')
  }
}

function disabledMessage(key) {
  const messages = {
    badge: {
      en: 'Disabled',
      zh: '已暂停'
    },
    title: {
      en: 'Lucuro is currently paused',
      zh: 'Lucuro 已暂停'
    },
    description: {
      en: 'The extension is still installed, so this tab cannot switch to the browser-native new tab page from inside the extension. Disable Lucuro in the extensions manager if you want the default browser page.',
      zh: '插件仍处于已安装状态，因此无法在扩展内部切换回浏览器原生新标签页。如需完全恢复浏览器默认主页，请在扩展管理页面中停用 Lucuro。'
    },
    enable: {
      en: 'Enable Lucuro',
      zh: '开启 Lucuro'
    },
    note: {
      en: 'Enabling Lucuro reloads this tab and restores your digital dashboard.',
      zh: '开启后，本页面会自动刷新并恢复 Lucuro 数字面板。'
    },
    saveError: {
      en: 'Could not save settings. Please try again.',
      zh: '无法保存设置，请稍后重试。'
    }
  }
  const locale = (document.documentElement.lang || navigator.language || 'en').toLowerCase().startsWith('zh') ? 'zh' : 'en'
  return messages[key]?.[locale] || messages[key]?.en || ''
}

function defaultNewTabUrls() {
  const ua = navigator.userAgent || ''
  if (globalThis.browser && !globalThis.chrome) return ['about:newtab']
  if (/Edg\//i.test(ua)) return ['edge://newtab/', 'chrome://new-tab-page/', 'chrome://newtab/']
  return ['chrome://newtab/', 'chrome://new-tab-page/']
}

function queryActiveTab(browserApi) {
  if (!browserApi?.tabs?.query) return Promise.resolve([])
  const result = browserApi.tabs.query({ active: true, currentWindow: true })
  if (result?.then) return result.catch(() => [])
  return new Promise((resolve) => {
    try {
      browserApi.tabs.query({ active: true, currentWindow: true }, (tabs) => resolve(tabs || []))
    } catch {
      resolve([])
    }
  })
}

function updateTab(browserApi, tabId, url) {
  const result = browserApi.tabs.update(tabId, { url })
  if (result?.then) return result
  return new Promise((resolve, reject) => {
    try {
      browserApi.tabs.update(tabId, { url }, (tab) => {
        if (globalThis.chrome?.runtime?.lastError) {
          reject(new Error(globalThis.chrome.runtime.lastError.message))
          return
        }
        resolve(tab)
      })
    } catch (error) {
      reject(error)
    }
  })
}

function createTab(browserApi, url) {
  const payload = url === undefined ? {} : { url }
  const result = browserApi.tabs.create(payload)
  if (result?.then) return result
  return new Promise((resolve, reject) => {
    try {
      browserApi.tabs.create(payload, (tab) => {
        if (globalThis.chrome?.runtime?.lastError) {
          reject(new Error(globalThis.chrome.runtime.lastError.message))
          return
        }
        resolve(tab)
      })
    } catch (error) {
      reject(error)
    }
  })
}

function removeTab(browserApi, tabId) {
  const result = browserApi.tabs.remove(tabId)
  if (result?.then) return result.catch(() => false)
  return new Promise((resolve, reject) => {
    try {
      browserApi.tabs.remove(tabId, () => {
        if (globalThis.chrome?.runtime?.lastError) {
          reject(new Error(globalThis.chrome.runtime.lastError.message))
          return
        }
        resolve(true)
      })
    } catch (error) {
      reject(error)
    }
  })
}

function getRedirectStore() {
  const browserApi = globalThis.browser || globalThis.chrome
  if (browserApi?.storage?.session) return browserApi.storage.session
  if (browserApi?.storage?.local) return browserApi.storage.local
  return null
}

function getStoreValue(store) {
  const result = store.get(DEFAULT_NTP_REDIRECT_KEY)
  if (result?.then) return result.catch(() => ({}))
  return new Promise((resolve) => {
    try {
      store.get(DEFAULT_NTP_REDIRECT_KEY, (data) => resolve(data || {}))
    } catch {
      resolve({})
    }
  })
}

async function readRedirectStore() {
  const store = getRedirectStore()
  if (!store) return false
  try {
    const data = await getStoreValue(store)
    return Boolean(data[DEFAULT_NTP_REDIRECT_KEY])
  } catch {
    return false
  }
}

async function writeRedirectStore(value) {
  const store = getRedirectStore()
  if (!store) return

  const payload = { [DEFAULT_NTP_REDIRECT_KEY]: value }
  const result = store.set(payload)
  if (result?.then) {
    await result.catch(() => {})
    return
  }

  await new Promise((resolve) => {
    try {
      store.set(payload, () => {
        if (globalThis.chrome?.runtime?.lastError) {
          delete globalThis.chrome.runtime.lastError
        }
        resolve()
      })
    } catch {
      resolve()
    }
  })
}

function isSameTabRedirectAttempted() {
  try {
    return sessionStorage.getItem(DEFAULT_NTP_REDIRECT_KEY) === '1'
  } catch {
    return false
  }
}

function markSameTabRedirectAttempt() {
  try {
    sessionStorage.setItem(DEFAULT_NTP_REDIRECT_KEY, '1')
  } catch {}
}

function clearSameTabRedirectAttempt() {
  try {
    sessionStorage.removeItem(DEFAULT_NTP_REDIRECT_KEY)
  } catch {}
}
