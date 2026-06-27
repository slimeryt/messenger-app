import { useEffect, useRef, useState } from 'react'
import { X, ImagePlus, Send } from 'lucide-react'
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera'
import { Capacitor } from '@capacitor/core'

export interface PickedImage { data: string; name: string; size: number }

interface Props {
  onClose: () => void
  onSend: (images: PickedImage[]) => void
}

export function ImagePickerSheet({ onClose, onSend }: Props) {
  const [images, setImages] = useState<PickedImage[]>([])
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { openPicker() }, [])

  async function openPicker() {
    if (Capacitor.isNativePlatform()) {
      await pickNative()
    } else {
      inputRef.current?.click()
    }
  }

  async function pickNative() {
    try {
      setLoading(true)
      const result = await Camera.pickImages({
        quality: 90,
        limit: 0,
        presentationStyle: 'fullscreen',
      })
      const loaded: PickedImage[] = await Promise.all(
        result.photos.map(async (photo, i) => {
          const res = await fetch(photo.webPath!)
          const blob = await res.blob()
          return new Promise<PickedImage>((resolve) => {
            const reader = new FileReader()
            reader.onload = () => resolve({
              data: reader.result as string,
              name: `photo_${i + 1}.${photo.format}`,
              size: blob.size,
            })
            reader.readAsDataURL(blob)
          })
        })
      )
      if (loaded.length > 0) {
        setImages(loaded)
        setSelected(new Set(loaded.map((_, i) => i)))
      }
    } catch {
      // user cancelled
    } finally {
      setLoading(false)
    }
  }

  async function handleWebFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    const loaded: PickedImage[] = await Promise.all(
      files.map(f => new Promise<PickedImage>(resolve => {
        const reader = new FileReader()
        reader.onload = () => resolve({ data: reader.result as string, name: f.name, size: f.size })
        reader.readAsDataURL(f)
      }))
    )
    setImages(prev => {
      const next = [...prev, ...loaded]
      const newIdxs = new Set(selected)
      for (let i = prev.length; i < next.length; i++) newIdxs.add(i)
      setSelected(newIdxs)
      return next
    })
    e.target.value = ''
  }

  function toggle(i: number) {
    setSelected(prev => {
      const s = new Set(prev)
      s.has(i) ? s.delete(i) : s.add(i)
      return s
    })
  }

  function handleSend() {
    const toSend = [...selected].sort().map(i => images[i])
    onSend(toSend)
    onClose()
  }

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200 }} />
      <div
        className="profile-sheet"
        style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: 'var(--bg-2)', borderRadius: '20px 20px 0 0', zIndex: 201, display: 'flex', flexDirection: 'column', maxHeight: '80vh' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px 10px' }}>
          <span style={{ fontSize: 16, fontWeight: 700 }}>Photos</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {selected.size > 0 && (
              <button
                onClick={handleSend}
                style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--accent)', color: '#fff', borderRadius: 20, padding: '7px 14px', fontSize: 13, fontWeight: 600 }}
              >
                <Send size={14} />
                Send {selected.size}
              </button>
            )}
            <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--bg-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-2)' }}>
              <X size={16} />
            </button>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '0 4px 24px' }}>
          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 24px', color: 'var(--text-3)', fontSize: 13 }}>
              Loading photos…
            </div>
          ) : images.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 24px', gap: 12 }}>
              <div style={{ width: 64, height: 64, borderRadius: 20, background: 'var(--bg-3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ImagePlus size={28} color="var(--text-3)" />
              </div>
              <span style={{ fontSize: 14, color: 'var(--text-3)' }}>No photos selected</span>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 3 }}>
              {images.map((img, i) => (
                <button key={i} onClick={() => toggle(i)} style={{ position: 'relative', aspectRatio: '1', overflow: 'hidden', borderRadius: 4 }}>
                  <img src={img.data} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                  <div style={{ position: 'absolute', inset: 0, background: selected.has(i) ? 'rgba(59,130,246,0.3)' : 'transparent', transition: 'background 0.15s' }} />
                  <div style={{
                    position: 'absolute', top: 6, right: 6,
                    width: 22, height: 22, borderRadius: '50%',
                    background: selected.has(i) ? 'var(--accent)' : 'rgba(0,0,0,0.4)',
                    border: selected.has(i) ? 'none' : '2px solid rgba(255,255,255,0.8)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'background 0.15s',
                  }}>
                    {selected.has(i) && (
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <path d="M2 6l3 3 5-5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>
                  {selected.has(i) && (
                    <div style={{ position: 'absolute', bottom: 6, left: 6, background: 'var(--accent)', color: '#fff', borderRadius: 10, fontSize: 10, fontWeight: 700, padding: '1px 6px' }}>
                      {[...selected].sort().indexOf(i) + 1}
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        <input ref={inputRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={handleWebFiles} />
        <button
          onClick={openPicker}
          style={{ margin: '0 16px 32px', padding: '13px', borderRadius: 14, background: 'var(--bg-3)', fontSize: 14, fontWeight: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, color: 'var(--text)' }}
        >
          <ImagePlus size={18} />
          {images.length === 0 ? 'Choose Photos' : 'Add More'}
        </button>
      </div>
    </>
  )
}
