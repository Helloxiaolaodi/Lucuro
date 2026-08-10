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
  if (/edg\//i.test(ua)) return 'edge://extensions/'
  if (/opr\//i.test(ua)) return 'opera://extensions/'
  return 'chrome://extensions/'
}

async function openExtensionManager() {
  errorMessage.value = ''
  const ua = navigator.userAgent || ''

  if (/firefox/i.test(ua)) {
    try {
      await navigator.clipboard.writeText('about:addons')
      errorMessage.value = t('popup.managerCopied')
    } catch {
      errorMessage.value = t('popup.managerCopyFailed')
    }
    return
  }

  const url = extensionManagerUrl()
  try {
    if (typeof chrome !== 'undefined' && chrome.tabs?.create) {
      await chrome.tabs.create({ url })
    } else {
      await browser.tabs.create({ url })
    }
  } catch {
    try {
      window.open(url, '_blank')
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
        <p class="toggle-help">
          <span class="toggle-help-en">{{ t('popup.extensionToggleHelp') }}</span>
          <span class="toggle-help-zh">{{ t('popup.extensionToggleHelpZh') }}</span>
        </p>
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
