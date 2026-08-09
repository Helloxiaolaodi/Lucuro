<script setup>
import { onMounted, ref } from 'vue'
import { Save } from 'lucide-vue-next'
import { storage, syncStorage } from './utils/storage'
import { normalizeSettings } from './data/defaults'
import { useI18n } from 'vue-i18n'
import LucuroLogo from './components/LucuroLogo.vue'

const STORAGE_SETTINGS = 'lucuro_settings_v1'

const newTabMode = ref('lucuro')
const saveSuccess = ref(false)
const errorMessage = ref('')
const { t } = useI18n()

onMounted(async () => {
  try {
    const [saved, synced] = await Promise.all([
      storage.get(STORAGE_SETTINGS),
      syncStorage.get(STORAGE_SETTINGS)
    ])
    const settings = normalizeSettings(saved || synced || {})
    newTabMode.value = settings.newTabEnabled === false ? 'default' : 'lucuro'
  } catch {
    errorMessage.value = t('popup.readSettingsError')
  }
})

async function saveToLucuro() {
  errorMessage.value = ''
  try {
    const [saved, synced] = await Promise.all([
      storage.get(STORAGE_SETTINGS),
      syncStorage.get(STORAGE_SETTINGS)
    ])
    const settings = normalizeSettings(saved || synced || {})
    settings.newTabEnabled = newTabMode.value === 'lucuro'
    await storage.set(STORAGE_SETTINGS, settings)
    await syncStorage.set(STORAGE_SETTINGS, settings).catch(() => {})
    saveSuccess.value = true
    setTimeout(() => window.close(), 900)
  } catch {
    errorMessage.value = t('popup.saveFailed')
  }
}
</script>

<template>
  <div class="popup-shell">
    <header class="popup-header">
      <LucuroLogo :size="40" />
      <div>
        <h1>{{ t('popup.title') }}</h1>
      </div>
    </header>

    <main class="popup-body">
      <div class="field">
        <label for="popup-new-tab">{{ t('popup.newTabMode') }}</label>
        <select id="popup-new-tab" v-model="newTabMode" class="select">
          <option value="lucuro">{{ t('popup.newTabTakeover') }}</option>
          <option value="default">{{ t('popup.newTabBlank') }}</option>
        </select>
      </div>

      <button class="save-btn" type="button" :disabled="saveSuccess" @click="saveToLucuro">
        <Save :size="16" />
        {{ saveSuccess ? t('popup.saved') : t('popup.save') }}
      </button>

      <p v-if="saveSuccess" class="popup-success">{{ t('popup.savedMessage') }}</p>
      <p v-if="errorMessage" class="popup-error">{{ errorMessage }}</p>
    </main>

  </div>
</template>
