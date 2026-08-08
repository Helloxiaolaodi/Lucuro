<script setup>
import { computed, ref, watch } from 'vue'

const props = defineProps({
  card: {
    type: Object,
    required: true
  },
  size: {
    type: Number,
    default: 40
  }
})

const providers = [
  (hostname) => `https://www.google.com/s2/favicons?domain=${hostname}&sz=128`,
  (hostname) => `https://icons.duckduckgo.com/ip3/${hostname}.ico`
]

const providerIndex = ref(0)
const imageFailed = ref(false)

const domain = computed(() => {
  try {
    const url = new URL(props.card.url)
    return url.hostname
  } catch {
    return String(props.card.url || '').replace(/^https?:\/\//i, '').split('/')[0].trim()
  }
})

const iconSource = computed(() => {
  const icon = props.card.icon || {}
  if (icon.source === 'image' && icon.src) return { kind: 'image', value: icon.src }
  if (icon.source === 'iconify' && icon.name) {
    return { kind: 'image', value: `https://api.iconify.design/${encodeURIComponent(icon.name)}.svg` }
  }
  if (icon.src && icon.source !== 'auto') return { kind: 'image', value: icon.src }
  if (icon.name) return { kind: 'image', value: `https://api.iconify.design/${encodeURIComponent(icon.name)}.svg` }
  return null
})

const faviconUrl = computed(() => {
  if (!domain.value) return ''
  const provider = providers[providerIndex.value]
  return provider ? provider(domain.value) : ''
})

const displaySrc = computed(() => {
  if (iconSource.value) return iconSource.value.value
  return faviconUrl.value
})

const isAuto = computed(() => !iconSource.value)

const letter = computed(() => {
  const text = props.card.title || domain.value || '?'
  return text.trim().charAt(0).toUpperCase()
})

const backgroundColor = computed(() => {
  const colors = [
    '#0087eb', '#6366f1', '#0ea5e9', '#14b8a6', '#10b981',
    '#f59e0b', '#ef4444', '#ec4899', '#8b5cf6', '#06b6d4'
  ]
  const text = props.card.title || domain.value || props.card.url || 'lucuro'
  let hash = 0
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash * 31 + text.charCodeAt(i)) >>> 0
  }
  return colors[hash % colors.length]
})

function resetIconState() {
  providerIndex.value = 0
  imageFailed.value = false
}

function handleImageError() {
  if (iconSource.value) {
    imageFailed.value = true
    return
  }
  providerIndex.value += 1
  if (providerIndex.value >= providers.length) {
    imageFailed.value = true
  }
}

watch(() => props.card?.url, resetIconState)
watch(() => props.card?.icon?.src, resetIconState)
watch(() => props.card?.icon?.name, resetIconState)
</script>

<template>
  <span
    class="site-icon"
    :class="{ 'card-icon': true, 'letter-icon': imageFailed }"
    :style="imageFailed ? { backgroundColor, width: `${size}px`, height: `${size}px` } : {}"
  >
    <img
      v-if="!imageFailed && displaySrc"
      class="site-icon-img"
      :src="displaySrc"
      :width="size"
      :height="size"
      alt=""
      loading="lazy"
      referrerpolicy="no-referrer"
      @error="handleImageError"
    />
    <span v-if="imageFailed || !displaySrc">{{ letter }}</span>
  </span>
</template>

<style scoped>
.site-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  overflow: hidden;
  border-radius: 9px;
}

.site-icon-img {
  display: block;
  object-fit: contain;
  padding: 5px;
  border-radius: 9px;
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid rgba(0, 0, 0, 0.06);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
}

.letter-icon {
  color: #fff;
  font-weight: 800;
  font-size: 16px;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.12);
}
</style>
