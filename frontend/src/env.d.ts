/// <reference types="vite/client" />

/**
 * Environment variables exposed to the Vite-powered frontend.
 */
interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string
}

/**
 * Augmented ImportMeta that includes the typed env object.
 */
interface ImportMeta {
  readonly env: ImportMetaEnv
}

