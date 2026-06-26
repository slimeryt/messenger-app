import { Message, User } from '../../types'
import { Avatar } from '../ui/Avatar'
import { Mic, FileText, CornerUpLeft } from 'lucide-react'
import { useRef, useState } from 'react'

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
            borderRadius: isOwn ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
            padding: '8px 12px',
            fontSize: 14,
            lineHeight: 1.5,
            color: 'var(--text)',
            wordBreak: 'break-word',
          }}
        >
          {msg.type === 'audio' ? (
            <AudioMessage url={msg.attachmentUrl!} />
          ) : msg.type === 'image' && msg.attachmentUrl ? (
            <img
              src={msg.attachmentUrl}
              alt="attachment"
              style={{ maxWidth: 240, borderRadius: 6, display: 'block' }}
            />
          ) : msg.type === 'file' && msg.attachmentUrl ? (
            <a
              href={msg.attachmentUrl}
              target="_blank"
              rel="noreferrer"
              style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text)' }}
            >
              <FileText size={16} />
              <span style={{ fontSize: 13 }}>{msg.attachmentMeta?.name ?? 'File'}</span>
            </a>
          ) : (
            <span>{msg.content}</span>
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

function AudioMessage({ url }: { url: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 180 }}>
      <Mic size={16} style={{ flexShrink: 0 }} />
      <audio controls src={url} style={{ height: 28, flex: 1 }} />
    </div>
  )
}
