<script setup>
import { computed, ref } from 'vue'
import { Plus, X } from 'lucide-vue-next'
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

const emit = defineEmits(['select-tag', 'select-category', 'add-tag', 'remove-tag', 'toggle'])
const { t } = useI18n()
const newTag = ref('')

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

function submitTag() {
  if (!newTag.value.trim()) return
  emit('add-tag', newTag.value.trim())
  newTag.value = ''
}
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
        <span v-for="tag in tags" :key="tag" class="tag-item">
          <button
            type="button"
            class="tag-chip"
            :class="{ active: activeTag === tag }"
            @click="emit('select-tag', tag)"
          >
            {{ tag }}
          </button>
          <button
            class="tag-remove"
            type="button"
            :title="t('sidebar.removeTag')"
            :aria-label="t('sidebar.removeTag', { tag })"
            @click="emit('remove-tag', tag)"
          >
            <X :size="12" />
          </button>
        </span>
      </div>
      <form class="tag-manage" @submit.prevent="submitTag">
        <input
          v-model.trim="newTag"
          class="tag-input"
          type="text"
          :placeholder="t('sidebar.tagPlaceholder')"
          :aria-label="t('sidebar.tagPlaceholder')"
        />
        <button class="mini-btn" type="submit" :title="t('sidebar.addTag')" :aria-label="t('sidebar.addTag')">
          <Plus :size="13" />
        </button>
      </form>

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
    </div>
  </div>
</template>
