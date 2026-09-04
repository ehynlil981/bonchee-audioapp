import { useState } from 'react'
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  LockKeyhole,
  Mail,
  UserPlus,
  X,
} from 'lucide-react'
import { supabase } from '../lib/supabase'

export default function AuthModal({ onClose }) {
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })

  const resetMessage = () => setMessage({ type: '', text: '' })

  const submit = async (event) => {
    event.preventDefault()
    resetMessage()

    if (!email.trim()) return setMessage({ type: 'error', text: 'Vui lòng nhập email.' })
    if (!password) return setMessage({ type: 'error', text: 'Vui lòng nhập mật khẩu.' })
    if (mode === 'register' && password.length < 6) {
      return setMessage({ type: 'error', text: 'Mật khẩu phải có ít nhất 6 ký tự.' })
    }
    if (mode === 'register' && password !== confirm) {
      return setMessage({ type: 'error', text: 'Mật khẩu xác nhận không khớp.' })
    }

    setLoading(true)

    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        })
        if (error) throw error
        onClose?.()
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
        })
        if (error) throw error

        if (data.session) {
          onClose?.()
        } else {
          setMessage({
            type: 'success',
            text: 'Đăng ký thành công. Hãy kiểm tra email để xác nhận tài khoản.',
          })
          setPassword('')
          setConfirm('')
        }
      }
    } catch (error) {
      const text = error?.message || ''
      setMessage({
        type: 'error',
        text:
          text === 'Invalid login credentials'
            ? 'Email hoặc mật khẩu không chính xác.'
            : text === 'User already registered'
              ? 'Email này đã được đăng ký.'
              : text || 'Không thể hoàn tất thao tác.',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && !loading && onClose?.()}>
      <div className="auth-modal">
        <button className="modal-close" onClick={onClose} disabled={loading} aria-label="Đóng">
          <X size={18} />
        </button>

        <div className="auth-visual">
          <div className="auth-orbit orbit-one" />
          <div className="auth-orbit orbit-two" />
          <div className="auth-icon"><LockKeyhole size={22} /></div>
          <span>TRUYEN AUDIO</span>
        </div>

        <div className="auth-body">
          <div className="eyebrow">MEMBER ACCESS</div>
          <h2>{mode === 'login' ? 'Chào mừng trở lại.' : 'Tạo không gian đọc.'}</h2>
          <p className="auth-subtitle">
            {mode === 'login'
              ? 'Đăng nhập để tiếp tục thư viện và lịch sử đọc của bạn.'
              : 'Tạo tài khoản để lưu truyện yêu thích và tiến trình đọc.'}
          </p>

          <div className="auth-switch">
            <button className={mode === 'login' ? 'active' : ''} onClick={() => { setMode('login'); resetMessage() }}>
              Đăng nhập
            </button>
            <button className={mode === 'register' ? 'active' : ''} onClick={() => { setMode('register'); resetMessage() }}>
              Đăng ký
            </button>
          </div>

          {message.text && (
            <div className={`form-message ${message.type}`}>
              {message.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
              <span>{message.text}</span>
            </div>
          )}

          <form onSubmit={submit} className="auth-form">
            <label>
              <span>Email</span>
              <div className="field-with-icon">
                <Mail size={17} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                />
              </div>
            </label>

            <label>
              <span>Mật khẩu</span>
              <div className="field-with-icon">
                <LockKeyhole size={17} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Tối thiểu 6 ký tự"
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                />
                <button type="button" className="field-action" onClick={() => setShowPassword((v) => !v)}>
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </label>

            {mode === 'register' && (
              <label>
                <span>Xác nhận mật khẩu</span>
                <div className="field-with-icon">
                  <LockKeyhole size={17} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="Nhập lại mật khẩu"
                    autoComplete="new-password"
                  />
                </div>
              </label>
            )}

            <button className="primary-button auth-submit" disabled={loading}>
              {loading ? <Loader2 className="spin" size={18} /> : mode === 'login' ? <LockKeyhole size={18} /> : <UserPlus size={18} />}
              {loading ? 'Đang xử lý…' : mode === 'login' ? 'Đăng nhập' : 'Tạo tài khoản'}
            </button>
          </form>

          <div className="auth-footnote">Xác thực tài khoản được xử lý bởi Supabase Auth.</div>
        </div>
      </div>
    </div>
  )
}

