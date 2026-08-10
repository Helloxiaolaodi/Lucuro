<script setup>
import { ref } from 'vue'
import { Settings } from 'lucide-vue-next'
import browser from 'webextension-polyfill'
import { useI18n } from 'vue-i18n'
import LucuroLogo from './components/LucuroLogo.vue'

const errorMessage = ref('')
const { t } = useI18n()

function extensionManagerUrl() {
  const ua = navigator.userAgent || ''
  if (/firefox/i.test(ua)) return 'about:addons'
  if (/edg\//i.test(ua)) return 'edge://extensions/'
  return 'chrome://extensions/'
}

async function openExtensionManager() {
  errorMessage.value = ''
  try {
    await browser.tabs.create({ url: extensionManagerUrl() })
  } catch {
    try {
      window.open(extensionManagerUrl(), '_blank')
    } catch {
      errorMessage.value = t('popup.openManagerFailed')
    }
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
          <span class="toggle-state is-on">{{ t('popup.enabled') }}</span>
        </div>
        <p class="toggle-help">{{ t('popup.extensionToggleHelp') }}</p>
        <button
          class="toggle-btn is-on manager-btn"
          type="button"
          @click="openExtensionManager"
        >
          <Settings :size="16" />
          {{ t('popup.manageExtensions') }}
        </button>
      </div>

      <p v-if="errorMessage" class="popup-error">{{ errorMessage }}</p>
    </main>
  </div>
</template>
