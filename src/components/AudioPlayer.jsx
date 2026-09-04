import {
  Pause,
  Play,
  RotateCcw,
  Square,
  Volume2,
} from 'lucide-react'
import {
  useEffect,
  useRef,
  useState,
} from 'react'

const MAX_TTS_CHARS = 170

function splitText(text = '') {
  const normalized = String(text)
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .trim()

  if (!normalized) return []

  /*
   * Tách theo dấu câu trước.
   * Sau đó gom lại để tránh request quá nhỏ.
   */
  const parts = normalized.split(
    /(?<=[.!?;。！？…])\s+|\n+/u,
  )

  const chunks = []
  let current = ''

  for (const part of parts) {
    const value = part.trim()

    if (!value) continue

    if (
      `${current} ${value}`.trim()
        .length <= MAX_TTS_CHARS
    ) {
      current = `${current} ${value}`.trim()
      continue
    }

    if (current) {
      chunks.push(current)
    }

    /*
     * Một câu quá dài thì cắt tiếp.
     */
    if (
      value.length > MAX_TTS_CHARS
    ) {
      for (
        let i = 0;
        i < value.length;
        i += MAX_TTS_CHARS
      ) {
        chunks.push(
          value.slice(
            i,
            i + MAX_TTS_CHARS,
          ),
        )
      }

      current = ''
    } else {
      current = value
    }
  }

  if (current) {
    chunks.push(current)
  }

  return chunks
}

function speak(text) {
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'vi-VN';
  speechSynthesis.speak(utterance);
}

