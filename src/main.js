import { createApp } from 'vue'
import App from './App.vue'
import { i18n, loadSavedLocale } from './i18n'
import './styles/main.css'
import { storage, syncStorage } from './utils/storage'
import { normalizeSettings } from './data/defaults'

Promise.all([
  loadSavedLocale(),
  storage.get('lucuro_settings_v1'),
  syncStorage.get('lucuro_settings_v1')
]).then(([, settings, syncedSettings]) => {
  const saved = normalizeSettings(settings || syncedSettings || {})
  if (saved.newTabEnabled === false) {
    closeCurrentTab()
    return
  }
  createApp(App).use(i18n).mount('#app')
})

function safeCloseWindow() {
  try {
    window.close()
  } catch {}
}

function closeCurrentTab() {
  const browserApi = globalThis.browser || globalThis.chrome
  if (!browserApi?.tabs) {
    safeCloseWindow()
    return
  }

  const removeActiveTab = (tabs) => {
    const tab = Array.isArray(tabs) ? tabs[0] : tabs
    if (tab?.id == null) {
      safeCloseWindow()
      return
    }
    try {
      const removed = browserApi.tabs.remove(tab.id)
      if (removed?.catch) removed.catch(safeCloseWindow)
    } catch {
      safeCloseWindow()
    }
  }

  const result = browserApi.tabs.query({ active: true, currentWindow: true })
  if (result?.then) {
    result.then(removeActiveTab).catch(safeCloseWindow)
    return
  }

  try {
    browserApi.tabs.query({ active: true, currentWindow: true }, removeActiveTab)
  } catch {
    safeCloseWindow()
  }
}
