import { useEffect, useState } from 'react'

const STORAGE_KEY = 'truyen-audio-theme'

export function useTheme() {
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    return ['dark', 'cream', 'sepia'].includes(saved) ? saved : 'dark'
  })

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    localStorage.setItem(STORAGE_KEY, theme)
  }, [theme])

  return { theme, setTheme }
}
