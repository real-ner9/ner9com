/// <reference types="vite/client" />

/**
 * Environment variables exposed to the Vite-powered frontend.
 */
interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string
  readonly VITE_DEFAULT_DRIVE_FOLDER?: string
  readonly VITE_DEFAULT_DRIVE_FOLDER_LABEL?: string
}

/**
 * Augmented ImportMeta that includes the typed env object.
 */
interface ImportMeta {
  readonly env: ImportMetaEnv
}

