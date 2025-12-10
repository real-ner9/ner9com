import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { fetchFolderContents, type DriveFile } from '@/services/drive.service'

export const useDrivePickerStore = defineStore('drivePicker', () => {
  const rootFolderId = import.meta.env.VITE_DEFAULT_DRIVE_FOLDER ?? ''
  const rootFolderLabel = import.meta.env.VITE_DEFAULT_DRIVE_FOLDER_LABEL ?? 'Library'

  const files = ref<DriveFile[]>([])
  const isLoading = ref(false)
  const errorMessage = ref<string | null>(null)
  const searchQuery = ref('')
  const currentFolderId = ref('')
  const currentFolderName = ref(rootFolderLabel)

  const filteredFiles = computed(() => {
    const query = searchQuery.value.trim().toLowerCase()
    if (!query) return files.value
    return files.value.filter((file) => file.name.toLowerCase().includes(query))
  })

  async function loadFolder(folderId: string, folderName: string) {
    if (!folderId) {
      errorMessage.value = 'Укажите VITE_DEFAULT_DRIVE_FOLDER в .env'
      return
    }

    isLoading.value = true
    errorMessage.value = null

    try {
      const data = await fetchFolderContents(folderId)
      files.value = data.files
      currentFolderId.value = folderId
      currentFolderName.value = folderName
      searchQuery.value = ''
    } catch (error) {
      files.value = []
      if (error instanceof Error) {
        errorMessage.value = error.message
      } else {
        errorMessage.value = 'Не удалось загрузить папку'
      }
    } finally {
      isLoading.value = false
    }
  }

  return {
    rootFolderId,
    rootFolderLabel,
    files,
    isLoading,
    errorMessage,
    searchQuery,
    currentFolderId,
    currentFolderName,
    filteredFiles,
    loadFolder
  }
})

