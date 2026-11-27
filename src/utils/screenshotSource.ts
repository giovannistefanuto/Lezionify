import type { ScreenshotRect } from '../../shared/focusScreenshot'

type PdfCrop = (rect: ScreenshotRect) => Promise<Uint8Array | null>
const sources = new Map<HTMLElement, PdfCrop>()
export function registerScreenshotSource(element: HTMLElement, crop: PdfCrop): () => void {
  sources.set(element, crop)
  return () => { sources.delete(element) }
}
/** Only use a source crop if the entire selection lies inside one visible page. */
export async function screenshotSource(rect: ScreenshotRect): Promise<Uint8Array | null> {
  for (const [element, crop] of sources) {
    const bounds = element.getBoundingClientRect()
    if (bounds.width && bounds.height && rect.x >= bounds.left && rect.y >= bounds.top &&
      rect.x + rect.width <= bounds.right && rect.y + rect.height <= bounds.bottom) return crop(rect)
  }
  return null
}
