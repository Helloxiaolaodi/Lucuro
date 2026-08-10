import { createApp } from 'vue'
import App from './App.vue'
import { i18n, loadSavedLocale } from './i18n'
import './styles/main.css'
import { storage, syncStorage } from './utils/storage'
import { normalizeSettings } from './data/defaults'

const SETTINGS_KEY = 'lucuro_settings_v1'

Promise.all([
  loadSavedLocale(),
  storage.get(SETTINGS_KEY),
  syncStorage.get(SETTINGS_KEY)
]).then(async ([, settings, syncedSettings]) => {
  const saved = normalizeSettings(settings || syncedSettings || {})

  // The extension owns the new tab while installed, so a stored "disabled"
  // state cannot hand the tab back to the browser. Reset any old value and
  // always render Lucuro to avoid redirect loops.
  if (saved.newTabEnabled === false) {
    saved.newTabEnabled = true
    await storage.set(SETTINGS_KEY, saved).catch(() => {})
    await syncStorage.set(SETTINGS_KEY, saved).catch(() => {})
  }

  createApp(App).use(i18n).mount('#app')
})
