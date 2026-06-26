import { useRef, useState } from 'react'
import { doc, updateDoc } from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { db, storage } from '../../firebase'
import { useAuthStore } from '../../store/authStore'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Camera } from 'lucide-react'

interface Props { onClose: () => void }

export function ProfileModal({ onClose }: Props) {
  const { user, setUser } = useAuthStore()
  const [bio, setBio] = useState(user?.bio ?? '')
  const [saving, setSaving] = useState(false)
  const avatarRef = useRef<HTMLInputElement>(null)
  const bannerRef = useRef<HTMLInputElement>(null)

  async function uploadImage(file: File, path: string): Promise<string> {
    const snap = await uploadBytes(ref(storage, path), file)
    return getDownloadURL(snap.ref)
  }

  async function handleAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !user) return
    setSaving(true)
    const url = await uploadImage(file, `avatars/${user.uid}`)
    await updateDoc(doc(db, 'users', user.uid), { avatarUrl: url })
    setUser({ ...user, avatarUrl: url })
    setSaving(false)
  }

  async function handleBanner(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !user) return
    setSaving(true)
    const url = await uploadImage(file, `banners/${user.uid}`)
    await updateDoc(doc(db, 'users', user.uid), { bannerUrl: url })
    setUser({ ...user, bannerUrl: url })
    setSaving(false)
  }

  async function save() {
    if (!user) return
    setSaving(true)
    await updateDoc(doc(db, 'users', user.uid), { bio })
    setUser({ ...user, bio })
    setSaving(false)
    onClose()
  }

  return (
    <Modal title="Profile" onClose={onClose} footer={<Button onClick={save} disabled={saving}>Save</Button>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Banner */}
        <div style={{ position: 'relative' }}>
          <div
            style={{
              height: 80,
              background: user?.bannerUrl ? `url(${user.bannerUrl}) center/cover` : 'var(--bg-3)',
              borderRadius: 'var(--radius)',
              border: '1px solid var(--border)',
            }}
          />
          <input ref={bannerRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleBanner} />
          <button
            onClick={() => bannerRef.current?.click()}
            style={{
              position: 'absolute',
              top: 8,
              right: 8,
              background: 'rgba(0,0,0,0.5)',
              borderRadius: 'var(--radius-sm)',
              padding: '4px 8px',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              fontSize: 12,
            }}
          >
            <Camera size={13} /> Banner
          </button>
        </div>

        {/* Avatar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ position: 'relative' }}>
            {user?.avatarUrl ? (
              <img
                src={user.avatarUrl}
                style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--border)' }}
              />
            ) : (
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--bg-4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 600 }}>
                {user?.username.slice(0, 1).toUpperCase()}
              </div>
            )}
            <input ref={avatarRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatar} />
            <button
              onClick={() => avatarRef.current?.click()}
              style={{
                position: 'absolute',
                bottom: 0,
                right: 0,
                background: 'var(--accent)',
                borderRadius: '50%',
                width: 20,
                height: 20,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Camera size={11} color="#fff" />
            </button>
          </div>
          <div>
            <div style={{ fontWeight: 600 }}>{user?.username}<span style={{ color: 'var(--text-3)', fontWeight: 400 }}>#{user?.tag}</span></div>
            <div style={{ fontSize: 12, color: 'var(--text-2)' }}>{user?.email}</div>
          </div>
        </div>

        <div>
          <label style={{ fontSize: 12, color: 'var(--text-2)', fontWeight: 500, display: 'block', marginBottom: 6 }}>Bio</label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={3}
            placeholder="Tell people about yourself…"
            style={{
              width: '100%',
              background: 'var(--bg-3)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              padding: '8px 12px',
              color: 'var(--text)',
              fontSize: 14,
              lineHeight: 1.5,
            }}
          />
        </div>
      </div>
    </Modal>
  )
}
