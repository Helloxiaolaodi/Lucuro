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
]).then(([, settings, syncedSettings]) => {
  const saved = normalizeSettings(settings || syncedSettings || {})
  if (saved.newTabEnabled === false) {
    if (isDefaultNtpRedirectAttempted()) {
      closeCurrentTab()
      return
    }
    markDefaultNtpRedirectAttempted()
    redirectToBrowserDefault()
    return
  }
  createApp(App).use(i18n).mount('#app')
})

function redirectToBrowserDefault() {
  const browserApi = globalThis.browser || globalThis.chrome

  if (browserApi?.tabs?.update) {
    redirectWithTabs(browserApi)
    return
  }

  for (const url of defaultNewTabUrls()) {
    try {
      window.location.replace(url)
      return
    } catch {}
  }

  closeCurrentTab()
}

function closeCurrentTab() {
  try {
    window.close()
  } catch {}
}

function defaultNewTabUrls() {
  const ua = navigator.userAgent || ''
  if (globalThis.browser && !globalThis.chrome) return ['about:newtab']
  if (/Edg\//i.test(ua)) return ['edge://newtab/', 'chrome://newtab/']
  return ['chrome://newtab/', 'chrome://new-tab-page/']
}

async function redirectWithTabs(browserApi) {
  const [tab] = await queryActiveTab(browserApi)

  if (!tab?.id) {
    for (const url of defaultNewTabUrls()) {
      try {
        window.location.replace(url)
        return
      } catch {}
    }
    closeCurrentTab()
    return
  }

  for (const url of defaultNewTabUrls()) {
    try {
      await updateTab(browserApi, tab.id, url)
      return
    } catch {}
  }

  try {
    await removeTab(browserApi, tab.id)
  } catch {
    closeCurrentTab()
  }
}

function isDefaultNtpRedirectAttempted() {
  try {
    return window.name === DEFAULT_NTP_REDIRECT_KEY || sessionStorage.getItem(DEFAULT_NTP_REDIRECT_KEY) === '1'
  } catch {
    return false
  }
}

function markDefaultNtpRedirectAttempted() {
  try {
    window.name = DEFAULT_NTP_REDIRECT_KEY
    sessionStorage.setItem(DEFAULT_NTP_REDIRECT_KEY, '1')
  } catch {}
}

function queryActiveTab(browserApi) {
  if (!browserApi.tabs?.query) return Promise.resolve([])
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
