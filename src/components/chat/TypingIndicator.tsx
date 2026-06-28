import { useTypingStore } from '../../store/typingStore'
import { useAuthStore } from '../../store/authStore'

interface Props {
  chatId: string
  members?: Record<string, { username: string; tag: string; avatarUrl: string | null }>
}

export function TypingIndicator({ chatId, members }: Props) {
  const typing = useTypingStore((s) => s.typing[chatId] ?? {})
  const me = useAuthStore((s) => s.user?.uid)
  const others = Object.entries(typing).filter(([uid]) => uid !== me)
  if (others.length === 0) return null
  if (localStorage.getItem('nod_showTyping') === 'false') return null

  return (
    <>
      <style>{`
        @keyframes nod-typing-dot {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
          30% { transform: translateY(-4px); opacity: 1; }
        }
        @keyframes nod-typing-in {
          from { opacity: 0; transform: translateY(6px) scale(0.92); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '2px 16px 4px' }}>
        {others.slice(0, 3).map(([uid, name]) => {
          const member = members?.[uid]
          const avatarUrl = member?.avatarUrl ?? null
          const initials = (member?.username ?? name ?? '?')[0].toUpperCase()
          return (
            <div
              key={uid}
              style={{
                display: 'flex',
                alignItems: 'flex-end',
                gap: 8,
                animation: 'nod-typing-in 0.2s ease-out',
              }}
            >
              {/* Avatar */}
              <div style={{
                width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                background: avatarUrl ? undefined : 'var(--accent)',
                backgroundImage: avatarUrl ? `url(${avatarUrl})` : undefined,
                backgroundSize: 'cover',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 13, fontWeight: 700, color: '#fff',
              }}>
                {!avatarUrl && initials}
              </div>

              {/* Bubble */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2 }}>
                <span style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 500, paddingLeft: 4 }}>
                  {member?.username ?? name}
                </span>
                <div style={{
                  background: 'var(--bubble-in)',
                  borderRadius: '12px 12px 12px 2px',
                  padding: '10px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                }}>
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      style={{
                        width: 7,
                        height: 7,
                        borderRadius: '50%',
                        background: 'var(--text-3)',
                        animation: `nod-typing-dot 1.1s ease-in-out ${i * 0.18}s infinite`,
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}
