import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { needsCharging, type BatteryStatus } from '../../shared/battery'
import './batteryIndicator.css'

export function BatteryIndicator() {
  const [status, setStatus] = useState<BatteryStatus | null>(null)
  const [target, setTarget] = useState<Element>(
    document.fullscreenElement ?? document.body
  )
  useEffect(() => {
    let cancelled = false,
      pending = false
    const refresh = async () => {
      if (pending) return
      pending = true
      try {
        const next = await window.archive.getBatteryStatus?.()
        if (!cancelled) setStatus(next ?? null)
      } catch {
        if (!cancelled) setStatus(null)
      } finally {
        pending = false
      }
    }
    const fullscreen = () => {
      setTarget(document.fullscreenElement ?? document.body)
      void refresh()
    }
    void refresh()
    const timer = setInterval(() => void refresh(), 30000)
    document.addEventListener('fullscreenchange', fullscreen)
    window.addEventListener('focus', refresh)
    return () => {
      cancelled = true
      clearInterval(timer)
      document.removeEventListener('fullscreenchange', fullscreen)
      window.removeEventListener('focus', refresh)
    }
  }, [])
  if (!needsCharging(status)) return null
  const label = `Batteria al ${status!.percent}%. Collega il caricatore.`
  return createPortal(
    <div
      className="battery-charge-indicator"
      role="status"
      aria-label={label}
      title={label}
    >
      <span aria-hidden="true">🪫</span>
      <span className="battery-charge-tooltip">{label}</span>
    </div>,
    target
  )
}
