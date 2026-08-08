<script setup>
import { ref } from 'vue'
import { Upload, X } from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'
import { readFileAsDataUrl } from '../utils/storage'

const props = defineProps({
  card: { type: Object, default: null },
  tags: { type: Array, default: () => [] }
})

const emit = defineEmits(['save', 'close'])
const { t } = useI18n()

const form = ref({
  title: props.card?.title || '',
  url: props.card?.url || '',
  iconSource: props.card?.icon?.source || (props.card?.icon?.src ? 'image' : 'auto'),
  iconUrl: props.card?.icon?.src || '',
  iconName: props.card?.icon?.name || '',
  description: props.card?.description || '',
  tags: (props.card?.tags || []).join(', '),
  isVpnRequired: Boolean(props.card?.isVpnRequired),
  openMethod: props.card?.openMethod || 1
})

function iconPayload() {
  const source = form.value.iconSource
  if (source === 'iconify' && form.value.iconName.trim()) {
    return { source: 'iconify', name: form.value.iconName.trim() }
  }
  if (source === 'image' && form.value.iconUrl.trim()) {
    return { source: 'image', src: form.value.iconUrl.trim() }
  }
  return { source: 'auto' }
}

async function uploadIcon(event) {
  const file = event.target.files?.[0]
  if (!file) return
  try {
    form.value.iconUrl = await readFileAsDataUrl(file)
    form.value.iconSource = 'image'
  } catch {
    form.value.iconUrl = ''
  }
  event.target.value = ''
}

function submit() {
  emit('save', {
    title: form.value.title.trim() || 'Untitled',
    url: form.value.url.trim(),
    icon: iconPayload(),
    description: form.value.description.trim(),
    tags: form.value.tags
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean),
    isVpnRequired: form.value.isVpnRequired,
    openMethod: Number(form.value.openMethod) || 1
  })
}
</script>

<template>
  <div class="modal-backdrop" @mousedown.self="emit('close')">
    <div class="modal-panel small" role="dialog" aria-modal="true" aria-label="Card editor">
      <div class="modal-header">
        <h2>{{ card ? t('card.edit') : t('card.add') }}</h2>
        <button class="modal-close" type="button" :aria-label="t('card.close')" @click="emit('close')">
          <X :size="18" />
        </button>
      </div>

      <div class="settings-body">
        <div class="form-grid">
          <div class="field">
            <label for="card-title">{{ t('card.name') }}</label>
            <input id="card-title" v-model="form.title" class="input" :placeholder="t('card.name')" />
          </div>
          <div class="field">
            <label for="card-url">{{ t('card.url') }}</label>
            <input id="card-url" v-model="form.url" class="input" type="url" placeholder="https://example.com" />
          </div>

          <div class="field full">
            <label for="card-icon">{{ t('card.iconUrl') }}</label>
            <select id="card-icon-source" v-model="form.iconSource" class="select">
              <option value="auto">{{ t('card.iconAuto') }}</option>
              <option value="image">{{ t('card.iconImage') }}</option>
              <option value="iconify">{{ t('card.iconIconify') }}</option>
            </select>
          </div>

          <div v-if="form.iconSource === 'image'" class="field full">
            <label for="card-icon">{{ t('card.iconUrl') }}</label>
            <div class="icon-input-row">
              <input id="card-icon" v-model="form.iconUrl" class="input" :placeholder="t('card.iconUrlPlaceholder')" />
              <label class="btn">
                <Upload :size="15" />
                {{ t('card.upload') }}
                <input class="visually-hidden" type="file" accept="image/*" @change="uploadIcon" />
              </label>
              <img v-if="form.iconUrl" class="icon-preview" :src="form.iconUrl" alt="Card icon preview" />
            </div>
          </div>

          <div v-if="form.iconSource === 'iconify'" class="field full">
            <label for="card-iconify">{{ t('card.iconifyName') }}</label>
            <input id="card-iconify" v-model="form.iconName" class="input" :placeholder="t('card.iconifyPlaceholder')" />
            <span v-if="form.iconName" class="iconify-preview">
              <img :src="`https://api.iconify.design/${form.iconName.trim()}.svg`" alt="Iconify preview" />
              {{ form.iconName }}
            </span>
          </div>

          <div class="field full">
            <label for="card-desc">{{ t('card.description') }}</label>
            <textarea id="card-desc" v-model="form.description" class="textarea" :placeholder="t('card.description')"></textarea>
          </div>

          <div class="field full">
            <label for="card-tags">{{ t('card.tags') }}</label>
            <input id="card-tags" v-model="form.tags" class="input" :placeholder="t('card.tagsPlaceholder')" />
          </div>

          <div class="field">
            <label for="card-open">{{ t('card.openMethod') }}</label>
            <select id="card-open" v-model.number="form.openMethod" class="select">
              <option :value="1">{{ t('card.newTab') }}</option>
              <option :value="2">{{ t('card.currentTab') }}</option>
            </select>
          </div>

          <label class="checkbox-field">
            <input v-model="form.isVpnRequired" type="checkbox" />
            <span>{{ t('card.vpn') }}</span>
          </label>
        </div>

        <div class="modal-actions">
          <button class="btn" type="button" @click="emit('close')">{{ t('card.cancel') }}</button>
          <button class="btn btn-primary" type="button" @click="submit">{{ t('card.save') }}</button>
        </div>
      </div>
    </div>
  </div>
</template>
