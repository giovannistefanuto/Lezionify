export interface RepetitionSession {
  id: string
  audioName: string
  referenceName: string
  createdAt: string
  status: 'transcribing' | 'evaluating' | 'completed' | 'paused' | 'failed'
  message: string
  percent: number
}

export interface RepetitionState {
  referenceName: string | null
  busy: boolean
  activeId: string | null
  sessions: RepetitionSession[]
}

export interface RepetitionDocument {
  session: RepetitionSession
  transcript: string
  reference: string
  assessment: string
}

export interface RepetitionApi {
  repetitionState: () => Promise<RepetitionState>
  selectRepetitionReference: () => Promise<boolean>
  startRepetition: () => Promise<string>
  resumeRepetition: (id: string) => Promise<string>
  stopRepetition: () => Promise<void>
  readRepetition: (id: string) => Promise<RepetitionDocument>
}

export const REPETITION_HEADINGS = [
  'Cosa hai capito bene',
  'Difficoltà che hai superato',
  'Cosa devi rivedere'
] as const
