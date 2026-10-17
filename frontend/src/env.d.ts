/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Prefix for backend requests; "/api" in dev, proxied by Vite to the backend. */
  readonly VITE_API_BASE_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
