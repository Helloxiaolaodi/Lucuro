<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { X } from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'

const props = defineProps({
  src: {
    type: String,
    required: true
  }
})

const emit = defineEmits(['confirm', 'close'])
const { t } = useI18n()

const stageRef = ref(null)
const display = ref({ width: 0, height: 0 })
const box = ref({ x: 0, y: 0, width: 0, height: 0 })
const sourceImage = ref(null)
let drag = null

const handles = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w']

function screenAspectRatio() {
  return window.innerWidth / window.innerHeight
}

const stageStyle = computed(() => {
  if (!display.value.width || !display.value.height) return {}
  return {
    width: `${display.value.width}px`,
    height: `${display.value.height}px`
  }
})

const boxStyle = computed(() => ({
  left: `${box.value.x}px`,
  top: `${box.value.y}px`,
  width: `${box.value.width}px`,
  height: `${box.value.height}px`
}))

function loadImage() {
  const image = new Image()
  image.onload = () => {
    const maxWidth = 760
    const maxHeight = 480
    const scale = Math.min(1, maxWidth / image.naturalWidth, maxHeight / image.naturalHeight)
    display.value = {
      width: Math.max(1, Math.round(image.naturalWidth * scale)),
      height: Math.max(1, Math.round(image.naturalHeight * scale))
    }
    const fitted = fitToDisplay(display.value.width, display.value.height)
    box.value = {
      x: Math.round((display.value.width - fitted.width) / 2),
      y: Math.round((display.value.height - fitted.height) / 2),
      width: Math.round(fitted.width),
      height: Math.round(fitted.height)
    }
    sourceImage.value = image
  }
  image.onerror = () => emit('close')
  image.src = props.src
}

function eventPoint(event) {
  const rect = stageRef.value.getBoundingClientRect()
  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top
  }
}

function clampBox(next) {
  const minSize = 24
  let width = Math.max(minSize, next.width)
  let height = Math.max(minSize, next.height)
  const fitted = fitToDisplay(width, height)
  width = fitted.width
  height = fitted.height
  const x = Math.max(0, Math.min(next.x, display.value.width - width))
  const y = Math.max(0, Math.min(next.y, display.value.height - height))
  return { x, y, width, height }
}

function fitToDisplay(width, height) {
  const ratio = width / height
  if (ratio > screenAspectRatio()) {
    height = width / screenAspectRatio()
  } else {
    width = height * screenAspectRatio()
  }
  const scale = Math.min(
    1,
    display.value.width / width,
    display.value.height / height
  )
  const fittedWidth = Math.max(24, width * scale)
  const fittedHeight = Math.max(24, height * scale)
  const fitScale = Math.min(
    1,
    display.value.width / fittedWidth,
    display.value.height / fittedHeight
  )
  return {
    width: fittedWidth * fitScale,
    height: fittedHeight * fitScale
  }
}

function resizeFromHandle(handle, origin, dx, dy) {
  let x = origin.x
  let y = origin.y
  let width = origin.width
  let height = origin.height

  if (handle === 'e' || handle === 'w') {
    width = handle === 'e' ? origin.width + dx : origin.width - dx
    height = width / screenAspectRatio()
    if (handle === 'w') x = origin.x + origin.width - width
  } else if (handle === 's' || handle === 'n') {
    height = handle === 's' ? origin.height + dy : origin.height - dy
    width = height * screenAspectRatio()
    if (handle === 'n') y = origin.y + origin.height - height
  } else {
    const useWidth = Math.abs(dx) >= Math.abs(dy)
    if (useWidth) {
      width = handle.includes('e') ? origin.width + dx : origin.width - dx
      height = width / screenAspectRatio()
    } else {
      height = handle.includes('s') ? origin.height + dy : origin.height - dy
      width = height * screenAspectRatio()
    }
    if (handle.includes('w')) x = origin.x + origin.width - width
    if (handle.includes('n')) y = origin.y + origin.height - height
  }
  return clampBox({ x, y, width, height })
}

function startMove(event) {
  event.preventDefault()
  const point = eventPoint(event)
  drag = {
    type: 'move',
    startX: point.x,
    startY: point.y,
    origin: { ...box.value }
  }
}

function startResize(event, handle) {
  event.preventDefault()
  event.stopPropagation()
  const point = eventPoint(event)
  drag = {
    type: 'resize',
    handle,
    startX: point.x,
    startY: point.y,
    origin: { ...box.value }
  }
}

function onPointerMove(event) {
  if (!drag) return
  const point = eventPoint(event)
  if (drag.type === 'move') {
    box.value = clampBox({
      x: drag.origin.x + point.x - drag.startX,
      y: drag.origin.y + point.y - drag.startY,
      width: drag.origin.width,
      height: drag.origin.height
    })
    return
  }

  const { handle, origin } = drag
  const dx = point.x - drag.startX
  const dy = point.y - drag.startY
  box.value = resizeFromHandle(handle, origin, dx, dy)
}

