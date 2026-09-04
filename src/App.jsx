import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  BookOpen,
  Clock3,
  Command,
  Heart,
  History,
  LogIn,
  LogOut,
  MessageCircle,
  Settings2,
  Menu,
  Search,
  ShieldCheck,
  Sparkles,
  User,
  X,
  BarChart3,
} from 'lucide-react'

import "./App.css";
import "./index.css";
import "./ui-upgrade.css";

import { useAuth } from './hooks/useAuth'
import { useLibrary } from './hooks/useLibrary'
import { useTheme } from './hooks/useTheme'
import { formatDuration } from './lib/format'

import Brand3D from './components/Brand3D'
import BookLoader3D from './components/BookLoader3D'
import StoryCard from './components/StoryCard'
import AuthModal from './components/AuthModal'
import AdminPanel from './components/AdminPanel'
import AudioPlayer from './components/AudioPlayer'
import Reader from './components/Reader'
import Dashboard from './components/Dashboard'
import UserCenter from './components/UserCenter'
import Community from './components/Community'

function App() {
  const { theme, setTheme } = useTheme()
  const { user, role, isAdmin, signOut } = useAuth()
  const {
    stories,
    favorites,
    lastRead,
    readingStats,
    loading,
    refresh,
    toggleFavorite,
    loadChapters,
    saveHistory,
    saveReadingSession,
  } = useLibrary(user?.id)

  const [activeTab, setActiveTab] = useState('all')
  const [view, setView] = useState('library')
  const [query, setQuery] = useState('')
  const [selectedStory, setSelectedStory] = useState(null)
  const [chapters, setChapters] = useState([])
  const [selectedChapter, setSelectedChapter] = useState(null)
  const [chaptersLoading, setChaptersLoading] = useState(false)
  const [readingTime, setReadingTime] = useState(0)
  const [fontSize, setFontSize] = useState(18)
  const [authOpen, setAuthOpen] = useState(false)
  const [adminOpen, setAdminOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [userCenterOpen, setUserCenterOpen] = useState(false)
  const [logoutConfirm, setLogoutConfirm] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [loaderEnabled, setLoaderEnabled] = useState(() => {
    const saved = localStorage.getItem('truyen-audio-3d-loader')
    return saved === null ? true : saved === 'true'
  })
  const [showLoader, setShowLoader] = useState(true)
  const searchRef = useRef(null)
  const timerRef = useRef(null)
  const persistedReadingTimeRef = useRef(0)
  const routeBootedRef = useRef(false)

  useEffect(() => {
    localStorage.setItem('truyen-audio-3d-loader', String(loaderEnabled))
  }, [loaderEnabled])

  useEffect(() => {
    const handler = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        searchRef.current?.focus()
      }
      if (event.key === 'Escape') {
        setMobileOpen(false)
        setProfileOpen(false)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  useEffect(() => {
    if (!selectedChapter || !selectedStory) {
      clearInterval(timerRef.current)
      return undefined
    }

    persistedReadingTimeRef.current = 0

    timerRef.current = setInterval(() => {
      setReadingTime((value) => value + 1)
    }, 1000)

    return () => clearInterval(timerRef.current)
  }, [selectedChapter?.id, selectedStory?.id])

  useEffect(() => {
    if (!selectedChapter || !selectedStory || readingTime <= persistedReadingTimeRef.current) {
      return
    }

    if (readingTime - persistedReadingTimeRef.current < 10) {
      return
    }

    const delta = readingTime - persistedReadingTimeRef.current
    persistedReadingTimeRef.current = readingTime

    const chapterIndex = chapters.findIndex((item) => item.id === selectedChapter.id)

    saveReadingSession({
      storyId: selectedStory.id,
      chapterNumber: Number(selectedChapter.so_chuong || chapterIndex + 1),
      totalChapters: chapters.length,
      seconds: delta,
      completed: chapterIndex === chapters.length - 1 && chapters.length > 0,
    })
  }, [readingTime, selectedChapter, selectedStory, chapters, saveReadingSession])

  const persistCurrentReading = useCallback(async () => {
    if (!selectedStory || !selectedChapter || readingTime <= persistedReadingTimeRef.current) {
      return
    }

    const delta = readingTime - persistedReadingTimeRef.current
    persistedReadingTimeRef.current = readingTime

    const chapterIndex = chapters.findIndex((item) => item.id === selectedChapter.id)

    await saveReadingSession({
      storyId: selectedStory.id,
      chapterNumber: Number(selectedChapter.so_chuong || chapterIndex + 1),
      totalChapters: chapters.length,
      seconds: delta,
      completed: chapterIndex === chapters.length - 1 && chapters.length > 0,
    })
  }, [selectedStory, selectedChapter, readingTime, chapters, saveReadingSession])

  const filteredStories = useMemo(() => {
    const normalized = query.trim().toLowerCase()

    return stories.filter((story) => {
      const matches =
        !normalized ||
        story.ten?.toLowerCase().includes(normalized) ||
        story.tac_gia?.toLowerCase().includes(normalized) ||
        story.mo_ta?.toLowerCase().includes(normalized)

      if (activeTab === 'favorites') return matches && favorites.includes(story.id)
      return matches
    })
  }, [stories, favorites, query, activeTab])

  const storyPath = (storyId, chapterNumber = null) =>
    chapterNumber ? `/truyen/${storyId}/chuong/${chapterNumber}` : `/truyen/${storyId}`

  const pushRoute = (path) => {
    if (window.location.pathname === path) return
    window.history.pushState({}, '', path)
  }

  const openStory = useCallback(async (
    story,
    targetChapterId = null,
    options = {},
  ) => {
    const { push = true, targetChapterNumber = null } = options

    if (push) {
      pushRoute(storyPath(story.id, targetChapterNumber))
    }

    setView('library')
    setSelectedStory(story)
    setSelectedChapter(null)
    setChapters([])
    setChaptersLoading(true)
    setReadingTime(0)
    persistedReadingTimeRef.current = 0

    try {
      const list = await loadChapters(story.id)
      setChapters(list)

      const target = targetChapterId
        ? list.find((item) => item.id === targetChapterId)
        : targetChapterNumber
          ? list.find((item) => Number(item.so_chuong) === Number(targetChapterNumber))
          : list[0]

      if (target) {
        setSelectedChapter(target)
        await saveHistory(story.id, target.id)

        if (push) {
          pushRoute(storyPath(story.id, target.so_chuong))
        }
      }
    } catch (error) {
      console.error(error)
    } finally {
      setChaptersLoading(false)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }, [loadChapters, saveHistory])

  const chooseChapter = async (chapter, options = {}) => {
    await persistCurrentReading()

    setSelectedChapter(chapter)
    setReadingTime(0)
    persistedReadingTimeRef.current = 0

    if (selectedStory) {
      if (options.push !== false) {
        pushRoute(storyPath(selectedStory.id, chapter.so_chuong))
      }
      await saveHistory(selectedStory.id, chapter.id)
    }
  }

  const navigateChapter = async (direction) => {
    const index = chapters.findIndex((item) => item.id === selectedChapter?.id)
    const nextIndex = direction === 'next' ? index + 1 : index - 1
    if (nextIndex < 0 || nextIndex >= chapters.length) return

    await chooseChapter(chapters[nextIndex])
  }

  const returnHome = async (options = {}) => {
    await persistCurrentReading()

    if (options.push !== false) {
      pushRoute('/')
    }

    setView('library')
    setSelectedStory(null)
    setSelectedChapter(null)
    setChapters([])
    setReadingTime(0)
    persistedReadingTimeRef.current = 0
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const openDashboard = () => {
    pushRoute('/dashboard')
    setView('dashboard')
    setSelectedStory(null)
    setSelectedChapter(null)
    setChapters([])
    setProfileOpen(false)
    setMobileOpen(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const openCommunity = () => {
    pushRoute('/cong-dong')
    setView('community')
    setSelectedStory(null)
    setSelectedChapter(null)
    setChapters([])
    setProfileOpen(false)
    setMobileOpen(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const requestLogout = () => {
    setProfileOpen(false)
    setLogoutConfirm(true)
  }

  const confirmLogout = async () => {
    setLogoutConfirm(false)
    await signOut()
  }

  const continueReading = () => {
    if (lastRead?.truyen) {
      openStory(lastRead.truyen, lastRead.chuong_dang_doc)
    }
  }

  useEffect(() => {
    const applyRoute = async () => {
      const path = window.location.pathname.replace(/\/+$/, '') || '/'

      if (path === '/dashboard') {
        setView('dashboard')
        setSelectedStory(null)
        setSelectedChapter(null)
        return
      }

      if (path === '/cong-dong') {
        setView('community')
        setSelectedStory(null)
        setSelectedChapter(null)
        return
      }

      const match = path.match(/^\/truyen\/([^/]+)(?:\/chuong\/(\d+))?$/)

      if (!match) {
        setView('library')
        if (selectedStory && routeBootedRef.current) {
          setSelectedStory(null)
          setSelectedChapter(null)
          setChapters([])
        }
        return
      }

      const story = stories.find((item) => item.id === match[1])
      if (!story) return

      const chapterNumber = match[2] ? Number(match[2]) : null

      if (
        selectedStory?.id === story.id &&
        chapters.length &&
        chapterNumber !== null
      ) {
        const target = chapters.find((item) => Number(item.so_chuong) === chapterNumber)
        if (target && target.id !== selectedChapter?.id) {
          await chooseChapter(target, { push: false })
        }
        return
      }

      await openStory(story, null, {
        push: false,
        targetChapterNumber: chapterNumber,
      })
    }

    if (stories.length) {
      routeBootedRef.current = true
      applyRoute()
    }
  }, [stories.length])

  useEffect(() => {
    const onPopState = () => {
      const path = window.location.pathname.replace(/\/+$/, '') || '/'
      if (path === '/dashboard') {
        setView('dashboard')
        setSelectedStory(null)
        setSelectedChapter(null)
        return
      }
      if (path === '/cong-dong') {
        setView('community')
        setSelectedStory(null)
        setSelectedChapter(null)
        return
      }

      const match = path.match(/^\/truyen\/([^/]+)(?:\/chuong\/(\d+))?$/)
      if (!match) {
        returnHome({ push: false })
        return
      }

      const story = stories.find((item) => item.id === match[1])
      if (!story) return

      const chapterNumber = match[2] ? Number(match[2]) : null
      if (selectedStory?.id === story.id && chapters.length && chapterNumber !== null) {
        const target = chapters.find((item) => Number(item.so_chuong) === chapterNumber)
        if (target) chooseChapter(target, { push: false })
      } else {
        openStory(story, null, { push: false, targetChapterNumber: chapterNumber })
      }
    }

    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [stories, selectedStory, chapters, selectedChapter])

  if ((loading && !stories.length) || (loaderEnabled && showLoader)) {
    return (
      <BookLoader3D
        onFinish={() => setShowLoader(false)}
      />
    )
  }

  return (
    <div className={`app-shell theme-${theme}`}>
      <header className="topbar">
        <div className="topbar-inner">
          <button className="brand" onClick={returnHome} aria-label="Về trang chủ">
            <Brand3D />
            <div className="brand-copy">
              <strong>BONC<span>HEE</span></strong>
              <small>interactive library</small>
            </div>
          </button>

          <nav className="desktop-nav">
            <button className={activeTab === 'all' && !selectedStory ? 'active' : ''} onClick={returnHome}>
              <BookOpen size={15} /> Thư viện
            </button>
            <button className={activeTab === 'favorites' && !selectedStory && view === 'library' ? 'active' : ''} onClick={() => { returnHome(); setActiveTab('favorites') }}>
              <Heart size={15} /> Yêu thích
            </button>
            {/*<button className={view === 'dashboard' ? 'active' : ''} onClick={openDashboard}>
              <BarChart3 size={15} /> Dashboard
            </button>*/}
            <button className={view === 'community' ? 'active' : ''} onClick={openCommunity}>
              <MessageCircle size={15} /> Cộng đồng
            </button>
            {lastRead?.truyen && (
              <button onClick={continueReading}>
                <History size={15} /> Đọc tiếp
              </button>
            )}
          </nav>

          <div className="topbar-actions">
            {user ? (
              <div className="profile-anchor">
                <button className="profile-button" onClick={() => setProfileOpen((v) => !v)}>
                  <span className="avatar"><User size={15} /></span>
                  <span className="profile-email">{user.user_metadata?.display_name || user.email?.split('@')[0]}</span>
                  {isAdmin && <span className="admin-dot" />}
                </button>

                {profileOpen && (
                  <div className="popover profile-popover">
                    <div className="profile-card">
                      <span className="avatar large"><User size={18} /></span>
                      <div><strong>{user.email}</strong><small>{role || 'member'}</small></div>
                    </div>
                    <button className="popover-action" onClick={() => { setUserCenterOpen(true); setProfileOpen(false) }}>
                      <Settings2 size={16} /> Tài khoản & thiết lập
                    </button>
                    <button className="popover-action" onClick={openDashboard}>
                      <BarChart3 size={16} /> Dashboard
                    </button>
                    <button className="popover-action" onClick={openCommunity}>
                      <MessageCircle size={16} /> Cộng đồng
                    </button>
                    {isAdmin && (
                      <button className="popover-action" onClick={() => { setAdminOpen(true); setProfileOpen(false) }}>
                        <ShieldCheck size={16} /> Mở quản trị
                      </button>
                    )}
                    <button className="popover-action danger-text" onClick={requestLogout}>
                      <LogOut size={16} /> Đăng xuất
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button className="login-button" onClick={() => setAuthOpen(true)}>
                <LogIn size={16} /> Đăng nhập
              </button>
            )}

            <button className="mobile-menu-button" onClick={() => setMobileOpen((v) => !v)}>
              {mobileOpen ? <X size={19} /> : <Menu size={19} />}
            </button>
          </div>
        </div>

        {mobileOpen && (
          <div className="mobile-nav">
            <button onClick={() => { returnHome(); setMobileOpen(false) }}><BookOpen size={16} /> Thư viện</button>
            <button onClick={() => { setActiveTab('favorites'); setSelectedStory(null); setSelectedChapter(null); setMobileOpen(false) }}><Heart size={16} /> Yêu thích</button>
            {lastRead?.truyen && <button onClick={() => { continueReading(); setMobileOpen(false) }}><History size={16} /> Đọc tiếp</button>}
            <button onClick={() => { openDashboard(); setMobileOpen(false) }}><BarChart3 size={16} /> Dashboard</button>
            <button onClick={() => { openCommunity(); setMobileOpen(false) }}><MessageCircle size={16} /> Cộng đồng</button>
            {user && <button onClick={() => { setUserCenterOpen(true); setMobileOpen(false) }}><Settings2 size={16} /> Tài khoản & thiết lập</button>}
          </div>
        )}
      </header>

      {view === 'dashboard' ? (
        <Dashboard
          user={user}
          stories={stories}
          readingStats={readingStats}
          onContinue={(story, chapterNumber) =>
            openStory(story, null, { targetChapterNumber: chapterNumber })
          }
        />
      ) : view === 'community' ? (
        <Community user={user} isAdmin={isAdmin} />
      ) : selectedStory ? (
        <Reader
          story={selectedStory}
          chapters={chapters}
          chapter={selectedChapter}
          loading={chaptersLoading}
          onBack={returnHome}
          onChapter={chooseChapter}
          onNavigate={navigateChapter}
          readingTime={readingTime}
          fontSize={fontSize}
          setFontSize={setFontSize}
          user={user}
        />
      ) : (
        <main>
          <section className="hero-section">
            <div className="hero-noise" />
            <div className="hero-orb orb-purple" />
            <div className="hero-orb orb-blue" />

            <div className="hero-content">
              <div className="eyebrow"><Sparkles size={13} /> YOUR PERSONAL STORY UNIVERSE</div>
              <h1>Đọc chậm lại.<br /><span>Thế giới mở ra.</span></h1>
              <p>
                Một thư viện truyện tối giản về cấu trúc, nhưng giàu cảm giác.
                Tìm một câu chuyện, chọn một chương, rồi để giọng đọc dẫn đường.
              </p>

              <div className="hero-search">
                <Search size={19} />
                <input
                  ref={searchRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Tìm tên truyện, tác giả…"
                />
                <kbd><Command size={11} /> K</kbd>
              </div>

              <div className="hero-actions">
                {lastRead?.truyen ? (
                  <button className="primary-button hero-cta" onClick={continueReading}>
                    <History size={17} /> Tiếp tục đọc
                  </button>
                ) : (
                  <button className="primary-button hero-cta" onClick={() => document.getElementById('library')?.scrollIntoView({ behavior: 'smooth' })}>
                    <BookOpen size={17} /> Khám phá thư viện
                  </button>
                )}
                <span className="hero-hint">⌘K để tìm kiếm nhanh</span>
              </div>
            </div>

            <div className="hero-stat-panel">
              <div className="stat-label">LIBRARY INDEX</div>
              <div className="big-stat">{stories.length.toString().padStart(2, '0')}</div>
              <div className="stat-caption">stories available</div>
              <div className="stat-divider" />
              <div className="mini-stats">
                <span><b>{favorites.length}</b> yêu thích</span>
                <span><b>{chapters.length || '—'}</b> chương đang mở</span>
              </div>
            </div>
          </section>

          {lastRead?.truyen && (
            <section className="continue-strip">
              <div>
                <span className="eyebrow">LAST SESSION</span>
                <strong>{lastRead.truyen.ten}</strong>
                <small>{lastRead.chuong?.tieu_de || `Chương ${lastRead.chuong?.so_chuong || ''}`}</small>
              </div>
              <button className="secondary-button" onClick={continueReading}>
                <Clock3 size={16} /> Đọc tiếp
              </button>
            </section>
          )}

          <section className="library-section" id="library">
            <div className="section-heading">
              <div>
                <div className="eyebrow">THE SHELF</div>
                <h2>Kho truyện <span>{filteredStories.length}</span></h2>
              </div>

              <div className="library-tabs">
                <button className={activeTab === 'all' ? 'active' : ''} onClick={() => setActiveTab('all')}>Tất cả</button>
                <button className={activeTab === 'favorites' ? 'active' : ''} onClick={() => setActiveTab('favorites')}><Heart size={14} /> Yêu thích</button>
              </div>
            </div>

            {loading ? (
              <div className="story-grid">
                {Array.from({ length: 6 }).map((_, index) => <div className="story-skeleton" key={index} />)}
              </div>
            ) : filteredStories.length ? (
              <div className="story-grid">
                {filteredStories.map((story) => (
                  <StoryCard
                    key={story.id}
                    story={story}
                    favorite={favorites.includes(story.id)}
                    onFavorite={toggleFavorite}
                    onOpen={openStory}
                  />
                ))}
              </div>
            ) : (
              <div className="empty-state library-empty">
                <Search size={30} />
                <h3>Không tìm thấy truyện</h3>
                <p>Thử một từ khóa khác hoặc quay về toàn bộ thư viện.</p>
                <button className="secondary-button" onClick={() => { setQuery(''); setActiveTab('all') }}>Xóa bộ lọc</button>
              </div>
            )}
          </section>

          <footer className="app-footer">
            <div className="footer-brand"><BookOpen size={18} /> TRUYỆN AUDIO</div>
            <span>Built for long-form reading · {new Date().getFullYear()}</span>
            <span>{isAdmin ? 'ADMIN ACCESS ENABLED' : 'MEMBER EXPERIENCE'}</span>
          </footer>
        </main>
      )}

      <AudioPlayer currentChapter={selectedChapter} />

      {authOpen && <AuthModal onClose={() => setAuthOpen(false)} />}
      {adminOpen && isAdmin && (
        <AdminPanel
          stories={stories}
          onClose={() => setAdminOpen(false)}
          onRefresh={refresh}
        />
      )}
      {userCenterOpen && user && (
        <UserCenter
          user={user}
          role={role}
          isAdmin={isAdmin}
          theme={theme}
          setTheme={setTheme}
          loaderEnabled={loaderEnabled}
          onToggleLoader={() => setLoaderEnabled((v) => !v)}
          onClose={() => setUserCenterOpen(false)}
          onDashboard={openDashboard}
          onAdmin={() => { setAdminOpen(true); setUserCenterOpen(false) }}
          onLogout={requestLogout}
        />
      )}

      {logoutConfirm && (
        <div className="logout-confirm-backdrop" onMouseDown={(e) => e.target === e.currentTarget && setLogoutConfirm(false)}>
          <div className="logout-confirm" role="dialog" aria-modal="true">
            <div className="logout-confirm-icon"><LogOut size={20} /></div>
            <div className="eyebrow">SESSION / EXIT</div>
            <h3>Đăng xuất khỏi tài khoản?</h3>
            <p>Phiên đọc của bạn vẫn được lưu. Bạn có chắc muốn đăng xuất không?</p>
            <div className="logout-confirm-actions">
              <button className="secondary-button" onClick={() => setLogoutConfirm(false)}>Hủy</button>
              <button className="primary-button danger-button" onClick={confirmLogout}>OK, đăng xuất</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App

