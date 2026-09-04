import { useEffect, useState } from 'react'
import {
  BookPlus,
  CheckCircle2,
  ChevronDown,
  FilePlus2,
  Globe,
  Loader2,
  Plus,
  RefreshCw,
  ScanSearch,
  Trash2,
  X,
} from 'lucide-react'
import { supabase } from '../lib/supabase'

const emptyStory = {
  ten: '',
  mo_ta: '',
  anh_bia: '',
  tac_gia: '',
}

const emptyChapter = (number = 1) => ({
  so_chuong: number,
  tieu_de: '',
  noi_dung: '',
  audio_url: '',
})

const CRAWL_PROXY = 'https://api.allorigins.win/get?url='

/* ============================================================
   CRAWL HELPERS
   ============================================================ */

function absoluteUrl(value, baseUrl) {
  if (!value) return ''

  try {
    return new URL(value, baseUrl).href
  } catch {
    return value
  }
}

function cleanText(value = '') {
  return value
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function getDocumentText(element) {
  if (!element) return ''
  return cleanText(element.textContent || '')
}

function findFirst(doc, selectors) {
  for (const selector of selectors) {
    const element = doc.querySelector(selector)
    if (element) return element
  }

  return null
}

function extractStoryInfo(doc, sourceUrl) {
  const titleElement = findFirst(doc, [
    'h1',
    'h3.title',
    '.book-title',
    '.story-title',
    '[itemprop="name"]',
  ])

  const authorElement = findFirst(doc, [
    '[itemprop="author"]',
    '[itemprop="creator"]',
    '.author',
    '.story-author',
    '.info-item a',
    '.book-author',
  ])

  const descriptionElement = findFirst(doc, [
    '[itemprop="description"]',
    '.desc-text',
    '.summary',
    '.story-detail-info',
    '.description',
    '.book-description',
    '.story-description',
  ])

  const imageElement = findFirst(doc, [
    'meta[property="og:image"]',
    '.book img',
    '.img-cover img',
    '.book-cover img',
    '.story-cover img',
    'img[itemprop="image"]',
  ])

  let image = ''

  if (imageElement?.getAttribute('content')) {
    image = imageElement.getAttribute('content')
  } else if (imageElement?.getAttribute('src')) {
    image = imageElement.getAttribute('src')
  } else if (imageElement?.getAttribute('data-src')) {
    image = imageElement.getAttribute('data-src')
  }

  image = absoluteUrl(image, sourceUrl)

  return {
    ten: getDocumentText(titleElement) || cleanText(doc.title || ''),
    tac_gia: getDocumentText(authorElement),
    mo_ta: getDocumentText(descriptionElement),
    anh_bia: image,
  }
}

/*
 * Nhận diện link chương.
 *
 * Không khóa cứng vào một website cụ thể.
 * Ưu tiên:
 * - Text chứa "chương/chapter/chap"
 * - URL chứa "chuong/chapter/chap"
 */
function looksLikeChapterLink(anchor) {
  const text = cleanText(anchor.textContent || '').toLowerCase()
  const href = (anchor.getAttribute('href') || '').toLowerCase()

  const chapterPattern =
    /(chương|chuong|chapter|chap)[\s._-]*\d+/i

  return chapterPattern.test(text) || chapterPattern.test(href)
}

function extractChapterNumber(text = '', fallback = 1) {
  const match = String(text).match(
    /(?:chương|chuong|chapter|chap)[\s._-]*(\d+)/i,
  )

  if (match) return Number(match[1])

  const plainNumber = String(text).match(/\b(\d{1,5})\b/)

  return plainNumber ? Number(plainNumber[1]) : fallback
}

function extractChapterTitle(doc, fallbackNumber) {
  const element = findFirst(doc, [
    'h1',
    'h2',
    'h3',
    '.chapter-title',
    '.chapter-name',
    '.title',
    '[itemprop="name"]',
  ])

  const title = getDocumentText(element)

  return title || `Chương ${fallbackNumber}`
}

function extractChapterContent(doc) {
  const selectors = [
    '[itemprop="articleBody"]',
    '.chapter-content',
    '.chapter-text',
    '.reading-content',
    '.entry-content',
    '.content-chapter',
    '.chapter-detail',
    '.read-content',
    '.content',
    'article',
  ]

  let best = ''

  for (const selector of selectors) {
    const element = doc.querySelector(selector)

    if (!element) continue

    const clone = element.cloneNode(true)

    clone
      .querySelectorAll(
        'script, style, iframe, ins, nav, header, footer, .ads, .advertisement',
      )
      .forEach((item) => item.remove())

    const text = cleanText(clone.textContent || '')

    if (text.length > best.length) {
      best = text
    }
  }

  return best
}

function extractChapterLinks(doc, sourceUrl) {
  const links = []
  const seen = new Set()

  doc.querySelectorAll('a[href]').forEach((anchor) => {
    if (!looksLikeChapterLink(anchor)) return

    const href = absoluteUrl(anchor.getAttribute('href'), sourceUrl)

    if (!href) return

    try {
      const parsed = new URL(href)
      const source = new URL(sourceUrl)

      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        return
      }

      /*
       * Không lấy link ra khỏi domain của trang truyện.
       * Điều này tránh crawler vô tình lấy menu/quảng cáo ngoài site.
       */
      if (parsed.hostname !== source.hostname) return
    } catch {
      return
    }

    if (seen.has(href)) return

    seen.add(href)

    const label = cleanText(anchor.textContent || '')

    links.push({
      url: href,
      label,
      number: extractChapterNumber(label || href, links.length + 1),
    })
  })

  return links.sort((a, b) => {
    if (a.number !== b.number) {
      return a.number - b.number
    }

    return a.url.localeCompare(b.url)
  })
}

