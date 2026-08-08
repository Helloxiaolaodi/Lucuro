<script setup>
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import Sortable from 'sortablejs'

const props = defineProps({
  handle: { type: String, default: '' },
  itemClass: { type: String, default: '' },
  disabled: { type: Boolean, default: false }
})

const emit = defineEmits(['reorder'])
const root = ref(null)
let sortable = null

onMounted(async () => {
  await nextTick()
  if (!root.value || props.disabled) return
  createSortable()
})

watch(() => props.disabled, async (disabled) => {
  await nextTick()
  if (disabled) {
    sortable?.destroy()
    sortable = null
    return
  }
  if (!sortable && root.value) createSortable()
})

function createSortable() {
  if (!root.value) return
  sortable = Sortable.create(root.value, {
    animation: 180,
    ghostClass: 'sortable-ghost',
    chosenClass: 'sortable-chosen',
    handle: props.handle || undefined,
    draggable: `.${props.itemClass || 'sortable-item'}`,
    onEnd(event) {
      const oldIndex = event.oldIndex
      const newIndex = event.newIndex
      if (oldIndex !== undefined && newIndex !== undefined && oldIndex !== newIndex) {
        emit('reorder', oldIndex, newIndex)
      }
    }
  })
}

onBeforeUnmount(() => {
  sortable?.destroy()
  sortable = null
})
</script>

<template>
  <div ref="root" class="sortable-list">
    <slot />
  </div>
</template>
