<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { ExternalLink, GripVertical, NotebookPen, Pencil, Plus, RefreshCw, Sparkles, Trash2, X } from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'
import { useLucuro } from './stores/lucuro'
import Sidebar from './components/Sidebar.vue'
import Topbar from './components/Topbar.vue'
import SettingsPanel from './components/SettingsPanel.vue'
import CardEditorModal from './components/CardEditorModal.vue'
import CategoryEditorModal from './components/CategoryEditorModal.vue'
import SortableList from './components/SortableList.vue'
import SiteIcon from './components/SiteIcon.vue'
import LucuroLogo from './components/LucuroLogo.vue'

const store = useLucuro()
const { state, load } = store
const { t } = useI18n()
const sidebarOpen = ref(false)
const notesOpen = ref(false)

onMounted(() => {
  load()
  window.addEventListener('keydown', handleShortcut)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleShortcut)
})

const visibleGroups = computed(() => store.filteredCategories())
const recommendedCards = computed(() => store.recommendedCards(8))

const yearProgress = computed(() => {
  const now = new Date()
  const start = new Date(now.getFullYear(), 0, 1)
  const end = new Date(now.getFullYear() + 1, 0, 1)
  return Math.min(100, Math.max(0, ((now - start) / (end - start)) * 100))
})

const dayProgress = computed(() => {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
  return Math.min(100, Math.max(0, ((now - start) / (end - start)) * 100))
})

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
    store.setSettings({ layoutLocked: !state.settings.layoutLocked })
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

function openSettings(tab = 'links') {
  state.settingsOpen = true
  state.settingsTab = tab
}

