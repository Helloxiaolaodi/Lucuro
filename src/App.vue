<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { Bold, ChevronRight, Code2, ExternalLink, GripVertical, Heading1, Heading2, Italic, Link2, List, NotebookPen, Pencil, Plus, Quote, RefreshCw, Strikethrough, Trash2, Undo2, X } from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'
import { useLucuro } from './stores/lucuro'
import Sidebar from './components/Sidebar.vue'
import Topbar from './components/Topbar.vue'
import SettingsPanel from './components/SettingsPanel.vue'
import CardEditorModal from './components/CardEditorModal.vue'
import CategoryEditorModal from './components/CategoryEditorModal.vue'
import SortableList from './components/SortableList.vue'
import SiteIcon from './components/SiteIcon.vue'

const store = useLucuro()
const { state, load } = store
const { t } = useI18n()
const sidebarOpen = ref(false)
const notesOpen = ref(false)
const notesTextarea = ref(null)
const noteHistory = ref([])
const AUTO_LOCK_DELAY = 30000
let autoLockTimer = null

onMounted(() => {
  load()
    .then(() => {
      if (state.settings.dataSource !== 'json') {
        return store.importBrowserBookmarks({ silent: true, replace: true }).catch(() => {})
      }
    })
    .catch(() => {})
  window.addEventListener('keydown', handleShortcut)
  window.addEventListener('pointerdown', handleActivity, { passive: true })
  window.addEventListener('pointermove', handleActivity, { passive: true })
  window.addEventListener('keydown', handleActivity, { passive: true })
  window.addEventListener('wheel', handleActivity, { passive: true })
  window.addEventListener('touchstart', handleActivity, { passive: true })
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleShortcut)
  window.removeEventListener('pointerdown', handleActivity)
  window.removeEventListener('pointermove', handleActivity)
  window.removeEventListener('keydown', handleActivity)
  window.removeEventListener('wheel', handleActivity)
  window.removeEventListener('touchstart', handleActivity)
  clearTimeout(autoLockTimer)
})

function categoryParts(title) {
  const parts = String(title || 'Uncategorized')
    .split(' - ')
    .map((part) => part.trim())
    .filter(Boolean)
  return parts.length ? parts : ['Uncategorized']
}

const visibleGroups = computed(() => store.filteredCategories().map((entry) => ({
  ...entry,
  parts: categoryParts(entry.category.title)
})))

function handleShortcut(event) {
  const mod = event.ctrlKey || event.metaKey
  if (!mod) return
  if (event.key.toLowerCase() === 'k') {
    event.preventDefault()
    document.querySelector('.search-input')?.focus()
    return
  }
  if (!event.shiftKey) return
  const key = event.key.toLowerCase()
  if (key === 'l') {
    event.preventDefault()
    toggleLayoutLock()
  } else if (key === 'n') {
    event.preventDefault()
    notesOpen.value = !notesOpen.value
  } else if (key === 'q') {
    event.preventDefault()
    store.refreshHitokoto()
  }
}

function toggleTheme() {
  store.setSettings({ theme: state.settings.theme === 'dark' ? 'light' : 'dark' })
}

function toggleLayoutLock() {
  store.setSettings({ layoutLocked: !state.settings.layoutLocked })
}

function scheduleAutoLock() {
  clearTimeout(autoLockTimer)
  autoLockTimer = setTimeout(() => {
    if (!state.settings.layoutLocked) store.setSettings({ layoutLocked: true })
  }, AUTO_LOCK_DELAY)
}

function handleActivity() {
  if (!state.settings.layoutLocked) scheduleAutoLock()
}

watch(() => state.settings.layoutLocked, (locked) => {
  if (locked) {
    clearTimeout(autoLockTimer)
  } else {
    scheduleAutoLock()
  }
})

