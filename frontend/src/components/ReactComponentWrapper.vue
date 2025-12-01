<script setup lang="ts" generic="TProps extends Record<string, unknown> = Record<string, unknown>">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { createElement } from 'react'
import { createRoot } from 'react-dom/client'
import type { ComponentType } from 'react'
import type { Root } from 'react-dom/client'

type ReactComponentWrapperProps = {
  component: ComponentType<TProps>
  componentProps?: TProps
}

const props = defineProps<ReactComponentWrapperProps>()

const containerRef = ref<HTMLDivElement | null>(null)
let reactRoot: Root | null = null

// если ты с видоса, то я тут унифицировал враппер, чтобы работал на любой компонент
// если знаешь как лучше пиши в комментарии
const renderReactTree = () => {
  if (!reactRoot) {
    return
  }

  const reactElement = createElement(props.component, props.componentProps ?? {})
  reactRoot.render(reactElement)
}

onMounted(() => {
  if (!containerRef.value) {
    return
  }

  reactRoot = createRoot(containerRef.value)
  renderReactTree()
})

watch(
  () => [props.component, props.componentProps],
  renderReactTree,
  { deep: true }
)

onBeforeUnmount(() => {
  if (!reactRoot) {
    return
  }

  reactRoot.unmount()
  reactRoot = null
})
</script>

<template>
  <div ref="containerRef"></div>
</template>
