<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import { Camera, Plus, X } from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'
import LucuroLogo from './LucuroLogo.vue'
import CategoryTreeNode from './CategoryTreeNode.vue'
import { useLucuro } from '../stores/lucuro'

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
const store = useLucuro()
const newTag = ref('')
const addingTag = ref(false)
const tagInput = ref(null)
const avatarInput = ref(null)
const profileName = ref(String(props.settings.profileName || 'Lucuro'))

watch(() => props.settings.profileName, (value) => {
  profileName.value = String(value || 'Lucuro')
})

function saveProfileName() {
  const name = profileName.value.trim() || 'Lucuro'
  profileName.value = name
  store.setSettings({ profileName: name })
}

function uploadAvatar(event) {
  const file = event.target.files?.[0]
  if (file) store.uploadAvatar(file)
  event.target.value = ''
}

function clicksFor(category) {
  return category.children.reduce((total, card) => total + Number(card.clickCount || 0) + Number(props.stats[card.url] || 0), 0)
}

const totalClicks = computed(() => props.categories.reduce((total, category) => total + clicksFor(category), 0))

const categoryTree = computed(() => {
  const root = {
    name: '',
    pathKey: '',
    children: new Map(),
    categoryIndex: null,
    count: 0,
    descendantIndexes: []
  }

  props.categories.forEach((category, index) => {
    const title = String(category.title || 'Uncategorized').trim()
    const parts = title.split(' - ').map((part) => part.trim()).filter(Boolean)
    const segments = parts.length ? parts : ['Uncategorized']
    let node = root

    segments.forEach((part, partIndex) => {
      const name = part || 'Uncategorized'
      const pathKey = partIndex === 0 ? name : `${node.pathKey} / ${name}`
      if (!node.children.has(name)) {
        node.children.set(name, {
          name,
          pathKey,
          children: new Map(),
          categoryIndex: null,
          count: 0,
          descendantIndexes: []
        })
      }
      node = node.children.get(name)
      node.count += Number(category.children?.length || 0)
      node.descendantIndexes.push(index)
    })

    node.categoryIndex = index
  })

  return toTree(root.children)
})

const sortedTags = computed(() => [...props.tags].sort((a, b) => String(a).localeCompare(String(b))))

function toTree(children) {
  return [...children.values()].map((node) => ({
    ...node,
    children: toTree(node.children)
  }))
}

async function openTagInput() {
  addingTag.value = true
  await nextTick()
  tagInput.value?.focus()
}

function closeTagInput() {
  addingTag.value = false
  newTag.value = ''
}

function submitTag() {
  const name = newTag.value.trim()
  if (name) emit('add-tag', name)
  closeTagInput()
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
        <span v-for="tag in sortedTags" :key="tag" class="tag-chip-wrap">
          <button
            type="button"
            class="tag-chip"
            :class="{ active: activeTag === tag }"
            @click="emit('select-tag', tag)"
          >
            {{ tag }}
          </button>
          <button
            class="tag-chip-remove"
            type="button"
            :title="t('sidebar.removeTag')"
            :aria-label="t('sidebar.removeTag', { tag })"
            @click="emit('remove-tag', tag)"
          >
            <X :size="10" />
          </button>
        </span>
      </div>
      <div class="tag-add">
        <button v-if="!addingTag" class="tag-add-trigger" type="button" @click="openTagInput">
          <Plus :size="13" />
          {{ t('sidebar.addTag') }}
        </button>
        <form v-else class="tag-manage" @submit.prevent="submitTag">
          <input
            ref="tagInput"
            v-model.trim="newTag"
            class="tag-input"
            type="text"
            :placeholder="t('sidebar.tagPlaceholder')"
            :aria-label="t('sidebar.tagPlaceholder')"
            @blur="closeTagInput"
            @keydown.esc="closeTagInput"
          />
          <button class="tag-add-submit" type="submit" :title="t('sidebar.addTag')" :aria-label="t('sidebar.addTag')" @mousedown.prevent>
            <Plus :size="14" />
          </button>
        </form>
      </div>

      <div class="side-label">{{ t('sidebar.categories') }}</div>
      <div class="category-links">
        <div v-if="categoryTree.length" class="category-tree">
          <CategoryTreeNode
            v-for="node in categoryTree"
            :key="node.pathKey"
            :node="node"
            :active-category="activeCategory"
            @select-category="emit('select-category', $event)"
          />
        </div>
        <p v-else class="category-empty">{{ t('sidebar.emptyCategories') }}</p>
      </div>
    </nav>

    <div class="sidebar-footer">
      <div class="profile-row">
        <input ref="avatarInput" class="visually-hidden" type="file" accept="image/*" @change="uploadAvatar" />
        <button
          class="profile-avatar-button"
          type="button"
          :title="t('sidebar.uploadAvatar')"
          :aria-label="t('sidebar.uploadAvatar')"
          @click="avatarInput?.click()"
        >
          <img v-if="settings.profileAvatar" class="profile-avatar" :src="settings.profileAvatar" alt="Profile avatar" />
          <span v-else class="profile-avatar profile-avatar-fallback profile-avatar-logo" aria-hidden="true">
            <LucuroLogo :size="32" />
          </span>
          <span class="profile-avatar-overlay" aria-hidden="true">
            <Camera :size="14" />
          </span>
        </button>
        <div class="profile-copy">
          <input
            v-model="profileName"
            class="profile-name-input"
            type="text"
            :aria-label="t('sidebar.profileName')"
            :title="t('sidebar.profileName')"
            @blur="saveProfileName"
            @keydown.enter.prevent="$event.target.blur()"
          />
          <div class="profile-meta">{{ t('sidebar.profileMeta', { categories: categories.length, clicks: totalClicks }) }}</div>
        </div>
      </div>
    </div>
  </div>
</template>
