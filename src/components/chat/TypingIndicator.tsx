import { useTypingStore } from '../../store/typingStore'
import { useAuthStore } from '../../store/authStore'

interface Props { chatId: string }

export function TypingIndicator({ chatId }: Props) {
  const typing = useTypingStore((s) => s.typing[chatId] ?? {})
  const me = useAuthStore((s) => s.user?.uid)
  const others = Object.entries(typing).filter(([uid]) => uid !== me)
  if (others.length === 0) return null
  if (localStorage.getItem('nod_showTyping') === 'false') return null

  const names = others.map(([, name]) => name)
  const label =
    names.length === 1
      ? `${names[0]} is typing`
      : names.length === 2
      ? `${names[0]} and ${names[1]} are typing`
      : 'Several people are typing'

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 16px', color: 'var(--text-2)', fontSize: 12 }}>
      <Dots />
      <span>{label}</span>
    </div>
  )
}

function Dots() {
  return (
    <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          style={{
            width: 5,
            height: 5,
            borderRadius: '50%',
            background: 'var(--text-3)',
            animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite`,
          }}
        />
      ))}
      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
          40% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  )
}