export default function AudioPlayer({
  currentChapter,
}) {
  const audioRef =
    useRef(new Audio())

  const playTokenRef =
    useRef(0)

  const [isPlaying, setIsPlaying] =
    useState(false)

  const [currentIndex, setCurrentIndex] =
    useState(0)

  const [chunks, setChunks] =
    useState([])

  const [error, setError] =
    useState('')

  const audioUrl =
    currentChapter?.audio_url?.trim() ||
    ''

  const text =
    currentChapter?.noi_dung || ''

  /*
   * Nếu chương có audio_url:
   * không cần chia text.
   *
   * Nếu không có:
   * dùng TTS ngoài hệ thống.
   */
  useEffect(() => {
    const audio =
      audioRef.current

    playTokenRef.current += 1

    audio.pause()
    audio.removeAttribute('src')
    audio.load()

    setIsPlaying(false)
    setCurrentIndex(0)
    setError('')

    if (audioUrl) {
      setChunks([])
      return
    }

    setChunks(splitText(text))
  }, [
    currentChapter?.id,
    audioUrl,
    text,
  ])

  /*
   * Cleanup khi component unmount.
   */
  useEffect(() => {
    return () => {
      playTokenRef.current += 1

      const audio =
        audioRef.current

      audio.pause()
      audio.removeAttribute('src')
      audio.load()
    }
  }, [])

  const playExternalAudio =
    async () => {
      const audio =
        audioRef.current

      if (!audioUrl) return

      try {
        setError('')

        /*
         * audio_url là audio thật do admin cung cấp.
         */
        if (
          audio.src !== audioUrl
        ) {
          audio.src = audioUrl
          audio.load()
        }

        await audio.play()

        setIsPlaying(true)
      } catch (err) {
        console.error(err)

        setIsPlaying(false)

        setError(
          'Không thể phát Audio URL. Hãy kiểm tra URL và CORS của máy chủ audio.',
        )
      }
    }

  const playTtsChunk =
    async (index, token) => {
      if (
        token !==
        playTokenRef.current
      ) {
        return
      }

      if (
        index >= chunks.length
      ) {
        setIsPlaying(false)
        setCurrentIndex(0)
        return
      }

      const chunk =
        chunks[index]

      const audio =
        audioRef.current

      try {
        setError('')

        audio.pause()
        audio.currentTime = 0

        /*
         * Google TTS là audio từ máy chủ bên ngoài,
         * KHÔNG phải giọng hệ thống của Windows/Chrome.
         */
        audio.src =
          getGoogleTtsUrl(chunk)

        audio.load()

        setCurrentIndex(index)

        await audio.play()

        if (
          token ===
          playTokenRef.current
        ) {
          setIsPlaying(true)
        }
      } catch (err) {
        console.error(err)

        if (
          token ===
          playTokenRef.current
        ) {
          setIsPlaying(false)

          setError(
            'Không thể tạo/phát giọng đọc. Hãy thử lại sau.',
          )
        }
      }
    }

  const handlePlay =
    async () => {
      setError('')

      const audio =
        audioRef.current

      /*
       * ================================================
       * MODE 1 — AUDIO URL
       * ================================================
       */
      if (audioUrl) {
        if (
          !audio.paused &&
          !audio.ended
        ) {
          audio.pause()
          setIsPlaying(false)
          return
        }

        if (
          audio.currentTime > 0 &&
          audio.currentTime <
            audio.duration
        ) {
          try {
            await audio.play()
            setIsPlaying(true)
            return
          } catch {
            // fallback bên dưới
          }
        }

        await playExternalAudio()
        return
      }

      /*
       * ================================================
       * MODE 2 — EXTERNAL TTS
       * ================================================
       */

      if (!chunks.length) {
        setError(
          'Chương này chưa có nội dung để đọc.',
        )
        return
      }

      /*
       * Nếu đang pause audio hiện tại,
       * tiếp tục từ đoạn đang nghe.
       */
      if (
        !audio.paused &&
        !audio.ended
      ) {
        audio.pause()
        setIsPlaying(false)
        return
      }

      const token =
        ++playTokenRef.current

      /*
       * Nếu audio đã có src và đang pause,
       * thử resume trước.
       */
      if (
        audio.src &&
        audio.currentTime > 0 &&
        !audio.ended
      ) {
        try {
          await audio.play()
          setIsPlaying(true)
          return
        } catch {
          // Tạo lại chunk bên dưới.
        }
      }

      await playTtsChunk(
        currentIndex,
        token,
      )
    }

  const handleStop =
    () => {
      playTokenRef.current += 1

      const audio =
        audioRef.current

      audio.pause()
      audio.currentTime = 0

      setIsPlaying(false)
      setCurrentIndex(0)
      setError('')
    }

  const handleRestart =
    async () => {
      handleStop()

      /*
       * Cho React render state mới rồi
       * bắt đầu lại.
       */
      setTimeout(() => {
        handlePlay()
      }, 0)
    }

  /*
   * Audio URL dùng onended trực tiếp.
   *
   * TTS dùng callback để chuyển chunk.
   */
  useEffect(() => {
    const audio =
      audioRef.current

    const handleEnded =
      async () => {
        if (audioUrl) {
          setIsPlaying(false)
          return
        }

        const next =
          currentIndex + 1

        if (
          next >= chunks.length
        ) {
          setIsPlaying(false)
          setCurrentIndex(0)
          return
        }

        const token =
          playTokenRef.current

        setCurrentIndex(next)

        await playTtsChunk(
          next,
          token,
        )
      }

    audio.addEventListener(
      'ended',
      handleEnded,
    )

    return () => {
      audio.removeEventListener(
        'ended',
        handleEnded,
      )
    }
  }, [
    audioUrl,
    currentIndex,
    chunks,
  ])

  if (!currentChapter) {
    return null
  }

  const modeLabel = audioUrl
    ? 'AUDIO FILE'
    : 'VIETNAMESE TTS'

  const progressText = audioUrl
    ? 'Audio chương'
    : chunks.length
      ? `Đoạn ${
          currentIndex + 1
        } / ${chunks.length}`
      : 'Sẵn sàng đọc'

  return (
    <div className={`tts-player-box ${isPlaying ? 'is-playing' : ''}`}>
      <div className="audio-orbit">
        <span /><span /><span /><span />
      </div>

      <button
        className="audio-main-button"
        onClick={handlePlay}
        aria-label={isPlaying ? 'Tạm dừng audio' : 'Phát audio'}
      >
        <span className="audio-button-core">
          {isPlaying ? <Pause size={18} /> : <Play size={18} />}
        </span>
        <span className="audio-wave">
          <i /><i /><i /><i /><i />
        </span>
      </button>

      <div className="audio-copy">
        <strong>{modeLabel}</strong>
        <span>{progressText}</span>
      </div>

      <div className="audio-actions">
        {isPlaying && (
          <button className="audio-small-button" onClick={handleStop} title="Dừng">
            <Square size={14} />
          </button>
        )}
        {!audioUrl && (
          <button className="audio-small-button" onClick={handleRestart} title="Đọc lại từ đầu">
            <RotateCcw size={14} />
          </button>
        )}
      </div>

      <div className="audio-volume"><Volume2 size={15} /></div>

      {error && <div className="audio-error">{error}</div>}
    </div>
  )
}
