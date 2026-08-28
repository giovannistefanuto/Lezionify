/// <reference types="vite/client" />

import type { ArchiveApi } from '../shared/archive'

declare global {
  interface Window {
    archive: ArchiveApi
  }
}

export {}
