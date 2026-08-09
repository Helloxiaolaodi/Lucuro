<script setup>
import { nextTick, onMounted, ref } from 'vue'
import { Save, X } from 'lucide-vue-next'
import { storage, syncStorage } from './utils/storage'
import { normalizeLinks, uid } from './data/defaults'
import { useI18n } from 'vue-i18n'
import LucuroLogo from './components/LucuroLogo.vue'

const STORAGE_LINKS = 'lucuro_links_v1'
const STORAGE_LAST_CATEGORY = 'lucuro_last_category_v1'

const titleInput = ref(null)
const linkTitle = ref('')
const linkUrl = ref('')
const selectedCategory = ref('')
const saveSuccess = ref(false)
const errorMessage = ref('')
const categories = ref([])
const { t } = useI18n()

onMounted(async () => {
  try {
    const [tab] = await queryActiveTab()
    linkTitle.value = tab?.title || ''
    linkUrl.value = tab?.url || ''
  } catch {
    errorMessage.value = t('popup.readTabError')
  }

  const [saved, synced] = await Promise.all([
    storage.get(STORAGE_LINKS),
    syncStorage.get(STORAGE_LINKS)
  ])
  categories.value = normalizeLinks(Array.isArray(saved) ? saved : Array.isArray(synced) ? synced : [])

  if (categories.value.length) {
    const lastCategory = await storage.get(STORAGE_LAST_CATEGORY)
    const remembered = categories.value.find((category) => category.id === lastCategory)
    selectedCategory.value = remembered?.id || categories.value[0].id
  }

  await nextTick()
  titleInput.value?.focus()
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
    tags: [],
    isVpnRequired: false,
    clickCount: 0,
    sort: 99999
  })

  await storage.set(STORAGE_LINKS, normalized)
  await storage.set(STORAGE_LAST_CATEGORY, selectedCategory.value)
  syncStorage.set(STORAGE_LINKS, normalized).catch(() => {})
  syncStorage.set(STORAGE_LAST_CATEGORY, selectedCategory.value).catch(() => {})
  saveSuccess.value = true
  setTimeout(() => window.close(), 900)
}
</script>

<template>
  <div class="popup-shell">
    <header class="popup-header">
      <LucuroLogo :size="40" />
      <div>
        <h1>{{ t('popup.title') }}</h1>
        <p>{{ t('popup.subtitle') }}</p>
      </div>
    </header>

    <main class="popup-body">
      <div class="field">
        <label for="popup-title">{{ t('popup.name') }}</label>
        <input id="popup-title" ref="titleInput" v-model="linkTitle" class="input" :placeholder="t('popup.name')" />
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
