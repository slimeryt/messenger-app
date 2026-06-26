interface Props {
  url: string | null
  name: string
  size?: number
  online?: boolean
}

export function Avatar({ url, name, size = 40, online }: Props) {
  const initials = name.slice(0, 1).toUpperCase()
  return (
    <div style={{ position: 'relative', flexShrink: 0, width: size, height: size }}>
      {url ? (
        <img
          src={url}
          alt={name}
          style={{
            width: size,
            height: size,
            borderRadius: '50%',
            objectFit: 'cover',
            display: 'block',
          }}
        />
      ) : (
        <div
          style={{
            width: size,
            height: size,
            borderRadius: '50%',
            background: 'var(--bg-4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: size * 0.4,
            fontWeight: 600,
            color: 'var(--text-2)',
          }}
        >
          {initials}
        </div>
      )}
      {online !== undefined && (
        <span
          style={{
            position: 'absolute',
            bottom: 1,
            right: 1,
            width: size * 0.28,
            height: size * 0.28,
            borderRadius: '50%',
            background: online ? '#22c55e' : 'var(--bg-4)',
            border: '2px solid var(--bg)',
          }}
        />
      )}
    </div>
  )
}
