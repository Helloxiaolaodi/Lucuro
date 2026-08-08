<script setup>
import { computed } from 'vue'
import { Plus, Settings2, X } from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'
import LucuroLogo from './LucuroLogo.vue'

const props = defineProps({
  open: { type: Boolean, default: false },
  categories: { type: Array, default: () => [] },
  tags: { type: Array, default: () => [] },
  activeTag: { type: String, default: 'all' },
  activeCategory: { type: Number, default: null },
  settings: { type: Object, required: true },
  stats: { type: Object, default: () => ({}) }
})

const emit = defineEmits(['select-tag', 'select-category', 'manage-links', 'toggle', 'add-link'])
const { t } = useI18n()

const categoryCounts = computed(() => {
  const counts = {}
  props.categories.forEach((category, index) => {
    counts[index] = category.children.length
  })
  return counts
})

function categoryTitle(category) {
  return (category.title || '').split(' - ')[0] || 'Uncategorized'
}

function clicksFor(category) {
  return category.children.reduce((total, card) => total + Number(card.clickCount || 0) + Number(props.stats[card.url] || 0), 0)
}

const totalClicks = computed(() => props.categories.reduce((total, category) => total + clicksFor(category), 0))
</script>

<template>
  <div class="sidebar" :class="{ open }" aria-label="Navigation sidebar">
    <button class="sidebar-close" type="button" :aria-label="t('sidebar.close')" @click="emit('toggle')">
      <X :size="18" />
    </button>

    <div class="sidebar-brand">
      <LucuroLogo :size="42" />
      <div>
        <h1>{{ settings.workspaceTitle || 'Lucuro' }}</h1>
        <small>{{ settings.workspaceSubtitle || 'Stay lucky, stay curious' }}</small>
      </div>
    </div>

    <nav class="sidebar-scroll">
      <div class="side-label">{{ t('sidebar.tags') }}</div>
      <div class="tag-filter">
        <button
          type="button"
          class="tag-chip"
          :class="{ active: activeTag === 'all' }"
          @click="emit('select-tag', 'all')"
        >
          {{ t('sidebar.all') }}
        </button>
        <button
          v-for="tag in tags"
          :key="tag"
          type="button"
          class="tag-chip"
          :class="{ active: activeTag === tag }"
          @click="emit('select-tag', tag)"
        >
          {{ tag }}
        </button>
      </div>

      <div class="side-label">{{ t('sidebar.categories') }}</div>
      <div class="category-links">
        <a
          v-for="(category, index) in categories"
          :key="category.id || index"
          class="category-link"
          :class="{ active: activeCategory === index }"
          :href="`#main-group-${index}`"
          @click="emit('select-category', index)"
        >
          <span>{{ categoryTitle(category) }}</span>
          <span class="badge">{{ categoryCounts[index] || 0 }}</span>
        </a>
      </div>
    </nav>

    <div class="sidebar-footer">
      <div class="profile-row">
        <img v-if="settings.profileAvatar" class="profile-avatar" :src="settings.profileAvatar" alt="Profile avatar" />
        <div v-else class="profile-avatar profile-avatar-fallback" aria-hidden="true">鹿</div>
        <div class="profile-copy">
          <div class="profile-name">{{ settings.profileName || 'Lucuro Explorer' }}</div>
          <div class="profile-meta">{{ t('sidebar.profileMeta', { categories: categories.length, clicks: totalClicks }) }}</div>
        </div>
      </div>
      <button class="btn full-width" type="button" @click="emit('manage-links')">
        <Settings2 :size="15" />
        {{ t('sidebar.manageLinks') }}
      </button>
      <button class="btn full-width" type="button" @click="$emit('add-link')">
        <Plus :size="15" />
        {{ t('sidebar.addLink') }}
      </button>
    </div>
  </div>
</template>
