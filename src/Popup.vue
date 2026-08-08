<script setup>
import { onMounted, ref } from 'vue'
import { Bookmark, Save, X } from 'lucide-vue-next'
import { storage, syncStorage } from './utils/storage'
import { normalizeLinks, normalizeSettings, uid } from './data/defaults'
import {
  ensureBookmarkPermission,
  fetchBrowserBookmarkGroups,
  hasBookmarkPermission,
  mergeBookmarkGroups,
  revokeBookmarkPermission
} from './utils/bookmarks'
import { useI18n } from 'vue-i18n'
import LucuroLogo from './components/LucuroLogo.vue'

const STORAGE_LINKS = 'lucuro_links_v1'
const STORAGE_SETTINGS = 'lucuro_settings_v1'

const linkTitle = ref('')
const linkUrl = ref('')
const selectedCategory = ref('')
const tagInput = ref('')
const saveSuccess = ref(false)
const errorMessage = ref('')
const newTabEnabled = ref(true)
const bookmarkEnabled = ref(false)
const bookmarkImporting = ref(false)
const bookmarkMessage = ref('')
const categories = ref([])
let loadedSettings = null
const { t } = useI18n()

onMounted(async () => {
  try {
    const [tab] = await queryActiveTab()
    linkTitle.value = tab?.title || ''
    linkUrl.value = tab?.url || ''
  } catch {
    errorMessage.value = t('popup.readTabError')
  }

  const saved = await storage.get(STORAGE_LINKS)
  if (Array.isArray(saved)) {
    categories.value = normalizeLinks(saved)
  } else {
    try {
      const response = await fetch('./links.json')
      const data = await response.json()
      categories.value = normalizeLinks(data.icons || data)
    } catch {
      categories.value = []
    }
  }

  if (categories.value.length) {
    selectedCategory.value = categories.value[0].id
  }

  const savedSettings = await storage.get(STORAGE_SETTINGS)
  const syncedSettings = await syncStorage.get(STORAGE_SETTINGS)
  loadedSettings = normalizeSettings(savedSettings || syncedSettings || {})
  newTabEnabled.value = loadedSettings.newTabEnabled !== false

  bookmarkEnabled.value = await hasBookmarkPermission()
})

function queryActiveTab() {
  const api = globalThis.chrome?.tabs || globalThis.browser?.tabs
  if (!api) return Promise.resolve([{ title: window.document.title, url: window.location.href }])
  return new Promise((resolve) => {
    const result = api.query({ active: true, currentWindow: true }, (tabs) => resolve(tabs || []))
    if (result && typeof result.then === 'function') {
      result.then(resolve).catch(() => resolve([]))
    }
  })
}

async function saveToLucuro() {
  errorMessage.value = ''
  if (!linkTitle.value.trim() || !linkUrl.value.trim()) {
    errorMessage.value = t('popup.nameRequired')
    return
  }
  if (!selectedCategory.value) {
    errorMessage.value = t('popup.categoryRequired')
    return
  }

  let current = await storage.get(STORAGE_LINKS)
  if (!Array.isArray(current)) {
    current = categories.value
  }
  const normalized = normalizeLinks(current)
  const target = normalized.find((category) => category.id === selectedCategory.value)
  if (!target) {
    errorMessage.value = t('popup.categoryMissing')
    return
  }

  target.children = target.children || []
  target.children.push({
    id: uid('card'),
    icon: {},
    title: linkTitle.value.trim(),
    url: linkUrl.value.trim(),
    description: '',
    tags: tagInput.value
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean),
    isVpnRequired: false,
    openMethod: 1,
    clickCount: 0,
    sort: 99999
  })

  await storage.set(STORAGE_LINKS, normalized)
  saveSuccess.value = true
  setTimeout(() => window.close(), 900)
}

async function setNewTabMode(enabled) {
  newTabEnabled.value = enabled
  const nextSettings = normalizeSettings({
    ...(loadedSettings || {}),
    newTabEnabled: enabled
  })
  loadedSettings = nextSettings
  await Promise.all([
    storage.set(STORAGE_SETTINGS, nextSettings),
    syncStorage.set(STORAGE_SETTINGS, nextSettings)
  ])
}

async function toggleBookmarkCapture() {
  bookmarkMessage.value = ''
  if (bookmarkEnabled.value) {
    await revokeBookmarkPermission()
    bookmarkEnabled.value = false
    bookmarkMessage.value = t('popup.bookmarkCaptureDisabled')
    return
  }
  const granted = await ensureBookmarkPermission()
  bookmarkEnabled.value = Boolean(granted)
  if (granted) {
    bookmarkMessage.value = t('popup.bookmarkCaptureEnabled')
  } else {
    bookmarkMessage.value = t('popup.bookmarkCapturePermissionDenied')
  }
}

