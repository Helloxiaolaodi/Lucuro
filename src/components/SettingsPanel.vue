<script setup>
import { ref } from 'vue'
import { Bookmark, FolderPlus, GripVertical, HeartHandshake, History, KeyRound, Link2, Pencil, Plus, QrCode, RefreshCw, Trash2, Upload, X } from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'
import { useLucuro } from '../stores/lucuro'
import { setSavedLocale } from '../i18n'
import SortableList from './SortableList.vue'

const props = defineProps({
  links: { type: Array, default: () => [] },
  settings: { type: Object, required: true },
  syncStatus: { type: String, default: '' },
  activeTab: { type: String, default: 'links' }
})

const emit = defineEmits(['close', 'open-category', 'open-card'])
const store = useLucuro()
const { t, locale } = useI18n()

const newEngine = ref({ id: '', label: '', url: '', shortcut: '' })
const backgroundInput = ref(null)
const avatarInput = ref(null)
const showWechatPay = ref(false)

function setTab(tab) {
  store.state.settingsTab = tab
}

function changeLanguage(event) {
  setSavedLocale(event.target.value)
}

function addEngine() {
  if (!newEngine.value.label || !newEngine.value.url) return
  const engine = {
    id: newEngine.value.id || `engine-${Date.now().toString(36)}`,
    label: newEngine.value.label.trim(),
    url: newEngine.value.url.trim(),
    shortcut: newEngine.value.shortcut.trim()
  }
  store.setSettings({ engines: [...props.settings.engines, engine] })
  newEngine.value = { id: '', label: '', url: '', shortcut: '' }
}

function removeEngine(index) {
  const engines = props.settings.engines.filter((_, i) => i !== index)
  store.setSettings({ engines })
}

function updateEngine(index, patch) {
  const engines = props.settings.engines.map((engine, i) => (i === index ? { ...engine, ...patch } : engine))
  store.setSettings({ engines })
}

function uploadBackground(event) {
  store.uploadBackground(event.target.files?.[0])
  event.target.value = ''
}

function uploadAvatar(event) {
  store.uploadAvatar(event.target.files?.[0])
  event.target.value = ''
}

