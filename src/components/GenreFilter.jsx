import { useEffect, useMemo, useState } from 'react'
import { Check, ChevronDown, Filter, Plus, RotateCcw, Search, X } from 'lucide-react'
import { supabase } from '../lib/supabase'

export default function GenreFilter({ value = [], onChange }) {
  const [genres, setGenres] = useState([])
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState('any')
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let active = true
    async function load() {
      setLoading(true)
      const { data } = await supabase.from('the_loai').select('id,ten').order('ten')
      if (active) {
        setGenres(data || [])
        setLoading(false)
      }
    }
    load()
    return () => { active = false }
  }, [])

  const selected = useMemo(
    () => genres.filter((genre) => value.includes(genre.id)),
    [genres, value],
  )

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return genres.filter((genre) => !q || genre.ten.toLowerCase().includes(q))
  }, [genres, query])

  const toggle = (id) => {
    onChange(value.includes(id) ? value.filter((item) => item !== id) : [...value, id])
  }

  return (
    <div className="genre-filter">
      <div className="genre-filter-head">
        <div>
          <div className="eyebrow"><Filter size={12} /> FILTER / GENRE</div>
          <strong>Lọc nhiều thể loại</strong>
        </div>
        <button
          className="genre-filter-reset"
          disabled={!value.length}
          onClick={() => onChange([])}
        >
          <RotateCcw size={13} /> Reset
        </button>
      </div>

      <div className="genre-chips">
        {selected.map((genre) => (
          <button key={genre.id} className="genre-chip selected" onClick={() => toggle(genre.id)}>
            {genre.ten}<X size={12} />
          </button>
        ))}
        {!selected.length && <span className="genre-empty">Chưa chọn thể loại</span>}
      </div>

      <div className="genre-filter-row">
        <div className="genre-mode">
          <button className={mode === 'any' ? 'active' : ''} onClick={() => setMode('any')}>
            ANY
          </button>
          <button className={mode === 'all' ? 'active' : ''} onClick={() => setMode('all')}>
            ALL
          </button>
        </div>

        <button className={`genre-picker-trigger ${open ? 'open' : ''}`} onClick={() => setOpen((v) => !v)}>
          <Plus size={14} />
          Thêm thể loại
          <ChevronDown size={14} />
        </button>
      </div>

      {open && (
        <div className="genre-picker">
          <div className="genre-search">
            <Search size={14} />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Tìm thể loại…" autoFocus />
          </div>
          <div className="genre-picker-list">
            {loading ? (
              <div className="genre-picker-state">Đang tải…</div>
            ) : visible.length ? visible.map((genre) => (
              <button
                key={genre.id}
                className={value.includes(genre.id) ? 'active' : ''}
                onClick={() => toggle(genre.id)}
              >
                <span>{genre.ten}</span>
                {value.includes(genre.id) && <Check size={14} />}
              </button>
            )) : (
              <div className="genre-picker-state">Không tìm thấy thể loại.</div>
            )}
          </div>
          <div className="genre-picker-foot">
            <span>{value.length} đã chọn</span>
            <span>{mode === 'any' ? 'Có ít nhất 1 thể loại' : 'Phải có tất cả thể loại'}</span>
          </div>
        </div>
      )}

      <input type="hidden" name="genreMode" value={mode} />
    </div>
  )
}