function insertMarkdown(prefix, suffix = '') {
  const textarea = notesTextarea.value
  if (!textarea) return
  const start = textarea.selectionStart ?? textarea.value.length
  const end = textarea.selectionEnd ?? textarea.value.length
  const selected = textarea.value.slice(start, end)
  const inserted = `${prefix}${selected}${suffix}`
  const nextValue = `${textarea.value.slice(0, start)}${inserted}${textarea.value.slice(end)}`
  store.setNotes(nextValue)
  nextTick(() => {
    textarea.focus()
    const cursor = selected ? start + inserted.length : start + prefix.length
    textarea.setSelectionRange(cursor, cursor)
  })
}

function onNotesInput(value) {
  if (value !== state.settings.notes) {
    noteHistory.value.push(state.settings.notes)
    if (noteHistory.value.length > 60) noteHistory.value.shift()
  }
  store.setNotes(value)
}

function clearNotes() {
  noteHistory.value.push(state.settings.notes)
  store.setNotes('')
}

function undoNotes() {
  const previous = noteHistory.value.pop()
  if (previous !== undefined) store.setNotes(previous)
}

function openSettings(tab = 'links') {
  state.settingsOpen = true
  state.settingsTab = tab
}

function safeUrl(url) {
  if (!url) return ''
  if (/^(https?:|mailto:|tel:)/i.test(url)) return url
  return `https://${url}`
}

function reorderVisibleCards(entry, oldFilteredIndex, newFilteredIndex) {
  const from = entry.items[oldFilteredIndex]
  const to = entry.items[newFilteredIndex]
  if (!from || !to) return
  store.reorderCards(entry.index, from.cardIndex, to.cardIndex)
}
</script>

