import { Eye, EyeOff, Settings2 } from 'lucide-react'

export default function SettingsButton({ enable3DLoader, onToggle3D }) {
  return (
    <button
      className={`setting-pill ${enable3DLoader ? 'active' : ''}`}
      onClick={onToggle3D}
      title="Bật/tắt animation loader 3D"
    >
      <Settings2 size={14} />
      <span>3D {enable3DLoader ? 'ON' : 'OFF'}</span>
      {enable3DLoader ? <Eye size={13} /> : <EyeOff size={13} />}
    </button>
  )
}
