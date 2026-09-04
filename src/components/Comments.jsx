import { useEffect, useState } from 'react'
import { MessageCircle, Send, Sparkles, Trash2 } from 'lucide-react'
import { supabase } from '../lib/supabase'

const placeholders = [
  'Bạn nghĩ gì về chương này?',
  'Chia sẻ cảm nhận của bạn…',
  'Một câu hỏi cho những người cùng đọc?',
]

export default function Comments({ chapter, story, user }) {
  const [comments, setComments] = useState([])
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(false)
  const [posting, setPosting] = useState(false)
  const [burst, setBurst] = useState(false)
  const [placeholderIndex, setPlaceholderIndex] = useState(0)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!chapter?.id) return
    let active = true
    const load = async () => {
      setLoading(true)
      const { data, error: loadError } = await supabase
        .from('chapter_comments')
        .select('*')
        .eq('chapter_id', chapter.id)
        .order('created_at', { ascending: true })
      if (active) {
        if (loadError) setError(loadError.message)
        else setComments(data || [])
        setLoading(false)
      }
    }
    load()
    return () => { active = false }
  }, [chapter?.id])

  useEffect(() => {
    const timer = setInterval(() => setPlaceholderIndex((v) => (v + 1) % placeholders.length), 2800)
    return () => clearInterval(timer)
  }, [])

  const submit = async (event) => {
    event.preventDefault()
    const text = content.trim()
    if (!user) {
      setError('Bạn cần đăng nhập để bình luận.')
      return
    }
    if (!text || posting) return
    setPosting(true)
    setError('')

    const displayName = user.user_metadata?.display_name || user.email?.split('@')[0] || 'Bạn đọc'
    const { data, error: insertError } = await supabase
      .from('chapter_comments')
      .insert({
        chapter_id: chapter.id,
        story_id: story?.id || null,
        user_id: user.id,
        display_name: displayName,
        content: text.slice(0, 1000),
      })
      .select()
      .single()

    setPosting(false)
    if (insertError) {
      setError(insertError.message)
      return
    }
    setComments((current) => [...current, data])
    setContent('')
    setBurst(true)
    setTimeout(() => setBurst(false), 850)
  }

  const remove = async (comment) => {
    const { error: deleteError } = await supabase.from('chapter_comments').delete().eq('id', comment.id)
    if (!deleteError) setComments((current) => current.filter((item) => item.id !== comment.id))
  }

  return (
    <section className="comments-section" id="comments">
      <div className="comments-heading">
        <div>
          <div className="eyebrow"><MessageCircle size={13} /> CHAPTER CONVERSATION</div>
          <h2>Góc bình luận <span>{comments.length}</span></h2>
          <p>Để lại một dấu chấm nhỏ trong hành trình đọc của bạn.</p>
        </div>
        <div className="comments-orbit"><Sparkles size={17} /></div>
      </div>

      <form className={`comment-composer ${burst ? 'is-posted' : ''}`} onSubmit={submit}>
        <div className="comment-input-wrap">
          <span className="comment-avatar">{user ? (user.user_metadata?.display_name || user.email || 'B')[0].toUpperCase() : '?'}</span>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            maxLength={1000}
            disabled={!user || posting}
            placeholder={user ? placeholders[placeholderIndex] : 'Đăng nhập để tham gia cuộc trò chuyện…'}
            rows={3}
          />
        </div>
        <div className="comment-composer-footer">
          <small>{content.length}/1000 · Hãy giữ cuộc trò chuyện văn minh.</small>
          <button className="primary-button" disabled={!user || !content.trim() || posting}>
            <Send size={15} /> {posting ? 'Đang gửi…' : 'Gửi bình luận'}
          </button>
        </div>
        {burst && <div className="comment-burst" aria-hidden="true">{Array.from({ length: 9 }).map((_, i) => <i key={i} style={{ '--i': i }} />)}</div>}
      </form>

      {error && <div className="comment-error">{error}</div>}

      <div className="comment-list">
        {loading ? (
          <div className="comments-loading"><span /><span /><span /></div>
        ) : comments.length ? comments.map((comment, index) => (
          <article className="comment-item" style={{ '--comment-delay': `${Math.min(index, 8) * 55}ms` }} key={comment.id}>
            <div className="comment-avatar">{(comment.display_name || 'B')[0].toUpperCase()}</div>
            <div className="comment-body">
              <div className="comment-meta"><strong>{comment.display_name || 'Bạn đọc'}</strong><time>{new Date(comment.created_at).toLocaleString('vi-VN')}</time></div>
              <p>{comment.content}</p>
            </div>
            {user?.id === comment.user_id && <button className="comment-delete" onClick={() => remove(comment)} title="Xóa bình luận"><Trash2 size={14} /></button>}
          </article>
        )) : (
          <div className="comments-empty"><MessageCircle size={22} /><strong>Chưa có bình luận</strong><span>Hãy là người mở đầu cuộc trò chuyện.</span></div>
        )}
      </div>
    </section>
  )
}

