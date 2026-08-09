<script setup>
import { ref } from 'vue'
import { X } from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'

const props = defineProps({
  card: { type: Object, default: null },
  tags: { type: Array, default: () => [] }
})

const emit = defineEmits(['save', 'close'])
const { t } = useI18n()

const form = ref({
  title: props.card?.title || '',
  url: props.card?.url || '',
  description: props.card?.description || '',
  tags: (props.card?.tags || []).join(', '),
  isVpnRequired: Boolean(props.card?.isVpnRequired)
})

function submit() {
  emit('save', {
    title: form.value.title.trim() || 'Untitled',
    url: form.value.url.trim(),
    icon: { source: 'auto' },
    description: form.value.description.trim(),
    tags: form.value.tags
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean),
    isVpnRequired: form.value.isVpnRequired
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
            <label for="card-desc">{{ t('card.description') }}</label>
            <textarea id="card-desc" v-model="form.description" class="textarea" :placeholder="t('card.description')"></textarea>
          </div>

          <div class="field full">
            <label for="card-tags">{{ t('card.tags') }}</label>
            <input id="card-tags" v-model="form.tags" class="input" :placeholder="t('card.tagsPlaceholder')" />
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
