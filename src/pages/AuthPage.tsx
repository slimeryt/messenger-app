import { useState } from 'react'
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from 'firebase/auth'
import {
  doc,
  setDoc,
  collection,
  query,
  where,
  getDocs,
} from 'firebase/firestore'
import { auth, db } from '../firebase'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'

function randomTag() {
  return String(Math.floor(Math.random() * 10000)).padStart(4, '0')
}

async function generateUniqueTag(username: string): Promise<string> {
  for (let i = 0; i < 10; i++) {
    const tag = randomTag()
    const q = query(
      collection(db, 'users'),
      where('username', '==', username),
      where('tag', '==', tag)
    )
    const snap = await getDocs(q)
    if (snap.empty) return tag
  }
  return randomTag()
}

export function AuthPage() {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (mode === 'register') {
        if (!username.trim()) { setError('Username is required'); setLoading(false); return }
        const cred = await createUserWithEmailAndPassword(auth, email, password)
        const tag = await generateUniqueTag(username.trim())
        await setDoc(doc(db, 'users', cred.user.uid), {
          uid: cred.user.uid,
          username: username.trim(),
          tag,
          email,
          avatarUrl: null,
          bannerUrl: null,
          bio: '',
          lastSeen: Date.now(),
          online: true,
          role: 'user',
          banned: false,
        })
      } else {
        await signInWithEmailAndPassword(auth, email, password)
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Something went wrong'
      setError(msg.replace('Firebase: ', '').replace(/\(auth\/.*?\)\.?/, '').trim())
    }
    setLoading(false)
  }

  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        background: 'var(--bg)',
      }}
    >
      <div style={{ width: '100%', maxWidth: 360 }}>
        <div style={{ marginBottom: 32, textAlign: 'center' }}>
          <div style={{ fontSize: 28, fontWeight: 700, marginBottom: 6 }}>Messenger</div>
          <div style={{ color: 'var(--text-2)', fontSize: 14 }}>
            {mode === 'login' ? 'Sign in to continue' : 'Create your account'}
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {mode === 'register' && (
            <Input
              label="Username"
              placeholder="yourname"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          )}
          <Input
            label="Email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Input
            label="Password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          {error && (
            <div style={{ fontSize: 13, color: 'var(--danger)', padding: '8px 0' }}>
              {error}
            </div>
          )}

          <Button type="submit" fullWidth disabled={loading} style={{ marginTop: 4 }}>
            {loading ? 'Please wait…' : mode === 'login' ? 'Sign In' : 'Create Account'}
          </Button>
        </form>

        <div style={{ textAlign: 'center', marginTop: 20, color: 'var(--text-2)', fontSize: 13 }}>
          {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
          <button
            onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError('') }}
            style={{ color: 'var(--accent)', fontWeight: 500, cursor: 'pointer' }}
          >
            {mode === 'login' ? 'Sign up' : 'Sign in'}
          </button>
        </div>
      </div>
    </div>
  )
}
