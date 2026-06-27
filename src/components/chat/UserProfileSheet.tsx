import { ReactNode } from 'react'
import { User } from '../../types'
import { ArrowLeft, MessageSquare, BellOff, Phone, Video } from 'lucide-react'
import { Avatar } from '../ui/Avatar'

interface Props {
  user: User
  onClose: () => void
  onMessage?: () => void
}

export function UserProfileSheet({ user, onClose, onMessage }: Props) {
  const displayName = user.firstName
    ? `${user.firstName}${user.lastName ? ' ' + user.lastName : ''}`
    : user.username

  return (
    <div
      className="profile-sheet"
      style={{ position: 'fixed', inset: 0, background: 'var(--bg)', zIndex: 301, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
    >
      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', padding: '8px 12px', paddingTop: 'calc(8px + env(safe-area-inset-top))', flexShrink: 0 }}>
        <button
          onClick={onClose}
          style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--bg-2)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text)' }}
        >
          <ArrowLeft size={20} />
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 40 }}>
        {/* Banner + PFP + Name */}
        <div style={{ position: 'relative', marginBottom: 60 }}>
          <div style={{
            height: 160,
            background: user.bannerUrl
              ? `url(${user.bannerUrl}) center/cover`
              : 'linear-gradient(135deg, var(--accent) 0%, #7c3aed 100%)',
          }} />
          {/* Centered avatar */}
          <div style={{ position: 'absolute', bottom: -44, left: 0, right: 0, display: 'flex', justifyContent: 'center' }}>
            <div style={{ position: 'relative' }}>
              <Avatar url={user.avatarUrl} name={user.username} size={88} />
              {user.online && (
                <div style={{ position: 'absolute', bottom: 4, right: 4, width: 18, height: 18, borderRadius: '50%', background: '#22c55e', border: '3px solid var(--bg)' }} />
              )}
            </div>
          </div>
        </div>

        {/* Name + tag + status */}
        <div style={{ textAlign: 'center', padding: '0 20px 24px' }}>
          <div style={{ fontSize: 22, fontWeight: 700, lineHeight: 1.2 }}>
            {displayName}
            <span style={{ fontSize: 15, fontWeight: 400, color: 'var(--text-3)', marginLeft: 6 }}>#{user.tag}</span>
          </div>
          <div style={{ fontSize: 13, color: user.online ? '#22c55e' : 'var(--text-3)', marginTop: 4 }}>
            {user.online ? 'Online' : 'Offline'}
          </div>
          {user.bio ? (
            <div style={{ marginTop: 10, fontSize: 14, color: 'var(--text-2)', lineHeight: 1.5 }}>{user.bio}</div>
          ) : null}
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 10, padding: '0 16px 24px' }}>
          <ActionBtn icon={<MessageSquare size={20} />} label="Message" onClick={onMessage} accent />
          <ActionBtn icon={<BellOff size={20} />} label="Mute" onClick={() => {}} />
          <ActionBtn icon={<Phone size={20} />} label="Call" onClick={() => {}} />
          <ActionBtn icon={<Video size={20} />} label="Video" onClick={() => {}} />
        </div>

        {/* Info */}
        <div style={{ margin: '0 16px', background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
          {user.phone && <InfoRow label="Phone" value={user.phone} />}
          {user.birthday && <InfoRow label="Birthday" value={user.birthday} last />}
        </div>
      </div>
    </div>
  )
}

function ActionBtn({ icon, label, onClick, accent }: { icon: ReactNode; label: string; onClick?: () => void; accent?: boolean }) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 6,
        padding: '12px 0',
        borderRadius: 20,
        background: 'var(--bg-2)',
        border: 'none',
        color: 'var(--text)',
        fontSize: 12,
        fontWeight: 500,
      }}
    >
      {icon}
      {label}
    </button>
  )
}

function InfoRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '13px 16px', borderBottom: last ? 'none' : '1px solid var(--border)' }}>
      <span style={{ fontSize: 14, color: 'var(--text-3)' }}>{label}</span>
      <span style={{ fontSize: 14, color: 'var(--text)' }}>{value}</span>
    </div>
  )
}
