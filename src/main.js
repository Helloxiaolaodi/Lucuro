import { createApp } from 'vue'
import App from './App.vue'
import { i18n, loadSavedLocale } from './i18n'
import './styles/main.css'
import { storage, syncStorage } from './utils/storage'
import { normalizeSettings } from './data/defaults'

const DEFAULT_NTP_REDIRECT_KEY = 'lucuro-default-ntp-redirect'

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
  }
})

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
  try {
    window.location.replace('about:blank')
  } catch {}
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
