import { InputHTMLAttributes } from 'react'

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
}

export function Input({ label, style, ...rest }: Props) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {label && (
        <label style={{ fontSize: 12, color: 'var(--text-2)', fontWeight: 500 }}>
          {label}
        </label>
      )}
      <input
        style={{
          background: 'var(--bg-3)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius)',
          padding: '9px 12px',
          color: 'var(--text)',
          fontSize: 14,
          width: '100%',
          ...style,
        }}
        {...rest}
      />
    </div>
  )
}
