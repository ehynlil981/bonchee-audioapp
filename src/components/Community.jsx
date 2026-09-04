import { useEffect, useMemo, useState } from 'react'
import { MessageCircle, Plus, ShieldCheck, Sparkles, Send, SlidersHorizontal, Trash2, Users } from 'lucide-react'
import { supabase } from '../lib/supabase'

const fallbackBlockedWords = ['đm', 'địt', 'fuck', 'shit']

export default function Community({ user, isAdmin }) {
  const [posts, setPosts] = useState([])
  const [content, setContent] = useState('')
  const [blockedWords, setBlockedWords] = useState(fallbackBlockedWords)
  const [draftWords, setDraftWords] = useState('')
  const [filter, setFilter] = useState('latest')
  const [loading, setLoading] = useState(true)
  const [posting, setPosting] = useState(false)
  const [error, setError] = useState('')
  const [showRules, setShowRules] = useState(false)

  const load = async () => {
    setLoading(true)
    const [{ data: postData, error: postError }, { data: settingData }] = await Promise.all([
      supabase.from('community_posts').select('*').order('created_at', { ascending: false }),
      supabase.from('community_settings').select('blocked_words').eq('id', 1).maybeSingle(),
    ])
    if (postError) setError(postError.message)
    setPosts(postData || [])
    const words = settingData?.blocked_words?.length ? settingData.blocked_words : fallbackBlockedWords
    setBlockedWords(words)
    setDraftWords(words.join(', '))
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const visiblePosts = useMemo(() => {
    const list = [...posts]
    if (filter === 'popular') list.sort((a, b) => Number(b.likes || 0) - Number(a.likes || 0))
    return list
  }, [posts, filter])

  const containsBlockedWord = (text) => {
    const normalized = text.toLowerCase()
    return blockedWords.some((word) => word.trim() && normalized.includes(word.trim().toLowerCase()))
  }

  const submit = async (event) => {
    event.preventDefault()
    const text = content.trim()
    if (!user) return setError('Bạn cần đăng nhập để đăng bài.')
    if (!text) return
    if (containsBlockedWord(text)) return setError('Bài viết có từ ngữ không phù hợp với quy tắc cộng đồng.')
    setPosting(true)
    setError('')

    const displayName = user.user_metadata?.display_name || user.email?.split('@')[0] || 'Bạn đọc'
    const { data, error: insertError } = await supabase.from('community_posts').insert({
      user_id: user.id,
      display_name: displayName,
      content: text.slice(0, 1200),
    }).select().single()

    setPosting(false)
    if (insertError) return setError(insertError.message)
    setPosts((current) => [data, ...current])
    setContent('')
  }

  const saveWords = async () => {
    const words = draftWords.split(',').map((w) => w.trim().toLowerCase()).filter(Boolean).slice(0, 100)
    const { error: updateError } = await supabase.from('community_settings').update({ blocked_words: words, updated_at: new Date().toISOString() }).eq('id', 1)
    if (updateError) return setError(updateError.message)
    setBlockedWords(words)
    setError('Đã cập nhật bộ lọc từ ngữ.')
  }

  const remove = async (post) => {
    const { error: deleteError } = await supabase.from('community_posts').delete().eq('id', post.id)
    if (!deleteError) setPosts((current) => current.filter((item) => item.id !== post.id))
  }

  return (
    <main className="community-page">
      <section className="community-hero">
        <div className="community-hero-copy">
          <div className="eyebrow"><Users size={13} /> THE COMMON ROOM</div>
          <h1>Nơi người đọc<br /><span>gặp nhau.</span></h1>
          <p>Hỏi, chia sẻ, tìm người cùng gu và để mỗi câu chuyện có thêm một cuộc trò chuyện phía sau.</p>
          <div className="community-rule-chips"><span>Không công kích</span><span>Không spam</span><span>Tôn trọng người đọc khác</span></div>
        </div>
        <div className="community-orb"><div /><span><Sparkles size={18} /> OPEN TO EVERY READER</span></div>
      </section>

      <section className="community-layout">
        <div className="community-main">
          <div className="community-toolbar">
            <div className="community-filters">
              <button className={filter === 'latest' ? 'active' : ''} onClick={() => setFilter('latest')}>Mới nhất</button>
              <button className={filter === 'popular' ? 'active' : ''} onClick={() => setFilter('popular')}>Nổi bật</button>
            </div>
            <button className="secondary-button" onClick={() => setShowRules((v) => !v)}><SlidersHorizontal size={15} /> Quy tắc</button>
          </div>

          {showRules && <div className="community-rules"><strong><ShieldCheck size={16} /> Bộ lọc cộng đồng</strong><span>Những từ ngữ bị chặn được quản trị viên cập nhật. Hệ thống chỉ kiểm tra trước khi đăng.</span></div>}

          <form className="community-composer" onSubmit={submit}>
            <div className="community-composer-top"><div className="eyebrow"><MessageCircle size={12} /> START A THREAD</div><span>{content.length}/1200</span></div>
            <textarea value={content} onChange={(e) => setContent(e.target.value)} maxLength={1200} rows={4} placeholder={user ? 'Bạn muốn hỏi hoặc chia sẻ điều gì?' : 'Đăng nhập để bắt đầu một bài viết…'} />
            <div className="community-composer-bottom"><small>Hỏi về truyện · Chia sẻ cảm nhận · Giao lưu</small><button className="primary-button" disabled={!user || !content.trim() || posting}><Send size={15} /> {posting ? 'Đang đăng…' : 'Đăng bài'}</button></div>
          </form>

          {error && <div className="community-error">{error}</div>}

          <div className="community-feed">
            {loading ? <div className="community-loading"><span /><span /><span /></div> : visiblePosts.length ? visiblePosts.map((post, index) => (
              <article className="community-post" style={{ '--post-delay': `${Math.min(index, 10) * 45}ms` }} key={post.id}>
                <div className="community-post-avatar">{(post.display_name || 'B')[0].toUpperCase()}</div>
                <div className="community-post-content">
                  <div className="community-post-meta"><strong>{post.display_name || 'Bạn đọc'}</strong><time>{new Date(post.created_at).toLocaleString('vi-VN')}</time></div>
                  <p>{post.content}</p>
                  <div className="community-post-actions"><span><MessageCircle size={14} /> Thảo luận</span>{(user?.id === post.user_id || isAdmin) && <button onClick={() => remove(post)}><Trash2 size={14} /> Xóa</button>}</div>
                </div>
              </article>
            )) : <div className="community-empty"><Plus size={22} /><strong>Chưa có bài viết nào</strong><span>Hãy bắt đầu cuộc trò chuyện đầu tiên.</span></div>}
          </div>
        </div>

        <aside className="community-aside">
          <div className="community-aside-card"><div className="eyebrow">COMMUNITY CODE</div><h3>Một căn phòng dễ chịu.</h3><ul><li>Tranh luận về nội dung, không công kích người.</li><li>Không spam, quảng cáo hoặc flood.</li><li>Nếu thấy nội dung xấu, báo cho admin.</li></ul></div>
          {isAdmin && <div className="community-admin-card"><div className="eyebrow"><ShieldCheck size={12} /> ADMIN CONTROL</div><h3>Danh sách từ chặn</h3><textarea value={draftWords} onChange={(e) => setDraftWords(e.target.value)} rows={5} placeholder="từ 1, từ 2, từ 3" /><button className="secondary-button" onClick={saveWords}>Cập nhật bộ lọc</button></div>}
        </aside>
      </section>
    </main>
  )
}

