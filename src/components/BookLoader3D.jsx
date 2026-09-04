import React, { useEffect, useMemo, useState } from 'react'
import './BookLoader3D.css'

/**
 * BookLoader3D — full-screen lofi anime "study at night" loader.
 *
 * Timeline:
 *  1. mount        -> CSS entrance animation tự chạy (fade + rise + light bloom)
 *  2. `duration` ms -> chuyển sang phase "exit": các "cửa giấy" (shoji) trượt
 *     vào giữa khép lại kèm một luồng sáng bùng lên ở khe cửa, đồng thời cả
 *     cảnh zoom nhẹ + mờ dần — đây là hiệu ứng "ấn tượng" khi loader kết thúc.
 *  3. sau EXIT_MS   -> gọi onFinish() để App.jsx gỡ loader, đúng lúc màn hình
 *     đã bị che kín bởi ánh sáng nên việc chuyển sang UI thật không bị giật.
 */

const EXIT_MS = 1200

function seededShuffleValue(seed) {
  const x = Math.sin(seed * 999.7) * 43758.5453
  return x - Math.floor(x)
}

export default function BookLoader3D({
  text = 'Study Vibes...',
  subtitle = '深夜の勉強 · Anime Lofi',
  duration = 2800,
  onFinish,
}) {
  const [isExiting, setIsExiting] = useState(false)

  useEffect(() => {
    const exitTimer = setTimeout(() => setIsExiting(true), Math.max(400, duration))
    return () => clearTimeout(exitTimer)
  }, [duration])

  useEffect(() => {
    if (!isExiting) return undefined
    if (typeof onFinish !== 'function') return undefined
    const finishTimer = setTimeout(onFinish, EXIT_MS)
    return () => clearTimeout(finishTimer)
  }, [isExiting, onFinish])

  // ═══════════════════════════════════════════════════════════════
  // 1. Stars – nhiều hơn, với màu sắc và kích thước đa dạng
  // ═══════════════════════════════════════════════════════════════
  const stars = useMemo(
    () =>
      Array.from({ length: 60 }).map((_, i) => {
        const r1 = seededShuffleValue(i + 1)
        const r2 = seededShuffleValue(i + 51)
        const r3 = seededShuffleValue(i + 101)
        const size = 1.2 + r3 * 2.6
        const hue = Math.floor(r1 * 360)
        return {
          id: i,
          top: `${(r1 * 68).toFixed(1)}%`,
          left: `${(r2 * 100).toFixed(1)}%`,
          size,
          delay: `${(r1 * 5).toFixed(2)}s`,
          duration: `${2.0 + r2 * 3.0}s`,
          color: `hsl(${hue}, 70%, 85%)`,
          glow: `hsl(${hue}, 80%, 75%)`,
        }
      }),
    [],
  )

  // ═══════════════════════════════════════════════════════════════
  // 2. Dust particles – nhiều hơn, với màu pastel
  // ═══════════════════════════════════════════════════════════════
  const dust = useMemo(
    () =>
      Array.from({ length: 24 }).map((_, i) => {
        const r1 = seededShuffleValue(i + 200)
        const r2 = seededShuffleValue(i + 260)
        const hue = [340, 160, 280, 200][i % 4]
        return {
          id: i,
          left: `${(r1 * 100).toFixed(1)}%`,
          bottom: `${(r2 * 60 + 10).toFixed(1)}%`,
          delay: `${(r1 * 8).toFixed(2)}s`,
          duration: `${5.0 + r2 * 6.0}s`,
          size: 2.5 + r2 * 4,
          color: `hsla(${hue}, 70%, 80%, 0.5)`,
        }
      }),
    [],
  )

  // ═══════════════════════════════════════════════════════════════
  // 3. Buildings – chi tiết hơn với cửa sổ sáng
  // ═══════════════════════════════════════════════════════════════
  const buildings = useMemo(
    () =>
      Array.from({ length: 30 }).map((_, i) => {
        const r1 = seededShuffleValue(i + 300)
        const r2 = seededShuffleValue(i + 340)
        const height = 50 + r1 * 220
        const width = 28 + r2 * 26
        const count = Math.floor(5 + r1 * 12)
        const litWindows = Array.from({ length: count }).map((__, w) => {
          const rw = seededShuffleValue(i * 13 + w)
          const rw2 = seededShuffleValue(i * 29 + w)
          return {
            key: w,
            top: `${(rw * 80 + 8).toFixed(1)}%`,
            left: `${(rw2 * 78 + 6).toFixed(1)}%`,
            lit: rw > 0.35,
            warm: rw2 > 0.5,
          }
        })
        return { id: i, height, width, litWindows }
      }),
    [],
  )

  return (
    <div className={`bl3d-root ${isExiting ? 'bl3d-exit' : ''}`} role="status" aria-live="polite">
      {/* ================= BACKGROUND: bầu trời đêm thành phố ================= */}
      <div className="bl3d-sky">
        <div className="bl3d-moon" />
        <div className="bl3d-stars">
          {stars.map((s) => (
            <span
              key={s.id}
              className="bl3d-star"
              style={{
                top: s.top,
                left: s.left,
                width: s.size,
                height: s.size,
                animationDelay: s.delay,
                animationDuration: s.duration,
                backgroundColor: s.color,
                boxShadow: `0 0 ${s.size * 1.5}px ${s.glow}`,
              }}
            />
          ))}
        </div>

        <div className="bl3d-skyline">
          {buildings.map((b) => (
            <div
              key={b.id}
              className="bl3d-building"
              style={{ height: `${b.height}px`, width: `${b.width}px` }}
            >
              {b.litWindows.map((w) =>
                w.lit ? (
                  <span
                    key={w.key}
                    className={`bl3d-window-light ${w.warm ? 'is-warm' : 'is-cool'}`}
                    style={{ top: w.top, left: w.left }}
                  />
                ) : null,
              )}
            </div>
          ))}
        </div>

        <div className="bl3d-glass-shine" />
        <div className="bl3d-vignette" />
      </div>

      {/* ================= Kệ sách + chậu cây góc trái ================= */}
      <div className="bl3d-shelf">
        <div className="bl3d-shelf-row">
          {['#f472b6', '#facc15', '#38bdf8', '#a78bfa', '#f87171', '#34d399'].map((c, i) => (
            <span key={i} className="bl3d-book-spine" style={{ background: c, height: `${58 + (i % 3) * 10}%` }} />
          ))}
        </div>
        <div className="bl3d-shelf-row">
          {['#38bdf8', '#f472b6', '#facc15', '#34d399', '#f87171'].map((c, i) => (
            <span key={i} className="bl3d-book-spine" style={{ background: c, height: `${50 + (i % 4) * 9}%` }} />
          ))}
        </div>
        <div className="bl3d-plant">
          <span className="bl3d-leaf leaf-1" />
          <span className="bl3d-leaf leaf-2" />
          <span className="bl3d-leaf leaf-3" />
          <span className="bl3d-pot" />
        </div>
      </div>

      {/* ================= Rèm cửa bên phải ================= */}
      <div className="bl3d-curtain" />

      {/* ================= Bụi sáng lơ lửng ================= */}
      <div className="bl3d-dust-layer">
        {dust.map((d) => (
          <span
            key={d.id}
            className="bl3d-dust"
            style={{
              left: d.left,
              bottom: d.bottom,
              animationDelay: d.delay,
              animationDuration: d.duration,
              width: d.size,
              height: d.size,
              backgroundColor: d.color,
              boxShadow: `0 0 ${d.size * 2}px ${d.color}`,
            }}
          />
        ))}
      </div>

      {/* ================= CẢNH CHÍNH: bàn học + đèn + nhân vật + mèo ================= */}
      <svg
        className="bl3d-scene-svg"
        viewBox="0 0 1000 640"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="xMidYMax meet"
      >
        <defs>
          <radialGradient id="bl3dLampLight" cx="34%" cy="4%" r="85%">
            <stop offset="0%" stopColor="#fef08a" stopOpacity="0.55" />
            <stop offset="55%" stopColor="#fef08a" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#fef08a" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="bl3dDeskGlow" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fef08a" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#7dd3fc" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="bl3dSweater" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#fbcfe8" />
            <stop offset="100%" stopColor="#f472b6" />
          </linearGradient>
          <linearGradient id="bl3dHair" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#312e81" />
            <stop offset="100%" stopColor="#1e1b4b" />
          </linearGradient>
          <radialGradient id="bl3dPhone" cx="35%" cy="30%" r="75%">
            <stop offset="0%" stopColor="#fbcfe8" />
            <stop offset="100%" stopColor="#ec4899" />
          </radialGradient>
          <filter id="bl3dDropShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="3" dy="6" stdDeviation="6" floodColor="#000" floodOpacity="0.35" />
          </filter>
          <filter id="bl3dSoftGlow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="8" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Ánh sáng đèn hắt xuống bàn */}
        <polygon points="270,120 90,560 640,560" fill="url(#bl3dLampLight)" className="bl3d-lamp-cone" />

        {/* Mặt bàn */}
        <rect x="0" y="560" width="1000" height="80" fill="#1e1b4b" opacity="0.92" />
        <rect x="0" y="560" width="1000" height="6" fill="#4338ca" opacity="0.55" />
        <ellipse cx="420" cy="588" rx="300" ry="30" fill="url(#bl3dDeskGlow)" />

        {/* Bóng đổ của các vật trên bàn */}
        <ellipse cx="280" cy="590" rx="80" ry="18" fill="#0f0a1a" opacity="0.5" filter="url(#bl3dDropShadow)" />
        <ellipse cx="680" cy="595" rx="40" ry="12" fill="#0f0a1a" opacity="0.4" />

        {/* --- Đèn bàn (khớp: chân → khớp giữa → chao đèn) --- */}
        <g className="bl3d-lamp-rig" filter="url(#bl3dDropShadow)">
          <rect x="205" y="545" width="46" height="14" rx="7" fill="#64748b" />
          <g className="bl3d-lamp-joint1">
            <path d="M228 545 L205 400" stroke="#94a3b8" strokeWidth="7" strokeLinecap="round" />
            <circle cx="205" cy="400" r="6" fill="#cbd5e1" />
            <g className="bl3d-lamp-joint2">
              <path d="M205 400 L270 260" stroke="#94a3b8" strokeWidth="7" strokeLinecap="round" />
              <circle cx="270" cy="260" r="6" fill="#cbd5e1" />
              <path d="M248 235 L308 275 L255 300 Z" fill="#38bdf8" />
              <circle cx="278" cy="268" r="12" fill="#fef08a" className="bl3d-bulb-glow" />
            </g>
          </g>
        </g>

        {/* --- Sách chồng + chậu bút + kéo --- */}
        <g className="bl3d-desk-props" filter="url(#bl3dDropShadow)">
          <rect x="60" y="575" width="90" height="14" rx="2" fill="#38bdf8" transform="rotate(-3 105 582)" />
          <rect x="66" y="562" width="80" height="14" rx="2" fill="#f472b6" transform="rotate(2 106 569)" />
          <rect x="30" y="595" width="34" height="40" rx="4" fill="#475569" />
          <line x1="36" y1="598" x2="34" y2="558" stroke="#facc15" strokeWidth="4" strokeLinecap="round" />
          <line x1="46" y1="598" x2="50" y2="552" stroke="#38bdf8" strokeWidth="4" strokeLinecap="round" />
          <line x1="56" y1="598" x2="60" y2="562" stroke="#f472b6" strokeWidth="4" strokeLinecap="round" />
        </g>

        {/* Sách đang mở + xấp giấy nơi nhân vật viết */}
        <g className="bl3d-open-book" filter="url(#bl3dDropShadow)">
          <path
            d="M 330 575 Q 400 560 470 575 Q 540 560 610 575 L 602 598 Q 535 583 470 592 Q 405 583 338 598 Z"
            fill="#fdf4ff"
            opacity="0.92"
          />
          <line x1="470" y1="570" x2="470" y2="594" stroke="#c4b5fd" strokeWidth="2" />
          <line x1="360" y1="578" x2="440" y2="575" stroke="#c4b5fd" strokeWidth="2" strokeLinecap="round" />
          <line x1="360" y1="585" x2="430" y2="582" stroke="#c4b5fd" strokeWidth="2" strokeLinecap="round" />
          <line x1="500" y1="575" x2="580" y2="578" stroke="#c4b5fd" strokeWidth="2" strokeLinecap="round" />
          <line x1="500" y1="582" x2="570" y2="585" stroke="#c4b5fd" strokeWidth="2" strokeLinecap="round" />
        </g>

        {/* Ly nước + khói */}
        <g className="bl3d-cup" filter="url(#bl3dDropShadow)">
          <rect x="650" y="548" width="30" height="34" rx="5" fill="#a7f3d0" opacity="0.85" />
          <path d="M 680 555 C 692 555, 692 574, 680 574" stroke="#a7f3d0" strokeWidth="3.5" fill="none" opacity="0.85" />
          <path d="M 658 540 Q 654 526 660 516" stroke="#e0f2fe" strokeWidth="2" fill="none" opacity="0.55" className="bl3d-steam s1" />
          <path d="M 670 540 Q 675 524 668 514" stroke="#e0f2fe" strokeWidth="2" fill="none" opacity="0.55" className="bl3d-steam s2" />
        </g>

        {/* --- Mèo đen ngồi trên bàn (khớp: tai + đuôi) --- */}
        <g className="bl3d-cat" filter="url(#bl3dDropShadow)">
          <ellipse cx="128" cy="540" rx="46" ry="34" fill="#111827" />
          <circle cx="150" cy="500" r="26" fill="#111827" />
          <g className="bl3d-cat-ear-l">
            <path d="M132 480 L122 458 L146 476 Z" fill="#111827" />
          </g>
          <g className="bl3d-cat-ear-r">
            <path d="M168 480 L182 456 L156 476 Z" fill="#111827" />
          </g>
          <ellipse cx="141" cy="502" rx="2.4" ry="3.2" fill="#fef9c3" />
          <ellipse cx="160" cy="502" rx="2.4" ry="3.2" fill="#fef9c3" />
          {/* Mắt mèo sáng */}
          <circle cx="141" cy="502" r="1.2" fill="#000" />
          <circle cx="160" cy="502" r="1.2" fill="#000" />
          <g className="bl3d-cat-tail">
            <path
              d="M 172 552 Q 210 548 216 508 Q 220 484 200 470"
              stroke="#111827"
              strokeWidth="12"
              strokeLinecap="round"
              fill="none"
            />
          </g>
        </g>

        {/* ================= NHÂN VẬT NỮ (rig nhiều khớp) ================= */}
        <g className="bl3d-girl-rig" filter="url(#bl3dDropShadow)">
          {/* Tóc sau + búi tóc */}
          <g className="bl3d-back-hair">
            <path
              d="M 640 300 Q 760 320 730 470 Q 660 460 630 380 Z"
              fill="url(#bl3dHair)"
            />
          </g>
          <g className="bl3d-hair-bun">
            <circle cx="705" cy="270" r="26" fill="url(#bl3dHair)" />
            <circle cx="705" cy="270" r="18" fill="#312e81" opacity="0.4" />
          </g>

          {/* Thân + áo (nhịp thở) */}
          <g className="bl3d-torso">
            <path
              d="M 590 420 C 630 392, 710 405, 730 470 L 742 560 L 560 560 Z"
              fill="url(#bl3dSweater)"
            />
            <path d="M 592 420 Q 612 440 632 425" stroke="#f472b6" strokeWidth="6" strokeLinecap="round" fill="none" />
            {/* cổ áo sailor */}
            <path d="M 600 424 L 632 452 L 664 424" stroke="#ffffff" strokeWidth="5" strokeLinecap="round" fill="none" opacity="0.9" />
          </g>

          {/* Đầu + tóc mái + headphone (nghiêng nhẹ theo học bài) */}
          <g className="bl3d-head-rig">
            <rect x="606" y="400" width="20" height="28" fill="#fed7aa" rx="5" />
            <path d="M 566 345 Q 552 398 598 418 Q 632 412 640 360 Q 618 328 566 345 Z" fill="#ffedd5" />
            <path d="M 570 378 Q 580 386 588 377" stroke="#78350f" strokeWidth="3" strokeLinecap="round" fill="none" />
            {/* Mắt */}
            <ellipse cx="585" cy="395" rx="4" ry="5" fill="#1e1b4b" />
            <ellipse cx="605" cy="395" rx="4" ry="5" fill="#1e1b4b" />
            {/* Má hồng */}
            <ellipse cx="574" cy="406" rx="7" ry="4" fill="#f43f5e" opacity="0.25" />
            <ellipse cx="616" cy="406" rx="7" ry="4" fill="#f43f5e" opacity="0.25" />
            {/* Miệng cười nhẹ */}
            <path d="M 588 408 Q 595 414 602 408" stroke="#78350f" strokeWidth="2" fill="none" strokeLinecap="round" />

            {/* Tóc mái */}
            <g className="bl3d-front-hair">
              <path
                d="M 556 338 Q 590 316 636 338 Q 642 376 622 396 Q 602 350 578 388 Q 562 362 556 338 Z"
                fill="url(#bl3dHair)"
              />
            </g>

            {/* Tai nghe (bám theo đầu, có nhịp nảy riêng nhẹ) */}
            <g className="bl3d-headphones">
              <path d="M 566 352 Q 600 302 640 352" stroke="#f472b6" strokeWidth="7" fill="none" strokeLinecap="round" />
              <circle cx="566" cy="366" r="17" fill="url(#bl3dPhone)" />
              <circle cx="566" cy="366" r="7" fill="#fbcfe8" opacity="0.7" />
              <circle cx="636" cy="358" r="15" fill="url(#bl3dPhone)" opacity="0.9" />
            </g>
          </g>

          {/* Tay trái tì lên bàn */}
          <g className="bl3d-arm-left">
            <path d="M 640 460 L 560 512 L 480 556" stroke="#fbcfe8" strokeWidth="26" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            <circle cx="474" cy="558" r="10" fill="#ffedd5" />
          </g>

          {/* Tay phải viết bài — 2 khớp lồng nhau: vai → khuỷu tay → cổ tay */}
          <g className="bl3d-arm-right-shoulder">
            <path d="M 600 458 L 560 500" stroke="#f472b6" strokeWidth="24" strokeLinecap="round" fill="none" />
            <g className="bl3d-arm-right-elbow">
              <path d="M 560 500 L 470 550" stroke="#f472b6" strokeWidth="22" strokeLinecap="round" fill="none" />
              <circle cx="466" cy="552" r="9" fill="#ffedd5" />
              <line x1="458" y1="558" x2="440" y2="542" stroke="#38bdf8" strokeWidth="4" strokeLinecap="round" />
            </g>
          </g>
        </g>
      </svg>

      {/* ================= Badge loading + tiêu đề ================= */}
      <div className="bl3d-badge">
        <div className="bl3d-badge-ring">
          <div className="bl3d-badge-core" />
        </div>
        <div className="bl3d-badge-copy">
          <span className="bl3d-badge-title">{text}</span>
          <span className="bl3d-badge-sub">{subtitle}</span>
        </div>
      </div>

      <div className="bl3d-progress-track">
        <div className="bl3d-progress-fill" style={{ animationDuration: `${duration}ms` }} />
      </div>

      {/* ================= Hiệu ứng kết thúc: cửa giấy (shoji) khép lại + bùng sáng ================= */}
      <div className="bl3d-shoji shoji-left" />
      <div className="bl3d-shoji shoji-right" />
      <div className="bl3d-flash" />
    </div>
  )
}