function addLink() {
  if (!state.links.length) {
    store.openCategoryModal(null)
    store.toast(t('toast.addCategoryFirst'))
    return
  }
  const section = state.activeCategory === null ? 0 : state.activeCategory
  store.openCardModal(section, null)
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
    <Sidebar
      :open="sidebarOpen"
      :categories="state.links"
      :tags="store.allTags()"
      :active-tag="state.activeTag"
      :active-category="state.activeCategory"
      :settings="state.settings"
      :stats="state.stats"
      @select-tag="(tag) => { state.activeTag = tag; state.activeCategory = null }"
      @select-category="(index) => { state.activeCategory = index; sidebarOpen = false }"
      @manage-links="openSettings('links')"
      @toggle="sidebarOpen = !sidebarOpen"
      @add-link="addLink"
    />

    <main class="main-area">
      <Topbar
        :title="state.settings.workspaceTitle || 'Lucuro'"
        :engines="state.settings.engines"
        :default-engine-id="state.settings.defaultEngineId"
        :theme="state.settings.theme"
        :query="state.searchQuery"
        :layout-locked="state.settings.layoutLocked"
        :sort-mode="state.settings.sortMode"
        @toggle-sidebar="sidebarOpen = !sidebarOpen"
        @toggle-theme="toggleTheme"
        @open-settings="openSettings('appearance')"
        @toggle-lock="store.setSettings({ layoutLocked: !state.settings.layoutLocked })"
        @toggle-notes="notesOpen = !notesOpen"
        @sort-change="(value) => store.setSettings({ sortMode: value })"
        @search="store.doSearch"
        @engine-change="(id) => store.setSettings({ defaultEngineId: id })"
        @query-change="(value) => { state.searchQuery = value }"
      />

      <div class="scroll-area">
        <div class="content-wrap">
          <section class="hero-strip" aria-label="Lucuro overview">
            <div>
              <div class="hero-badge"><LucuroLogo :size="24" /> <span>{{ state.settings.statusLabel || t('hero.status') }}</span></div>
              <h2 class="hero-title">{{ state.settings.heroTitle || t('hero.title') }}</h2>
              <p class="hero-subtitle">{{ state.settings.heroSubtitle || t('hero.subtitle') }}</p>
              <div class="hitokoto-row">
                <button class="hitokoto-text" type="button" :title="t('settings.hitokotoRefresh')" @click="store.refreshHitokoto">
                  {{ state.currentHitokoto || t('settings.hitokotoPlaceholder') }}
                </button>
                <button class="mini-btn" type="button" :title="t('settings.hitokotoRefresh')" :aria-label="t('settings.hitokotoRefresh')" @click="store.refreshHitokoto">
                  <RefreshCw :size="14" />
                </button>
              </div>
            </div>
            <button class="btn" type="button" @click="openSettings('links')">
              <Plus :size="15" />
              {{ t('app.customize') }}
            </button>
          </section>

          <div class="progress-row">
            <div class="progress-card">
              <div class="progress-head">
                <span>{{ t('app.yearProgress') }}</span>
                <strong>{{ Math.round(yearProgress) }}%</strong>
              </div>
              <div class="progress-track"><i :style="{ width: `${yearProgress}%` }"></i></div>
            </div>
            <div class="progress-card">
              <div class="progress-head">
                <span>{{ t('app.dayProgress') }}</span>
                <strong>{{ Math.round(dayProgress) }}%</strong>
              </div>
              <div class="progress-track"><i :style="{ width: `${dayProgress}%` }"></i></div>
            </div>
          </div>

          <div v-if="state.settings.showStatusLegend" class="legend-row">
            <span><i class="legend-dot" style="background: var(--success)"></i>{{ t('legend.categories', { count: state.links.length }) }}</span>
            <span><i class="legend-dot" style="background: var(--accent)"></i>{{ t('legend.cards', { count: state.links.reduce((sum, group) => sum + group.children.length, 0) }) }}</span>
            <span><i class="legend-dot" style="background: #f59e0b"></i>{{ t('legend.tags', { count: store.allTags().length }) }}</span>
          </div>

          <div v-if="visibleGroups.length === 0" class="empty-state">
            <p>{{ t('app.noResults') }}</p>
            <button class="btn btn-primary" type="button" @click="openSettings('links')">{{ t('app.manageLinks') }}</button>
          </div>

          <section v-if="!state.searchQuery.trim() && recommendedCards.length" class="category-section recommended-section" aria-label="Recommended links">
            <div class="category-head">
              <div>
                <h3 class="category-title recommended-title"><Sparkles :size="18" /> {{ t('app.recommended') }}</h3>
                <p class="category-subtitle">{{ t('app.recommendedHelp') }}</p>
              </div>
            </div>
            <div class="card-grid recommended-grid">
              <article v-for="card in recommendedCards" :key="card.id || card.url" class="card">
                <a
                  v-if="card.url"
                  class="card-hit"
                  :href="safeUrl(card.url)"
                  :target="Number(card.openMethod) === 2 ? '_self' : '_blank'"
                  :rel="Number(card.openMethod) === 2 ? '' : 'noopener noreferrer'"
                  @click="store.trackClick(card)"
                ></a>
                <div class="card-content">
                  <SiteIcon :card="card" />
                  <div class="card-copy">
                    <h4 class="card-title">{{ card.title }}</h4>
                    <p v-if="card.description" class="card-description">{{ card.description }}</p>
                  </div>
                  <ExternalLink v-if="card.url" class="card-open-icon" :size="14" />
                </div>
              </article>
            </div>
          </section>

          <section
            v-for="entry in visibleGroups"
            :id="`main-group-${entry.index}`"
            :key="entry.category.id || entry.index"
            class="category-section"
          >
            <div class="category-head">
              <div>
                <h3 class="category-title">{{ entry.category.title }}</h3>
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
                  :target="Number(item.card.openMethod) === 2 ? '_self' : '_blank'"
                  :rel="Number(item.card.openMethod) === 2 ? '' : 'noopener noreferrer'"
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

    <button class="fab" type="button" @click="addLink">
      <Plus :size="18" />
      {{ t('app.addLink') }}
    </button>

    <div class="notes-dock" :class="{ open: notesOpen }">
      <div v-if="notesOpen" class="notes-panel">
        <div class="notes-head">
          <span><NotebookPen :size="15" /> {{ t('settings.notes') }}</span>
          <button class="mini-btn" type="button" :aria-label="t('settings.close')" @click="notesOpen = false">
            <X :size="14" />
          </button>
        </div>
        <textarea
          class="notes-input"
          :value="state.settings.notes"
          :placeholder="t('settings.notesPlaceholder')"
          @input="store.setNotes($event.target.value)"
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
      :sync-status="state.syncStatus"
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
