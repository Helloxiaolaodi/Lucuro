<script setup>
import { ref } from 'vue'
import { Download, FolderPlus, GripVertical, HeartHandshake, Link2, Pencil, QrCode, RefreshCw, Trash2, Upload, X } from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'
import { useLucuro } from '../stores/lucuro'
import { setSavedLocale } from '../i18n'
import { readFileAsDataUrl } from '../utils/storage'
import SortableList from './SortableList.vue'
import BackgroundCropModal from './BackgroundCropModal.vue'

const props = defineProps({
  links: { type: Array, default: () => [] },
  settings: { type: Object, required: true },
  activeTab: { type: String, default: 'links' }
})

const emit = defineEmits(['close', 'open-category', 'open-card'])
const store = useLucuro()
const { t, locale } = useI18n()

const backgroundInput = ref(null)
const jsonInput = ref(null)
const showWechatPay = ref(false)
const cropModalOpen = ref(false)
const pendingBackgroundDataUrl = ref('')

function setTab(tab) {
  store.state.settingsTab = tab
}

function changeLanguage(event) {
  setSavedLocale(event.target.value)
}

async function uploadBackground(event) {
  const file = event.target.files?.[0]
  event.target.value = ''
  if (!file) return
  try {
    pendingBackgroundDataUrl.value = await readFileAsDataUrl(file)
    cropModalOpen.value = true
  } catch {
    store.toast(t('toast.imageReadFailed'))
  }
}

function applyCroppedBackground(dataUrl) {
  store.setSettings({ background: dataUrl })
  cropModalOpen.value = false
}

