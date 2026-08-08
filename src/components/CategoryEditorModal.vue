<script setup>
import { ref } from 'vue'
import { X } from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'

const props = defineProps({
  category: { type: Object, default: null }
})

const emit = defineEmits(['save', 'close'])
const { t } = useI18n()

const form = ref({
  title: props.category?.title || '',
  subtitle: props.category?.subtitle || ''
})

function submit() {
  emit('save', {
    title: form.value.title.trim(),
    subtitle: form.value.subtitle.trim()
  })
}
</script>

<template>
  <div class="modal-backdrop" @mousedown.self="emit('close')">
    <div class="modal-panel small" role="dialog" aria-modal="true" aria-label="Category editor">
      <div class="modal-header">
        <h2>{{ category ? t('category.edit') : t('category.add') }}</h2>
        <button class="modal-close" type="button" :aria-label="t('category.close')" @click="emit('close')">
          <X :size="18" />
        </button>
      </div>

      <div class="settings-body">
        <div class="form-grid">
          <div class="field full">
            <label for="category-title">{{ t('category.name') }}</label>
            <input id="category-title" v-model="form.title" class="input" :placeholder="t('category.name')" />
          </div>
          <div class="field full">
            <label for="category-subtitle">{{ t('category.subtitle') }}</label>
            <input id="category-subtitle" v-model="form.subtitle" class="input" :placeholder="t('category.subtitle')" />
          </div>
        </div>

        <div class="modal-actions">
          <button class="btn" type="button" @click="emit('close')">{{ t('category.cancel') }}</button>
          <button class="btn btn-primary" type="button" @click="submit">{{ t('category.save') }}</button>
        </div>
      </div>
    </div>
  </div>
</template>
