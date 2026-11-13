export const IPAD_PNG_MAX_BYTES = 16 * 1024 * 1024
export const IPAD_MAX_PIXELS = 24_000_000
export interface IpadExportRequest { key: string; png: Uint8Array; manual?: boolean }
export interface IpadExportStatus { enabled: boolean; count: number; bytes: number }
export interface IpadExportResult { duplicate: boolean; bytes: number }
export function validateIpadExport(value: unknown): IpadExportRequest {
  const input = value as Partial<IpadExportRequest> | null
  if (!input || (input.manual !== undefined && typeof input.manual !== 'boolean') || typeof input.key !== 'string' || !/^[a-f0-9]{64}$/.test(input.key) ||
    !(input.png instanceof Uint8Array) || input.png.length < 24 || input.png.length > IPAD_PNG_MAX_BYTES ||
    ![137, 80, 78, 71, 13, 10, 26, 10].every((byte, index) => input.png![index] === byte))
    throw new Error('Immagine non valida per iPad.')
  const view = new DataView(input.png.buffer, input.png.byteOffset, input.png.byteLength)
  const width = view.getUint32(16), height = view.getUint32(20)
  if (!width || !height || width > 12000 || height > 12000 || width * height > IPAD_MAX_PIXELS)
    throw new Error('Schema troppo grande per esportarlo come immagine.')
  return input as IpadExportRequest
}
