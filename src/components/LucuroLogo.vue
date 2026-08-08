<script setup>
defineProps({
  size: {
    type: Number,
    default: 40
  }
})
</script>

<template>
  <span
    class="lucuro-logo"
    role="img"
    aria-label="Lucuro Glass Sinan"
    :style="{ width: `${size}px`, height: `${size}px` }"
  >
    <svg :viewBox="`0 0 ${size} ${size}`" :width="size" :height="size" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="lucuro-base" x1="8" y1="6" x2="56" y2="58" gradientUnits="userSpaceOnUse">
          <stop stop-color="#273b63" />
          <stop offset="0.52" stop-color="#17263f" />
          <stop offset="1" stop-color="#0d1626" />
        </linearGradient>
        <linearGradient id="lucuro-needle" x1="18" y1="14" x2="48" y2="50" gradientUnits="userSpaceOnUse">
          <stop stop-color="#e86a4b" />
          <stop offset="0.48" stop-color="#b23a30" />
          <stop offset="1" stop-color="#8e2b26" />
        </linearGradient>
        <radialGradient id="lucuro-glass" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(18 16) rotate(42) scale(42)">
          <stop stop-color="#ffffff" stop-opacity="0.32" />
          <stop offset="1" stop-color="#ffffff" stop-opacity="0" />
        </radialGradient>
      </defs>

      <rect x="4" y="4" :width="size - 8" :height="size - 8" rx="14" fill="url(#lucuro-base)" />
      <rect x="4.5" y="4.5" :width="size - 9" :height="size - 9" rx="13.5" stroke="#ffffff" stroke-opacity="0.2" />

      <circle cx="32" cy="32" r="23" stroke="#ffffff" stroke-opacity="0.18" stroke-width="1.2" />
      <circle cx="32" cy="32" r="15" stroke="#ffffff" stroke-opacity="0.12" stroke-width="1" />

      <g stroke="#ffffff" stroke-opacity="0.3" stroke-width="1">
        <path d="M32 9 L32 15" />
        <path d="M32 49 L32 55" />
        <path d="M9 32 L15 32" />
        <path d="M49 32 L55 32" />
        <path d="M15.7 15.7 L19.9 19.9" />
        <path d="M44.1 44.1 L48.3 48.3" />
        <path d="M48.3 15.7 L44.1 19.9" />
        <path d="M19.9 44.1 L15.7 48.3" />
      </g>

      <g fill="#ffffff" fill-opacity="0.42">
        <circle cx="32" cy="8" r="1.6" />
        <circle cx="32" cy="56" r="1.6" />
        <circle cx="8" cy="32" r="1.6" />
        <circle cx="56" cy="32" r="1.6" />
        <circle cx="15" cy="15" r="1.2" />
        <circle cx="49" cy="49" r="1.2" />
        <circle cx="49" cy="15" r="1.2" />
        <circle cx="15" cy="49" r="1.2" />
      </g>

      <path
        d="M32 11 L36.8 27.2 L53 32 L36.8 36.8 L32 53 L27.2 36.8 L11 32 L27.2 27.2 Z"
        fill="url(#lucuro-needle)"
        stroke="#ffffff"
        stroke-opacity="0.42"
        stroke-width="1"
      />
      <path
        d="M32 20 L34.7 29.3 L44 32 L34.7 34.7 L32 44 L29.3 34.7 L20 32 L29.3 29.3 Z"
        fill="#ffffff"
        fill-opacity="0.22"
      />
      <circle cx="32" cy="32" r="4.6" fill="#ffffff" fill-opacity="0.92" />
      <circle cx="32" cy="32" r="2" fill="#a8402c" />

      <rect x="4" y="4" :width="size - 8" :height="size - 8" rx="14" fill="url(#lucuro-glass)" />
    </svg>
  </span>
</template>

<style scoped>
.lucuro-logo {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  border-radius: 14px;
  filter: drop-shadow(0 8px 16px rgba(23, 38, 63, 0.28));
  transition: transform 0.45s cubic-bezier(0.16, 1, 0.3, 1), filter 0.3s ease;
}

.lucuro-logo:hover {
  transform: rotate(14deg) scale(1.04);
  filter: drop-shadow(0 10px 20px rgba(178, 58, 47, 0.28));
}

.lucuro-logo svg {
  display: block;
}
</style>
