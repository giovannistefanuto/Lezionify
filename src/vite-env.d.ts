/// <reference types="vite/client" />

import type { ArchiveApi } from '../shared/archive'

declare global {
  interface Window {
    collections: import('../shared/collections').CollectionsApi
    appUpdate?: import('../shared/appUpdate').AppUpdateApi
    archive: ArchiveApi
  }
}

export {}
