<template>
  <span class="tag"><slot /></span>
</template>

<style scoped>
.tag {
  display: inline-block;
  padding: 3px 10px;
  border-radius: 999px;
  background: var(--color-surface-alt);
  color: var(--color-text-muted);
  font-family: var(--font-label);
  font-size: 12px;
  font-weight: 500;
}
</style>
