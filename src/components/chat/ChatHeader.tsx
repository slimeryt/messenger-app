import { useEffect, useRef, useState } from 'react'
import { Chat } from '../../types'
import { Avatar } from '../ui/Avatar'
import { MoreVertical, ArrowLeft, Phone, Video, Pin, BellOff, Trash2, X, Copy } from 'lucide-react'

interface Props {
  chat: Chat
  memberCount: number
  onBack?: () => void
  onCall: (type: 'audio' | 'video') => void
  onShowPinned: () => void
  onShowMenu: () => void
  onShowProfile?: () => void | Promise<void>
  selectionCount?: number
  onClearSelection?: () => void
  onDeleteSelected?: () => void
  onCopySelected?: () => void
  canDelete?: boolean
  canCopy?: boolean
  dmUser?: { username: string; avatarUrl: string | null; online?: boolean; lastSeen?: number }
}

export function ChatHeader({ chat, memberCount, onBack, onCall, onShowPinned, onShowProfile, selectionCount = 0, onClearSelection, onDeleteSelected, onCopySelected, canDelete, canCopy, dmUser }: Props) {
  const displayName = chat.type === 'dm' && dmUser ? dmUser.username : chat.name
  const displayAvatar = chat.type === 'dm' && dmUser ? dmUser.avatarUrl : chat.avatarUrl
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  function fmtLastSeen(ts: number) {
    const d = Date.now() - ts
    if (d < 60000) return 'Last seen just now'
    if (d < 3600000) return `Last seen ${Math.floor(d / 60000)}m ago`
    if (d < 86400000) return `Last seen ${Math.floor(d / 3600000)}h ago`
    return `Last seen ${new Date(ts).toLocaleDateString([], { month: 'short', day: 'numeric' })}`
  }

  const subtitle =
    chat.type === 'dm'
      ? dmUser?.online
        ? 'Online'
        : dmUser?.lastSeen
          ? fmtLastSeen(dmUser.lastSeen)
          : 'Offline'
      : chat.type === 'channel'
      ? `${memberCount} subscribers`
      : `${memberCount} members`

  useEffect(() => {
    if (!menuOpen) return
    function handler(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [menuOpen])

  const menuItems = [
    { icon: <Phone size={15} />, label: 'Audio Call', action: () => { onCall('audio'); setMenuOpen(false) } },
    { icon: <Video size={15} />, label: 'Video Call', action: () => { onCall('video'); setMenuOpen(false) } },
    { icon: <Pin size={15} />, label: 'Pinned Messages', action: () => { onShowPinned(); setMenuOpen(false) } },
    { icon: <BellOff size={15} />, label: 'Mute', action: () => setMenuOpen(false) },
    null,
    { icon: <Trash2 size={15} />, label: 'Clear History', danger: true, action: () => setMenuOpen(false) },
  ]

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '8px 12px',
        flexShrink: 0,
        gap: 10,
        background: 'var(--bg)',
      }}
    >
      {/* Left: back / X with crossfade */}
      <button
        onClick={selectionCount > 0 ? onClearSelection : onBack}
        style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--bg-2)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: 'var(--text)', position: 'relative' }}
      >
        <span style={{ position: 'absolute', opacity: selectionCount > 0 ? 1 : 0, transform: `rotate(${selectionCount > 0 ? 0 : 180}deg)`, transition: 'opacity 0.25s, transform 0.3s cubic-bezier(0.34,1.56,0.64,1)' }}>
          <X size={20} />
        </span>
        <span style={{ position: 'absolute', opacity: selectionCount > 0 ? 0 : 1, transform: `rotate(${selectionCount > 0 ? -180 : 0}deg)`, transition: 'opacity 0.25s, transform 0.3s cubic-bezier(0.34,1.56,0.64,1)' }}>
          <ArrowLeft size={20} />
        </span>
      </button>

      {/* Center pill — fixed size, content crossfades */}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 999, flex: 1, minWidth: 0, height: 40, boxSizing: 'border-box', overflow: 'hidden' }}>
        {/* Normal content */}
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', gap: 8, padding: '6px 14px 6px 6px', opacity: selectionCount > 0 ? 0 : 1, transform: `translateX(${selectionCount > 0 ? -12 : 0}px)`, transition: 'opacity 0.2s, transform 0.2s', pointerEvents: selectionCount > 0 ? 'none' : 'auto' }}>
          <Avatar url={displayAvatar} name={displayName} size={28} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: 1.2 }}>{displayName}</div>
            <div style={{ fontSize: 11, color: chat.type === 'dm' && dmUser?.online ? '#22c55e' : 'var(--text-3)', lineHeight: 1.2 }}>{subtitle}</div>
          </div>
          {onShowProfile && <button onClick={onShowProfile} style={{ position: 'absolute', inset: 0, borderRadius: 999, cursor: 'pointer' }} />}
        </div>
        {/* Selection count */}
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', padding: '0 16px', opacity: selectionCount > 0 ? 1 : 0, transform: `translateX(${selectionCount > 0 ? 0 : 12}px)`, transition: 'opacity 0.2s, transform 0.2s', pointerEvents: selectionCount > 0 ? 'auto' : 'none' }}>
          <span style={{ fontWeight: 600, fontSize: 14 }}>{selectionCount} selected</span>
        </div>
      </div>

      {/* Right: grid cell so 3-dot and action pill share the same space */}
      <div style={{ display: 'grid', flexShrink: 0, alignItems: 'center' }}>
        {/* 3-dot */}
        <div ref={menuRef} style={{ gridArea: '1/1', opacity: selectionCount > 0 ? 0 : 1, transform: `scale(${selectionCount > 0 ? 0.8 : 1})`, transition: 'opacity 0.2s, transform 0.2s', pointerEvents: selectionCount > 0 ? 'none' : 'auto', position: 'relative' }}>
          <button
            onClick={() => setMenuOpen((v) => !v)}
            style={{ width: 40, height: 40, borderRadius: '50%', background: menuOpen ? 'var(--bg-3)' : 'var(--bg-2)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text)' }}
          >
            <MoreVertical size={20} />
          </button>
          {menuOpen && (
            <div
              className="menu-dropdown"
              style={{ position: 'fixed', top: 64, right: 12, background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', minWidth: 180, zIndex: 200, boxShadow: '0 8px 24px rgba(0,0,0,0.3)' }}
            >
              {menuItems.map((item, i) =>
                item === null ? (
                  <div key={i} style={{ height: 1, background: 'var(--border)', marginInline: 12 }} />
                ) : (
                  <button key={item.label} onClick={item.action} style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '11px 14px', fontSize: 14, color: item.danger ? '#ef4444' : 'var(--text)', textAlign: 'left' }}>
                    <span style={{ color: item.danger ? '#ef4444' : 'var(--text-3)' }}>{item.icon}</span>
                    {item.label}
                  </button>
                )
              )}
            </div>
          )}
        </div>

        {/* Action pill */}
        <div style={{ gridArea: '1/1', display: 'flex', alignItems: 'center', height: 40, background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 999, overflow: 'hidden', opacity: selectionCount > 0 ? 1 : 0, transform: `scale(${selectionCount > 0 ? 1 : 0.85})`, transition: 'opacity 0.2s, transform 0.2s', pointerEvents: selectionCount > 0 ? 'auto' : 'none' }}>
          {canCopy && (
            <button onClick={onCopySelected} style={{ padding: '0 14px', height: '100%', display: 'flex', alignItems: 'center', color: 'var(--text-2)', borderRight: canDelete ? '1px solid var(--border)' : 'none' }}>
              <Copy size={17} />
            </button>
          )}
          {canDelete && (
            <button onClick={onDeleteSelected} style={{ padding: '0 14px', height: '100%', display: 'flex', alignItems: 'center', color: '#ef4444' }}>
              <Trash2 size={17} />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
