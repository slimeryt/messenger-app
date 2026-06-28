import { useEffect, useRef, useState } from 'react'
import { X, ImagePlus, Send } from 'lucide-react'
import { Capacitor } from '@capacitor/core'
import { GalleryPhoto, checkGalleryPermission, requestGalleryPermission, getPhotoData, getPhotoThumbnail, listPhotos } from '../../lib/gallery'

export interface PickedImage { data: string; name: string; size: number }

interface Props {
  onClose: () => void
  onSend: (images: PickedImage[]) => void
}

export function ImagePickerSheet({ onClose, onSend }: Props) {
  const [photos, setPhotos] = useState<GalleryPhoto[]>([])
  const [thumbnails, setThumbnails] = useState<Record<string, string>>({})
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [noPermission, setNoPermission] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // web images (non-native fallback)
  const [webImages, setWebImages] = useState<PickedImage[]>([])
  const [webSelected, setWebSelected] = useState<Set<number>>(new Set())

  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      loadGallery()
    } else {
      setLoading(false)
    }
  }, [])

  async function loadGallery() {
    try {
      let granted = await checkGalleryPermission()
      if (!granted) {
        granted = await requestGalleryPermission()
        if (!granted) {
          setNoPermission(true)
          setLoading(false)
          return
        }
      }
      const list = await listPhotos(0, 60)
      setPhotos(list)
      setLoading(false)
      // load thumbnails in batches of 8
      const BATCH = 8
      for (let i = 0; i < list.length; i += BATCH) {
        const batch = list.slice(i, i + BATCH)
        const results = await Promise.allSettled(
          batch.map(p => getPhotoThumbnail(p.id).then(data => ({ id: p.id, data })))
        )
        setThumbnails(prev => {
          const next = { ...prev }
          results.forEach(r => { if (r.status === 'fulfilled') next[r.value.id] = r.value.data })
          return next
        })
      }
    } catch (e: unknown) {
      const msg = String(e)
      if (msg.includes('PERMISSION_DENIED')) {
        setNoPermission(true)
      } else {
        setError(msg)
      }
      setLoading(false)
    }
  }

  function toggleNative(id: string) {
    setSelected(prev => {
      const s = new Set(prev)
      s.has(id) ? s.delete(id) : s.add(id)
      return s
    })
  }

  async function handleSend() {
    if (Capacitor.isNativePlatform()) {
      if (selected.size === 0) return
      setSending(true)
      try {
        const ids = [...selected]
        const loaded = await Promise.all(ids.map(async id => {
          const photo = photos.find(p => p.id === id)!
          const data = await getPhotoData(id)
          return { data, name: photo.name, size: 0 } as PickedImage
        }))
        onSend(loaded)
        onClose()
      } catch {
        setSending(false)
      }
    } else {
      const toSend = [...webSelected].sort().map(i => webImages[i])
      onSend(toSend)
      onClose()
    }
  }

  // web fallback handlers
  async function handleWebFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    const loaded: PickedImage[] = await Promise.all(
      files.map(f => new Promise<PickedImage>(resolve => {
        const reader = new FileReader()
        reader.onload = () => resolve({ data: reader.result as string, name: f.name, size: f.size })
        reader.readAsDataURL(f)
      }))
    )
    setWebImages(prev => {
      const next = [...prev, ...loaded]
      const newIdxs = new Set(webSelected)
      for (let i = prev.length; i < next.length; i++) newIdxs.add(i)
      setWebSelected(newIdxs)
      return next
    })
    e.target.value = ''
  }

  function toggleWeb(i: number) {
    setWebSelected(prev => {
      const s = new Set(prev)
      s.has(i) ? s.delete(i) : s.add(i)
      return s
    })
  }

  const sendCount = Capacitor.isNativePlatform() ? selected.size : webSelected.size
  const canSend = sendCount > 0 && !sending

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200 }} />
      <div
        className="profile-sheet"
        style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: 'var(--bg-2)', borderRadius: '20px 20px 0 0', zIndex: 201, display: 'flex', flexDirection: 'column', maxHeight: '80vh' }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px 10px' }}>
          <span style={{ fontSize: 16, fontWeight: 700 }}>Photos</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {canSend && (
              <button
                onClick={handleSend}
                style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--accent)', color: '#fff', borderRadius: 20, padding: '7px 14px', fontSize: 13, fontWeight: 600 }}
              >
                <Send size={14} />
                {sending ? 'Sending…' : `Send ${sendCount}`}
              </button>
            )}
            <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--bg-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-2)' }}>
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 4px 8px' }}>
          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 24px', color: 'var(--text-3)', fontSize: 13 }}>
              Loading photos…
            </div>
          ) : noPermission ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 24px', gap: 12 }}>
              <div style={{ width: 64, height: 64, borderRadius: 20, background: 'var(--bg-3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ImagePlus size={28} color="var(--text-3)" />
              </div>
              <span style={{ fontSize: 14, color: 'var(--text-3)', textAlign: 'center' }}>Photo access was denied. Allow it in Settings.</span>
            </div>
          ) : error ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 24px', gap: 12 }}>
              <span style={{ fontSize: 13, color: 'var(--text-3)', textAlign: 'center', wordBreak: 'break-all' }}>{error}</span>
              <button onClick={loadGallery} style={{ fontSize: 13, color: 'var(--accent)', padding: '6px 14px', borderRadius: 12, background: 'var(--bg-3)' }}>Retry</button>
            </div>
          ) : Capacitor.isNativePlatform() ? (
            photos.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 24px', gap: 12 }}>
                <div style={{ width: 64, height: 64, borderRadius: 20, background: 'var(--bg-3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ImagePlus size={28} color="var(--text-3)" />
                </div>
                <span style={{ fontSize: 14, color: 'var(--text-3)' }}>No photos found</span>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 3 }}>
                {photos.map(photo => {
                  const thumb = thumbnails[photo.id]
                  const isSelected = selected.has(photo.id)
                  const selOrder = [...selected].indexOf(photo.id) + 1
                  return (
                    <button key={photo.id} onClick={() => toggleNative(photo.id)} style={{ position: 'relative', aspectRatio: '1', overflow: 'hidden', borderRadius: 4, background: 'var(--bg-3)' }}>
                      {thumb ? (
                        <img src={thumb} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                      ) : (
                        <div style={{ width: '100%', height: '100%', background: 'var(--bg-3)' }} />
                      )}
                      <div style={{ position: 'absolute', inset: 0, background: isSelected ? 'rgba(59,130,246,0.3)' : 'transparent', transition: 'background 0.15s' }} />
                      <div style={{
                        position: 'absolute', top: 6, right: 6,
                        width: 22, height: 22, borderRadius: '50%',
                        background: isSelected ? 'var(--accent)' : 'rgba(0,0,0,0.4)',
                        border: isSelected ? 'none' : '2px solid rgba(255,255,255,0.8)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'background 0.15s',
                      }}>
                        {isSelected && (
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                            <path d="M2 6l3 3 5-5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </div>
                      {isSelected && (
                        <div style={{ position: 'absolute', bottom: 6, left: 6, background: 'var(--accent)', color: '#fff', borderRadius: 10, fontSize: 10, fontWeight: 700, padding: '1px 6px' }}>
                          {selOrder}
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            )
          ) : (
            // Web fallback: show file-picked images
            webImages.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 24px', gap: 12 }}>
                <div style={{ width: 64, height: 64, borderRadius: 20, background: 'var(--bg-3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ImagePlus size={28} color="var(--text-3)" />
                </div>
                <span style={{ fontSize: 14, color: 'var(--text-3)' }}>No photos selected</span>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 3 }}>
                {webImages.map((img, i) => (
                  <button key={i} onClick={() => toggleWeb(i)} style={{ position: 'relative', aspectRatio: '1', overflow: 'hidden', borderRadius: 4 }}>
                    <img src={img.data} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                    <div style={{ position: 'absolute', inset: 0, background: webSelected.has(i) ? 'rgba(59,130,246,0.3)' : 'transparent', transition: 'background 0.15s' }} />
                    <div style={{
                      position: 'absolute', top: 6, right: 6,
                      width: 22, height: 22, borderRadius: '50%',
                      background: webSelected.has(i) ? 'var(--accent)' : 'rgba(0,0,0,0.4)',
                      border: webSelected.has(i) ? 'none' : '2px solid rgba(255,255,255,0.8)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'background 0.15s',
                    }}>
                      {webSelected.has(i) && (
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                          <path d="M2 6l3 3 5-5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </div>
                    {webSelected.has(i) && (
                      <div style={{ position: 'absolute', bottom: 6, left: 6, background: 'var(--accent)', color: '#fff', borderRadius: 10, fontSize: 10, fontWeight: 700, padding: '1px 6px' }}>
                        {[...webSelected].sort().indexOf(i) + 1}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )
          )}
        </div>

        {/* Footer: add more (web only) or system picker fallback */}
        {!Capacitor.isNativePlatform() && (
          <>
            <input ref={inputRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={handleWebFiles} />
            <button
              onClick={() => inputRef.current?.click()}
              style={{ margin: '0 16px 32px', padding: '13px', borderRadius: 14, background: 'var(--bg-3)', fontSize: 14, fontWeight: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, color: 'var(--text)' }}
            >
              <ImagePlus size={18} />
              {webImages.length === 0 ? 'Choose Photos' : 'Add More'}
            </button>
          </>
        )}
        {Capacitor.isNativePlatform() && !loading && !noPermission && (
          <div style={{ height: 24 }} />
        )}
      </div>
    </>
  )
}
