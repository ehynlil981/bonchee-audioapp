export function formatDuration(seconds) {
  const value = Math.max(0, Number(seconds) || 0)
  const hours = Math.floor(value / 3600)
  const minutes = Math.floor((value % 3600) / 60)
  const secs = value % 60

  if (hours) return `${hours}h ${String(minutes).padStart(2, '0')}m`
  return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}

export function truncate(text = '', length = 150) {
  const value = String(text)
  return value.length > length ? `${value.slice(0, length).trim()}…` : value
}
