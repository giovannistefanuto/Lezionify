import { nativeImage, type WebContents, type NativeImage } from 'electron'
import { randomUUID } from 'node:crypto'
import { stat, writeFile, rename, unlink } from 'node:fs/promises'
import { join } from 'node:path'
import { screenshotRect, type FocusScreenshot, type ScreenshotRect } from '../../shared/focusScreenshot'
import { validateIpadExport } from '../../shared/ipadExport'

/** Frozen window capture stays in memory until saved, cancelled, or replaced. */
export class FocusScreenshotService {
  private capture: { token: string; image: NativeImage; owner: number } | null = null
  constructor(private readonly destination: string) {}
  async begin(sender: WebContents): Promise<FocusScreenshot> {
    this.capture = null
    const image = nativeImage.createFromBuffer((await sender.capturePage()).toPNG())
    if (image.isEmpty()) throw new Error('Screenshot non disponibile. Riprova.')
    const token = randomUUID(), size = image.getSize()
    this.capture = { token, image, owner: sender.id }
    return { token, dataUrl: image.toDataURL(), ...size }
  }
  cancel(sender: WebContents, token: string): void {
    if (this.capture?.token === token && this.capture.owner === sender.id) this.capture = null
  }
  async save(sender: WebContents, token: string, rectangle: ScreenshotRect, enhanced?: Uint8Array): Promise<void> {
    const capture = this.capture
    if (!capture || capture.token !== token || capture.owner !== sender.id) throw new Error('Screenshot scaduto. Acquisisci di nuovo lo schermo.')
    const size = capture.image.getSize()
    const rect = screenshotRect(rectangle, size.width, size.height)
    const png = enhanced ? validateIpadExport({ key: '0'.repeat(64), png: enhanced, manual: true }).png : capture.image.crop(rect).toPNG()
    if (nativeImage.createFromBuffer(Buffer.from(png)).isEmpty()) throw new Error('Screenshot non decodificabile. Acquisisci di nuovo lo schermo.')
    const name = `lezionify-screenshot-${randomUUID()}.png`
    const temporary = join(this.destination, `${name}.tmp`)
    try {
      if (!(await stat(this.destination)).isDirectory()) throw new Error()
      await writeFile(temporary, png, { flag: 'wx' })
      await rename(temporary, join(this.destination, name))
    } catch {
      await unlink(temporary).catch(() => {})
      throw new Error('Screenshot non salvato. Controlla cartella Foto di iCloud, spazio e permessi; puoi riprovare.')
    }
    if (this.capture === capture) this.capture = null
  }
}
