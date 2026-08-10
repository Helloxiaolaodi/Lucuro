<script setup>
import { computed, ref, watch } from 'vue'
import { CornerDownLeft, Download, Lock, Moon, Plus, Search, Settings, Slash, Sun, Unlock, X } from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'
import SiteIcon from './SiteIcon.vue'

const { t } = useI18n()

const props = defineProps({
  engines: { type: Array, default: () => [] },
  defaultEngineId: { type: String, default: 'google' },
  theme: { type: String, default: 'light' },
  query: { type: String, default: '' },
  layoutLocked: { type: Boolean, default: false },
  sortMode: { type: String, default: 'default' },
  localResults: { type: Array, default: () => [] },
  guideVisible: { type: Boolean, default: false },
  localSearchMode: { type: Boolean, default: false }
})

const emit = defineEmits([
  'toggle-theme',
  'open-settings',
  'set-theme',
  'open-add-card',
  'export-json',
  'search',
  'engine-change',
  'query-change',
  'toggle-lock',
  'sort-change',
  'local-select',
  'guide-dismiss',
  'escape-command'
])

const activeIndex = ref(0)
const commandMode = computed(() => props.query.trim().startsWith('/'))
const commands = [
  { id: 'settings', kind: 'command', command: '/settings', labelKey: 'topbar.commandSettings', icon: Settings },
  { id: 'dark', kind: 'command', command: '/dark', labelKey: 'topbar.commandDark', icon: Moon },
  { id: 'light', kind: 'command', command: '/light', labelKey: 'topbar.commandLight', icon: Sun },
  { id: 'add', kind: 'command', command: '/add', labelKey: 'topbar.commandAdd', icon: Plus },
  { id: 'export', kind: 'command', command: '/export', labelKey: 'topbar.commandExport', icon: Download }
]
const matchingCommands = computed(() => {
  const raw = props.query.trim().toLowerCase()
  if (!raw.startsWith('/')) return []
  if (raw === '/') return commands
  return commands.filter((item) => item.command.startsWith(raw))
})
const paletteItems = computed(() => {
  if (commandMode.value && matchingCommands.value.length) return matchingCommands.value
  return props.localResults
})

function onInput(value) {
  activeIndex.value = 0
  emit('query-change', value)
}

function onCommandKeydown(event) {
  if (!commandMode.value && !props.localSearchMode) return
  const count = paletteItems.value.length
  if (event.key === 'ArrowDown') {
    event.preventDefault()
    if (!count) return
    activeIndex.value = (activeIndex.value + 1) % count
  } else if (event.key === 'ArrowUp') {
    event.preventDefault()
    if (!count) return
    activeIndex.value = (activeIndex.value - 1 + count) % count
  } else if (event.key === 'Escape') {
    event.preventDefault()
    emit('escape-command')
  }
}

function submitSearch() {
  if (commandMode.value) {
    const selected = paletteItems.value[activeIndex.value] || paletteItems.value[0]
    if (selected?.kind === 'command') {
      executeCommand(selected)
      return
    }
    const result = selected || props.localResults[0]
    if (result?.card?.url) {
      selectResult(result)
    }
    return
  }
  if (props.localSearchMode) {
    const selected = paletteItems.value[activeIndex.value] || props.localResults[0]
    if (selected?.card?.url) {
      selectResult(selected)
      return
    }
  }
  emit('search')
}

function executeCommand(item) {
  if (!item) return
  activeIndex.value = 0
  emit('query-change', '')
  if (item.id === 'settings') {
    emit('open-settings')
  } else if (item.id === 'dark' || item.id === 'light') {
    emit('set-theme', item.id)
  } else if (item.id === 'add') {
    emit('open-add-card')
  } else if (item.id === 'export') {
    emit('export-json')
  }
}

function selectResult(result) {
  if (!result?.card?.url) return
  emit('local-select', result)
  activeIndex.value = 0
}

watch(() => [props.query, props.localSearchMode, props.localResults.length], () => {
  activeIndex.value = 0
})
</script>

