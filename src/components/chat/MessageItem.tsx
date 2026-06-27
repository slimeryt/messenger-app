import { Message, User } from '../../types'
import { Avatar } from '../ui/Avatar'
import { Play, Pause, FileText, CornerUpLeft, ImageIcon } from 'lucide-react'
import { useRef, useState, useEffect } from 'react'
import { openUrl } from '../../lib/browser'

function getBubbleRadius(isOwn: boolean): string {
  const style = localStorage.getItem('nod_bubbleStyle') ?? 'Modern'
  if (style === 'Classic') return '18px'
  if (style === 'Minimal') return '6px'
  return isOwn ? '12px 12px 2px 12px' : '12px 12px 12px 2px'
}

function extractUrl(text: string): string | null {
  const m = text.match(/(https?:\/\/[^\s]+)/)
  return m ? m[1] : null
}

function LinkPreview({ url }: { url: string }) {
  const [meta, setMeta] = useState<{ title?: string; description?: string; image?: string } | null>(null)

  useEffect(() => {
    if (localStorage.getItem('nod_linkPrev') === 'false') return
    fetch(`https://api.microlink.io/?url=${encodeURIComponent(url)}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.status === 'success') setMeta({ title: d.data.title, description: d.data.description, image: d.data.image?.url })
      })
      .catch(() => {})
  }, [url])

  if (!meta || (!meta.title && !meta.image)) return null

  return (
    <a
      href={url}
      onClick={(e) => { e.preventDefault(); openUrl(url) }}
      style={{ display: 'block', marginTop: 6, background: 'rgba(0,0,0,0.2)', borderRadius: 8, overflow: 'hidden', textDecoration: 'none' }}
    >
      {meta.image && <img src={meta.image} alt="" style={{ width: '100%', maxHeight: 140, objectFit: 'cover', display: 'block' }} />}
      <div style={{ padding: '6px 10px' }}>
        {meta.title && <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 2 }}>{meta.title}</div>}
        {meta.description && <div style={{ fontSize: 12, color: 'var(--text-2)', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{meta.description}</div>}
      </div>
    </a>
  )
}

function AutoImage({ url }: { url: string }) {
  const lowData = localStorage.getItem('nod_lowData') === 'true'
  const autoImg = !lowData && localStorage.getItem('nod_autoImg') !== 'false'
  const [loaded, setLoaded] = useState(autoImg)

  if (!loaded) {
    return (
      <button
        onClick={() => setLoaded(true)}
        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 0', color: 'var(--text-2)', fontSize: 13 }}
      >
        <ImageIcon size={16} /> Tap to load image
      </button>
    )
  }

  return <img src={url} alt="attachment" style={{ maxWidth: 240, borderRadius: 6, display: 'block' }} />
}

interface Props {
  msg: Message
  sender: User | null
  isOwn: boolean
  onReply: (msg: Message) => void
  onReact: (msgId: string, emoji: string) => void
}

const EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🔥']

export function MessageItem({ msg, sender, isOwn, onReply, onReact }: Props) {
  const [showReactions, setShowReactions] = useState(false)
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  if (msg.deleted) {
    return (
      <div style={{ padding: '2px 16px', color: 'var(--text-3)', fontSize: 13, fontStyle: 'italic' }}>
        Message deleted
      </div>
    )
  }

  const time = new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

  function handleHoldStart() {
    holdTimer.current = setTimeout(() => setShowReactions(true), 500)
  }
  function handleHoldEnd() {
    if (holdTimer.current) clearTimeout(holdTimer.current)
  }

  const reactionEntries = Object.entries(msg.reactions ?? {}).filter(([, uids]) => uids.length > 0)

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: isOwn ? 'row-reverse' : 'row',
        gap: 8,
        padding: '2px 16px',
        alignItems: 'flex-end',
        position: 'relative',
      }}
      onMouseDown={handleHoldStart}
      onMouseUp={handleHoldEnd}
      onTouchStart={handleHoldStart}
      onTouchEnd={handleHoldEnd}
    >
      {!isOwn && (
        <Avatar url={sender?.avatarUrl ?? null} name={sender?.username ?? '?'} size={32} />
      )}

      <div style={{ maxWidth: '70%', display: 'flex', flexDirection: 'column', gap: 2, alignItems: isOwn ? 'flex-end' : 'flex-start' }}>
        {!isOwn && sender && (
          <span style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 500, paddingLeft: 4 }}>
            {sender.username}#{sender.tag}
          </span>
        )}

        {msg.replyToId && (
          <div
            style={{
              background: 'var(--bg-3)',
              borderLeft: '3px solid var(--accent)',
              padding: '4px 8px',
              borderRadius: 4,
              fontSize: 12,
              color: 'var(--text-2)',
              maxWidth: '100%',
            }}
          >
            <span style={{ color: 'var(--accent)', fontWeight: 500 }}>{msg.replyToSender}</span>
            <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {msg.replyToContent}
            </div>
          </div>
        )}

        <div
          style={{
            background: isOwn ? 'var(--bubble-out)' : 'var(--bubble-in)',
            borderRadius: getBubbleRadius(isOwn),
            padding: '8px 12px',
            fontSize: 'var(--msg-font-size, 14px)',
            lineHeight: 1.5,
            color: 'var(--text)',
            wordBreak: 'break-word',
          }}
        >
          {msg.type === 'audio' ? (
            <AudioMessage url={msg.attachmentUrl!} isOwn={isOwn} />
          ) : msg.type === 'image' && msg.attachmentUrl ? (
            <AutoImage url={msg.attachmentUrl} />
          ) : msg.type === 'file' && msg.attachmentUrl ? (
            <a
              href={msg.attachmentUrl}
              onClick={(e) => { e.preventDefault(); openUrl(msg.attachmentUrl!) }}
              style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text)' }}
            >
              <FileText size={16} />
              <span style={{ fontSize: 13 }}>{msg.attachmentMeta?.name ?? 'File'}</span>
            </a>
          ) : (
            <>
              <span>{msg.content}</span>
              {extractUrl(msg.content) && <LinkPreview url={extractUrl(msg.content)!} />}
            </>
          )}
        </div>

        {reactionEntries.length > 0 && (
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {reactionEntries.map(([emoji, uids]) => (
              <button
                key={emoji}
                onClick={() => onReact(msg.id, emoji)}
                style={{
                  background: 'var(--bg-3)',
                  border: '1px solid var(--border)',
                  borderRadius: 12,
                  padding: '2px 6px',
                  fontSize: 12,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 3,
                }}
              >
                {emoji} <span style={{ color: 'var(--text-2)' }}>{uids.length}</span>
              </button>
            ))}
          </div>
        )}

        <span style={{ fontSize: 11, color: 'var(--text-3)', paddingInline: 4 }}>
          {time}{msg.edited && ' · edited'}
        </span>
      </div>

      <button
        onClick={() => onReply(msg)}
        style={{ color: 'var(--text-3)', opacity: 0, padding: 4, transition: 'opacity 0.1s' }}
        className="reply-btn"
        title="Reply"
      >
        <CornerUpLeft size={15} />
      </button>

      {showReactions && (
        <div
          style={{
            position: 'absolute',
            bottom: '100%',
            [isOwn ? 'right' : 'left']: 16,
            background: 'var(--bg-2)',
            border: '1px solid var(--border)',
            borderRadius: 20,
            padding: '6px 10px',
            display: 'flex',
            gap: 8,
            zIndex: 10,
          }}
          onMouseLeave={() => setShowReactions(false)}
        >
          {EMOJIS.map((e) => (
            <button
              key={e}
              onClick={() => { onReact(msg.id, e); setShowReactions(false) }}
              style={{ fontSize: 18, cursor: 'pointer', lineHeight: 1 }}
            >
              {e}
            </button>
          ))}
        </div>
      )}

      <style>{`.reply-btn:hover, [style*="display: flex"]:hover .reply-btn { opacity: 1 }`}</style>
    </div>
  )
}

function AudioMessage({ url, isOwn }: { url: string; isOwn: boolean }) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(0)
  const [current, setCurrent] = useState(0)
  const [barHeights, setBarHeights] = useState<number[]>([])
  const bars = 28

  // Decode audio and extract real waveform
  useEffect(() => {
    async function extractWaveform() {
      try {
        const ctx = new AudioContext()
        const res = await fetch(url)
        const buf = await res.arrayBuffer()
        const decoded = await ctx.decodeAudioData(buf)
        const data = decoded.getChannelData(0)
        const step = Math.floor(data.length / bars)
        const heights = Array.from({ length: bars }, (_, i) => {
          let sum = 0
          for (let j = 0; j < step; j++) sum += Math.abs(data[i * step + j])
          const avg = sum / step
          return Math.max(3, Math.round(avg * 80))
        })
        setBarHeights(heights)
        ctx.close()
      } catch {
        // fallback: random-ish heights
        setBarHeights(Array.from({ length: bars }, (_, i) => 4 + Math.floor(Math.abs(Math.sin(i * 1.3)) * 16)))
      }
    }
    extractWaveform()
  }, [url])

  useEffect(() => {
    const a = audioRef.current
    if (!a) return
    const onTime = () => {
      setCurrent(a.currentTime)
      setProgress(a.duration ? a.currentTime / a.duration : 0)
    }
    const onLoaded = () => setDuration(a.duration)
    const onEnded = () => { setPlaying(false); setProgress(0); setCurrent(0) }
    a.addEventListener('timeupdate', onTime)
    a.addEventListener('loadedmetadata', onLoaded)
    a.addEventListener('ended', onEnded)
    return () => { a.removeEventListener('timeupdate', onTime); a.removeEventListener('loadedmetadata', onLoaded); a.removeEventListener('ended', onEnded) }
  }, [])

  function togglePlay() {
    const a = audioRef.current
    if (!a) return
    if (playing) { a.pause(); setPlaying(false) }
    else { a.play(); setPlaying(true) }
  }

  function seek(e: React.MouseEvent<HTMLDivElement>) {
    const a = audioRef.current
    if (!a || !a.duration) return
    const rect = e.currentTarget.getBoundingClientRect()
    const pct = (e.clientX - rect.left) / rect.width
    a.currentTime = pct * a.duration
  }

  function fmt(s: number) {
    const m = Math.floor(s / 60)
    return `${m}:${String(Math.floor(s % 60)).padStart(2, '0')}`
  }

  const accent = isOwn ? 'rgba(255,255,255,0.9)' : 'var(--accent)'
  const dim = isOwn ? 'rgba(255,255,255,0.35)' : 'var(--text-3)'

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 200, maxWidth: 260 }}>
      <audio ref={audioRef} src={url} preload="metadata" />

      {/* Play/Pause */}
      <button
        onClick={togglePlay}
        style={{ width: 36, height: 36, borderRadius: '50%', background: isOwn ? 'rgba(255,255,255,0.2)' : 'var(--bg-4)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: isOwn ? '#fff' : 'var(--text)' }}
      >
        {playing ? <Pause size={16} /> : <Play size={16} />}
      </button>

      {/* Waveform + time */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
        {/* Waveform bars (seekable) */}
        {(() => {
          const heights = barHeights.length ? barHeights : Array.from({ length: bars }, () => 8)
          const renderBars = (color: string) => (
            <div style={{ display: 'flex', alignItems: 'center', gap: 1.5, height: 24 }}>
              {Array.from({ length: bars }).map((_, i) => (
                <div key={i} style={{ width: 2.5, borderRadius: 2, height: heights[i % heights.length], background: color, flexShrink: 0 }} />
              ))}
            </div>
          )
          return (
            <div onClick={seek} style={{ position: 'relative', cursor: 'pointer', height: 24 }}>
              {renderBars(dim)}
              <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', width: `${progress * 100}%`, transition: 'width 0.08s linear' }}>
                {renderBars(accent)}
              </div>
            </div>
          )
        })()}

        {/* Time */}
        <span style={{ fontSize: 10, color: dim, fontVariantNumeric: 'tabular-nums' }}>
          {playing || current > 0 ? fmt(current) : fmt(duration)}
        </span>
      </div>
    </div>
  )
}
