<script setup>
import { computed, ref, watch } from 'vue'
import { ChevronDown, ChevronRight } from 'lucide-vue-next'

const props = defineProps({
  node: {
    type: Object,
    required: true
  },
  activeCategory: {
    type: Number,
    default: null
  }
})

const emit = defineEmits(['select-category'])

const expanded = ref(false)
const hasChildren = computed(() => Boolean(props.node.children?.length))
const canSelect = computed(() => props.node.categoryIndex !== null)
const isActive = computed(() => props.activeCategory !== null && props.node.categoryIndex === props.activeCategory)
const containsActive = computed(() =>
  props.activeCategory !== null && props.node.descendantIndexes?.includes(props.activeCategory)
)

watch(containsActive, (value) => {
  if (value) expanded.value = true
}, { immediate: true })

function toggle() {
  if (hasChildren.value) expanded.value = !expanded.value
}

function handleLabelClick() {
  if (canSelect.value) {
    emit('select-category', props.node.categoryIndex)
    return
  }
  toggle()
}
</script>

<template>
  <div class="tree-node" :class="{ active: isActive, descendant: containsActive }">
    <div class="tree-row">
      <button
        v-if="hasChildren"
        class="tree-toggle"
        type="button"
        :aria-label="expanded ? 'Collapse folder' : 'Expand folder'"
        @click="toggle"
      >
        <ChevronRight v-if="!expanded" :size="15" />
        <ChevronDown v-else :size="15" />
      </button>
      <span v-else class="tree-toggle tree-toggle-spacer" aria-hidden="true"></span>

      <button class="tree-label" type="button" @click="handleLabelClick">
        <span class="tree-name">{{ node.name }}</span>
        <span class="badge tree-count">{{ node.count }}</span>
      </button>
    </div>

    <div class="tree-children-wrap" :class="{ open: expanded }">
      <div class="tree-children-inner">
        <div v-if="hasChildren" class="tree-children">
          <CategoryTreeNode
            v-for="child in node.children"
            :key="child.pathKey"
            :node="child"
            :active-category="activeCategory"
            @select-category="emit('select-category', $event)"
          />
        </div>
      </div>
    </div>
  </div>
</template>
