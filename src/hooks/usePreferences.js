import { useEffect, useState } from 'react'

const KEYS = {
  textMotion: 'truyen-audio-text-motion',
}

export function usePreferences() {
  const [textMotion, setTextMotion] = useState(() => {
    const saved = localStorage.getItem(KEYS.textMotion)
    return saved === null ? true : saved === 'true'
  })

  useEffect(() => {
    localStorage.setItem(KEYS.textMotion, String(textMotion))
    document.documentElement.dataset.textMotion = textMotion ? 'on' : 'off'
  }, [textMotion])

  return { textMotion, setTextMotion }
}
