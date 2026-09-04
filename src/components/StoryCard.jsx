import { BookOpen, Heart, Link2, Sparkles } from 'lucide-react'
import { truncate } from '../lib/format'

export default function StoryCard({ story, favorite, onFavorite, onOpen }) {
  const handleOpen = () => onOpen(story)
  const handleKeyDown = (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      handleOpen()
    }
  }
  const href = `/truyen/${story.id}`

  const handleLink = (event) => {
    event.stopPropagation()
    window.history.pushState({}, '', href)
    window.dispatchEvent(new PopStateEvent('popstate'))
  }

  return (
    <article className="story-card story-card-enhanced" onClick={handleOpen} onKeyDown={handleKeyDown} tabIndex={0} role="button">
      <div className="story-cover">
        {story.anh_bia ? (
          <img src={story.anh_bia} alt={story.ten} loading="lazy" />
        ) : (
          <div className="cover-placeholder">
            <BookOpen size={34} />
            <span>TRUYỆN</span>
          </div>
        )}
        <div className="cover-shade" />
        <div className="cover-film" />
        <button
          className={`favorite-button ${favorite ? 'active' : ''}`}
          onClick={(e) => {
            e.stopPropagation()
            onFavorite(story.id)
          }}
          aria-label={favorite ? 'Bỏ yêu thích' : 'Thêm yêu thích'}
        >
          <Heart size={17} fill={favorite ? 'currentColor' : 'none'} />
        </button>
        <button className="story-link-button" onClick={handleLink} title="Mở link truyện">
          <Link2 size={15} />
        </button>
        <div className="cover-badge"><Sparkles size={12} /> STORY EDITION</div><div className="story-hover-label">MỞ TRUYỆN <span>↗</span></div><div className="story-card-glint" />
      </div>

      <div className="story-content">
        <div className="story-kicker">{story.tac_gia || 'Tác giả chưa cập nhật'}</div>
        <h3>{story.ten}</h3>
        <p>{truncate(story.mo_ta || 'Một câu chuyện đang chờ bạn khám phá.', 120)}</p>
        <div className="story-footer">
          <span>Đọc truyện</span>
          <span className="arrow">↗</span>
        </div>
      </div>
    </article>
  )
}

