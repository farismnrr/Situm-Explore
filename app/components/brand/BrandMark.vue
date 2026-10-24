<template>
  <span
    class="brand-mark"
    :class="sizeClass"
    role="img"
    aria-label="Senar"
  >
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M21 3 3 10.5l7.5 3L14 21 21 3Z" />
    </svg>
  </span>
</template>

<script setup lang="ts">
const props = withDefaults(defineProps<{ size?: 'sm' | 'md' }>(), {
  size: 'md'
})

const sizeClass = computed(() => props.size === 'sm' ? 'brand-mark--sm' : 'brand-mark--md')
</script>

<style scoped>
.brand-mark {
  display: inline-grid;
  flex: 0 0 auto;
  place-items: center;
  border-radius: var(--explore-radius-sm);
  background: #111827;
  color: #fff;
  box-shadow: var(--explore-shadow-xs);
}

.brand-mark--md {
  width: 30px;
  height: 30px;
}

.brand-mark--sm {
  width: 30px;
  height: 30px;
}

svg {
  width: 17px;
  height: 17px;
  fill: currentColor;
}

</style>
