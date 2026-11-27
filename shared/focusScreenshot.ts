export interface ScreenshotRect { x: number; y: number; width: number; height: number }
export interface FocusScreenshot { token: string; dataUrl: string; width: number; height: number }
/** Normalize reverse drags and reject empty or out-of-image selections. */
export function screenshotRect(value: ScreenshotRect, width: number, height: number): ScreenshotRect {
  if (!value || ![value.x, value.y, value.width, value.height].every(Number.isFinite)) throw new Error('Selezione screenshot non valida.')
  const left = Math.floor(Math.min(value.x, value.x + value.width)), top = Math.floor(Math.min(value.y, value.y + value.height))
  const right = Math.ceil(Math.max(value.x, value.x + value.width)), bottom = Math.ceil(Math.max(value.y, value.y + value.height))
  if (left < 0 || top < 0 || right > width || bottom > height || right - left < 2 || bottom - top < 2) throw new Error('Seleziona un rettangolo dentro lo schermo.')
  return { x: left, y: top, width: right - left, height: bottom - top }
}
