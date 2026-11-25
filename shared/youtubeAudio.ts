export type YoutubeAudioPhase = 'missing' | 'downloading' | 'converting' | 'ready' | 'error'
export interface YoutubeAudioItem {
  videoId: string
  phase: YoutubeAudioPhase
  progress?: number
  durationSeconds?: number
  error?: string
}
export interface YoutubeAudioApi {
  status(): Promise<YoutubeAudioItem[]>
  download(videoId: string): Promise<YoutubeAudioItem[]>
  cancel(videoId: string): Promise<YoutubeAudioItem[]>
  playbackUrl(videoId: string): Promise<string>
}
