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
    redirectToBrowserDefault()
    return
  }
  createApp(App).use(i18n).mount('#app')
})

function redirectToBrowserDefault() {
  const browserApi = globalThis.browser || globalThis.chrome
  const defaultNewTabUrl = globalThis.browser ? 'about:newtab' : 'chrome://newtab/'
  try {
    window.location.replace(defaultNewTabUrl)
    return
  } catch {
    // Fall through to the tabs API when direct navigation is blocked.
  }
  if (browserApi?.tabs?.update) {
    try {
      const result = browserApi.tabs.update({ url: defaultNewTabUrl })
      if (result?.catch) {
        result.catch(() => window.close())
      }
      return
    } catch {
      // Fall through.
    }
  }
  try {
    window.close()
  } catch {
    // The page may remain open; the fallback is intentionally empty.
  }
}