function importJson(event) {
  store.importLinksFile(event.target.files?.[0])
  event.target.value = ''
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
        <button class="tab-btn" :class="{ active: activeTab === 'guide' }" type="button" @click="setTab('guide')">{{ t('settings.guide') }}</button>
        <button class="tab-btn" :class="{ active: activeTab === 'support' }" type="button" @click="setTab('support')">{{ t('settings.support') }}</button>
      </div>

      <div class="settings-body">
        <div v-if="activeTab === 'links'" class="settings-section">
          <div class="field full data-source-field">
            <label>{{ t('settings.dataSource') }}</label>
            <div class="segmented-row">
              <button
                class="segment-btn"
                :class="{ active: settings.dataSource !== 'json' }"
                type="button"
                @click="store.setDataSource('browser')"
              >
                {{ t('settings.dataSourceBrowser') }}
              </button>
              <button
                class="segment-btn"
                :class="{ active: settings.dataSource === 'json' }"
                type="button"
                @click="store.setDataSource('json')"
              >
                {{ t('settings.dataSourceJson') }}
              </button>
            </div>
            <p class="section-help">{{ t('settings.dataSourceHelp') }}</p>
          </div>

          <div class="section-heading">
            <div>
              <h3 class="section-title">{{ t('settings.categories') }}</h3>
              <p class="section-help">{{ t('settings.categoriesHelp') }}</p>
            </div>
            <div class="row-actions">
              <template v-if="settings.dataSource === 'json'">
                <input ref="jsonInput" class="visually-hidden" type="file" accept=".json,application/json" @change="importJson" />
                <button class="btn" type="button" :disabled="store.state.bookmarkImporting" @click="jsonInput?.click()">
                  <Upload :size="15" />
                  {{ t('settings.importJson') }}
                </button>
              </template>
              <template v-else>
                <button
                  class="btn"
                  type="button"
                  :disabled="store.state.bookmarkImporting"
                  @click="store.importBrowserBookmarks({ silent: false, replace: true })"
                >
                  <RefreshCw :size="15" />
                  {{ t('settings.syncBrowserBookmarks') }}
                </button>
              </template>
              <button class="btn" type="button" @click="store.exportJson">
                <Download :size="15" />
                {{ t('settings.exportJson') }}
              </button>
              <button class="btn" type="button" @click="emit('open-category', null)">
                <FolderPlus :size="15" />
                {{ t('settings.addCategory') }}
              </button>
            </div>
          </div>

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

        <div v-else-if="activeTab === 'appearance'" class="settings-section appearance-settings">
          <div class="appearance-group">
            <div class="appearance-group-head">
              <h3 class="appearance-group-title">{{ t('settings.appearanceBasic') }}</h3>
            </div>
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
            </div>
          </div>

          <hr class="settings-divider" />

          <div class="appearance-group">
            <div class="appearance-group-head">
              <h3 class="appearance-group-title">{{ t('settings.appearanceCards') }}</h3>
            </div>
            <div class="form-grid appearance-cards-grid">
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
              <div class="field">
                <label for="settings-font-size">{{ t('settings.cardFontSize') }}</label>
                <input id="settings-font-size" class="input" type="range" min="11" max="24" step="1" :value="settings.cardFontSize" @input="store.setSettings({ cardFontSize: Number($event.target.value) })" />
              </div>
            </div>
          </div>

          <hr class="settings-divider" />

          <div class="appearance-group">
            <div class="appearance-group-head">
              <h3 class="appearance-group-title">{{ t('settings.appearanceBackground') }}</h3>
            </div>
            <div class="form-grid appearance-background-grid">
              <div class="field">
                <label>{{ t('settings.backgroundImage') }}</label>
                <div class="file-field">
                  <input ref="backgroundInput" class="visually-hidden" type="file" accept="image/*" @change="uploadBackground" />
                  <button class="btn" type="button" @click="backgroundInput?.click()">
                    <Upload :size="15" />
                    {{ t('settings.uploadLocalImage') }}
                  </button>
                  <button v-if="settings.background" class="btn btn-ghost" type="button" @click="store.setSettings({ background: '' })">{{ t('settings.remove') }}</button>
                </div>
              </div>
              <div class="field">
                <label for="settings-background-blur">{{ t('settings.backgroundBlur') }}</label>
                <input id="settings-background-blur" class="input" type="range" min="0" max="24" step="1" :value="settings.backgroundBlur" @input="store.setSettings({ backgroundBlur: Number($event.target.value) })" />
              </div>
            </div>
          </div>

          <hr class="settings-divider" />

          <div class="appearance-group">
            <div class="appearance-group-head">
              <h3 class="appearance-group-title">{{ t('settings.appearanceContent') }}</h3>
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
            </div>
          </div>
        </div>

        <div v-else-if="activeTab === 'support'" class="settings-section">
          <div class="support-card">
            <div class="support-head">
              <HeartHandshake :size="20" />
              <div>
                <h3 class="section-title">{{ t('settings.supportTitle') }}</h3>
              </div>
            </div>
            <div class="support-actions">
              <a class="btn btn-primary support-button" href="https://ko-fi.com/helloxiaolaodi" target="_blank" rel="noopener noreferrer">
                <HeartHandshake :size="15" />
                {{ t('settings.supportKoFi') }}
              </a>
              <button class="btn btn-primary support-button" type="button" @click="showWechatPay = true">
                <QrCode :size="15" />
                {{ t('settings.supportWechat') }}
              </button>
            </div>
            <div class="support-meta">
              <span>{{ t('settings.supportAuthor') }}</span>
            </div>
          </div>
        </div>

        <div v-else-if="activeTab === 'guide'" class="settings-section">
          <div class="guide-head">
            <div>
              <h3 class="section-title">{{ t('settings.guideTitle') }}</h3>
              <p class="section-help">{{ t('settings.guideHelp') }}</p>
            </div>
          </div>
          <div class="guide-grid">
            <div class="guide-row">
              <div class="guide-keys"><kbd class="kbd-key">/</kbd></div>
              <p>{{ t('settings.guideSlash') }}</p>
            </div>
            <div class="guide-row">
              <div class="guide-keys"><kbd class="kbd-key">/settings</kbd><kbd class="kbd-key">Enter</kbd></div>
              <p>{{ t('settings.guideSettings') }}</p>
            </div>
            <div class="guide-row">
              <div class="guide-keys"><kbd class="kbd-key">Ctrl</kbd><span class="guide-plus">+</span><kbd class="kbd-key">K</kbd></div>
              <p>{{ t('settings.guidePalette') }}</p>
            </div>
            <div class="guide-row">
              <div class="guide-keys"><kbd class="kbd-key">Esc</kbd></div>
              <p>{{ t('settings.guideEscape') }}</p>
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

  <BackgroundCropModal
    v-if="cropModalOpen"
    :src="pendingBackgroundDataUrl"
    @confirm="applyCroppedBackground"
    @close="cropModalOpen = false"
  />
</template>