<template>
  <header class="topbar">
    <div class="topbar-tools">
      <div class="search-wrap">
        <form class="search-box" :class="{ 'command-mode': commandMode || localSearchMode }" @submit.prevent="submitSearch">
          <input
            :value="query"
            class="search-input"
            type="search"
            :placeholder="commandMode ? t('topbar.commandPlaceholder') : localSearchMode ? t('topbar.localSearchPlaceholder') : t('topbar.searchPlaceholder')"
            autocomplete="off"
            spellcheck="false"
            @input="onInput($event.target.value)"
            @keydown="onCommandKeydown"
          />
          <select
            v-if="!commandMode && !localSearchMode"
            class="engine-select"
            :value="defaultEngineId"
            :aria-label="t('topbar.searchEngine')"
            @change="$emit('engine-change', $event.target.value)"
          >
            <option v-for="engine in engines" :key="engine.id" :value="engine.id">
              {{ engine.label }}
            </option>
          </select>
          <select
            v-if="!commandMode && !localSearchMode"
            class="engine-select sort-select"
            :value="sortMode"
            :aria-label="t('topbar.sortMode')"
            :title="t('topbar.sortMode')"
            @change="$emit('sort-change', $event.target.value)"
          >
            <option value="default">{{ t('topbar.sortDefault') }}</option>
            <option value="frequency">{{ t('topbar.sortFrequency') }}</option>
            <option value="alphabetical">{{ t('topbar.sortAlphabetical') }}</option>
          </select>
        </form>

        <transition name="command-pop">
          <div v-if="commandMode || localSearchMode" class="command-palette" role="listbox" :aria-label="t('topbar.localSearch')">
            <div class="command-palette-head">
              <span>
                <Slash v-if="commandMode" :size="14" />
                <Search v-else :size="14" />
                {{ commandMode ? t('topbar.commandPalette') : t('topbar.localSearch') }}
              </span>
              <span v-if="paletteItems.length" class="command-palette-count">{{ paletteItems.length }}</span>
            </div>
            <button
              v-for="(item, index) in paletteItems"
              :key="item.kind === 'command' ? item.id : `${item.card?.id || item.card?.url}-${index}`"
              class="command-result"
              :class="{ active: activeIndex === index, 'command-action': item.kind === 'command' }"
              type="button"
              @mouseenter="activeIndex = index"
              @click="item.kind === 'command' ? executeCommand(item) : selectResult(item)"
            >
              <span v-if="item.kind === 'command'" class="command-result-icon">
                <component :is="item.icon" :size="17" />
              </span>
              <span v-else class="command-result-icon"><SiteIcon :card="item.card" :size="28" /></span>
              <span class="command-result-copy">
                <span class="command-result-title">{{ item.kind === 'command' ? t(item.labelKey) : item.card.title }}</span>
                <span class="command-result-meta">
                  {{ item.kind === 'command' ? item.command : `${item.categoryTitle}${item.card.tags?.length ? ` · ${item.card.tags.slice(0, 2).join(', ')}` : ''}` }}
                </span>
              </span>
              <CornerDownLeft :size="15" />
            </button>
            <div v-if="!paletteItems.length" class="command-empty">
              <Search :size="16" />
              <span>{{ t('topbar.noLocalResults') }}</span>
            </div>
          </div>
        </transition>

        <transition name="tip-fade">
          <button
            v-if="guideVisible && !commandMode"
            class="onboarding-tip"
            type="button"
            @click="emit('guide-dismiss')"
          >
            <span>{{ t('topbar.onboardingTip') }}</span>
            <X :size="12" />
          </button>
        </transition>
      </div>

      <div class="controls">
        <button class="icon-btn" type="button" :aria-label="t('topbar.toggleLock')" :title="t('topbar.toggleLock')" @click="emit('toggle-lock')">
          <Lock v-if="layoutLocked" :size="18" />
          <Unlock v-else :size="18" />
        </button>
        <button class="icon-btn" type="button" :aria-label="t('topbar.toggleTheme')" :title="t('topbar.toggleTheme')" @click="emit('toggle-theme')">
          <Sun v-if="theme === 'light'" :size="18" />
          <Moon v-else :size="18" />
        </button>
        <button class="icon-btn" type="button" :aria-label="t('topbar.settings')" :title="t('topbar.settings')" @click="emit('open-settings')">
          <Settings :size="18" />
        </button>
      </div>
    </div>
  </header>
</template>
