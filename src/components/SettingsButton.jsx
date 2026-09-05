import { Eye, EyeOff, Settings2 } from 'lucide-react'

export default function SettingsButton({
  enable3DLoader,
  onToggle3D,
  textMotion = true,
  onToggleTextMotion,
  onOpenSettings,
}) {
  return (
    <div className="settings-cluster">
      <button className="setting-pill" onClick={onOpenSettings} title="Mở trung tâm thiết lập">
        <Settings2 size={14} />
        <span>CONTROL</span>
      </button>
      <button className={`setting-pill ${enable3DLoader ? 'active' : ''}`} onClick={onToggle3D} title="Bật/tắt animation loader 3D">
        {enable3DLoader ? <Eye size={13} /> : <EyeOff size={13} />}
        <span>3D {enable3DLoader ? 'ON' : 'OFF'}</span>
      </button>
      <button className={`setting-pill ${textMotion ? 'active' : ''}`} onClick={onToggleTextMotion} title="Bật/tắt hiệu ứng chữ">
        <SparklesIcon />
        <span>TEXT {textMotion ? 'ON' : 'OFF'}</span>
      </button>
    </div>
  )
}

function SparklesIcon() {
  return <span aria-hidden="true" style={{ fontSize: 12 }}>✦</span>
}
