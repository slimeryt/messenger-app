import { useRef, useState, useEffect } from 'react'
import { doc, updateDoc } from 'firebase/firestore'
import { db } from '../../firebase'
import { compressAvatar, compressBanner } from '../../lib/toBase64'
import { useAuthStore } from '../../store/authStore'
import { Camera } from 'lucide-react'

export function ProfileScreen() {
  const { user, setUser } = useAuthStore()
  const [bio, setBio] = useState(user?.bio ?? '')
  const avatarRef = useRef<HTMLInputElement>(null)
  const bannerRef = useRef<HTMLInputElement>(null)
  const isFirst = useRef(true)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (isFirst.current) { isFirst.current = false; return }
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(async () => {
      if (!user) return
      await updateDoc(doc(db, 'users', user.uid), { bio })
      setUser({ ...user, bio })
    }, 800)
  }, [bio])

  async function handleAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !user) return
    const data = await compressAvatar(file)
    await updateDoc(doc(db, 'users', user.uid), { avatarUrl: data })
    setUser({ ...user, avatarUrl: data })
  }

  async function handleBanner(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !user) return
    const data = await compressBanner(file)
    await updateDoc(doc(db, 'users', user.uid), { bannerUrl: data })
    setUser({ ...user, bannerUrl: data })
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ padding: '0 16px', height: 56, display: 'flex', alignItems: 'center', flexShrink: 0 }}>
        <span style={{ fontSize: 18, fontWeight: 700 }}>Profile</span>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 100 }}>
        {/* Banner */}
        <div style={{ position: 'relative' }}>
          <div
            style={{
              height: 140,
              background: user?.bannerUrl ? `url(${user.bannerUrl}) center/cover` : 'var(--bg-3)',
            }}
          />
          <input ref={bannerRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleBanner} />
          <button
            onClick={() => bannerRef.current?.click()}
            style={{
              position: 'absolute',
              top: 10,
              right: 12,
              background: 'rgba(0,0,0,0.55)',
              borderRadius: 8,
              padding: '5px 10px',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              fontSize: 12,
            }}
          >
            <Camera size={13} /> Edit banner
          </button>
        </div>

        {/* Avatar overlapping banner */}
        <div style={{ padding: '0 20px', marginTop: -36, marginBottom: 16, display: 'flex', alignItems: 'flex-end', gap: 14 }}>
          <div style={{ position: 'relative', flexShrink: 0 }}>
            {user?.avatarUrl ? (
              <img
                src={user.avatarUrl}
                style={{ width: 72, height: 72, borderRadius: '50%', objectFit: 'cover', border: '3px solid var(--bg)' }}
              />
            ) : (
              <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'var(--bg-4)', border: '3px solid var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, fontWeight: 700 }}>
                {user?.username.slice(0, 1).toUpperCase()}
              </div>
            )}
            <input ref={avatarRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatar} />
            <button
              onClick={() => avatarRef.current?.click()}
              style={{
                position: 'absolute',
                bottom: 2,
                right: 2,
                background: 'var(--accent)',
                borderRadius: '50%',
                width: 22,
                height: 22,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Camera size={12} color="#fff" />
            </button>
          </div>
          <div style={{ paddingBottom: 4, minWidth: 0, flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 18, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user?.username}<span style={{ color: 'var(--text-3)', fontWeight: 400 }}>#{user?.tag}</span>
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.phone || user?.email}</div>
          </div>
        </div>

        {/* Bio */}
        <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ background: 'var(--bg-2)', borderRadius: 14, overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px 4px' }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>Bio</div>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Tell people about yourself…"
                rows={4}
                style={{ width: '100%', fontSize: 15, color: 'var(--text)', background: 'none', lineHeight: 1.5, resize: 'none', paddingBottom: 12 }}
              />
            </div>
          </div>

          <div style={{ background: 'var(--bg-2)', borderRadius: 14, overflow: 'hidden' }}>
            <InfoRow label="User ID" value={`${user?.username}#${user?.tag}`} />
            <div style={{ height: 1, background: 'var(--border)', marginLeft: 16 }} />
            <InfoRow label="Phone" value={user?.phone || '—'} />
            <div style={{ height: 1, background: 'var(--border)', marginLeft: 16 }} />
            <InfoRow label="Member since" value={user?.createdAt ? new Date(user.createdAt).toLocaleDateString([], { year: 'numeric', month: 'long', day: 'numeric' }) : '—'} />
          </div>
        </div>
      </div>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '13px 16px' }}>
      <span style={{ fontSize: 15, color: 'var(--text)' }}>{label}</span>
      <span style={{ fontSize: 14, color: 'var(--text-3)' }}>{value}</span>
    </div>
  )
}
