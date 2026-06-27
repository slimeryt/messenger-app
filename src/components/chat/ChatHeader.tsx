import { Chat } from '../../types'
import { Avatar } from '../ui/Avatar'
import { Phone, Video, MoreVertical, Pin, ArrowLeft } from 'lucide-react'

interface Props {
  chat: Chat
  memberCount: number
  onBack?: () => void
  onCall: (type: 'audio' | 'video') => void
  onShowPinned: () => void
  onShowMenu: () => void
}

export function ChatHeader({ chat, memberCount, onBack, onCall, onShowPinned, onShowMenu }: Props) {
  const subtitle =
    chat.type === 'dm'
      ? 'Direct message'
      : chat.type === 'channel'
      ? `${memberCount} subscribers`
      : `${memberCount} members`

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '0 8px',
        height: 56,
        borderBottom: '1px solid var(--border)',
        flexShrink: 0,
        background: 'var(--bg)',
      }}
    >
      {onBack && (
        <button onClick={onBack} style={{ color: 'var(--accent)', padding: 6, display: 'flex', alignItems: 'center', flexShrink: 0 }}>
          <ArrowLeft size={22} />
        </button>
      )}
      <Avatar url={chat.avatarUrl} name={chat.name} size={36} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {chat.name}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-2)' }}>{subtitle}</div>
      </div>
      <div style={{ display: 'flex', gap: 4 }}>
        <IconBtn title="Audio call" onClick={() => onCall('audio')}><Phone size={18} /></IconBtn>
        <IconBtn title="Video call" onClick={() => onCall('video')}><Video size={18} /></IconBtn>
        <IconBtn title="Pinned" onClick={onShowPinned}><Pin size={18} /></IconBtn>
        <IconBtn title="More" onClick={onShowMenu}><MoreVertical size={18} /></IconBtn>
      </div>
    </div>
  )
}

function IconBtn({ children, title, onClick }: { children: React.ReactNode; title: string; onClick: () => void }) {
  return (
    <button
      title={title}
      onClick={onClick}
      style={{
        color: 'var(--text-2)',
        padding: 7,
        borderRadius: 'var(--radius)',
        display: 'flex',
        alignItems: 'center',
      }}
    >
      {children}
    </button>
  )
}
