/** Pixel minima keep text and questions readable; below this, slides yield their space. */
export function discussionWidth(width: number, ratio: number): number {
  return Math.min(Math.max(300, width - 370), Math.max(300, width * Math.max(0.15, Math.min(0.85, ratio))))
}

export function focusLayout(width: number, ratio: number, hasPdf: boolean, hasQna: boolean, qnaRatio = 0.29) {
  const divider = hasPdf ? 10 : 0
  const qnaWidth = hasQna ? discussionWidth(width, qnaRatio) : 0
  const available = Math.max(0, width - qnaWidth - (hasQna ? 10 : 0))
  const showPdf = hasPdf && available >= 680
  const pdfWidth = showPdf
    ? Math.min(available - divider - 360, Math.max(300, (available - divider) * ratio))
    : 0
  return { qnaWidth, pdfWidth, showPdf }
}
