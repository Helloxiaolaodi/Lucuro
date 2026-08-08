import { createI18n } from 'vue-i18n'
import en from './locales/en.json'
import zh from './locales/zh.json'
import { storage } from './utils/storage'

const STORAGE_LOCALE = 'lucuro_locale_v1'

function detectLocale() {
  const language = (navigator.language || 'en').toLowerCase()
  return language.includes('zh') ? 'zh' : 'en'
}

export const i18n = createI18n({
  legacy: false,
  locale: detectLocale(),
  fallbackLocale: 'en',
  messages: { en, zh }
})

export async function loadSavedLocale() {
  try {
    const saved = await storage.get(STORAGE_LOCALE)
    if (saved === 'en' || saved === 'zh') {
      i18n.global.locale.value = saved
      document.documentElement.lang = saved === 'zh' ? 'zh-CN' : 'en'
      return saved
    }
  } catch {
    // Browser storage is not required in plain web development.
  }
  document.documentElement.lang = i18n.global.locale.value === 'zh' ? 'zh-CN' : 'en'
  return i18n.global.locale.value
}

export async function setSavedLocale(locale) {
  i18n.global.locale.value = locale
  document.documentElement.lang = locale === 'zh' ? 'zh-CN' : 'en'
  try {
    await storage.set(STORAGE_LOCALE, locale)
  } catch {
    // Keep the runtime locale even if persistence is unavailable.
  }
}