function onPointerUp() {
  drag = null
}

function confirmCrop() {
  const image = sourceImage.value
  if (!image || !display.value.width || !display.value.height) return
  const scaleX = image.naturalWidth / display.value.width
  const scaleY = image.naturalHeight / display.value.height
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(box.value.width * scaleX))
  canvas.height = Math.max(1, Math.round(box.value.height * scaleY))
  const context = canvas.getContext('2d')
  if (!context) return
  context.drawImage(
    image,
    Math.max(0, box.value.x * scaleX),
    Math.max(0, box.value.y * scaleY),
    canvas.width,
    canvas.height,
    0,
    0,
    canvas.width,
    canvas.height
  )
  emit('confirm', canvas.toDataURL('image/png'))
}

onMounted(() => {
  loadImage()
  window.addEventListener('pointermove', onPointerMove)
  window.addEventListener('pointerup', onPointerUp)
})

onBeforeUnmount(() => {
  window.removeEventListener('pointermove', onPointerMove)
  window.removeEventListener('pointerup', onPointerUp)
})
</script>

<template>
  <div class="crop-modal-backdrop" @mousedown.self="emit('close')">
    <div class="crop-modal" role="dialog" aria-modal="true" :aria-label="t('settings.cropBackground')">
      <div class="crop-modal-header">
        <h2>{{ t('settings.cropBackground') }}</h2>
        <button class="modal-close" type="button" :aria-label="t('settings.close')" @click="emit('close')">
          <X :size="18" />
        </button>
      </div>

      <p class="crop-help">{{ t('settings.cropBackgroundHelp') }}</p>

      <div ref="stageRef" class="crop-stage" :style="stageStyle">
        <img class="crop-image" :src="src" alt="" draggable="false" />
        <div v-if="display.width" class="crop-box" :style="boxStyle" @pointerdown="startMove">
          <span
            v-for="handle in handles"
            :key="handle"
            class="crop-handle"
            :class="`crop-handle-${handle}`"
            @pointerdown.stop="startResize($event, handle)"
          ></span>
        </div>
      </div>

      <div class="crop-actions">
        <button class="btn" type="button" @click="emit('close')">{{ t('settings.cancel') }}</button>
        <button class="btn btn-primary" type="button" @click="confirmCrop">{{ t('settings.confirmCrop') }}</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.crop-modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 120;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 18px;
  background: rgba(15, 23, 42, 0.58);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
}

.crop-modal {
  width: min(820px, 100%);
  max-height: 94vh;
  overflow: auto;
  padding: 20px 24px 24px;
  border: 1px solid var(--border);
  border-radius: 18px;
  background: var(--surface-strong);
  color: var(--text);
  box-shadow: 0 28px 80px rgba(0, 0, 0, 0.32);
}

.crop-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 8px;
}

.crop-modal-header h2 {
  margin: 0;
  font-size: 19px;
  letter-spacing: -0.02em;
}

.crop-help {
  margin: 0 0 16px;
  color: var(--muted);
  font-size: 13px;
  line-height: 1.6;
}

.crop-stage {
  position: relative;
  max-width: 100%;
  margin: 0 auto;
  overflow: hidden;
  border: 1px solid var(--border-strong);
  border-radius: 14px;
  background: #050a14;
  touch-action: none;
  user-select: none;
}

.crop-image {
  display: block;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.crop-box {
  position: absolute;
  z-index: 2;
  border: 2px solid rgba(255, 255, 255, 0.94);
  border-radius: 4px;
  box-shadow: 0 0 0 9999px rgba(2, 6, 23, 0.46);
  cursor: move;
}

.crop-handle {
  position: absolute;
  width: 14px;
  height: 14px;
  border: 2px solid #fff;
  border-radius: 4px;
  background: var(--accent);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.34);
}

.crop-handle-nw {
  top: -7px;
  left: -7px;
  cursor: nwse-resize;
}

.crop-handle-n {
  top: -7px;
  left: calc(50% - 7px);
  cursor: ns-resize;
}

.crop-handle-ne {
  top: -7px;
  right: -7px;
  cursor: nesw-resize;
}

.crop-handle-e {
  top: calc(50% - 7px);
  right: -7px;
  cursor: ew-resize;
}

.crop-handle-se {
  right: -7px;
  bottom: -7px;
  cursor: nwse-resize;
}

.crop-handle-s {
  bottom: -7px;
  left: calc(50% - 7px);
  cursor: ns-resize;
}

.crop-handle-sw {
  bottom: -7px;
  left: -7px;
  cursor: nesw-resize;
}

.crop-handle-w {
  top: calc(50% - 7px);
  left: -7px;
  cursor: ew-resize;
}

.crop-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 18px;
}

.crop-actions .btn-primary,
.crop-actions .btn-primary:hover,
.crop-actions .btn-primary:focus-visible {
  background: var(--accent) !important;
  border-color: var(--accent) !important;
  color: #fff !important;
}
</style>
