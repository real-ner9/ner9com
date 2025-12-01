import { computed, ref } from 'vue'

export interface DriveBreadcrumb {
  id: string
  name: string
}

const PATH_SEPARATOR = '>'
const NAME_SEPARATOR = '::'

export function encodeBreadcrumbPath(path: DriveBreadcrumb[]) {
  return path
    .map((crumb) => `${encodeURIComponent(crumb.id)}${NAME_SEPARATOR}${encodeURIComponent(crumb.name)}`)
    .join(PATH_SEPARATOR)
}

export function decodeBreadcrumbPath(pathValue: string | undefined): DriveBreadcrumb[] {
  if (!pathValue) return []
  return pathValue
    .split(PATH_SEPARATOR)
    .map((segment) => {
      const [idEncoded, nameEncoded] = segment.split(NAME_SEPARATOR)
      return {
        id: decodeURIComponent(idEncoded ?? ''),
        name: decodeURIComponent(nameEncoded ?? '')
      }
    })
    .filter((crumb) => crumb.id)
}

export function useBreadcrumbs(initialTrail: DriveBreadcrumb[] = []) {
  const breadcrumbs = ref<DriveBreadcrumb[]>([...initialTrail])

  const canGoBack = computed(() => breadcrumbs.value.length > 1)

  function setTrail(trail: DriveBreadcrumb[]) {
    breadcrumbs.value = [...trail]
  }

  function append(crumb: DriveBreadcrumb) {
    breadcrumbs.value = [...breadcrumbs.value, crumb]
  }

  function removeLast() {
    if (breadcrumbs.value.length <= 1) return breadcrumbs.value
    breadcrumbs.value = breadcrumbs.value.slice(0, -1)
    return breadcrumbs.value
  }

  return {
    breadcrumbs,
    canGoBack,
    setTrail,
    append,
    removeLast
  }
}

