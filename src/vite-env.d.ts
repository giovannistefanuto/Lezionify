/// <reference types="vite/client" />

import type { ArchiveApi } from '../shared/archive'

declare global {
  interface Window {
    appUpdate?: import('../shared/appUpdate').AppUpdateApi
    archive: ArchiveApi
  }
}

export {}
