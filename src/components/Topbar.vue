<script setup>
import { computed, ref, watch } from 'vue'
import { CornerDownLeft, Lock, Moon, Search, Settings, Slash, Sun, Unlock, X } from 'lucide-vue-next'
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
  guideVisible: { type: Boolean, default: false }
})

const emit = defineEmits([
  'toggle-theme',
  'open-settings',
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
const settingsCommand = computed(() => props.query.trim().toLowerCase() === '/settings')

function onInput(value) {
  activeIndex.value = 0
  emit('query-change', value)
}

function onCommandKeydown(event) {
  if (!commandMode.value) return
  if (event.key === 'ArrowDown') {
    event.preventDefault()
    const count = localResults.length
    if (!count) return
    activeIndex.value = (activeIndex.value + 1) % count
  } else if (event.key === 'ArrowUp') {
    event.preventDefault()
    const count = localResults.length
    if (!count) return
    activeIndex.value = (activeIndex.value - 1 + count) % count
  } else if (event.key === 'Escape') {
    event.preventDefault()
    emit('escape-command')
  }
}

function submitSearch() {
  if (!commandMode.value) {
    emit('search')
    return
  }
  if (settingsCommand.value) {
    emit('open-settings')
    emit('query-change', '')
    return
  }
  const result = localResults[activeIndex.value] || localResults[0]
  if (result) {
    selectResult(result)
  }
}

function selectResult(result) {
  if (!result?.card?.url) return
  emit('local-select', result)
  activeIndex.value = 0
}

watch(() => props.query, () => {
  activeIndex.value = 0
})
</script>

<template>
  <header class="topbar">
    <div class="topbar-tools">
      <div class="search-wrap">
        <form class="search-box" :class="{ 'command-mode': commandMode }" @submit.prevent="submitSearch">
          <input
            :value="query"
            class="search-input"
            type="search"
            :placeholder="commandMode ? t('topbar.commandPlaceholder') : t('topbar.searchPlaceholder')"
            autocomplete="off"
            spellcheck="false"
            @input="onInput($event.target.value)"
            @keydown="onCommandKeydown"
          />
          <select
            v-if="!commandMode"
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
            v-if="!commandMode"
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
          <div v-if="commandMode" class="command-palette" role="listbox" :aria-label="t('topbar.localSearch')">
            <div class="command-palette-head">
              <span><Slash :size="14" /> {{ t('topbar.localSearch') }}</span>
              <span v-if="localResults.length" class="command-palette-count">{{ localResults.length }}</span>
            </div>
            <button
              v-if="settingsCommand"
              class="command-result command-action"
              type="button"
              @mouseenter="activeIndex = -1"
              @click="submitSearch"
            >
              <span class="command-result-icon"><Settings :size="17" /></span>
              <span class="command-result-copy">
                <span class="command-result-title">{{ t('topbar.openSettings') }}</span>
                <span class="command-result-meta">/settings</span>
              </span>
              <CornerDownLeft :size="15" />
            </button>
            <button
              v-for="(result, index) in localResults"
              :key="`${result.card?.id || result.card?.url}-${index}`"
              class="command-result"
              :class="{ active: activeIndex === index }"
              type="button"
              @mouseenter="activeIndex = index"
              @click="selectResult(result)"
            >
              <span class="command-result-icon"><SiteIcon :card="result.card" :size="28" /></span>
              <span class="command-result-copy">
                <span class="command-result-title">{{ result.card.title }}</span>
                <span class="command-result-meta">
                  {{ result.categoryTitle }}<template v-if="result.card.tags?.length"> · {{ result.card.tags.slice(0, 2).join(', ') }}</template>
                </span>
              </span>
              <CornerDownLeft :size="15" />
            </button>
            <div v-if="!localResults.length && !settingsCommand" class="command-empty">
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
