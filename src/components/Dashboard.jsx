import { useMemo } from 'react'
import {
  BookCheck,
  BookOpen,
  Clock3,
  Flame,
  Headphones,
  Sparkles,
} from 'lucide-react'
import { formatDuration } from '../lib/format'

function Ring({ value, label, caption, size = 154 }) {
  const safe = Math.max(0, Math.min(100, Number(value) || 0))
  const radius = 58
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (safe / 100) * circumference

  return (
    <div className="dashboard-ring-card">
      <div className="dashboard-ring" style={{ width: size, height: size }}>
        <svg viewBox="0 0 140 140" aria-hidden="true">
          <circle className="ring-track" cx="70" cy="70" r={radius} />
          <circle
            className="ring-value"
            cx="70"
            cy="70"
            r={radius}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
          />
        </svg>
        <div className="ring-center">
          <strong>{Math.round(safe)}%</strong>
          <span>{label}</span>
        </div>
      </div>
      <div className="ring-caption">{caption}</div>
    </div>
  )
}

function StatCard({ icon: Icon, label, value, detail }) {
  return (
    <div className="dashboard-stat">
      <div className="dashboard-stat-icon"><Icon size={17} /></div>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        <small>{detail}</small>
      </div>
    </div>
  )
}

export default function Dashboard({
  user,
  stories,
  readingStats,
  onContinue,
}) {
  const stats = useMemo(() => {
    const completed = readingStats.filter((item) => item.hoan_thanh).length
    const totalSeconds = readingStats.reduce(
      (sum, item) => sum + Number(item.thoi_gian_doc || 0),
      0,
    )
    const totalChaptersRead = readingStats.reduce(
      (sum, item) => sum + Number(item.chuong_cuoi || 0),
      0,
    )
    const activeStories = readingStats.filter((item) => !item.hoan_thanh).length
    const completionRate = readingStats.length
      ? (completed / readingStats.length) * 100
      : 0

    return {
      completed,
      totalSeconds,
      totalChaptersRead,
      activeStories,
      completionRate,
    }
  }, [readingStats])

  const recent = useMemo(() => {
    return [...readingStats]
      .sort((a, b) => new Date(b.lan_doc_cuoi || 0) - new Date(a.lan_doc_cuoi || 0))
      .slice(0, 6)
      .map((item) => ({
        ...item,
        story: stories.find((story) => story.id === item.truyen_id),
      }))
      .filter((item) => item.story)
  }, [readingStats, stories])

  if (!user) {
    return (
      <main className="dashboard-page">
        <div className="dashboard-login">
          <div className="dashboard-login-icon"><BookOpen size={25} /></div>
          <div className="eyebrow">PERSONAL READING SPACE</div>
          <h1>Đăng nhập để mở dashboard</h1>
          <p>Lịch sử đọc, thời gian, tiến độ và những bộ truyện đã hoàn thành sẽ được lưu riêng cho tài khoản của bạn.</p>
        </div>
      </main>
    )
  }

  return (
    <main className="dashboard-page">
      <section className="dashboard-hero">
        <div>
          <div className="eyebrow"><Sparkles size={13} /> READING ANALYTICS</div>
          <h1>Không chỉ đọc.<br /><span>Theo dõi hành trình.</span></h1>
          <p>Những con số nhỏ biến mỗi phiên đọc thành một hành trình có dấu vết.</p>
        </div>
        <div className="dashboard-user-chip">
          <span className="avatar"><BookOpen size={15} /></span>
          <div>
            <small>READER</small>
            <strong>{user.email?.split('@')[0] || 'Member'}</strong>
          </div>
        </div>
      </section>

      <section className="dashboard-stat-grid">
        <StatCard icon={BookCheck} label="ĐÃ HOÀN THÀNH" value={stats.completed} detail="bộ truyện" />
        <StatCard icon={Clock3} label="THỜI GIAN ĐỌC" value={formatDuration(stats.totalSeconds)} detail="tổng thời gian" />
        <StatCard icon={BookOpen} label="CHƯƠNG ĐÃ ĐỌC" value={stats.totalChaptersRead} detail="mốc chương cao nhất" />
        <StatCard icon={Flame} label="ĐANG THEO DÕI" value={stats.activeStories} detail="bộ đang đọc" />
      </section>

      <section className="dashboard-grid">
        <article className="dashboard-panel dashboard-progress-panel">
          <div className="dashboard-panel-head">
            <div>
              <div className="eyebrow">OVERVIEW</div>
              <h2>Nhịp đọc của bạn</h2>
            </div>
            <Headphones size={19} />
          </div>

          <div className="dashboard-rings">
            <Ring
              value={stats.completionRate}
              label="hoàn tất"
              caption="Tỷ lệ truyện đã đọc xong"
            />
            <Ring
              value={readingStats.length ? Math.min(100, (stats.totalSeconds / 3600) * 10) : 0}
              label="thời gian"
              caption="Mỗi 1 giờ = 10% vòng theo dõi"
            />
          </div>
        </article>

        <article className="dashboard-panel">
          <div className="dashboard-panel-head">
            <div>
              <div className="eyebrow">YOUR SHELF</div>
              <h2>Đã xem & đang xem</h2>
            </div>
            <span className="dashboard-count">{readingStats.length}</span>
          </div>

          <div className="dashboard-list">
            {recent.length ? recent.map((item) => {
              const total = Math.max(1, Number(item.tong_chuong || 1))
              const progress = Math.min(100, (Number(item.chuong_cuoi || 0) / total) * 100)
              return (
                <button
                  className="dashboard-book"
                  key={item.id}
                  onClick={() => onContinue(item.story, item.chuong_cuoi)}
                >
                  <div className="dashboard-book-cover">
                    {item.story.anh_bia
                      ? <img src={item.story.anh_bia} alt="" />
                      : <BookOpen size={16} />}
                  </div>
                  <div className="dashboard-book-copy">
                    <strong>{item.story.ten}</strong>
                    <span>{item.hoan_thanh ? 'Đã hoàn thành' : `Chương ${item.chuong_cuoi}/${item.tong_chuong}`}</span>
                    <div className="dashboard-progress"><i style={{ width: `${progress}%` }} /></div>
                  </div>
                  <small>{formatDuration(item.thoi_gian_doc)}</small>
                </button>
              )
            }) : (
              <div className="dashboard-empty">
                <BookOpen size={22} />
                <span>Chưa có dữ liệu đọc. Hãy mở một bộ truyện và bắt đầu.</span>
              </div>
            )}
          </div>
        </article>
      </section>

      <section className="dashboard-note">
        <Sparkles size={16} />
        <span>Thống kê được tính từ các phiên đọc của tài khoản hiện tại; thời gian chỉ tăng khi bạn đang ở trong trình đọc.</span>
      </section>
    </main>
  )
}