<template>
  <div class="app-shell">
    <div class="sidebar-dock" :class="{ open: sidebarOpen }" @mouseenter="sidebarOpen = true" @mouseleave="sidebarOpen = false">
      <div class="sidebar-hover-zone" aria-hidden="true"></div>
      <Sidebar
        @mouseenter="sidebarOpen = true"
        :open="sidebarOpen"
        :categories="state.links"
        :tags="store.allTags()"
        :active-tag="state.activeTag"
        :active-category="state.activeCategory"
        :settings="state.settings"
        :stats="state.stats"
        @select-tag="(tag) => { state.activeTag = tag; state.activeCategory = null }"
        @select-category="(index) => { state.activeCategory = index; sidebarOpen = false }"
        @add-tag="(tag) => { if (store.addTag(tag)) { state.activeTag = tag; state.activeCategory = null } }"
        @remove-tag="store.removeTag"
        @toggle="sidebarOpen = !sidebarOpen"
      />
    </div>

    <main class="main-area">
      <Topbar
        :engines="state.settings.engines"
        :default-engine-id="state.settings.defaultEngineId"
        :theme="state.settings.theme"
        :query="state.searchQuery"
        :layout-locked="state.settings.layoutLocked"
        :sort-mode="state.settings.sortMode"
        @toggle-theme="toggleTheme"
        @open-settings="openSettings('appearance')"
        @toggle-lock="toggleLayoutLock"
        @sort-change="(value) => store.setSettings({ sortMode: value })"
        @search="store.doSearch"
        @engine-change="(id) => store.setSettings({ defaultEngineId: id })"
        @query-change="(value) => { state.searchQuery = value }"
      />

      <div class="scroll-area">
        <div class="content-wrap">
          <section class="hero-strip" aria-label="Lucuro overview">
            <div>
              <h2 class="hero-title">Stay lucky, stay curious</h2>
              <div class="hitokoto-row">
                <button class="hitokoto-text" type="button" :title="t('settings.hitokotoRefresh')" @click="store.refreshHitokoto">
                  {{ state.currentHitokoto || t('settings.hitokotoPlaceholder') }}
                </button>
                <button class="mini-btn" type="button" :title="t('settings.hitokotoRefresh')" :aria-label="t('settings.hitokotoRefresh')" @click="store.refreshHitokoto">
                  <RefreshCw :size="14" />
                </button>
              </div>
            </div>
          </section>

          <div v-if="visibleGroups.length === 0" class="empty-state">
            <p>{{ t('app.noResults') }}</p>
            <button class="btn btn-primary" type="button" @click="openSettings('links')">{{ t('app.manageLinks') }}</button>
          </div>

          <section
            v-for="entry in visibleGroups"
            :id="`main-group-${entry.index}`"
            :key="entry.category.id || entry.index"
            class="category-section"
          >
            <div class="category-head">
              <div>
                <h3 class="category-title">
                  <template v-for="(part, partIndex) in entry.parts" :key="`${part}-${partIndex}`">
                    <ChevronRight v-if="partIndex > 0" :size="14" class="category-breadcrumb-separator" aria-hidden="true" />
                    <span :class="partIndex === entry.parts.length - 1 ? 'category-breadcrumb-current' : 'category-breadcrumb-parent'">{{ part }}</span>
                  </template>
                </h3>
                <p v-if="entry.category.subtitle" class="category-subtitle">{{ entry.category.subtitle }}</p>
              </div>
              <div class="category-actions">
                <button class="mini-btn" type="button" title="Edit category" aria-label="Edit category" @click="store.openCategoryModal(entry.index)">
                  <Pencil :size="14" />
                </button>
                <button class="mini-btn" type="button" title="Add card" aria-label="Add card" @click="store.openCardModal(entry.index, null)">
                  <Plus :size="14" />
                </button>
                <button class="mini-btn danger" type="button" title="Delete category" aria-label="Delete category" @click="store.deleteCategory(entry.index)">
                  <Trash2 :size="14" />
                </button>
              </div>
            </div>

            <SortableList
              class="card-grid sortable-list"
              :class="{ 'layout-locked': state.settings.layoutLocked }"
              handle=".drag-handle"
              item-class="card"
              :disabled="state.settings.layoutLocked"
              @reorder="(oldIndex, newIndex) => reorderVisibleCards(entry, oldIndex, newIndex)"
            >
              <article v-for="item in entry.items" :key="item.card.id || `${entry.index}-${item.cardIndex}`" class="card">
                <a
                  v-if="item.card.url"
                  class="card-hit"
                  :href="safeUrl(item.card.url)"
                  target="_blank"
                  rel="noopener noreferrer"
                  @click="store.trackClick(item.card)"
                ></a>
                <span v-else class="card-hit" aria-hidden="true"></span>

                <span class="drag-handle" title="Drag to reorder">
                  <GripVertical :size="15" />
                </span>

                <div class="card-content">
                  <SiteIcon :card="item.card" />
                  <div class="card-copy">
                    <h4 class="card-title">{{ item.card.title }}</h4>
                    <p v-if="item.card.description" class="card-description">{{ item.card.description }}</p>
                    <div v-if="item.card.tags?.length" class="card-tags">
                      <span v-for="tag in item.card.tags.slice(0, 3)" :key="tag" class="tag-pill">{{ tag }}</span>
                    </div>
                  </div>
                  <ExternalLink v-if="item.card.url" class="card-open-icon" :size="14" />
                </div>

                <div class="card-actions">
                  <button class="mini-btn" type="button" title="Edit card" aria-label="Edit card" @click.stop="store.openCardModal(entry.index, item.cardIndex)">
                    <Pencil :size="13" />
                  </button>
                  <button class="mini-btn danger" type="button" title="Delete card" aria-label="Delete card" @click.stop="store.deleteCard(entry.index, item.cardIndex)">
                    <Trash2 :size="13" />
                  </button>
                </div>

                <span v-if="item.card.isVpnRequired" class="vpn-dot" title="VPN required"></span>
              </article>
            </SortableList>
          </section>
        </div>
      </div>
    </main>

    <div class="notes-dock" :class="{ open: notesOpen }">
      <div v-if="notesOpen" class="notes-panel">
        <div class="notes-head">
          <span><NotebookPen :size="15" /> {{ t('settings.notes') }}</span>
          <button class="mini-btn" type="button" :aria-label="t('settings.close')" @click="notesOpen = false">
            <X :size="14" />
          </button>
        </div>
        <div class="notes-toolbar" aria-label="Markdown formatting">
          <button class="notes-tool-btn" type="button" :title="t('notes.bold')" :aria-label="t('notes.bold')" @mousedown.prevent @click="insertMarkdown('**', '**')">
            <Bold :size="14" />
          </button>
          <button class="notes-tool-btn" type="button" :title="t('notes.italic')" :aria-label="t('notes.italic')" @mousedown.prevent @click="insertMarkdown('*', '*')">
            <Italic :size="14" />
          </button>
          <button class="notes-tool-btn" type="button" :title="t('notes.heading1')" :aria-label="t('notes.heading1')" @mousedown.prevent @click="insertMarkdown('# ')">
            <Heading1 :size="14" />
          </button>
          <button class="notes-tool-btn" type="button" :title="t('notes.heading2')" :aria-label="t('notes.heading2')" @mousedown.prevent @click="insertMarkdown('## ')">
            <Heading2 :size="14" />
          </button>
          <button class="notes-tool-btn" type="button" :title="t('notes.code')" :aria-label="t('notes.code')" @mousedown.prevent @click="insertMarkdown('```\n', '\n```')">
            <Code2 :size="14" />
          </button>
          <button class="notes-tool-btn" type="button" :title="t('notes.link')" :aria-label="t('notes.link')" @mousedown.prevent @click="insertMarkdown('[', '](url)')">
            <Link2 :size="14" />
          </button>
          <button class="notes-tool-btn" type="button" :title="t('notes.list')" :aria-label="t('notes.list')" @mousedown.prevent @click="insertMarkdown('- ')">
            <List :size="14" />
          </button>
          <button class="notes-tool-btn" type="button" :title="t('notes.quote')" :aria-label="t('notes.quote')" @mousedown.prevent @click="insertMarkdown('> ')">
            <Quote :size="14" />
          </button>
          <button class="notes-tool-btn" type="button" :title="t('notes.strikethrough')" :aria-label="t('notes.strikethrough')" @mousedown.prevent @click="insertMarkdown('~~', '~~')">
            <Strikethrough :size="14" />
          </button>
          <button class="notes-tool-btn" type="button" :title="t('notes.undo')" :aria-label="t('notes.undo')" @mousedown.prevent @click="undoNotes">
            <Undo2 :size="14" />
          </button>
          <button class="notes-tool-btn notes-danger" type="button" :title="t('notes.clear')" :aria-label="t('notes.clear')" @mousedown.prevent @click="clearNotes">
            <Trash2 :size="14" />
          </button>
        </div>
        <textarea
          ref="notesTextarea"
          class="notes-input"
          :value="state.settings.notes"
          :placeholder="t('settings.notesPlaceholder')"
          @input="onNotesInput($event.target.value)"
        ></textarea>
      </div>
      <button class="notes-toggle" type="button" :title="t('topbar.toggleNotes')" :aria-label="t('topbar.toggleNotes')" @click="notesOpen = !notesOpen">
        <NotebookPen :size="18" />
      </button>
    </div>

    <SettingsPanel
      v-if="state.settingsOpen"
      :links="state.links"
      :settings="state.settings"
      :active-tab="state.settingsTab"
      @close="state.settingsOpen = false"
      @open-category="store.openCategoryModal"
      @open-card="store.openCardModal"
    />

    <CategoryEditorModal
      v-if="state.categoryModal"
      :key="`category-${state.categoryModal.index}`"
      :category="state.categoryModal.index === null ? null : state.links[state.categoryModal.index]"
      @save="(payload) => store.saveCategory({ index: state.categoryModal.index, ...payload })"
      @close="state.categoryModal = null"
    />

    <CardEditorModal
      v-if="state.cardModal"
      :key="`card-${state.cardModal.section}-${state.cardModal.index}`"
      :card="state.cardModal.index === null ? null : state.links[state.cardModal.section]?.children[state.cardModal.index]"
      :tags="store.allTags()"
      @save="(payload) => store.saveCard({ section: state.cardModal.section, index: state.cardModal.index, data: payload })"
      @close="state.cardModal = null"
    />

    <div class="toast" :class="{ show: state.toastMessage }">{{ state.toastMessage }}</div>
  </div>
</template>