async function fetchHtml(url) {
  const response = await fetch(
    `${CRAWL_PROXY}${encodeURIComponent(url)}`,
  )

  if (!response.ok) {
    throw new Error(
      `Proxy trả về HTTP ${response.status}.`,
    )
  }

  const data = await response.json()

  if (!data?.contents) {
    throw new Error(
      'Không nhận được HTML từ trang nguồn.',
    )
  }

  return data.contents
}

/* ============================================================
   ADMIN PANEL
   ============================================================ */

export default function AdminPanel({
  stories,
  onClose,
  onRefresh,
}) {
  const [story, setStory] = useState(emptyStory)

  const [chapters, setChapters] = useState([
    emptyChapter(1),
  ])

  const [selectedStoryId, setSelectedStoryId] = useState('')
  const [deleteId, setDeleteId] = useState('')

  const [busy, setBusy] = useState(false)
  const [crawlBusy, setCrawlBusy] = useState(false)

  const [notice, setNotice] = useState(null)

  const [crawlUrl, setCrawlUrl] = useState('')
  const [nextChapterNumber, setNextChapterNumber] = useState(1)
  const [crawlChapterLimit, setCrawlChapterLimit] = useState(20)

  /*
   * Chế độ crawler:
   * - story: tạo truyện mới
   * - existing: thêm chương vào truyện cũ
   */
  const [crawlMode, setCrawlMode] = useState('story')

  /* ----------------------------------------------------------
     INIT SELECTED STORY
     ---------------------------------------------------------- */

  useEffect(() => {
    if (!selectedStoryId && stories[0]?.id) {
      setSelectedStoryId(stories[0].id)
    }
  }, [stories, selectedStoryId])

  /* ----------------------------------------------------------
     LẤY CHƯƠNG TIẾP THEO CỦA TRUYỆN CŨ
     ---------------------------------------------------------- */

  const loadNextChapterNumber = async (storyId) => {
    if (!storyId) {
      setNextChapterNumber(1)
      setChapters([emptyChapter(1)])
      return
    }

    try {
      const { data, error } = await supabase
        .from('chuong')
        .select('so_chuong')
        .eq('truyen_id', storyId)
        .order('so_chuong', {
          ascending: false,
        })
        .limit(1)
        .maybeSingle()

      if (error) throw error

      const lastNumber = Number(data?.so_chuong || 0)
      const nextNumber = lastNumber + 1

      setNextChapterNumber(nextNumber)
      setChapters([emptyChapter(nextNumber)])
    } catch (error) {
      console.error(error)

      /*
       * Không để lỗi này chặn admin nhập chương.
       * Nếu database chưa có chương thì mặc định 1.
       */
      setNextChapterNumber(1)
      setChapters([emptyChapter(1)])
    }
  }

  useEffect(() => {
    loadNextChapterNumber(selectedStoryId)
  }, [selectedStoryId])

  /* ----------------------------------------------------------
     BASIC STATE HELPERS
     ---------------------------------------------------------- */

  const setStoryField = (key, value) => {
    setStory((current) => ({
      ...current,
      [key]: value,
    }))
  }

  const updateChapter = (index, key, value) => {
    setChapters((current) =>
      current.map((item, i) =>
        i === index
          ? {
              ...item,
              [key]: value,
            }
          : item,
      ),
    )
  }

  /*
   * Chỉ dùng cho form "Tạo truyện mới".
   * Form "Thêm chương" sẽ bắt đầu từ nextChapterNumber.
   */
  const addChapter = () => {
    setChapters((current) => {
      const last = current[current.length - 1]
      const lastNumber = Number(last?.so_chuong || 0)

      return [
        ...current,
        emptyChapter(lastNumber + 1),
      ]
    })
  }

  const removeChapter = (index) => {
    if (chapters.length === 1) return

    setChapters((current) =>
      current
        .filter((_, i) => i !== index)
        .map((item, i) => ({
          ...item,
          so_chuong:
            crawlMode === 'existing'
              ? nextChapterNumber + i
              : i + 1,
        })),
    )
  }

  const notify = (type, text) => {
    setNotice({
      type,
      text,
    })
  }

  /* ==========================================================
     CRAWL
     ========================================================== */

  const handleCrawl = async (event) => {
    event.preventDefault()

    const url = crawlUrl.trim()

    if (!url) {
      return notify(
        'error',
        'Vui lòng nhập URL cần crawl.',
      )
    }

    try {
      new URL(url)
    } catch {
      return notify(
        'error',
        'URL không hợp lệ.',
      )
    }

    setCrawlBusy(true)
    setNotice(null)

    try {
      const html = await fetchHtml(url)

      const parser = new DOMParser()
      const doc = parser.parseFromString(
        html,
        'text/html',
      )

      /* ------------------------------------------------------
         LẤY METADATA TRUYỆN
         ------------------------------------------------------ */

      const storyInfo = extractStoryInfo(
        doc,
        url,
      )

      setStory(storyInfo)

      /* ------------------------------------------------------
         LẤY DANH SÁCH CHƯƠNG
         ------------------------------------------------------ */

      const links = extractChapterLinks(
        doc,
        url,
      )

      if (!links.length) {
        notify(
          'success',
          'Đã lấy thông tin truyện. Không tìm thấy link chương tự động — bạn có thể nhập chương thủ công.',
        )

        setCrawlUrl('')

        return
      }

      const limit = Math.min(
        Math.max(
          Number(crawlChapterLimit) || 20,
          1,
        ),
        100,
      )

      const selectedLinks = links.slice(
        0,
        limit,
      )

      /*
       * Nếu crawl để thêm vào truyện cũ,
       * bắt đầu từ chương tiếp theo.
       *
       * Nếu tạo truyện mới,
       * bắt đầu từ 1.
       */
      let startNumber =
        crawlMode === 'existing'
          ? nextChapterNumber
          : 1

      const crawledChapters = []

      for (
        let i = 0;
        i < selectedLinks.length;
        i += 1
      ) {
        const item = selectedLinks[i]

        try {
          const chapterHtml =
            await fetchHtml(item.url)

          const chapterDoc =
            parser.parseFromString(
              chapterHtml,
              'text/html',
            )

          const content =
            extractChapterContent(
              chapterDoc,
            )

          const sourceNumber =
            item.number ||
            startNumber + i

          const chapterNumber =
            crawlMode === 'existing'
              ? startNumber + i
              : sourceNumber

          crawledChapters.push({
            so_chuong: chapterNumber,
            tieu_de:
              extractChapterTitle(
                chapterDoc,
                chapterNumber,
              ),
            noi_dung: content,
            audio_url: '',
          })
        } catch (chapterError) {
          console.warn(
            `Không crawl được chương ${item.url}`,
            chapterError,
          )
        }
      }

      if (crawledChapters.length) {
        setChapters(crawledChapters)

        notify(
          'success',
          `Đã crawl metadata và ${crawledChapters.length}/${selectedLinks.length} chương. Hãy kiểm tra trước khi lưu.`,
        )
      } else {
        setChapters([
          emptyChapter(
            crawlMode === 'existing'
              ? nextChapterNumber
              : 1,
          ),
        ])

        notify(
          'success',
          'Đã lấy metadata truyện nhưng chưa lấy được nội dung chương.',
        )
      }

      setCrawlUrl('')
    } catch (error) {
      console.error(error)

      notify(
        'error',
        `Lỗi Crawl: ${
          error?.message ||
          'Không thể lấy dữ liệu trang web này.'
        }`,
      )
    } finally {
      setCrawlBusy(false)
    }
  }

  /* ==========================================================
     CREATE STORY
     ========================================================== */

  const createStory = async (event) => {
    event.preventDefault()

    if (!story.ten.trim()) {
      return notify(
        'error',
        'Tên truyện không được để trống.',
      )
    }

    setBusy(true)

    try {
      const { data: created, error } =
        await supabase
          .from('truyen')
          .insert({
            ...story,
            ten: story.ten.trim(),
            mo_ta:
              story.mo_ta?.trim() || null,
            anh_bia:
              story.anh_bia?.trim() || null,
            tac_gia:
              story.tac_gia?.trim() || null,
          })
          .select()
          .single()

      if (error) throw error

      const rows = chapters
        .filter(
          (item) =>
            item.tieu_de.trim() ||
            item.noi_dung.trim(),
        )
        .map((item, index) => ({
          truyen_id: created.id,
          so_chuong:
            Number(item.so_chuong) ||
            index + 1,
          tieu_de:
            item.tieu_de.trim() ||
            `Chương ${
              Number(item.so_chuong) ||
              index + 1
            }`,
          noi_dung:
            item.noi_dung.trim() || null,
          audio_url:
            item.audio_url?.trim() || null,
        }))

      if (rows.length) {
        const {
          error: chapterError,
        } = await supabase
          .from('chuong')
          .insert(rows)

        if (chapterError) {
          throw chapterError
        }
      }

      setStory(emptyStory)
      setChapters([emptyChapter(1)])

      notify(
        'success',
        'Đã tạo truyện và các chương thành công.',
      )

      await onRefresh?.()
    } catch (error) {
      console.error(error)

      notify(
        'error',
        error?.message ||
          'Không thể tạo truyện.',
      )
    } finally {
      setBusy(false)
    }
  }

  /* ==========================================================
     ADD CHAPTERS TO EXISTING STORY
     ========================================================== */

  const addChaptersToExisting = async (
    event,
  ) => {
    event.preventDefault()

    if (!selectedStoryId) {
      return notify(
        'error',
        'Hãy chọn truyện trước.',
      )
    }

    setBusy(true)

    try {
      /*
       * QUAN TRỌNG:
       * Lấy lại MAX ngay trước INSERT.
       *
       * Điều này tránh trường hợp:
       * - mở modal ở chương 20
       * - một nơi khác thêm chương 21
       * - admin vẫn tưởng chương tiếp theo là 21.
       */
      const { data: latest, error: latestError } =
        await supabase
          .from('chuong')
          .select('so_chuong')
          .eq('truyen_id', selectedStoryId)
          .order('so_chuong', {
            ascending: false,
          })
          .limit(1)
          .maybeSingle()

      if (latestError) {
        throw latestError
      }

      const latestNumber = Number(
        latest?.so_chuong || 0,
      )

      const realStartNumber =
        latestNumber + 1

      const validChapters = chapters.filter(
        (item) =>
          item.tieu_de.trim() ||
          item.noi_dung.trim(),
      )

      if (!validChapters.length) {
        throw new Error(
          'Chưa có chương nào có nội dung.',
        )
      }

      const rows = validChapters.map(
        (item, index) => {
          const number =
            realStartNumber + index

          return {
            truyen_id: selectedStoryId,
            so_chuong: number,
            tieu_de:
              item.tieu_de.trim() ||
              `Chương ${number}`,
            noi_dung:
              item.noi_dung.trim() || null,
            /*
             * audio_url rỗng -> NULL.
             * KHÔNG BAO GIỜ báo lỗi chỉ vì thiếu audio.
             */
            audio_url:
              item.audio_url?.trim() || null,
          }
        },
      )

      const { error } =
        await supabase
          .from('chuong')
          .insert(rows)

      if (error) throw error

      setNextChapterNumber(
        realStartNumber +
          rows.length,
      )

      setChapters([
        emptyChapter(
          realStartNumber +
            rows.length,
        ),
      ])

      notify(
        'success',
        `Đã thêm ${rows.length} chương, từ chương ${realStartNumber} đến chương ${
          realStartNumber +
          rows.length -
          1
        }.`,
      )

      await onRefresh?.()
    } catch (error) {
      console.error(error)

      notify(
        'error',
        error?.message ||
          'Không thể thêm chương.',
      )
    } finally {
      setBusy(false)
    }
  }

  /* ==========================================================
     DELETE STORY
     ========================================================== */

  const deleteStory = async (event) => {
    event.preventDefault()

    if (!deleteId) {
      return notify(
        'error',
        'Hãy chọn truyện cần xóa.',
      )
    }

    setBusy(true)

    try {
      const { error } =
        await supabase
          .from('truyen')
          .delete()
          .eq('id', deleteId)

      if (error) throw error

      setDeleteId('')

      notify(
        'success',
        'Đã xóa truyện.',
      )

      await onRefresh?.()
    } catch (error) {
      notify(
        'error',
        error?.message ||
          'Không thể xóa truyện.',
      )
    } finally {
      setBusy(false)
    }
  }

  /* ==========================================================
     RENDER
     ========================================================== */

  return (
    <div className="modal-backdrop admin-backdrop">
      <div className="admin-panel">
        <div className="admin-header">
          <div>
            <div className="eyebrow">
              CONTROL ROOM
            </div>

            <h2>
              Quản trị thư viện
            </h2>

            <p>
              Tạo truyện, crawl chương,
              thêm nội dung và quản lý
              thư viện từ một khu vực duy nhất.
            </p>
          </div>

          <button
            className="modal-close"
            onClick={onClose}
            disabled={busy || crawlBusy}
          >
            <X size={18} />
          </button>
        </div>

        {notice && (
          <div
            className={`admin-notice ${notice.type}`}
          >
            <CheckCircle2 size={17} />
            {notice.text}
          </div>
        )}

        <div className="admin-grid">
          {/* ==================================================
              CREATE STORY
          ================================================== */}

          <section className="admin-card accent-violet">
            <div className="admin-card-title">
              <span className="admin-icon">
                <BookPlus size={18} />
              </span>

              <div>
                <strong>
                  Tạo truyện mới
                </strong>

                <small>
                  Truyện + chương trong
                  một lần gửi
                </small>
              </div>
            </div>

            {/* CRAWLER */}

            <form
              onSubmit={handleCrawl}
              className="admin-form crawler-box"
            >
              <div className="crawler-heading">
                <div>
                  <span>
                    <ScanSearch size={14} />
                    CRAWLER ENGINE
                  </span>

                  <small>
                    Lấy metadata và nội dung
                    chương từ URL
                  </small>
                </div>
              </div>

              <div className="crawl-mode">
                <button
                  type="button"
                  className={
                    crawlMode === 'story'
                      ? 'active'
                      : ''
                  }
                  onClick={() =>
                    setCrawlMode('story')
                  }
                >
                  Tạo truyện mới
                </button>

                <button
                  type="button"
                  className={
                    crawlMode === 'existing'
                      ? 'active'
                      : ''
                  }
                  onClick={() =>
                    setCrawlMode('existing')
                  }
                >
                  Thêm vào truyện cũ
                </button>
              </div>

              <label>
                <span>
                  URL trang truyện
                </span>

                <div
                  style={{
                    display: 'flex',
                    gap: '10px',
                  }}
                >
                  <input
                    value={crawlUrl}
                    onChange={(e) =>
                      setCrawlUrl(
                        e.target.value,
                      )
                    }
                    placeholder="https://example.com/truyen/..."
                    style={{
                      flex: 1,
                    }}
                    disabled={
                      crawlBusy ||
                      busy
                    }
                  />

                  <button
                    type="submit"
                    className="secondary-button"
                    disabled={
                      crawlBusy ||
                      busy
                    }
                    title="Crawl truyện"
                  >
                    {crawlBusy ? (
                      <Loader2
                        className="spin"
                        size={16}
                      />
                    ) : (
                      <Globe size={16} />
                    )}
                  </button>
                </div>
              </label>

              <label>
                <span>
                  Số chương tối đa crawl
                </span>

                <input
                  type="number"
                  min="1"
                  max="100"
                  value={
                    crawlChapterLimit
                  }
                  onChange={(e) =>
                    setCrawlChapterLimit(
                      e.target.value,
                    )
                  }
                  disabled={
                    crawlBusy ||
                    busy
                  }
                />
              </label>

              <div className="crawl-hint">
                <Globe size={14} />

                <span>
                  Crawler sẽ thử tìm các link
                  có dạng “Chương 1”,
                  “Chapter 1”, “Chap 1”...
                  và đọc nội dung từng trang.
                </span>
              </div>
            </form>

            {/* STORY FORM */}

            <form
              onSubmit={createStory}
              className="admin-form"
            >
              <div className="two-col">
                <label>
                  <span>
                    Tên truyện
                  </span>

                  <input
                    value={story.ten}
                    onChange={(e) =>
                      setStoryField(
                        'ten',
                        e.target.value,
                      )
                    }
                    placeholder="Ví dụ: Mộng Giang Hồ"
                  />
                </label>

                <label>
                  <span>
                    Tác giả
                  </span>

                  <input
                    value={story.tac_gia}
                    onChange={(e) =>
                      setStoryField(
                        'tac_gia',
                        e.target.value,
                      )
                    }
                    placeholder="Tên tác giả"
                  />
                </label>
              </div>

              <label>
                <span>
                  Ảnh bìa URL
                </span>

                <input
                  value={story.anh_bia}
                  onChange={(e) =>
                    setStoryField(
                      'anh_bia',
                      e.target.value,
                    )
                  }
                  placeholder="https://..."
                />
              </label>

              <label>
                <span>
                  Mô tả
                </span>

                <textarea
                  value={story.mo_ta}
                  onChange={(e) =>
                    setStoryField(
                      'mo_ta',
                      e.target.value,
                    )
                  }
                  rows={3}
                  placeholder="Mô tả ngắn cho thẻ truyện…"
                />
              </label>

              <ChapterEditor
                chapters={chapters}
                updateChapter={
                  updateChapter
                }
                addChapter={
                  addChapter
                }
                removeChapter={
                  removeChapter
                }
              />

              <button
                className="primary-button"
                disabled={
                  busy ||
                  crawlBusy
                }
              >
                {busy ? (
                  <Loader2
                    className="spin"
                    size={17}
                  />
                ) : (
                  <FilePlus2 size={17} />
                )}

                {busy
                  ? 'Đang lưu…'
                  : 'Tạo truyện'}
              </button>
            </form>
          </section>

          {/* ==================================================
              SIDE
          ================================================== */}

          <div className="admin-side">
            {/* ADD CHAPTER */}

            <section className="admin-card accent-cyan">
              <div className="admin-card-title">
                <span className="admin-icon">
                  <Plus size={18} />
                </span>

                <div>
                  <strong>
                    Thêm chương
                  </strong>

                  <small>
                    Tự động nối tiếp chương
                    cuối cùng
                  </small>
                </div>
              </div>

              <form
                onSubmit={
                  addChaptersToExisting
                }
                className="admin-form"
              >
                <label>
                  <span>
                    Truyện
                  </span>

                  <div className="select-wrap">
                    <select
                      value={
                        selectedStoryId
                      }
                      onChange={(e) =>
                        setSelectedStoryId(
                          e.target.value,
                        )
                      }
                    >
                      <option value="">
                        Chọn truyện…
                      </option>

                      {stories.map(
                        (item) => (
                          <option
                            key={item.id}
                            value={
                              item.id
                            }
                          >
                            {item.ten}
                          </option>
                        ),
                      )}
                    </select>

                    <ChevronDown
                      size={15}
                    />
                  </div>
                </label>

                <div className="next-chapter-badge">
                  <span>
                    CHƯƠNG TIẾP THEO
                  </span>

                  <strong>
                    #
                    {
                      nextChapterNumber
                    }
                  </strong>
                </div>

                <ChapterEditor
                  chapters={
                    chapters
                  }
                  updateChapter={
                    updateChapter
                  }
                  addChapter={
                    addChapter
                  }
                  removeChapter={
                    removeChapter
                  }
                  compact
                  preserveNumbers
                />

                <button
                  className="secondary-button full"
                  disabled={
                    busy ||
                    crawlBusy ||
                    !selectedStoryId
                  }
                >
                  {busy ? (
                    <Loader2
                      className="spin"
                      size={16}
                    />
                  ) : (
                    <Plus size={16} />
                  )}

                  Thêm chương
                </button>
              </form>
            </section>

            {/* DELETE */}

            <section className="admin-card danger-card">
              <div className="admin-card-title">
                <span className="admin-icon danger">
                  <Trash2 size={18} />
                </span>

                <div>
                  <strong>
                    Xóa truyện
                  </strong>

                  <small>
                    Hành động không thể
                    hoàn tác
                  </small>
                </div>
              </div>

              <form
                onSubmit={deleteStory}
                className="admin-form"
              >
                <label>
                  <span>
                    Truyện cần xóa
                  </span>

                  <select
                    value={deleteId}
                    onChange={(e) =>
                      setDeleteId(
                        e.target.value,
                      )
                    }
                  >
                    <option value="">
                      Chọn truyện…
                    </option>

                    {stories.map(
                      (item) => (
                        <option
                          key={item.id}
                          value={item.id}
                        >
                          {item.ten}
                        </option>
                      ),
                    )}
                  </select>
                </label>

                <button
                  className="danger-button full"
                  disabled={
                    busy ||
                    crawlBusy
                  }
                >
                  <Trash2 size={16} />
                  Xóa vĩnh viễn
                </button>
              </form>
            </section>

            <button
              className="refresh-admin"
              onClick={onRefresh}
              disabled={
                busy ||
                crawlBusy
              }
            >
              <RefreshCw size={15} />
              Đồng bộ lại thư viện
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ============================================================
   CHAPTER EDITOR
   ============================================================ */

function ChapterEditor({
  chapters,
  updateChapter,
  addChapter,
  removeChapter,
  compact = false,
}) {
  return (
    <div
      className={`chapter-editor ${
        compact ? 'compact' : ''
      }`}
    >
      <div className="chapter-editor-head">
        <span>
          Chương · {chapters.length}
        </span>

        <button
          type="button"
          onClick={addChapter}
        >
          <Plus size={14} />
          Thêm dòng
        </button>
      </div>

      {chapters.map(
        (chapter, index) => (
          <div
            className="chapter-row"
            key={`${index}-${chapter.so_chuong}`}
          >
            <div className="chapter-number">
              #
              {chapter.so_chuong}
            </div>

            <div className="chapter-fields">
              <input
                value={
                  chapter.tieu_de
                }
                onChange={(e) =>
                  updateChapter(
                    index,
                    'tieu_de',
                    e.target.value,
                  )
                }
                placeholder="Tên chương"
              />

              <textarea
                value={
                  chapter.noi_dung
                }
                onChange={(e) =>
                  updateChapter(
                    index,
                    'noi_dung',
                    e.target.value,
                  )
                }
                rows={
                  compact ? 3 : 5
                }
                placeholder="Nội dung chương…"
              />

              <div className="audio-url-field">
                <input
                  value={
                    chapter.audio_url
                  }
                  onChange={(e) =>
                    updateChapter(
                      index,
                      'audio_url',
                      e.target.value,
                    )
                  }
                  placeholder="Audio URL — tùy chọn"
                />

                <span>
                  Tùy chọn
                </span>
              </div>
            </div>

            <button
              type="button"
              className="remove-chapter"
              onClick={() =>
                removeChapter(index)
              }
              disabled={
                chapters.length === 1
              }
              title="Xóa dòng"
            >
              <Trash2 size={15} />
            </button>
          </div>
        ),
      )}
    </div>
  )
}

