import { useEffect, useRef } from 'react'
import { registerUpdatePreparation } from '../utils/updatePreparation'

/** Keep open editors reachable by the updater without saving merely on close. */
export function useUpdateSave(save: () => Promise<void>, active = true) {
  const latest = useRef(save)
  latest.current = save
  useEffect(() => {
    if (active) return registerUpdatePreparation(() => latest.current(), false)
  }, [active])
}
