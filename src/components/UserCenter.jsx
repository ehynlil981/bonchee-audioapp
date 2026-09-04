import { useEffect, useState } from 'react'
import { BarChart3, Check, LogOut, MonitorCog, Palette, Save, ShieldCheck, Sparkles, UserRound, X } from 'lucide-react'
import { supabase } from '../lib/supabase'

const themes = [
  { id: 'dark', name: 'Midnight', caption: 'Tối, sâu và điện ảnh' },
  { id: 'cream', name: 'Cream', caption: 'Sáng, nhẹ và sạch' },
  { id: 'sepia', name: 'Sepia', caption: 'Ấm như trang sách cũ' },
]

export default function UserCenter({
  user,
  role,
  isAdmin,
  theme,
  setTheme,
  loaderEnabled,
  onToggleLoader,
  onClose,
  onDashboard,
  onAdmin,
  onLogout,
}) {
  const [tab, setTab] = useState('profile')
  const [displayName, setDisplayName] = useState(
    user?.user_metadata?.display_name || user?.email?.split('@')[0] || '',
  )
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    setDisplayName(user?.user_metadata?.display_name || user?.email?.split('@')[0] || '')
  }, [user])

  const saveProfile = async (event) => {
    event.preventDefault()
    setSaving(true)
    setMessage('')
    const name = displayName.trim()
    const { error } = await supabase.auth.updateUser({
      data: { display_name: name || user?.email?.split('@')[0] || 'Bạn đọc' },
    })
    setSaving(false)
    setMessage(error ? error.message : 'Đã lưu hồ sơ.')
  }

  return (
    <div className="uc-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <section className="uc-modal" role="dialog" aria-modal="true" aria-label="Trung tâm người dùng">
        <button className="uc-close" onClick={onClose} aria-label="Đóng"><X size={18} /></button>

        <aside className="uc-sidebar">
          <div className="uc-brand"><Sparkles size={17} /><span>USER CENTER</span></div>
          <div className="uc-user">
            <span className="uc-avatar"><UserRound size={20} /></span>
            <strong>{displayName || 'Bạn đọc'}</strong>
            <small>{role || 'member'}</small>
          </div>

          <nav className="uc-tabs">
            <button className={tab === 'profile' ? 'active' : ''} onClick={() => setTab('profile')}>
              <UserRound size={16} /> Hồ sơ
            </button>
            <button className={tab === 'appearance' ? 'active' : ''} onClick={() => setTab('appearance')}>
              <Palette size={16} /> Giao diện
            </button>
          </nav>

          <div className="uc-sidebar-actions">
            <button onClick={onDashboard}><BarChart3 size={16} /> Dashboard</button>
            {isAdmin && <button onClick={onAdmin}><ShieldCheck size={16} /> Quản trị</button>}
          </div>

          <button className="uc-logout" onClick={onLogout}><LogOut size={16} /> Đăng xuất</button>
        </aside>

        <div className="uc-content">
          {tab === 'profile' ? (
            <div className="uc-pane">
              <div className="uc-heading">
                <div className="eyebrow">IDENTITY / 01</div>
                <h2>Hồ sơ người dùng</h2>
                <p>Chỉnh tên hiển thị và thông tin cơ bản của không gian đọc.</p>
              </div>

              <form className="uc-form" onSubmit={saveProfile}>
                <label>
                  <span>Tên hiển thị</span>
                  <input value={displayName} maxLength={40} onChange={(e) => setDisplayName(e.target.value)} placeholder="Tên bạn muốn hiển thị" />
                </label>
                <label>
                  <span>Email</span>
                  <input value={user?.email || ''} readOnly />
                </label>
                <div className="uc-readonly"><span>Vai trò</span><strong>{role || 'member'}</strong></div>
                {message && <div className={`uc-message ${message === 'Đã lưu hồ sơ.' ? 'success' : 'error'}`}>{message}</div>}
                <button className="primary-button" disabled={saving}><Save size={16} /> {saving ? 'Đang lưu…' : 'Lưu thay đổi'}</button>
              </form>
            </div>
          ) : (
            <div className="uc-pane">
              <div className="uc-heading">
                <div className="eyebrow">ATMOSPHERE / 02</div>
                <h2>Thiết lập trải nghiệm</h2>
                <p>Mọi thiết lập giao diện được giữ trong trình duyệt của bạn.</p>
              </div>

              <div className="uc-setting-block">
                <div className="uc-setting-title"><Palette size={17} /><div><strong>Chủ đề</strong><small>Chọn không khí cho trang đọc.</small></div></div>
                <div className="uc-theme-grid">
                  {themes.map((item) => (
                    <button key={item.id} className={`uc-theme-card theme-preview-${item.id} ${theme === item.id ? 'active' : ''}`} onClick={() => setTheme(item.id)}>
                      <span className="uc-theme-dot">{theme === item.id && <Check size={13} />}</span>
                      <strong>{item.name}</strong>
                      <small>{item.caption}</small>
                    </button>
                  ))}
                </div>
              </div>

              <div className="uc-setting-row">
                <div><MonitorCog size={18} /><div><strong>Loader cinematic</strong><small>Hiệu ứng mở trang lần đầu.</small></div></div>
                <button className={`uc-switch ${loaderEnabled ? 'on' : ''}`} onClick={onToggleLoader} aria-label="Bật tắt loader"><span /></button>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

