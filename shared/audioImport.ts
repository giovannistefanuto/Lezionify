export interface AudioImportFile { id: string; name: string; courseCode: string | null; recordedAt: string }
export interface AudioImportSelection { token: string; files: AudioImportFile[] }
export interface AudioImportMetadata { id: string; courseCode: string | null; recordedAt: string }
