<script setup>
import { Lock, Moon, Settings, Sun, Unlock } from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

defineProps({
  engines: { type: Array, default: () => [] },
  defaultEngineId: { type: String, default: 'google' },
  theme: { type: String, default: 'light' },
  query: { type: String, default: '' },
  layoutLocked: { type: Boolean, default: false },
  sortMode: { type: String, default: 'default' }
})

const emit = defineEmits(['toggle-theme', 'open-settings', 'search', 'engine-change', 'query-change', 'toggle-lock', 'sort-change'])

function onInput(value) {
  emit('query-change', value)
}
</script>

<template>
  <header class="topbar">
    <div class="topbar-tools">
      <div class="search-wrap">
        <form class="search-box" @submit.prevent="emit('search')">
          <input
            :value="query"
            class="search-input"
            type="search"
            :placeholder="t('topbar.searchPlaceholder')"
            autocomplete="off"
            spellcheck="false"
            @input="onInput($event.target.value)"
          />
          <select
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
