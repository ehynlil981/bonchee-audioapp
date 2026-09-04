import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Clock3,
  List,
  Minus,
  Plus,
  Link2,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import Comments from './Comments'

export default function Reader({
  story,
  chapters,
  chapter,
  loading,
  onBack,
  onChapter,
  onNavigate,
  readingTime,
  fontSize,
  setFontSize,
  user,
}) {
  const [showChapters, setShowChapters] = useState(false)

  const index = useMemo(
    () => chapters.findIndex((item) => item.id === chapter?.id),
    [chapters, chapter],
  )

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [chapter?.id])

  if (loading) {
    return (
      <main className="reader-page">
        <div className="skeleton reader-skeleton" />
      </main>
    )
  }

  if (!chapter) {
    return (
      <main className="reader-page">
        <div className="empty-state">
          <BookOpen size={34} />
          <h2>Truyện chưa có chương</h2>
          <p>Hãy quay lại thư viện hoặc thêm chương từ khu vực quản trị.</p>
          <button className="secondary-button" onClick={onBack}><ArrowLeft size={16} /> Quay lại</button>
        </div>
      </main>
    )
  }

  return (
    <main className="reader-page">
      <div className="reader-topbar">
        <button className="ghost-button" onClick={onBack}><ArrowLeft size={17} /> <span>Thư viện</span></button>
        <div className="reader-story-name"><BookOpen size={15} /> {story.ten}</div>
        <div className="reader-tools">
          <button className="icon-button compact" onClick={() => setFontSize((v) => Math.max(15, v - 1))}><Minus size={15} /></button>
          <span>{fontSize}px</span>
          <button className="icon-button compact" onClick={() => setFontSize((v) => Math.min(25, v + 1))}><Plus size={15} /></button>
          <button className={`icon-button compact ${showChapters ? 'selected' : ''}`} onClick={() => setShowChapters((v) => !v)}><List size={16} /></button>
        </div>
      </div>

      {showChapters && (
        <div className="chapter-popover">
          <div className="popover-title">Mục lục · {chapters.length} chương</div>
          <div className="chapter-list compact-list">
            {chapters.map((item) => (
              <button key={item.id} className={item.id === chapter.id ? 'current' : ''} onClick={() => { onChapter(item); setShowChapters(false) }}>
                <span>#{item.so_chuong}</span>
                <strong>{item.tieu_de || `Chương ${item.so_chuong}`}</strong>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="reader-heading">
        <div className="eyebrow">CHAPTER {String(chapter.so_chuong).padStart(2, '0')}</div>
        <h1>{chapter.tieu_de || `Chương ${chapter.so_chuong}`}</h1>
        <div className="reader-meta">
          <span><Clock3 size={14} /> {readingTime}s trong phiên đọc</span>
          <span>{index + 1} / {chapters.length}</span>
          <button
            className="reader-share"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(window.location.href)
              } catch {
                // Clipboard có thể bị chặn trong một số môi trường local.
              }
            }}
            title="Sao chép link chương"
          >
            <Link2 size={13} /> Link chương
          </button>
        </div>
      </div>

      <article className="reader-paper">
        <div className="paper-rule" />
        <div className="reader-text" style={{ fontSize: `${fontSize}px` }}>
          {chapter.noi_dung}
        </div>
        <div className="paper-end">✦ · ✦</div>
      </article>

      <Comments chapter={chapter} story={story} user={user} />

      <div className="reader-navigation">
        <button className="secondary-button" disabled={index <= 0} onClick={() => onNavigate('prev')}>
          <ArrowLeft size={17} /> Chương trước
        </button>
        <span>Đang đọc {index + 1}/{chapters.length}</span>
        <button className="primary-button" disabled={index < 0 || index >= chapters.length - 1} onClick={() => onNavigate('next')}>
          Chương sau <ArrowRight size={17} />
        </button>
      </div>
    </main>
  )
}

