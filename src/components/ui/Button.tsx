import { ButtonHTMLAttributes, ReactNode } from 'react'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost' | 'danger'
  children: ReactNode
  fullWidth?: boolean
}

export function Button({ variant = 'primary', children, fullWidth, style, ...rest }: Props) {
  const base: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: '8px 16px',
    borderRadius: 'var(--radius)',
    fontWeight: 500,
    fontSize: 14,
    transition: 'opacity 0.15s',
    width: fullWidth ? '100%' : undefined,
    opacity: rest.disabled ? 0.5 : 1,
    cursor: rest.disabled ? 'not-allowed' : 'pointer',
  }

  const variants: Record<string, React.CSSProperties> = {
    primary: { background: 'var(--accent)', color: '#fff' },
    ghost: { background: 'var(--bg-3)', color: 'var(--text)' },
    danger: { background: 'var(--danger)', color: '#fff' },
  }

  return (
    <button style={{ ...base, ...variants[variant], ...style }} {...rest}>
      {children}
    </button>
  )
}
