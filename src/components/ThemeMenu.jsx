import { Check, Moon, Palette, Sun } from 'lucide-react'
import { useState } from 'react'

const themes = [
  { id: 'dark', label: 'Obsidian', icon: Moon },
  { id: 'cream', label: 'Cream', icon: Sun },
  { id: 'sepia', label: 'Sepia', icon: Palette },
]

export default function ThemeMenu({ theme, setTheme }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="menu-anchor">
      <button className="icon-button" onClick={() => setOpen((v) => !v)} aria-label="Đổi giao diện">
        <Palette size={17} />
      </button>

      {open && (
        <div className="popover theme-popover">
          <div className="popover-title">Giao diện đọc</div>
          {themes.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              className={`theme-option ${theme === id ? 'active' : ''}`}
              onClick={() => {
                setTheme(id)
                setOpen(false)
              }}
            >
              <Icon size={16} />
              <span>{label}</span>
              {theme === id && <Check size={15} />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
