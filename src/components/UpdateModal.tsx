import { UpdateInfo } from '../types'
import { Button } from './ui/Button'
import { Download, AlertTriangle } from 'lucide-react'

interface Props {
  info: UpdateInfo
  downloading?: boolean
  onUpdate: () => void
  onLater?: () => void
}

export function UpdateModal({ info, downloading, onUpdate, onLater }: Props) {
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
          borderRadius: 12,
          width: '100%',
          maxWidth: 360,
          padding: 24,
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        {info.force && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              color: '#f59e0b',
              fontSize: 13,
            }}
          >
            <AlertTriangle size={16} />
            <span>Required update</span>
          </div>
        )}

        <div>
          <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 4 }}>
            Update {info.version} available
          </div>
          {info.notes && (
            <div style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.5 }}>
              {info.notes}
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
