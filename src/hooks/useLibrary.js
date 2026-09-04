import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export function useLibrary(userId = null) {
  const [stories, setStories] = useState([])
  const [favorites, setFavorites] = useState([])
  const [lastRead, setLastRead] = useState(null)
  const [readingStats, setReadingStats] = useState([])
  const [loading, setLoading] = useState(true)

  const loadReadingStats = useCallback(async () => {
    if (!userId) {
      setReadingStats([])
      return []
    }

    const { data, error } = await supabase
      .from('reading_stats')
      .select('*')
      .eq('user_id', userId)
      .order('lan_doc_cuoi', { ascending: false })

    if (error) {
      console.warn('Không tải được reading_stats:', error.message)
      setReadingStats([])
      return []
    }

    setReadingStats(data || [])
    return data || []
  }, [userId])

  const refresh = useCallback(async () => {
    setLoading(true)

    const [storiesResult, favoritesResult, historyResult] = await Promise.all([
      supabase
        .from('truyen')
        .select('*')
        .order('ngay_tao', { ascending: false }),

      supabase
        .from('yeu_thich')
        .select('truyen_id'),

      supabase
        .from('lich_su_doc')
        .select('*, truyen(*), chuong(*)')
        .order('cap_nhat_luc', { ascending: false })
        .limit(1),
    ])

    setStories(storiesResult.data || [])
    setFavorites((favoritesResult.data || []).map((item) => item.truyen_id))
    setLastRead(historyResult.data?.[0] || null)

    await loadReadingStats()
    setLoading(false)

    return {
      stories: storiesResult.data || [],
      favorites: favoritesResult.data || [],
      lastRead: historyResult.data?.[0] || null,
    }
  }, [loadReadingStats])

  useEffect(() => {
    refresh()
  }, [refresh])

  const toggleFavorite = useCallback(async (storyId) => {
    const active = favorites.includes(storyId)

    setFavorites((current) =>
      active
        ? current.filter((id) => id !== storyId)
        : [...current, storyId],
    )

    const result = active
      ? await supabase.from('yeu_thich').delete().eq('truyen_id', storyId)
      : await supabase.from('yeu_thich').insert({ truyen_id: storyId })

    if (result.error) {
      setFavorites((current) =>
        active ? [...current, storyId] : current.filter((id) => id !== storyId),
      )
      throw result.error
    }
  }, [favorites])

  const loadChapters = useCallback(async (storyId) => {
    const { data, error } = await supabase
      .from('chuong')
      .select('*')
      .eq('truyen_id', storyId)
      .order('so_chuong', { ascending: true })

    if (error) throw error
    return data || []
  }, [])

  const saveHistory = useCallback(async (storyId, chapterId) => {
    if (!userId) return { data: null, error: null };
    const { data, error } = await supabase
      .from('lich_su_doc')
      .insert({
        truyen_id: storyId,
        chuong_dang_doc: chapterId,
      })
      .select('*, truyen(*), chuong(*)')
      .maybeSingle()

    if (!error && data) setLastRead(data)
    return { data, error }
  }, [])

  const saveReadingSession = useCallback(async ({
    storyId,
    chapterNumber,
    totalChapters,
    seconds = 0,
    completed = false,
  }) => {
    if (!userId || !storyId || seconds <= 0) return { data: null, error: null }

    const { data: existing, error: readError } = await supabase
      .from('reading_stats')
      .select('*')
      .eq('user_id', userId)
      .eq('truyen_id', storyId)
      .maybeSingle()

    if (readError) return { data: null, error: readError }

    const payload = {
      user_id: userId,
      truyen_id: storyId,
      chuong_cuoi: Math.max(
        Number(existing?.chuong_cuoi || 0),
        Number(chapterNumber || 0),
      ),
      tong_chuong: Math.max(
        Number(existing?.tong_chuong || 0),
        Number(totalChapters || 0),
      ),
      thoi_gian_doc: Number(existing?.thoi_gian_doc || 0) + Number(seconds || 0),
      hoan_thanh: Boolean(existing?.hoan_thanh || completed),
      lan_doc_cuoi: new Date().toISOString(),
    }

    const { data, error } = await supabase
      .from('reading_stats')
      .upsert(payload, { onConflict: 'user_id,truyen_id' })
      .select()
      .single()

    if (!error && data) {
      setReadingStats((current) => {
        const rest = current.filter((item) => item.truyen_id !== storyId)
        return [data, ...rest]
      })
    }

    return { data, error }
  }, [userId])

  return {
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
    loadReadingStats,
  }
}

