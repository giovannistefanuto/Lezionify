/**
 * geminiPolicy.ts
 * Costanti, limiti e configurazione centrale per la gestione delle richieste Gemini.
 */

export type RequestPurpose =
  | 'overview'
  | 'sections'
  | 'translation'
  | 'studyset'
  | 'qna'
  | 'asr_transcribe'
  | 'asr_fallback'
  | 'key_verification'
  | 'course_logistics'
  | 'file_operation'

export type RequestPriority = 'interactive' | 'background'

export interface GeminiPolicyConfig {
  maxTotalAttempts: number
  maxAttemptsPerKey: number
  backoffBaseMs: number
  backoffCapMs: number
  logicalDeadlineMs: number
  rpmLimit: number
  concurrencyLimit: number
}

export const DEFAULT_GEMINI_POLICY: GeminiPolicyConfig = {
  maxTotalAttempts: 6,
  maxAttemptsPerKey: 3,
  backoffBaseMs: 2_000,
  backoffCapMs: 30_000,
  logicalDeadlineMs: 600_000, // 10 minuti per la singola richiesta logica
  rpmLimit: 5,               // 5 RPM per finestra mobile di 60s
  concurrencyLimit: 1        // 1 sola richiesta fisica attiva globalmente
}

export const TIMEOUTS_BY_PURPOSE: Record<RequestPurpose, number> = {
  overview: 180_000,
  sections: 180_000,
  translation: 180_000,
  studyset: 180_000,
  qna: 180_000,
  asr_transcribe: 300_000,
  asr_fallback: 300_000,
  key_verification: 60_000,
  course_logistics: 120_000,
  file_operation: 120_000
}

export const QNA_TIMEOUTS = {
  firstChunkTimeoutMs: 20_000,
  chunkInactivityTimeoutMs: 45_000,
  totalAttemptTimeoutMs: 180_000
}

export const CLEANUP_BUDGET_MS = 15_000
