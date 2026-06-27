import { useEffect, useRef, useState } from 'react'
import { Chat } from '../../types'
import { Avatar } from '../ui/Avatar'
import { MoreVertical, ArrowLeft, Phone, Video, Pin, BellOff, Trash2 } from 'lucide-react'

interface Props {
  chat: Chat
  memberCount: number
  onBack?: () => void
  onCall: (type: 'audio' | 'video') => void
  onShowPinned: () => void
  onShowMenu: () => void
  onShowProfile?: () => void | Promise<void>
}

export function ChatHeader({ chat, memberCount, onBack, onCall, onShowPinned, onShowProfile }: Props) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const subtitle =
    chat.type === 'dm'
      ? 'Online'
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
      {/* Left: back */}
      {onBack ? (
        <button
          onClick={onBack}
          style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--bg-2)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: 'var(--text)' }}
        >
          <ArrowLeft size={20} />
        </button>
      ) : (
        <div style={{ width: 40 }} />
      )}

      {/* Center: pill */}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 999, padding: '6px 14px 6px 6px', flex: 1 }}>
        <Avatar url={chat.avatarUrl} name={chat.name} size={28} />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: 1.2 }}>
            {chat.name}
          </div>
          <div style={{ fontSize: 11, color: chat.type === 'dm' ? '#22c55e' : 'var(--text-3)', lineHeight: 1.2 }}>
            {subtitle}
          </div>
        </div>
        {onShowProfile && (
          <button
            onClick={onShowProfile}
            style={{ position: 'absolute', inset: 0, borderRadius: 999, cursor: 'pointer' }}
          />
        )}
      </div>

      {/* Right: 3-dot + dropdown */}
      <div ref={menuRef} style={{ position: 'relative', flexShrink: 0 }}>
        <button
          onClick={() => setMenuOpen((v) => !v)}
          style={{ width: 40, height: 40, borderRadius: '50%', background: menuOpen ? 'var(--bg-3)' : 'var(--bg-2)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text)' }}
        >
          <MoreVertical size={20} />
        </button>

        {menuOpen && (
          <div
            className="menu-dropdown"
            style={{
              position: 'fixed',
              top: 64,
              right: 12,
              background: 'var(--bg-2)',
              border: '1px solid var(--border)',
              borderRadius: 12,
              overflow: 'hidden',
              minWidth: 180,
              zIndex: 200,
              boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
            }}
          >
            {menuItems.map((item, i) =>
              item === null ? (
                <div key={i} style={{ height: 1, background: 'var(--border)', marginInline: 12 }} />
              ) : (
                <button
                  key={item.label}
                  onClick={item.action}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    width: '100%',
                    padding: '11px 14px',
                    fontSize: 14,
                    color: item.danger ? '#ef4444' : 'var(--text)',
                    textAlign: 'left',
                  }}
                >
                  <span style={{ color: item.danger ? '#ef4444' : 'var(--text-3)' }}>{item.icon}</span>
                  {item.label}
                </button>
              )
            )}
          </div>
        )}
      </div>
    </div>
  )
}