function formatTime(timestamp) {
  if (!timestamp) return ''
  const date = new Date(timestamp)
  const pad = (value) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

async function copyShareCode() {
  if (!store.state.shareCode) return
  try {
    await navigator.clipboard.writeText(store.state.shareCode)
    store.toast(t('toast.shareCopied'))
  } catch {
    store.toast(t('toast.shareFailed'))
  }
}
</script>

<template>
  <div class="modal-backdrop" @mousedown.self="emit('close')">
    <div class="modal-panel" role="dialog" aria-modal="true" aria-label="Lucuro settings">
      <div class="modal-header">
        <h2>{{ t('settings.title') }}</h2>
        <button class="modal-close" type="button" :aria-label="t('settings.close')" @click="emit('close')">
          <X :size="18" />
        </button>
      </div>

      <div class="tabs">
        <button class="tab-btn" :class="{ active: activeTab === 'links' }" type="button" @click="setTab('links')">{{ t('settings.links') }}</button>
        <button class="tab-btn" :class="{ active: activeTab === 'appearance' }" type="button" @click="setTab('appearance')">{{ t('settings.appearance') }}</button>
        <button class="tab-btn" :class="{ active: activeTab === 'search' }" type="button" @click="setTab('search')">{{ t('settings.search') }}</button>
        <button class="tab-btn" :class="{ active: activeTab === 'data' }" type="button" @click="setTab('data')">{{ t('settings.dataSync') }}</button>
        <button class="tab-btn" :class="{ active: activeTab === 'support' }" type="button" @click="setTab('support')">{{ t('settings.support') }}</button>
      </div>

      <div class="settings-body">
        <div v-if="activeTab === 'links'" class="settings-section">
          <div class="section-heading">
            <div>
              <h3 class="section-title">{{ t('settings.categories') }}</h3>
              <p class="section-help">{{ t('settings.categoriesHelp') }}</p>
            </div>
            <div class="row-actions">
              <button class="btn" type="button" :disabled="store.state.bookmarkImporting" @click="store.importBrowserBookmarks">
                <Bookmark :size="15" />
                {{ t('settings.importBookmarks') }}
              </button>
              <button class="btn" type="button" @click="emit('open-category', null)">
                <FolderPlus :size="15" />
                {{ t('settings.addCategory') }}
              </button>
            </div>
          </div>
          <p class="section-help">{{ t('settings.importBookmarksHelp') }}</p>

          <SortableList
            item-class="category-row"
            @reorder="(oldIndex, newIndex) => store.reorderCategories(oldIndex, newIndex)"
          >
            <div v-for="(category, index) in links" :key="category.id || index" class="list-row category-row">
              <span class="drag-handle static">
                <GripVertical :size="15" />
              </span>
              <div class="list-main">
                <h4 class="list-title">{{ category.title }}</h4>
                <p class="list-meta">{{ category.children.length }} {{ t('settings.cards') }}</p>
              </div>
              <div class="row-actions">
                <button class="btn btn-ghost small" type="button" @click="emit('open-card', index, null)">
                  <Link2 :size="14" />
                  {{ t('settings.addCard') }}
                </button>
                <button class="mini-btn" type="button" :title="t('settings.editCategory')" :aria-label="t('settings.editCategory')" @click="emit('open-category', index)">
                  <Pencil :size="14" />
                </button>
                <button class="mini-btn danger" type="button" :title="t('settings.deleteCategory')" :aria-label="t('settings.deleteCategory')" @click="store.deleteCategory(index)">
                  <Trash2 :size="14" />
                </button>
              </div>
            </div>
          </SortableList>
        </div>

        <div v-else-if="activeTab === 'appearance'" class="settings-section">
          <div class="form-grid">
            <div class="field">
              <label for="settings-language">{{ t('settings.language') }}</label>
              <select id="settings-language" class="select" :value="locale" @change="changeLanguage">
                <option value="en">{{ t('settings.english') }}</option>
                <option value="zh">{{ t('settings.chinese') }}</option>
              </select>
            </div>
            <div class="field">
              <label for="settings-title">{{ t('settings.workspaceTitle') }}</label>
              <input id="settings-title" class="input" :value="settings.workspaceTitle" @input="store.setSettings({ workspaceTitle: $event.target.value })" />
            </div>
            <div class="field">
              <label for="settings-subtitle">{{ t('settings.workspaceSubtitle') }}</label>
              <input id="settings-subtitle" class="input" :value="settings.workspaceSubtitle" @input="store.setSettings({ workspaceSubtitle: $event.target.value })" />
            </div>
            <div class="field">
              <label for="settings-hero">{{ t('settings.heroTitle') }}</label>
              <input id="settings-hero" class="input" :value="settings.heroTitle" @input="store.setSettings({ heroTitle: $event.target.value })" />
            </div>
            <div class="field">
              <label for="settings-hero-sub">{{ t('settings.heroSubtitle') }}</label>
              <input id="settings-hero-sub" class="input" :value="settings.heroSubtitle" @input="store.setSettings({ heroSubtitle: $event.target.value })" />
            </div>
          </div>

          <div class="form-grid settings-extra-grid">
            <div class="field">
              <label for="settings-accent">{{ t('settings.accentColor') }}</label>
              <input id="settings-accent" class="input color-input" type="color" :value="settings.accent" @input="store.setSettings({ accent: $event.target.value })" />
            </div>
            <div class="field">
              <label for="settings-radius">{{ t('settings.cardRadius') }}</label>
              <input id="settings-radius" class="input" type="range" min="0" max="28" step="2" :value="settings.cardRadius" @input="store.setSettings({ cardRadius: Number($event.target.value) })" />
            </div>
            <div class="field">
              <label for="settings-size">{{ t('settings.cardSize') }}</label>
              <select id="settings-size" class="select" :value="settings.cardSize" @change="store.setSettings({ cardSize: $event.target.value })">
                <option value="compact">{{ t('settings.compact') }}</option>
                <option value="default">{{ t('settings.default') }}</option>
                <option value="cozy">{{ t('settings.cozy') }}</option>
              </select>
            </div>
            <label class="checkbox-field">
              <input type="checkbox" :checked="settings.showStatusLegend" @change="store.setSettings({ showStatusLegend: $event.target.checked })" />
              <span>{{ t('settings.showStatusLegend') }}</span>
            </label>
          </div>

          <div class="form-grid">
            <div class="field full">
              <label for="settings-hitokoto">{{ t('settings.hitokoto') }}</label>
              <textarea
                id="settings-hitokoto"
                class="textarea"
                :value="settings.hitokoto"
                :placeholder="t('settings.hitokotoPlaceholder')"
                @input="store.setHitokoto($event.target.value)"
              ></textarea>
              <p class="section-help">{{ t('settings.hitokotoHelp') }}</p>
            </div>
            <div class="field full">
              <label for="settings-notes">{{ t('settings.notes') }}</label>
              <textarea
                id="settings-notes"
                class="textarea"
                :value="settings.notes"
                :placeholder="t('settings.notesPlaceholder')"
                @input="store.setNotes($event.target.value)"
              ></textarea>
              <p class="section-help">{{ t('settings.notesHelp') }}</p>
            </div>
          </div>

          <div class="form-grid">
            <div class="field">
              <label>{{ t('settings.backgroundImage') }}</label>
              <div class="file-field">
                <input ref="backgroundInput" class="visually-hidden" type="file" accept="image/*" @change="uploadBackground" />
                <button class="btn" type="button" @click="backgroundInput?.click()">
                  <Upload :size="15" />
                  {{ t('settings.uploadLocalImage') }}
                </button>
                <input class="input" :value="settings.background.startsWith('data:') ? 'Custom local background' : settings.background" @input="store.setSettings({ background: $event.target.value })" placeholder="https://example.com/wallpaper.jpg" />
                <button v-if="settings.background" class="btn btn-ghost" type="button" @click="store.setSettings({ background: '' })">{{ t('settings.remove') }}</button>
              </div>
            </div>
            <div class="field">
              <label>{{ t('settings.profileAvatar') }}</label>
              <div class="file-field">
                <input ref="avatarInput" class="visually-hidden" type="file" accept="image/*" @change="uploadAvatar" />
                <button class="btn" type="button" @click="avatarInput?.click()">
                  <Upload :size="15" />
                  {{ t('settings.uploadAvatar') }}
                </button>
                <input class="input" :value="settings.profileAvatar" @input="store.setSettings({ profileAvatar: $event.target.value })" placeholder="https://example.com/avatar.jpg" />
              </div>
            </div>
          </div>
        </div>

        <div v-else-if="activeTab === 'search'" class="settings-section">
          <div class="field">
            <label for="default-engine">{{ t('settings.defaultEngine') }}</label>
            <select id="default-engine" class="select" :value="settings.defaultEngineId" @change="store.setSettings({ defaultEngineId: $event.target.value })">
              <option v-for="engine in settings.engines" :key="engine.id" :value="engine.id">{{ engine.label }}</option>
            </select>
          </div>

          <div class="section-heading">
            <h3 class="section-title">{{ t('settings.engineTemplates') }}</h3>
            <p class="section-help">{{ t('settings.engineHelp') }}</p>
          </div>

          <div v-for="(engine, index) in settings.engines" :key="engine.id || index" class="list-row engine-row">
            <input class="input" :value="engine.label" @input="updateEngine(index, { label: $event.target.value })" :placeholder="t('settings.engineName')" />
            <input class="input" :value="engine.url" @input="updateEngine(index, { url: $event.target.value })" :placeholder="t('settings.engineUrl')" />
            <input class="input" :value="engine.shortcut" @input="updateEngine(index, { shortcut: $event.target.value })" :placeholder="t('settings.shortcut')" />
            <button class="mini-btn" type="button" :title="t('settings.removeEngine')" :aria-label="t('settings.removeEngine')" @click="removeEngine(index)">
              <Trash2 :size="14" />
            </button>
            <button class="mini-btn" type="button" :title="t('settings.useDefault')" :aria-label="t('settings.useDefault')" @click="store.setSettings({ defaultEngineId: engine.id })">
              <RefreshCw :size="14" />
            </button>
          </div>

          <div class="list-row engine-row add-engine-row">
            <input v-model="newEngine.label" class="input" :placeholder="t('settings.engineName')" />
            <input v-model="newEngine.url" class="input" :placeholder="t('settings.engineUrl')" />
            <input v-model="newEngine.shortcut" class="input" :placeholder="t('settings.shortcut')" />
            <button class="btn btn-primary" type="button" @click="addEngine">
              <Plus :size="15" />
              {{ t('settings.addEngine') }}
            </button>
          </div>
        </div>

        <div v-else-if="activeTab === 'data'" class="settings-section">
          <div class="settings-section">
            <h3 class="section-title">{{ t('settings.nativeSync') }}</h3>
            <p class="section-help">{{ t('settings.nativeSyncHelp') }}</p>
            <span class="sync-status">{{ syncStatus || t('syncStatus.synced') }}</span>
          </div>

          <div class="settings-section">
            <h3 class="section-title">{{ t('settings.shareCode') }}</h3>
            <p class="section-help">{{ t('settings.shareCodeHelp') }}</p>
            <div class="form-grid">
              <div class="field full">
                <label for="share-endpoint">{{ t('settings.shareEndpoint') }}</label>
                <input
                  id="share-endpoint"
                  class="input"
                  :value="settings.sync?.shareEndpoint || ''"
                  @input="store.setSettings({ sync: { ...settings.sync, shareEndpoint: $event.target.value } })"
                  placeholder="https://lucuro-share.helloxiaolaodi.workers.dev"
                />
                <p class="section-help">{{ t('settings.shareEndpointHelp') }}</p>
              </div>
            </div>
            <div class="data-actions">
              <button class="btn btn-primary" type="button" :disabled="store.state.shareCodeLoading" @click="store.createShareCode">
                <KeyRound :size="15" />
                {{ t('settings.generateCode') }}
              </button>
              <button class="btn" type="button" @click="store.openClaimCode">
                <KeyRound :size="15" />
                {{ t('settings.claimCode') }}
              </button>
            </div>
            <span v-if="syncStatus" class="sync-status">{{ syncStatus }}</span>
          </div>

          <div class="settings-section">
            <h3 class="section-title">{{ t('settings.history') }}</h3>
            <p class="section-help">{{ t('settings.historyHelp') }}</p>
            <div v-if="store.state.history.length" class="history-list">
              <div v-for="snapshot in store.state.history" :key="snapshot.id" class="history-row">
                <div class="history-copy">
                  <strong>{{ snapshot.summary }}</strong>
                  <span>{{ formatTime(snapshot.createdAt) }}</span>
                </div>
                <button class="btn btn-ghost small" type="button" @click="store.restoreSnapshot(snapshot.id)">
                  <History :size="14" />
                  {{ t('settings.restore') }}
                </button>
              </div>
            </div>
            <p v-else class="section-help">{{ t('settings.historyEmpty') }}</p>
            <div class="data-actions">
              <button class="btn btn-danger" type="button" @click="store.clearHistory">{{ t('settings.clearHistory') }}</button>
              <button class="btn btn-danger" type="button" @click="store.resetLinks">{{ t('settings.resetLinks') }}</button>
              <button class="btn btn-danger" type="button" @click="store.clearStats">{{ t('settings.clearStats') }}</button>
            </div>
          </div>
        </div>

        <div v-else-if="activeTab === 'support'" class="settings-section">
          <div class="support-card">
            <div class="support-head">
              <HeartHandshake :size="20" />
              <div>
                <h3 class="section-title">{{ t('settings.supportTitle') }}</h3>
                <p class="section-help">{{ t('settings.supportSubtitle') }}</p>
              </div>
            </div>
            <div class="support-quote">
              <p>{{ t('settings.supportQuote') }}</p>
              <p class="support-quote-en">{{ t('settings.supportQuoteEn') }}</p>
            </div>
            <div class="support-meta">
              <span>{{ t('settings.supportAuthor') }}</span>
              <span>Helloxiaolaodi</span>
            </div>
            <div class="support-actions">
              <a class="btn btn-primary support-button" href="https://ko-fi.com/helloxiaolaodi" target="_blank" rel="noopener noreferrer">
                <HeartHandshake :size="15" />
                {{ t('settings.supportKoFi') }}
              </a>
              <button class="btn support-button" type="button" @click="showWechatPay = true">
                <QrCode :size="15" />
                {{ t('settings.supportWechat') }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <div v-if="showWechatPay" class="modal-backdrop" @mousedown.self="showWechatPay = false">
    <div class="modal-panel small wechat-pay-modal" role="dialog" aria-modal="true" aria-label="WeChat pay">
      <div class="modal-header">
        <h2>{{ t('settings.supportWechat') }}</h2>
        <button class="modal-close" type="button" :aria-label="t('settings.close')" @click="showWechatPay = false">
          <X :size="18" />
        </button>
      </div>
      <div class="settings-body wechat-pay-body">
        <p class="section-help">{{ t('settings.supportWechatHelp') }}</p>
        <img class="wechat-qr" src="/qrcode-wechat.png" alt="WeChat pay QR code" />
        <button class="btn btn-primary" type="button" @click="showWechatPay = false">{{ t('settings.close') }}</button>
      </div>
    </div>
  </div>

  <div v-if="store.state.shareCodeOpen" class="modal-backdrop" @mousedown.self="store.closeShareCode()">
    <div class="modal-panel small" role="dialog" aria-modal="true" aria-label="Lucuro pickup code">
      <div class="modal-header">
        <h2>{{ t('settings.shareCode') }}</h2>
        <button class="modal-close" type="button" :aria-label="t('settings.close')" @click="store.closeShareCode()">
          <X :size="18" />
        </button>
      </div>
      <div class="settings-body">
        <p class="section-help">{{ t('settings.shareCodeHelp') }}</p>
        <div class="share-code-display">{{ store.state.shareCode }}</div>
        <p v-if="store.state.shareCodeExpiresAt" class="section-help">{{ t('settings.shareCodeExpires', { time: formatTime(store.state.shareCodeExpiresAt) }) }}</p>
        <p v-if="store.state.shareCodeError" class="sync-status error">{{ store.state.shareCodeError }}</p>
        <div class="data-actions">
          <button class="btn btn-primary" type="button" @click="copyShareCode">
            <KeyRound :size="15" />
            {{ t('settings.copyCode') }}
          </button>
          <button class="btn" type="button" @click="store.closeShareCode()">{{ t('settings.cancel') }}</button>
        </div>
      </div>
    </div>
  </div>

  <div v-if="store.state.claimCodeOpen" class="modal-backdrop" @mousedown.self="store.closeClaimCode()">
    <div class="modal-panel small" role="dialog" aria-modal="true" aria-label="Claim Lucuro configuration">
      <div class="modal-header">
        <h2>{{ t('settings.claimCode') }}</h2>
        <button class="modal-close" type="button" :aria-label="t('settings.close')" @click="store.closeClaimCode()">
          <X :size="18" />
        </button>
      </div>
      <div class="settings-body">
        <p class="section-help">{{ t('settings.shareCodeHelp') }}</p>
        <div class="field">
          <label for="claim-code">{{ t('settings.shareCodeInput') }}</label>
          <input
            id="claim-code"
            v-model="store.state.claimCode"
            class="input claim-code-input"
            maxlength="6"
            inputmode="numeric"
            :placeholder="t('settings.shareCodePlaceholder')"
          />
        </div>
        <p v-if="store.state.claimCodeError" class="sync-status error">{{ store.state.claimCodeError }}</p>
        <div class="data-actions">
          <button class="btn btn-primary" type="button" :disabled="store.state.claimCodeLoading" @click="store.claimShareCode">
            <KeyRound :size="15" />
            {{ t('settings.claimCode') }}
          </button>
          <button class="btn" type="button" @click="store.closeClaimCode()">{{ t('settings.cancel') }}</button>
        </div>
      </div>
    </div>
  </div>
</template>
