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
    await clearDefaultNtpRedirectAttempt()
    createApp(App).use(i18n).mount('#app')
    return
  }
  const redirected = await redirectToBrowserDefault()
  if (redirected) {
    await clearDefaultNtpRedirectAttempt()
  }
})

async function redirectToBrowserDefault() {
  const browserApi = globalThis.browser || globalThis.chrome

  if (browserApi?.tabs && (browserApi.tabs.update || browserApi.tabs.create)) {
    const redirected = await redirectWithTabs(browserApi)
    if (redirected) return
  }

  if (!globalThis.browser && !globalThis.chrome) {
    for (const url of defaultNewTabUrls()) {
      try {
        window.location.replace(url)
        return
      } catch {}
    }
  }

  closeCurrentTab()
}

async function redirectWithTabs(browserApi) {
  const [tab] = await queryActiveTab(browserApi)

  const created = await createDefaultTab(browserApi)
  if (created?.id != null) {
    if (tab?.id != null && created.id !== tab.id) {
      try {
        await removeTab(browserApi, tab.id)
      } catch {}
    }
    return true
  }

  if (tab?.id) {
    for (const url of defaultNewTabUrls()) {
      try {
        await updateTab(browserApi, tab.id, url)
        return true
      } catch {}
    }
  }

  if (tab?.id != null) {
    try {
      await removeTab(browserApi, tab.id)
      return true
    } catch {}
  }

  return false
}

async function createDefaultTab(browserApi) {
  if (!browserApi?.tabs?.create) return null

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

function closeCurrentTab() {
  try {
    window.close()
  } catch {}
}

function defaultNewTabUrls() {
  const ua = navigator.userAgent || ''
  if (globalThis.browser && !globalThis.chrome) return ['about:newtab']
  if (/Edg\//i.test(ua)) return ['edge://newtab/', 'chrome://newtab/', 'chrome://new-tab-page/']
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
  if (globalThis.browser && !globalThis.chrome) {
    const result = browserApi.tabs.remove(tabId)
    if (result?.then) return result.catch(() => false)
    return Promise.resolve(false)
  }
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

async function clearDefaultNtpRedirectAttempt() {
  await writeRedirectStore(false)
}

function getRedirectStore() {
  const browserApi = globalThis.browser || globalThis.chrome
  if (browserApi?.storage?.session) return browserApi.storage.session
  if (browserApi?.storage?.local) return browserApi.storage.local
  return null
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
