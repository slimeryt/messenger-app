import { UpdateInfo, UpdateType } from '../types'
import { Button } from './ui/Button'
import { Download, AlertTriangle, Sparkles, Wrench, Palette, Zap } from 'lucide-react'

interface Props {
  info: UpdateInfo
  downloading?: boolean
  onUpdate: () => void
  onLater?: () => void
}

const TYPE_META: Record<UpdateType, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  'major':        { label: 'Major Update',     color: '#3b82f6', bg: 'rgba(59,130,246,0.12)',  icon: <Zap size={13} /> },
  'minor':        { label: 'Minor Update',     color: '#a3a3a3', bg: 'rgba(163,163,163,0.10)', icon: <Sparkles size={13} /> },
  'ui':           { label: 'UI/UX Update',     color: '#a78bfa', bg: 'rgba(167,139,250,0.12)', icon: <Palette size={13} /> },
  'bugfix-major': { label: 'Major Bug Fix',    color: '#ef4444', bg: 'rgba(239,68,68,0.12)',   icon: <AlertTriangle size={13} /> },
  'bugfix-minor': { label: 'Minor Bug Fix',    color: '#22c55e', bg: 'rgba(34,197,94,0.12)',   icon: <Wrench size={13} /> },
}

export function UpdateModal({ info, downloading, onUpdate, onLater }: Props) {
  const meta = TYPE_META[info.type] ?? TYPE_META['minor']

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2000,
        padding: 24,
      }}
    >
      <div
        style={{
          background: 'var(--bg-2)',
          border: '1px solid var(--border)',
          borderRadius: 16,
          width: '100%',
          maxWidth: 340,
          padding: 24,
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        {/* Type badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            background: meta.bg,
            color: meta.color,
            fontSize: 12, fontWeight: 600,
            padding: '4px 10px',
            borderRadius: 999,
          }}>
            {meta.icon}
            {meta.label}
          </div>
          {info.force && (
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              background: 'rgba(245,158,11,0.12)',
              color: '#f59e0b',
              fontSize: 12, fontWeight: 600,
              padding: '4px 10px',
              borderRadius: 999,
            }}>
              <AlertTriangle size={13} />
              Required
            </div>
          )}
        </div>

        <div>
          <div style={{ fontWeight: 700, fontSize: 17, marginBottom: 4 }}>
            Nod {info.version}
          </div>
          {info.notes && (
            <div style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.6, marginBottom: info.changelog.length ? 10 : 0 }}>
              {info.notes}
            </div>
          )}
          {info.changelog.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {info.changelog.map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 13, color: 'var(--text-2)', lineHeight: 1.5 }}>
                  <span style={{ color: 'var(--accent)', marginTop: 1, flexShrink: 0 }}>•</span>
                  <span>{item}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Button onClick={onUpdate} fullWidth disabled={downloading}>
            <Download size={15} />
            {downloading ? 'Downloading…' : 'Download & Install'}
          </Button>
          {!info.force && onLater && (
            <Button variant="ghost" onClick={onLater} fullWidth>
              Later
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
