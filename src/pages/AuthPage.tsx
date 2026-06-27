import { useState, useRef, useEffect } from 'react'
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
import { ChevronDown, Search } from 'lucide-react'

interface Country { name: string; dial: string; code: string; fmt: number[] }

function FlagImg({ code, size = 20 }: { code: string; size?: number }) {
  const [failed, setFailed] = useState(false)
  const h = Math.round(size * 0.75)
  if (failed) {
    return (
      <span style={{ width: size, height: h, fontSize: size * 0.5, fontWeight: 700, color: 'var(--text-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {code}
      </span>
    )
  }
  return (
    <img
      src={`https://flagcdn.com/w40/${code.toLowerCase()}.png`}
      width={size}
      height={h}
      alt={code}
      onError={() => setFailed(true)}
      style={{ objectFit: 'cover', borderRadius: 2, display: 'block', flexShrink: 0 }}
    />
  )
}

const COUNTRIES: Country[] = [
  { name: 'Afghanistan',          dial: '+93',  code: 'AF', fmt: [2,3,4]     },
  { name: 'Albania',              dial: '+355', code: 'AL', fmt: [3,4]        },
  { name: 'Algeria',              dial: '+213', code: 'DZ', fmt: [2,3,4]     },
  { name: 'Argentina',            dial: '+54',  code: 'AR', fmt: [2,4,4]     },
  { name: 'Australia',            dial: '+61',  code: 'AU', fmt: [3,3,3]     },
  { name: 'Austria',              dial: '+43',  code: 'AT', fmt: [3,4,4]     },
  { name: 'Bangladesh',           dial: '+880', code: 'BD', fmt: [2,3,4]     },
  { name: 'Belgium',              dial: '+32',  code: 'BE', fmt: [3,2,2,2]   },
  { name: 'Brazil',               dial: '+55',  code: 'BR', fmt: [2,4,4]     },
  { name: 'Canada',               dial: '+1',   code: 'CA', fmt: [3,3,4]     },
  { name: 'Chile',                dial: '+56',  code: 'CL', fmt: [1,4,4]     },
  { name: 'China',                dial: '+86',  code: 'CN', fmt: [3,4,4]     },
  { name: 'Colombia',             dial: '+57',  code: 'CO', fmt: [3,3,4]     },
  { name: 'Czech Republic',       dial: '+420', code: 'CZ', fmt: [3,3,3]     },
  { name: 'Denmark',              dial: '+45',  code: 'DK', fmt: [2,2,2,2]   },
  { name: 'Egypt',                dial: '+20',  code: 'EG', fmt: [2,4,4]     },
  { name: 'Ethiopia',             dial: '+251', code: 'ET', fmt: [2,3,4]     },
  { name: 'Finland',              dial: '+358', code: 'FI', fmt: [2,3,4]     },
  { name: 'France',               dial: '+33',  code: 'FR', fmt: [1,2,2,2,2] },
  { name: 'Germany',              dial: '+49',  code: 'DE', fmt: [3,4,4]     },
  { name: 'Ghana',                dial: '+233', code: 'GH', fmt: [2,3,4]     },
  { name: 'Greece',               dial: '+30',  code: 'GR', fmt: [3,3,4]     },
  { name: 'Hungary',              dial: '+36',  code: 'HU', fmt: [2,3,4]     },
  { name: 'India',                dial: '+91',  code: 'IN', fmt: [5,5]        },
  { name: 'Indonesia',            dial: '+62',  code: 'ID', fmt: [3,4,4]     },
  { name: 'Iran',                 dial: '+98',  code: 'IR', fmt: [3,3,4]     },
  { name: 'Iraq',                 dial: '+964', code: 'IQ', fmt: [3,3,4]     },
  { name: 'Ireland',              dial: '+353', code: 'IE', fmt: [2,3,4]     },
  { name: 'Israel',               dial: '+972', code: 'IL', fmt: [2,3,4]     },
  { name: 'Italy',                dial: '+39',  code: 'IT', fmt: [3,4,3]     },
  { name: 'Japan',                dial: '+81',  code: 'JP', fmt: [3,4,4]     },
  { name: 'Jordan',               dial: '+962', code: 'JO', fmt: [1,4,4]     },
  { name: 'Kenya',                dial: '+254', code: 'KE', fmt: [3,3,3]     },
  { name: 'South Korea',          dial: '+82',  code: 'KR', fmt: [2,4,4]     },
  { name: 'Malaysia',             dial: '+60',  code: 'MY', fmt: [2,4,4]     },
  { name: 'Mexico',               dial: '+52',  code: 'MX', fmt: [2,4,4]     },
  { name: 'Morocco',              dial: '+212', code: 'MA', fmt: [2,3,4]     },
  { name: 'Netherlands',          dial: '+31',  code: 'NL', fmt: [1,4,4]     },
  { name: 'New Zealand',          dial: '+64',  code: 'NZ', fmt: [2,3,4]     },
  { name: 'Nigeria',              dial: '+234', code: 'NG', fmt: [3,3,4]     },
  { name: 'Norway',               dial: '+47',  code: 'NO', fmt: [3,2,3]     },
  { name: 'Pakistan',             dial: '+92',  code: 'PK', fmt: [3,3,4]     },
  { name: 'Peru',                 dial: '+51',  code: 'PE', fmt: [3,3,3]     },
  { name: 'Philippines',          dial: '+63',  code: 'PH', fmt: [3,3,4]     },
  { name: 'Poland',               dial: '+48',  code: 'PL', fmt: [3,3,3]     },
  { name: 'Portugal',             dial: '+351', code: 'PT', fmt: [3,3,3]     },
  { name: 'Romania',              dial: '+40',  code: 'RO', fmt: [3,3,3]     },
  { name: 'Russia',               dial: '+7',   code: 'RU', fmt: [3,3,2,2]   },
  { name: 'Saudi Arabia',         dial: '+966', code: 'SA', fmt: [2,3,4]     },
  { name: 'South Africa',         dial: '+27',  code: 'ZA', fmt: [2,3,4]     },
  { name: 'Spain',                dial: '+34',  code: 'ES', fmt: [3,3,3]     },
  { name: 'Sweden',               dial: '+46',  code: 'SE', fmt: [2,3,4]     },
  { name: 'Switzerland',          dial: '+41',  code: 'CH', fmt: [2,3,2,2]   },
  { name: 'Taiwan',               dial: '+886', code: 'TW', fmt: [4,3,3]     },
  { name: 'Tanzania',             dial: '+255', code: 'TZ', fmt: [2,3,4]     },
  { name: 'Thailand',             dial: '+66',  code: 'TH', fmt: [2,4,4]     },
  { name: 'Turkey',               dial: '+90',  code: 'TR', fmt: [3,3,2,2]   },
  { name: 'Uganda',               dial: '+256', code: 'UG', fmt: [2,3,4]     },
  { name: 'Ukraine',              dial: '+380', code: 'UA', fmt: [2,3,2,2]   },
  { name: 'United Arab Emirates', dial: '+971', code: 'AE', fmt: [2,3,4]     },
  { name: 'United Kingdom',       dial: '+44',  code: 'GB', fmt: [4,3,4]     },
  { name: 'United States',        dial: '+1',   code: 'US', fmt: [3,3,4]     },
  { name: 'Venezuela',            dial: '+58',  code: 'VE', fmt: [3,3,4]     },
  { name: 'Vietnam',              dial: '+84',  code: 'VN', fmt: [3,3,4]     },
]

function applyFormat(digits: string, fmt: number[]): string {
  let result = ''
  let pos = 0
  for (const groupSize of fmt) {
    if (pos >= digits.length) break
    if (result) result += ' '
    result += digits.slice(pos, pos + groupSize)
    pos += groupSize
  }
  if (pos < digits.length) result += ' ' + digits.slice(pos)
  return result
}

function detectCountry(digits: string): Country | null {
  // Try longest dial code match first (4 digits → 3 → 2 → 1)
  for (const len of [4, 3, 2, 1]) {
    const prefix = '+' + digits.slice(0, len)
    // For +1 prefer United States
    const match = COUNTRIES.find((c) => c.dial === prefix && (prefix !== '+1' || c.name === 'United States'))
    if (match) return match
  }
  return null
}

function PhoneField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [country, setCountry] = useState<Country>(COUNTRIES.find((c) => c.name === 'United States')!)
  const [localNum, setLocalNum] = useState('')
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const wrapRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    onChange(country.dial + localNum)
  }, [country, localNum])

  useEffect(() => {
    if (open) setTimeout(() => searchRef.current?.focus(), 50)
  }, [open])

  // Close on outside click
  useEffect(() => {
    if (!open) return
    function handler(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  function handleLocalNum(raw: string) {
    const maxDigits = country.fmt.reduce((a, b) => a + b, 0)
    const digits = raw.replace(/\D/g, '').slice(0, maxDigits)
    setLocalNum(applyFormat(digits, country.fmt))
  }

  const filtered = COUNTRIES.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.dial.includes(search)
  )

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-2)', marginBottom: 6 }}>Phone Number</div>
      <div style={{ display: 'flex', gap: 8 }}>
        {/* Country picker button */}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          style={{
            display: 'flex', alignItems: 'center', gap: 4,
            padding: '10px 12px',
            background: 'var(--bg-3)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius)', flexShrink: 0,
            fontSize: 15, color: 'var(--text)', cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          <FlagImg code={country.code} size={20} />
          <span style={{ fontSize: 13, color: 'var(--text-2)' }}>{country.dial}</span>
          <ChevronDown size={13} color="var(--text-3)" style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
        </button>

        {/* Number input */}
        <input
          type="tel"
          placeholder="234 567 8900"
          value={localNum}
          onChange={(e) => handleLocalNum(e.target.value)}
          style={{
            flex: 1, padding: '10px 12px',
            background: 'var(--bg-3)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius)', fontSize: 14, color: 'var(--text)',
            outline: 'none',
          }}
        />
      </div>

      {/* Dropdown */}
      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4,
          background: 'var(--bg-2)', border: '1px solid var(--border)',
          borderRadius: 12, zIndex: 100, overflow: 'hidden',
          boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
        }}>
          {/* Search */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderBottom: '1px solid var(--border)' }}>
            <Search size={14} color="var(--text-3)" />
            <input
              ref={searchRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search country"
              style={{ flex: 1, fontSize: 13, background: 'none', border: 'none', outline: 'none', color: 'var(--text)' }}
            />
          </div>
          {/* List */}
          <div style={{ maxHeight: 220, overflowY: 'auto' }}>
            {filtered.length === 0 ? (
              <div style={{ padding: '12px 14px', fontSize: 13, color: 'var(--text-3)' }}>No results</div>
            ) : filtered.map((c) => (
              <button
                key={c.name}
                type="button"
                onClick={() => {
                const digits = localNum.replace(/\D/g, '').slice(0, c.fmt.reduce((a, b) => a + b, 0))
                setLocalNum(applyFormat(digits, c.fmt))
                setCountry(c); setOpen(false); setSearch('')
              }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  width: '100%', padding: '9px 14px', textAlign: 'left',
                  background: c.name === country.name ? 'var(--bg-3)' : 'transparent',
                  fontSize: 14,
                }}
              >
                <FlagImg code={c.code} size={20} />
                <span style={{ flex: 1, color: 'var(--text)' }}>{c.name}</span>
                <span style={{ color: 'var(--text-3)', fontSize: 13 }}>{c.dial}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

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
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function phoneToEmail(p: string) {
    return `${p.replace(/\D/g, '')}@nod.app`
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    const rawPhone = phone.trim().replace(/\s/g, '')
    if (!rawPhone) { setError('Phone number is required'); return }
    if (rawPhone.replace(/\D/g, '').length < 7) { setError('Enter a valid phone number'); return }

    setLoading(true)
    try {
      if (mode === 'register') {
        if (!username.trim()) { setError('Username is required'); setLoading(false); return }
        const cred = await createUserWithEmailAndPassword(auth, phoneToEmail(rawPhone), password)
        const tag = await generateUniqueTag(username.trim())
        await setDoc(doc(db, 'users', cred.user.uid), {
          uid: cred.user.uid,
          username: username.trim(),
          tag,
          phone: rawPhone,
          email: phoneToEmail(rawPhone),
          avatarUrl: null,
          bannerUrl: null,
          bio: '',
          lastSeen: Date.now(),
          createdAt: Date.now(),
          online: true,
          role: 'user',
          banned: false,
        })
      } else {
        await signInWithEmailAndPassword(auth, phoneToEmail(rawPhone), password)
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Something went wrong'
      setError(msg.replace('Firebase: ', '').replace(/\(auth\/.*?\)\.?/, '').trim())
    }
    setLoading(false)
  }

  return (
    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, background: 'var(--bg)' }}>
      <div style={{ width: '100%', maxWidth: 360 }}>

        <div style={{ marginBottom: 32, textAlign: 'center' }}>
          <div style={{ fontSize: 28, fontWeight: 700, marginBottom: 6 }}>Nod</div>
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
            <PhoneField value={phone} onChange={setPhone} />
            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            {error && <div style={{ fontSize: 13, color: 'var(--danger)', padding: '8px 0' }}>{error}</div>}

            <Button type="submit" fullWidth disabled={loading} style={{ marginTop: 4 }}>
              {loading ? 'Please wait…' : mode === 'login' ? 'Sign In' : 'Create Account'}
            </Button>
          </form>

          <div style={{ textAlign: 'center', marginTop: 20, color: 'var(--text-2)', fontSize: 13 }}>
            {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
            <button onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError('') }} style={{ color: 'var(--accent)', fontWeight: 500 }}>
              {mode === 'login' ? 'Sign up' : 'Sign in'}
            </button>
          </div>
      </div>
    </div>
  )
}