async function captureBrowserBookmarks() {
  bookmarkMessage.value = ''
  if (!bookmarkEnabled.value) {
    bookmarkMessage.value = t('popup.bookmarkCapturePermissionDenied')
    return
  }
  if (bookmarkImporting.value) return
  bookmarkImporting.value = true
  try {
    const groups = await fetchBrowserBookmarkGroups()
    if (!groups.length) {
      bookmarkMessage.value = t('popup.bookmarkCaptureEmpty')
      return
    }
    const current = await storage.get(STORAGE_LINKS)
    const normalized = normalizeLinks(Array.isArray(current) ? current : categories.value)
    const merged = mergeBookmarkGroups(normalized, groups)
    categories.value = merged.links
    if (merged.addedCount) {
      await Promise.all([
        storage.set(STORAGE_LINKS, merged.links),
        syncStorage.set(STORAGE_LINKS, merged.links)
      ])
    }
    bookmarkMessage.value = merged.addedCount
      ? t('popup.bookmarkCaptureImported', { count: merged.addedCount })
      : t('popup.bookmarkCaptureNoNew')
  } catch {
    bookmarkMessage.value = t('popup.bookmarkCaptureFailed')
  } finally {
    bookmarkImporting.value = false
  }
}
</script>

<template>
  <div class="popup-shell">
    <header class="popup-header">
      <LucuroLogo :size="44" />
      <div>
        <h1>{{ t('popup.title') }}</h1>
        <p>{{ t('popup.subtitle') }}</p>
      </div>
    </header>

    <main class="popup-body">
      <div class="field">
        <label for="popup-title">{{ t('popup.name') }}</label>
        <input id="popup-title" v-model="linkTitle" class="input" :placeholder="t('popup.name')" />
      </div>

      <div class="field">
        <label for="popup-url">{{ t('popup.url') }}</label>
        <input id="popup-url" v-model="linkUrl" class="input" readonly />
      </div>

      <div class="field">
        <label for="popup-category">{{ t('popup.category') }}</label>
        <select id="popup-category" v-model="selectedCategory" class="select">
          <option v-if="categories.length === 0" value="">{{ t('popup.noCategories') }}</option>
          <option v-for="category in categories" :key="category.id" :value="category.id">
            {{ category.title }}
          </option>
        </select>
      </div>

      <div class="field">
        <label for="popup-tags">{{ t('popup.tags') }}</label>
        <input id="popup-tags" v-model="tagInput" class="input" :placeholder="t('popup.tagsPlaceholder')" />
      </div>

      <section class="newtab-mode" aria-label="New tab mode">
        <div class="newtab-mode-head">
          <strong>{{ t('popup.newTabMode') }}</strong>
          <span>{{ t('popup.newTabModeHelp') }}</span>
        </div>
        <div class="segmented">
          <button
            type="button"
            class="segment"
            :class="{ active: newTabEnabled }"
            @click="setNewTabMode(true)"
          >
            {{ t('popup.newTabTakeover') }}
          </button>
          <button
            type="button"
            class="segment"
            :class="{ active: !newTabEnabled }"
            @click="setNewTabMode(false)"
          >
            {{ t('popup.newTabBlank') }}
          </button>
        </div>
      </section>

      <section class="newtab-mode bookmark-mode" aria-label="Browser bookmarks">
        <div class="newtab-mode-head">
          <strong>{{ t('popup.bookmarkCapture') }}</strong>
          <span>{{ t('popup.bookmarkCaptureHelp') }}</span>
        </div>
        <div class="segmented">
          <button
            type="button"
            class="segment"
            :class="{ active: bookmarkEnabled }"
            @click="toggleBookmarkCapture"
          >
            {{ t('popup.bookmarkCaptureEnable') }}
          </button>
          <button
            type="button"
            class="segment"
            :class="{ active: !bookmarkEnabled }"
            @click="toggleBookmarkCapture"
          >
            {{ t('popup.bookmarkCaptureDisable') }}
          </button>
        </div>
        <button
          class="bookmark-capture-btn"
          type="button"
          :disabled="!bookmarkEnabled || bookmarkImporting"
          @click="captureBrowserBookmarks"
        >
          <Bookmark :size="15" />
          {{ bookmarkImporting ? t('popup.bookmarkCaptureImporting') : t('popup.bookmarkCaptureImport') }}
        </button>
        <p v-if="bookmarkMessage" class="bookmark-message">{{ bookmarkMessage }}</p>
      </section>

      <button class="save-btn" type="button" :disabled="saveSuccess" @click="saveToLucuro">
        <Save :size="16" />
        {{ saveSuccess ? t('popup.saved') : t('popup.save') }}
      </button>

      <p v-if="saveSuccess" class="popup-success">{{ t('popup.savedMessage') }}</p>
      <p v-if="errorMessage" class="popup-error">{{ errorMessage }}</p>
    </main>

    <footer class="popup-footer">
      <span>{{ t('popup.tagline') }}</span>
      <button type="button" :aria-label="t('popup.close')" @click="window.close()">
        <X :size="15" />
      </button>
    </footer>
  </div>
</template>
