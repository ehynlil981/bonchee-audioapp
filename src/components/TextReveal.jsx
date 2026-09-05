import { useEffect, useState } from 'react'

export default function TextReveal({
  children,
  as: Tag = 'span',
  className = '',
  delay = 0,
  speed = 24,
}) {
  const text = String(children ?? '')
  const [shown, setShown] = useState(() => textMotionEnabled() ? '' : text)

  useEffect(() => {
    if (!textMotionEnabled()) {
      setShown(text)
      return undefined
    }

    setShown('')
    let index = 0
    const timer = window.setTimeout(() => {
      const interval = window.setInterval(() => {
        index += 1
        setShown(text.slice(0, index))
        if (index >= text.length) window.clearInterval(interval)
      }, speed)
    }, delay)

    return () => {
      window.clearTimeout(timer)
    }
  }, [text, delay, speed])

  return <Tag className={`text-reveal ${className}`}>{shown}</Tag>
}

function textMotionEnabled() {
  if (typeof document === 'undefined') return true
  return document.documentElement.dataset.textMotion !== 'off'
}
