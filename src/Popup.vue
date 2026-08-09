<script setup>
import { onMounted, ref } from 'vue'
import { Power, PowerOff } from 'lucide-vue-next'
import { storage, syncStorage } from './utils/storage'
import { normalizeSettings } from './data/defaults'
import { useI18n } from 'vue-i18n'
import LucuroLogo from './components/LucuroLogo.vue'

const STORAGE_SETTINGS = 'lucuro_settings_v1'

const lucuroEnabled = ref(true)
const errorMessage = ref('')
const { t } = useI18n()

onMounted(async () => {
  try {
    const [saved, synced] = await Promise.all([
      storage.get(STORAGE_SETTINGS),
      syncStorage.get(STORAGE_SETTINGS)
    ])
    const settings = normalizeSettings(saved || synced || {})
    lucuroEnabled.value = settings.newTabEnabled !== false
  } catch {
    errorMessage.value = t('popup.readSettingsError')
  }
})

async function toggleLucuro() {
  errorMessage.value = ''
  const nextValue = !lucuroEnabled.value
  try {
    const [saved, synced] = await Promise.all([
      storage.get(STORAGE_SETTINGS),
      syncStorage.get(STORAGE_SETTINGS)
    ])
    const settings = normalizeSettings(saved || synced || {})
    settings.newTabEnabled = nextValue
    await storage.set(STORAGE_SETTINGS, settings)
    await syncStorage.set(STORAGE_SETTINGS, settings).catch(() => {})
    lucuroEnabled.value = nextValue
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
      <div class="toggle-card">
        <div class="toggle-summary">
          <span class="toggle-title">{{ t('popup.extensionToggle') }}</span>
          <span class="toggle-state" :class="{ 'is-on': lucuroEnabled }">
            {{ lucuroEnabled ? t('popup.enabled') : t('popup.disabled') }}
          </span>
        </div>
        <p class="toggle-help">{{ t('popup.extensionToggleHelp') }}</p>
        <button
          class="toggle-btn"
          :class="{ 'is-on': lucuroEnabled }"
          type="button"
          :aria-pressed="lucuroEnabled"
          @click="toggleLucuro"
        >
          <Power v-if="lucuroEnabled" :size="16" />
          <PowerOff v-else :size="16" />
          {{ lucuroEnabled ? t('popup.turnOff') : t('popup.turnOn') }}
        </button>
      </div>

      <p v-if="errorMessage" class="popup-error">{{ errorMessage }}</p>
    </main>
  </div>
</template>
