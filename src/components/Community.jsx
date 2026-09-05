import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Camera, Heart, ImagePlus, MessageCircle, MoreHorizontal, Reply, Send,
  ShieldAlert, Sparkles, Trash2, X
} from 'lucide-react'
import { supabase } from '../lib/supabase'

const MAX_IMAGE_SIZE = 5 * 1024 * 1024
const MAX_IMAGES = 4
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const fallbackBlockedWords = ['đm', 'địt', 'fuck', 'shit']

function displayName(user) {
  return user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'Bạn đọc'
}

function validateImage(file) {
  if (!file) return 'Không tìm thấy ảnh.'
  if (!ALLOWED_TYPES.includes(file.type)) return 'Chỉ nhận JPG, PNG, WEBP hoặc GIF.'
  if (file.size > MAX_IMAGE_SIZE) return 'Ảnh phải nhỏ hơn 5MB.'
  return ''
}

function avatarLetter(name) {
  return (name || 'B').trim().slice(0, 1).toUpperCase()
}

function formatTime(value) {
  return new Date(value).toLocaleString('vi-VN', {
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
  })
}

export default function Community({ user, isAdmin }) {
  const [posts, setPosts] = useState([])
  const [comments, setComments] = useState([])
  const [content, setContent] = useState('')
  const [commentDrafts, setCommentDrafts] = useState({})
  const [replyTo, setReplyTo] = useState({})
  const [postImages, setPostImages] = useState([])
  const [commentImages, setCommentImages] = useState({})
  const [liked, setLiked] = useState(() => new Set())
  const [sort, setSort] = useState('latest')
  const [loading, setLoading] = useState(true)
  const [posting, setPosting] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef(null)

  const load = async () => {
    setLoading(true)
    setError('')
    const [postResult, commentResult] = await Promise.all([
      supabase.from('community_posts').select('*').order('created_at', { ascending: false }),
      supabase.from('community_comments').select('*').order('created_at', { ascending: true }),
    ])
    if (postResult.error) setError(postResult.error.message)
    if (commentResult.error && !String(commentResult.error.message).includes('community_comments')) {
      setError(commentResult.error.message)
    }
    setPosts(postResult.data || [])
    setComments(commentResult.data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const sortedPosts = useMemo(() => {
    const list = [...posts]
    if (sort === 'popular') list.sort((a, b) => Number(b.likes || 0) - Number(a.likes || 0))
    if (sort === 'active') list.sort((a, b) => {
      const ac = comments.filter((c) => c.post_id === a.id).length
      const bc = comments.filter((c) => c.post_id === b.id).length
      return bc - ac
    })
    return list
  }, [posts, comments, sort])

  const commentsFor = (postId) => comments.filter((item) => item.post_id === postId)

  const uploadImages = async (files, ownerType) => {
    const chosen = Array.from(files || [])
    if (chosen.length > MAX_IMAGES) throw new Error(`Tối đa ${MAX_IMAGES} ảnh.`)
    for (const file of chosen) {
      const validation = validateImage(file)
      if (validation) throw new Error(validation)
    }

    const urls = []
    for (const file of chosen) {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
      const path = `${user.id}/${ownerType}/${crypto.randomUUID()}-${safeName}`
      const { error: uploadError } = await supabase.storage.from('community-media').upload(path, file, {
        contentType: file.type,
        upsert: false,
      })
      if (uploadError) throw uploadError
      const { data } = supabase.storage.from('community-media').getPublicUrl(path)
      urls.push({ url: data.publicUrl, path })
    }
    return urls
  }

  const choosePostImages = async (event) => {
    try {
      const files = Array.from(event.target.files || [])
      for (const file of files) {
        const validation = validateImage(file)
        if (validation) throw new Error(validation)
      }
      if (files.length > MAX_IMAGES) throw new Error(`Tối đa ${MAX_IMAGES} ảnh.`)
      setPostImages(files)
      setError('')
    } catch (e) {
      setPostImages([])
      setError(e.message)
    } finally {
      event.target.value = ''
    }
  }

  const containsBlockedWord = (text) => {
    const normalized = text.toLowerCase()
    return fallbackBlockedWords.some((word) => normalized.includes(word))
  }

  const submitPost = async (event) => {
    event.preventDefault()
    if (!user) return setError('Bạn cần đăng nhập để đăng bài.')
    const text = content.trim()
    if (!text && !postImages.length) return
    if (containsBlockedWord(text)) return setError('Nội dung có từ bị chặn.')
    if (posting) return

    setPosting(true)
    setError('')
    try {
      const { data: post, error: insertError } = await supabase
        .from('community_posts')
        .insert({
          user_id: user.id,
          display_name: displayName(user),
          content: text.slice(0, 5000),
          moderation_status: 'pending',
        })
        .select()
        .single()
      if (insertError) throw insertError

      if (postImages.length) {
        const uploaded = await uploadImages(postImages, `post-${post.id}`)
        const { error: imageError } = await supabase.from('community_post_images').insert(
          uploaded.map((item, index) => ({
            post_id: post.id,
            image_url: item.url,
            storage_path: item.path,
            sort_order: index,
          })),
        )
        if (imageError) throw imageError
      }

      setContent('')
      setPostImages([])
      await load()
    } catch (e) {
      setError(e.message || 'Không thể đăng bài.')
    } finally {
      setPosting(false)
    }
  }

  const submitComment = async (postId) => {
    if (!user) return setError('Bạn cần đăng nhập để bình luận.')
    const text = (commentDrafts[postId] || '').trim()
    const images = commentImages[postId] || []
    if (!text && !images.length) return
    if (containsBlockedWord(text)) return setError('Bình luận có từ bị chặn.')

    try {
      const parentId = replyTo[postId] || null
      const { data: comment, error: insertError } = await supabase
        .from('community_comments')
        .insert({
          post_id: postId,
          parent_id: parentId,
          user_id: user.id,
          display_name: displayName(user),
          content: text.slice(0, 2000),
          moderation_status: 'pending',
        })
        .select()
        .single()
      if (insertError) throw insertError

      if (images.length) {
        const uploaded = await uploadImages(images, `comment-${comment.id}`)
        const { error: imageError } = await supabase.from('community_comment_images').insert(
          uploaded.map((item, index) => ({
            comment_id: comment.id,
            image_url: item.url,
            storage_path: item.path,
            sort_order: index,
          })),
        )
        if (imageError) throw imageError
      }

      setCommentDrafts((current) => ({ ...current, [postId]: '' }))
      setCommentImages((current) => ({ ...current, [postId]: [] }))
      setReplyTo((current) => ({ ...current, [postId]: null }))
      await load()
    } catch (e) {
      setError(e.message || 'Không thể gửi bình luận.')
    }
  }

  const removePost = async (post) => {
    if (!user || (user.id !== post.user_id && !isAdmin)) return
    const { error: deleteError } = await supabase.from('community_posts').delete().eq('id', post.id)
    if (deleteError) setError(deleteError.message)
    else setPosts((current) => current.filter((item) => item.id !== post.id))
  }

  const removeComment = async (comment) => {
    if (!user || (user.id !== comment.user_id && !isAdmin)) return
    const { error: deleteError } = await supabase.from('community_comments').delete().eq('id', comment.id)
    if (deleteError) setError(deleteError.message)
    else setComments((current) => current.filter((item) => item.id !== comment.id))
  }

  const toggleLike = async (post) => {
    if (!user) return setError('Bạn cần đăng nhập để thích bài viết.')
    const hasLiked = liked.has(post.id)
    const next = new Set(liked)
    hasLiked ? next.delete(post.id) : next.add(post.id)
    setLiked(next)

    const nextLikes = Math.max(0, Number(post.likes || 0) + (hasLiked ? -1 : 1))
    const { error: likeError } = await supabase.from('community_posts').update({ likes: nextLikes }).eq('id', post.id)
    if (likeError) setError(likeError.message)
    else setPosts((current) => current.map((item) => item.id === post.id ? { ...item, likes: nextLikes } : item))
  }

  const selectCommentImages = async (postId, event) => {
    try {
      const files = Array.from(event.target.files || [])
      for (const file of files) {
        const validation = validateImage(file)
        if (validation) throw new Error(validation)
      }
      if (files.length > MAX_IMAGES) throw new Error(`Tối đa ${MAX_IMAGES} ảnh.`)
      setCommentImages((current) => ({ ...current, [postId]: files }))
    } catch (e) {
      setError(e.message)
    } finally {
      event.target.value = ''
    }
  }

  const renderComments = (postId, parentId = null, depth = 0) => {
    if (depth > 2) return null
    return commentsFor(postId)
      .filter((item) => (item.parent_id || null) === parentId)
      .map((comment) => (
        <div className={`community-comment depth-${depth}`} key={comment.id}>
          <div className="community-comment-avatar">{avatarLetter(comment.display_name)}</div>
          <div className="community-comment-main">
            <div className="community-comment-head">
              <strong>{comment.display_name || 'Bạn đọc'}</strong>
              <time>{formatTime(comment.created_at)}</time>
            </div>
            {comment.content && <p>{comment.content}</p>}
            <div className="community-comment-actions">
              <button onClick={() => setReplyTo((current) => ({ ...current, [postId]: comment.id }))}>
                <Reply size={13} /> Trả lời
              </button>
              {(user?.id === comment.user_id || isAdmin) && (
                <button className="danger" onClick={() => removeComment(comment)}>
                  <Trash2 size={13} /> Xóa
                </button>
              )}
            </div>
            {renderComments(postId, comment.id, depth + 1)}
          </div>
        </div>
      ))
  }

  return (
    <main className="community-page community-v2">
      <section className="community-hero">
        <div>
          <div className="eyebrow"><Sparkles size={13} /> SOCIAL READING SPACE</div>
          <h1>Phòng đọc của <span>Bonchee.</span></h1>
          <p>Nơi bạn có thể đăng bài, chia sẻ cảm nhận và trả lời trực tiếp những người cùng đọc.</p>
        </div>
        <div className="community-stat"><strong>{posts.length}</strong><span>BÀI VIẾT</span></div>
      </section>

      <section className="community-layout-v2">
        <div>
          <div className="community-toolbar">
            <div className="community-sort">
              {[
                ['latest', 'Mới nhất'],
                ['popular', 'Phổ biến'],
                ['active', 'Nhiều thảo luận'],
              ].map(([id, label]) => (
                <button key={id} className={sort === id ? 'active' : ''} onClick={() => setSort(id)}>{label}</button>
              ))}
            </div>
          </div>

          <form className="community-composer-v2" onSubmit={submitPost}>
            <div className="community-composer-avatar">{avatarLetter(displayName(user))}</div>
            <div className="community-composer-main">
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                maxLength={5000}
                placeholder={user ? 'Bạn muốn chia sẻ điều gì?' : 'Đăng nhập để bắt đầu một bài viết…'}
                disabled={!user}
              />
              {!!postImages.length && (
                <div className="community-image-preview-row">
                  {postImages.map((file) => (
                    <div className="community-image-preview" key={`${file.name}-${file.size}`}>
                      <img src={URL.createObjectURL(file)} alt="" />
                    </div>
                  ))}
                  <button type="button" className="preview-remove" onClick={() => setPostImages([])}><X size={14} /></button>
                </div>
              )}
              <div className="community-composer-tools">
                <label className="community-tool">
                  <ImagePlus size={16} /> Ảnh
                  <input ref={fileRef} type="file" accept={ALLOWED_TYPES.join(',')} multiple onChange={choosePostImages} hidden />
                </label>
                <small>JPG/PNG/WEBP/GIF · tối đa 4 ảnh · 5MB/ảnh</small>
                <button className="primary-button" disabled={!user || posting || (!content.trim() && !postImages.length)}>
                  <Send size={15} /> {posting ? 'Đang đăng…' : 'Đăng bài'}
                </button>
              </div>
            </div>
          </form>

          {error && <div className="community-error-v2"><ShieldAlert size={15} /> {error}</div>}

          <div className="community-feed-v2">
            {loading ? (
              <div className="community-loading"><span /><span /><span /></div>
            ) : sortedPosts.length ? sortedPosts.map((post) => {
              const postComments = commentsFor(post.id)
              return (
                <article className="community-post-v2" key={post.id}>
                  <div className="community-post-v2-head">
                    <div className="community-post-v2-avatar">{avatarLetter(post.display_name)}</div>
                    <div className="community-post-v2-author">
                      <strong>{post.display_name || 'Bạn đọc'}</strong>
                      <time>{formatTime(post.created_at)}</time>
                    </div>
                    <button className="community-more"><MoreHorizontal size={18} /></button>
                  </div>

                  {post.content && <div className="community-post-v2-text">{post.content}</div>}

                  {post.images?.length > 0 && (
                    <div className={`community-post-gallery count-${Math.min(post.images.length, 4)}`}>
                      {post.images.map((image) => <img key={image.id || image.image_url} src={image.image_url} alt="" loading="lazy" />)}
                    </div>
                  )}

                  <div className="community-post-v2-meta">
                    <span>{Number(post.likes || 0)} lượt thích</span>
                    <span>{postComments.length} bình luận</span>
                  </div>

                  <div className="community-post-v2-actions">
                    <button className={liked.has(post.id) ? 'liked' : ''} onClick={() => toggleLike(post)}>
                      <Heart size={17} fill={liked.has(post.id) ? 'currentColor' : 'none'} /> Thích
                    </button>
                    <button onClick={() => document.getElementById(`comment-${post.id}`)?.focus()}>
                      <MessageCircle size={17} /> Bình luận
                    </button>
                    {(user?.id === post.user_id || isAdmin) && (
                      <button className="danger" onClick={() => removePost(post)}><Trash2 size={17} /> Xóa</button>
                    )}
                  </div>

                  <div className="community-comments-v2">
                    {renderComments(post.id)}
                    <div className="community-comment-box">
                      <div className="community-comment-avatar">{avatarLetter(displayName(user))}</div>
                      <div className="community-comment-input-wrap">
                        {replyTo[post.id] && (
                          <div className="reply-banner">
                            Đang trả lời bình luận
                            <button onClick={() => setReplyTo((current) => ({ ...current, [post.id]: null }))}><X size={13} /></button>
                          </div>
                        )}
                        <textarea
                          id={`comment-${post.id}`}
                          value={commentDrafts[post.id] || ''}
                          onChange={(e) => setCommentDrafts((current) => ({ ...current, [post.id]: e.target.value }))}
                          placeholder={user ? 'Viết bình luận…' : 'Đăng nhập để bình luận…'}
                          disabled={!user}
                          rows={1}
                        />
                        <div className="community-comment-tools">
                          <label title="Đính kèm ảnh">
                            <Camera size={15} />
                            <input type="file" accept={ALLOWED_TYPES.join(',')} multiple hidden onChange={(e) => selectCommentImages(post.id, e)} />
                          </label>
                          <button className="comment-send" onClick={() => submitComment(post.id)} disabled={!user}>
                            <Send size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </article>
              )
            }) : (
              <div className="community-empty-v2"><MessageCircle size={26} /><strong>Chưa có bài viết</strong><span>Hãy mở đầu cuộc trò chuyện.</span></div>
            )}
          </div>
        </div>

        <aside className="community-aside-v2">
          <div className="community-rule-card">
            <div className="eyebrow"><ShieldAlert size={12} /> COMMUNITY SAFETY</div>
            <h3>Quy tắc phòng đọc</h3>
            <ul>
              <li>Không đăng nội dung tình dục, khỏa thân hoặc NSFW.</li>
              <li>Không spam, flood, quảng cáo hoặc công kích người khác.</li>
              <li>Ảnh chỉ nhận JPG, PNG, WEBP, GIF; tối đa 5MB/ảnh.</li>
              <li>Nội dung vi phạm phải được moderation ở server, không chỉ ở trình duyệt.</li>
            </ul>
          </div>
          {isAdmin && (
            <div className="community-rule-card admin">
              <div className="eyebrow"><ShieldAlert size={12} /> MODERATION</div>
              <h3>Admin</h3>
              <p>Hệ thống đã chuẩn bị cột moderation_status và bảng ban/violation. Hãy bật Edge Function moderation trước khi cho upload public.</p>
            </div>
          )}
        </aside>
      </section>
    </main>
  )
}
