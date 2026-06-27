import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { signOut } from 'firebase/auth'
import { doc, updateDoc, collection, getDocs } from 'firebase/firestore'
import { auth, db } from '../../firebase'
import { useAuthStore } from '../../store/authStore'
import { useLang } from '../../contexts/LangContext'
import { requestNotificationPermission } from '../../lib/notifications'
import { Avatar } from '../ui/Avatar'
import { ProfileModal } from './ProfileModal'
import { StaffMenu } from './StaffMenu'
import { ChevronRight, LogOut, ShieldAlert, User, Bell, MessageSquare, Shield, Database, Monitor, Zap, Globe, ArrowLeft, Check, Smartphone, Trash2, Loader2, LogOutIcon, Phone, AtSign, Cake, HardDrive, Activity } from 'lucide-react'
import { SESSION_ID } from '../../App'

function ls(key: string, def: string) {
  try { return localStorage.getItem(key) ?? def } catch { return def }
}
function lsSet(key: string, val: string) {
  try { localStorage.setItem(key, val) } catch {}
}

function hexToRgb(hex: string) {
  const n = parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}
function shift(hex: string, amount: number) {
  const [r, g, b] = hexToRgb(hex)
  const c = (v: number) => Math.min(255, Math.max(0, v + amount)).toString(16).padStart(2, '0')
  return `#${c(r)}${c(g)}${c(b)}`
}
const lighten = (hex: string) => shift(hex, 40)
const darken  = (hex: string) => shift(hex, -40)

type Page = 'account' | 'chat' | 'privacy' | 'notifications' | 'data' | 'devices' | 'power' | 'language' | 'staff'

export function SettingsScreen() {
  const me = useAuthStore((s) => s.user)
  const [page, setPage] = useState<Page | null>(null)
  const [showProfile, setShowProfile] = useState(false)
  const [showStaff, setShowStaff] = useState(false)

  if (page) {
    return <SettingsPage page={page} onBack={() => setPage(null)} />
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ padding: '0 16px', height: 56, display: 'flex', alignItems: 'center', flexShrink: 0 }}>
        <span style={{ fontSize: 18, fontWeight: 700 }}>Settings</span>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 16px 100px' }}>
        <button
          onClick={() => setShowProfile(true)}
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, width: '100%', padding: '8px 16px 20px', textAlign: 'center' }}
        >
          <Avatar url={me?.avatarUrl ?? null} name={me?.username ?? '?'} size={72} online />
          <div>
            <div style={{ fontWeight: 700, fontSize: 18 }}>
              {me?.username}<span style={{ color: 'var(--text-3)', fontWeight: 400 }}>#{me?.tag}</span>
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 2 }}>{me?.bio || 'Tap to set a bio'}</div>
          </div>
        </button>

        <Panel>
          <Row icon={<User size={16} />}         iconBg="#3b82f6" label="Account"            desc={me?.email ?? '—'}         onClick={() => setPage('account')} />
          <Row icon={<MessageSquare size={16} />} iconBg="#8b5cf6" label="Chat Settings"     desc="Bubbles, themes & more"    onClick={() => setPage('chat')} />
          <Row icon={<Shield size={16} />}        iconBg="#10b981" label="Privacy & Security" desc="Blocked users, passcode"  onClick={() => setPage('privacy')} />
          <Row icon={<Bell size={16} />}          iconBg="#f59e0b" label="Notifications"      desc="Sounds & alerts"          onClick={() => setPage('notifications')} />
          <Row icon={<Database size={16} />}      iconBg="#06b6d4" label="Data and Storage"   desc="Auto-download, cache"     onClick={() => setPage('data')} />
          <Row icon={<Monitor size={16} />}       iconBg="#6366f1" label="Devices"            desc="Linked devices"           onClick={() => setPage('devices')} />
          <Row icon={<Zap size={16} />}           iconBg="#f97316" label="Power Saving"       desc="Reduce animations"        onClick={() => setPage('power')} />
          <Row icon={<Globe size={16} />}         iconBg="#14b8a6" label="Language"           desc="English"                  onClick={() => setPage('language')} />
        </Panel>

        {(me?.role === 'staff' || me?.role === 'owner') && (
          <Panel>
            <Row icon={<ShieldAlert size={16} />} iconBg="#ef4444" label="Staff Menu" desc="Manage users" onClick={() => setPage('staff')} />
          </Panel>
        )}

        <Panel>
          <Row icon={<LogOut size={16} />} iconBg="#ef4444" label="Sign Out" desc="See ya" onClick={() => signOut(auth)} danger />
        </Panel>
      </div>

      {showProfile && <ProfileModal onClose={() => setShowProfile(false)} />}
      {showStaff && <StaffMenu onClose={() => setShowStaff(false)} />}
    </div>
  )
}

const PAGE_TITLES: Record<Page, string> = {
  account: 'Account',
  chat: 'Chat Settings',
  privacy: 'Privacy & Security',
  notifications: 'Notifications',
  data: 'Data and Storage',
  devices: 'Devices',
  power: 'Power Saving',
  language: 'Language',
  staff: 'Staff Menu',
}

function SettingsPage({ page, onBack }: { page: Page; onBack: () => void }) {
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--bg)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '0 8px', height: 56, borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <button onClick={onBack} style={{ color: 'var(--accent)', padding: 8, display: 'flex', alignItems: 'center' }}>
          <ArrowLeft size={16} />
        </button>
        <span style={{ fontSize: 17, fontWeight: 600 }}>{PAGE_TITLES[page]}</span>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 100px' }}>
        {page === 'account'       && <AccountPage />}
        {page === 'chat'          && <ChatSettingsPage />}
        {page === 'privacy'       && <PrivacyPage />}
        {page === 'notifications' && <NotificationsPage />}
        {page === 'data'          && <DataStoragePage />}
        {page === 'devices'       && <DevicesPage />}
        {page === 'power'         && <PowerSavingPage />}
        {page === 'language'      && <LanguagePage />}
        {page === 'staff'         && <StaffMenu onClose={() => {}} inline />}
      </div>
    </div>
  )
}

function AccountPage() {
  const { user, setUser } = useAuthStore()
  const [firstName, setFirstName] = useState(user?.firstName ?? '')
  const [lastName,  setLastName]  = useState(user?.lastName ?? '')
  const [bio,       setBio]       = useState(user?.bio ?? '')
  const [phone,     setPhone]     = useState(user?.phone ?? '')
  const [username,  setUsername]  = useState(user?.username ?? '')
  const [birthday,  setBirthday]  = useState(user?.birthday ?? '')
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isFirst  = useRef(true)

  useEffect(() => {
    if (isFirst.current) { isFirst.current = false; return }
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(async () => {
      if (!user) return
      await updateDoc(doc(db, 'users', user.uid), { firstName, lastName, bio, phone, username, birthday })
      setUser({ ...user, firstName, lastName, bio, phone, username, birthday })
    }, 800)
  }, [firstName, lastName, bio, phone, username, birthday])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

      {/* Your name */}
      <Panel>
        <div style={{ padding: '10px 16px 4px' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Your name</div>
        </div>
        <Field label="First name" value={firstName} onChange={setFirstName} placeholder="First name" />
        <Field label="Last name"  value={lastName}  onChange={setLastName}  placeholder="Last name" />
      </Panel>

      {/* Bio */}
      <Panel>
        <Field label="Bio" value={bio} onChange={setBio} placeholder="Write something about yourself…" multiline />
      </Panel>

      {/* Your info */}
      <Panel>
        <div style={{ padding: '10px 16px 4px' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Your info</div>
        </div>
        <InfoField icon={<Phone  size={16} fill="#fff" strokeWidth={0} />} iconBg="#3b82f6" label="Number"   value={phone}    onChange={setPhone}    placeholder="Phone number" type="tel" />
        <InfoField icon={<AtSign size={16} color="#fff" />} iconBg="#8b5cf6" label="Username" value={username}  onChange={setUsername}  placeholder="username" />
        <InfoField icon={<Cake   size={16} fill="#fff" strokeWidth={0} />} iconBg="#ec4899" label="Birthday" value={birthday}  onChange={setBirthday}  placeholder="DD/MM/YYYY" type="date" />
      </Panel>

    </div>
  )
}

// ── shared primitives ────────────────────────────────────────────────────────

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!value)}
      style={{
        width: 32, height: 17, borderRadius: 999, flexShrink: 0,
        background: value ? 'var(--accent)' : 'var(--bg-4)',
        position: 'relative', transition: 'background 0.2s', overflow: 'visible',
      }}
    >
      <span style={{
        position: 'absolute', top: -3, left: value ? 13 : -3,
        width: 23, height: 23, borderRadius: '50%', background: '#fff',
        transition: 'left 0.2s',
        boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
      }} />
    </button>
  )
}

function ToggleRow({ label, desc, value, onChange }: { label: string; desc?: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', gap: 12 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15, color: 'var(--text)' }}>{label}</div>
        {desc && <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>{desc}</div>}
      </div>
      <Toggle value={value} onChange={onChange} />
    </div>
  )
}

function PickerRow({ label, options, value, onChange }: { label: string; options: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ padding: '12px 16px' }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>{label}</div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {options.map((o) => (
          <button
            key={o}
            onClick={() => onChange(o)}
            style={{
              padding: '6px 14px', borderRadius: 999, fontSize: 13,
              background: value === o ? 'var(--accent)' : 'var(--bg-4)',
              color: value === o ? '#fff' : 'var(--text-2)',
              fontWeight: value === o ? 600 : 400,
            }}
          >
            {o}
          </button>
        ))}
      </div>
    </div>
  )
}

function SelectRow({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', gap: 12 }}>
      <div style={{ flex: 1, fontSize: 15, color: 'var(--text)' }}>{label}</div>
      <Dropdown value={value} options={options} onChange={onChange} />
    </div>
  )
}

// ── Chat Settings ─────────────────────────────────────────────────────────────

const BUBBLE_STYLES = ['Modern', 'Classic', 'Minimal']

function bubbleRadius(style: string, isOwn: boolean) {
  if (style === 'Classic') return '18px'
  if (style === 'Minimal') return '6px'
  return isOwn ? '12px 12px 2px 12px' : '12px 12px 12px 2px'
}

function ChatSettingsPage() {
  const [msgSize,      setMsgSize]      = useState(() => parseInt(ls('nod_msgFontSize', '14')))
  const [bubbleStyle,  setBubbleStyle]  = useState(() => ls('nod_bubbleStyle', 'Modern'))
  const [enterSend,    setEnterSend]    = useState(() => ls('nod_enterSend', 'true') === 'true')
  const [linkPrev,     setLinkPrev]     = useState(() => ls('nod_linkPrev', 'true') === 'true')
  const [showTyping,   setShowTyping]   = useState(() => ls('nod_showTyping', 'true') === 'true')
  const [inAppBrowser, setInAppBrowser] = useState(() => ls('nod_inAppBrowser', 'true') === 'true')
  const [autoNight,    setAutoNight]    = useState(() => ls('nod_autoNight', 'false') === 'true')

  useEffect(() => {
    lsSet('nod_msgFontSize', String(msgSize))
    document.documentElement.style.setProperty('--msg-font-size', `${msgSize}px`)
  }, [msgSize])
  useEffect(() => { lsSet('nod_bubbleStyle', bubbleStyle) }, [bubbleStyle])
  useEffect(() => { lsSet('nod_enterSend', String(enterSend)) }, [enterSend])
  useEffect(() => { lsSet('nod_linkPrev', String(linkPrev)) }, [linkPrev])
  useEffect(() => { lsSet('nod_showTyping', String(showTyping)) }, [showTyping])
  useEffect(() => { lsSet('nod_inAppBrowser', String(inAppBrowser)) }, [inAppBrowser])
  useEffect(() => {
    lsSet('nod_autoNight', String(autoNight))
    if (autoNight) {
      const dark = window.matchMedia('(prefers-color-scheme: dark)').matches
      document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light')
    } else {
      document.documentElement.removeAttribute('data-theme')
    }
  }, [autoNight])

  const BubblePreview = ({ isOwn, text }: { isOwn: boolean; text: string }) => (
    <div style={{ display: 'flex', justifyContent: isOwn ? 'flex-end' : 'flex-start' }}>
      <div style={{
        background: isOwn ? 'var(--bubble-out)' : 'var(--bubble-in)',
        borderRadius: bubbleRadius(bubbleStyle, isOwn),
        padding: '8px 12px',
        fontSize: msgSize,
        color: 'var(--text)',
        maxWidth: '75%',
      }}>
        {text}
      </div>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

      {/* Text size */}
      <Panel>
        <div style={{ padding: '14px 16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <span style={{ fontSize: 15, color: 'var(--text)' }}>Message Text Size</span>
            <span style={{ fontSize: 13, color: 'var(--text-3)' }}>{msgSize}px</span>
          </div>
          <input type="range" min={11} max={20} step={1} value={msgSize} onChange={(e) => setMsgSize(Number(e.target.value))} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 16, padding: '10px', background: 'var(--bg)', borderRadius: 12 }}>
            <BubblePreview isOwn={false} text="Hey! How's it going? 👋" />
            <BubblePreview isOwn text="Pretty good, working on something cool!" />
          </div>
        </div>
      </Panel>

      {/* Bubble style */}
      <Panel>
        <div style={{ padding: '14px 16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <span style={{ fontSize: 15, color: 'var(--text)' }}>Bubble Style</span>
            <span style={{ fontSize: 13, color: 'var(--text-3)' }}>{bubbleStyle}</span>
          </div>
          <input
            type="range" min={0} max={2} step={1}
            value={BUBBLE_STYLES.indexOf(bubbleStyle)}
            onChange={(e) => setBubbleStyle(BUBBLE_STYLES[Number(e.target.value)])}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
            {BUBBLE_STYLES.map((s) => (
              <span key={s} style={{ fontSize: 11, color: BUBBLE_STYLES.indexOf(bubbleStyle) === BUBBLE_STYLES.indexOf(s) ? 'var(--accent)' : 'var(--text-3)' }}>{s}</span>
            ))}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 14, padding: '10px', background: 'var(--bg)', borderRadius: 12 }}>
            <BubblePreview isOwn={false} text="Hey! How's it going? 👋" />
            <BubblePreview isOwn text="Pretty good, working on something cool!" />
          </div>
        </div>
      </Panel>

      {/* Toggles */}
      <Panel>
        <ToggleRow label="Send with Enter"    desc="Press Enter to send messages"       value={enterSend}    onChange={setEnterSend} />
        <ToggleRow label="Link Previews"      desc="Show previews for links in chat"    value={linkPrev}     onChange={setLinkPrev} />
        <ToggleRow label="Typing Indicators"  desc="Show when others are typing"        value={showTyping}   onChange={setShowTyping} />
        <ToggleRow label="In-App Browser"     desc="Open links inside the app"          value={inAppBrowser} onChange={setInAppBrowser} />
        <ToggleRow label="Auto Night Mode"    desc="Follow system dark/light preference" value={autoNight}   onChange={setAutoNight} />
      </Panel>

    </div>
  )
}

// ── Privacy & Security ────────────────────────────────────────────────────────

const PRIVACY_OPTIONS = ['Everybody', 'My Contacts', 'Nobody']

function PrivacyPage() {
  // Security toggles
  const [twoStep,      setTwoStep]      = useState(() => ls('nod_sec_2fa', 'false') === 'true')
  const [autoDelete,   setAutoDelete]   = useState(() => ls('nod_sec_autoDelete', 'false') === 'true')
  const [passcodeLock, setPasscodeLock] = useState(() => ls('nod_sec_passcode', 'false') === 'true')
  const [passkeys,     setPasskeys]     = useState(() => ls('nod_sec_passkeys', 'false') === 'true')
  const [blockUnknown, setBlockUnknown] = useState(() => ls('nod_sec_blockUnknown', 'false') === 'true')
  const [deviceApproval, setDeviceApproval] = useState(() => ls('nod_sec_deviceApproval', 'false') === 'true')

  // Privacy dropdowns
  const [phone,    setPhone]    = useState(() => ls('nod_priv_phone',    'My Contacts'))
  const [lastSeen, setLastSeen] = useState(() => ls('nod_priv_lastSeen', 'Everybody'))
  const [photo,    setPhoto]    = useState(() => ls('nod_priv_photo',    'Everybody'))
  const [forwards, setForwards] = useState(() => ls('nod_priv_forwards', 'Everybody'))
  const [calls,    setCalls]    = useState(() => ls('nod_priv_calls',    'My Contacts'))
  const [vms,      setVms]      = useState(() => ls('nod_priv_vms',      'My Contacts'))
  const [messages, setMessages] = useState(() => ls('nod_priv_messages', 'Everybody'))
  const [birthday, setBirthday] = useState(() => ls('nod_priv_birthday', 'My Contacts'))
  const [bio,      setBio]      = useState(() => ls('nod_priv_bio',      'Everybody'))

  useEffect(() => { lsSet('nod_sec_2fa', String(twoStep)) }, [twoStep])
  useEffect(() => { lsSet('nod_sec_autoDelete', String(autoDelete)) }, [autoDelete])
  useEffect(() => { lsSet('nod_sec_passcode', String(passcodeLock)) }, [passcodeLock])
  useEffect(() => { lsSet('nod_sec_passkeys', String(passkeys)) }, [passkeys])
  useEffect(() => { lsSet('nod_sec_blockUnknown', String(blockUnknown)) }, [blockUnknown])
  useEffect(() => { lsSet('nod_sec_deviceApproval', String(deviceApproval)) }, [deviceApproval])

  useEffect(() => { lsSet('nod_priv_phone', phone) }, [phone])
  useEffect(() => { lsSet('nod_priv_lastSeen', lastSeen) }, [lastSeen])
  useEffect(() => { lsSet('nod_priv_photo', photo) }, [photo])
  useEffect(() => { lsSet('nod_priv_forwards', forwards) }, [forwards])
  useEffect(() => { lsSet('nod_priv_calls', calls) }, [calls])
  useEffect(() => { lsSet('nod_priv_vms', vms) }, [vms])
  useEffect(() => { lsSet('nod_priv_messages', messages) }, [messages])
  useEffect(() => { lsSet('nod_priv_birthday', birthday) }, [birthday])
  useEffect(() => { lsSet('nod_priv_bio', bio) }, [bio])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

      {/* Security */}
      <Panel>
        <div style={{ padding: '10px 16px 4px' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Security</div>
        </div>
        <ToggleRow label="Two-Step Verification" desc="Add an extra password to your account" value={twoStep}        onChange={setTwoStep} />
        <ToggleRow label="Auto-Delete Messages"  desc="Automatically remove old messages"     value={autoDelete}    onChange={setAutoDelete} />
        <ToggleRow label="Passcode Lock"         desc="Lock the app with a PIN"               value={passcodeLock}  onChange={setPasscodeLock} />
        <ToggleRow label="Passkeys"              desc="Sign in with biometrics"               value={passkeys}      onChange={setPasskeys} />
        <ToggleRow label="Block Unknown Users"   desc="Block messages from people you don't know" value={blockUnknown} onChange={setBlockUnknown} />
        <ToggleRow label="Device Approval"       desc="Approve new logins from this device"   value={deviceApproval} onChange={setDeviceApproval} />
      </Panel>

      {/* Privacy */}
      <Panel>
        <div style={{ padding: '10px 16px 4px' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Privacy</div>
        </div>
        <PrivacyRow label="Phone Number"        value={phone}    onChange={setPhone} />
        <PrivacyRow label="Last Seen & Online"  value={lastSeen} onChange={setLastSeen} />
        <PrivacyRow label="Profile Photos"      value={photo}    onChange={setPhoto} />
        <PrivacyRow label="Forwarded Messages"  value={forwards} onChange={setForwards} />
        <PrivacyRow label="Calls"               value={calls}    onChange={setCalls} />
        <PrivacyRow label="Voice Messages"      value={vms}      onChange={setVms} />
        <PrivacyRow label="Messages"            value={messages} onChange={setMessages} />
        <PrivacyRow label="Birthday"            value={birthday} onChange={setBirthday} />
        <PrivacyRow label="Bio"                 value={bio}      onChange={setBio} />
      </Panel>

    </div>
  )
}

function PrivacyRow({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 16px', gap: 12 }}>
      <span style={{ fontSize: 15, color: 'var(--text)', flex: 1, minWidth: 0 }}>{label}</span>
      <Dropdown value={value} options={PRIVACY_OPTIONS} onChange={onChange} />
    </div>
  )
}

// ── Notifications ─────────────────────────────────────────────────────────────

function NotificationsPage() {
  const [enabled,   setEnabled]   = useState(() => ls('nod_notif', 'true') === 'true')
  const [sound,     setSound]     = useState(() => ls('nod_notifSound', 'true') === 'true')
  const [vibrate,   setVibrate]   = useState(() => ls('nod_notifVibrate', 'true') === 'true')
  const [preview,   setPreview]   = useState(() => ls('nod_notifPreview', 'true') === 'true')
  const [groupNotif, setGroupNotif] = useState(() => ls('nod_groupNotif', 'true') === 'true')

  useEffect(() => {
    lsSet('nod_notif', String(enabled))
    if (enabled) requestNotificationPermission()
  }, [enabled])
  useEffect(() => { lsSet('nod_notifSound', String(sound)) }, [sound])
  useEffect(() => { lsSet('nod_notifVibrate', String(vibrate)) }, [vibrate])
  useEffect(() => { lsSet('nod_notifPreview', String(preview)) }, [preview])
  useEffect(() => { lsSet('nod_groupNotif', String(groupNotif)) }, [groupNotif])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <Panel>
        <ToggleRow label="Notifications" desc="Enable all push notifications" value={enabled} onChange={setEnabled} />
      </Panel>
      <Panel>
        <ToggleRow label="Sound"     desc="Play sound on new message" value={sound}     onChange={setSound} />
        <FieldDivider />
        <ToggleRow label="Vibration" desc="Vibrate on new message"    value={vibrate}   onChange={setVibrate} />
        <FieldDivider />
        <ToggleRow label="Message Preview" desc="Show content in notification" value={preview} onChange={setPreview} />
        <FieldDivider />
        <ToggleRow label="Group Notifications" desc="Notify for group messages" value={groupNotif} onChange={setGroupNotif} />
      </Panel>
    </div>
  )
}

// ── Data and Storage ──────────────────────────────────────────────────────────

function fmt(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

function DataStoragePage() {
  const [autoImg,       setAutoImg]       = useState(() => ls('nod_autoImg', 'true') === 'true')
  const [autoVideo,     setAutoVideo]     = useState(() => ls('nod_autoVideo', 'false') === 'true')
  const [autoAudio,     setAutoAudio]     = useState(() => ls('nod_autoAudio', 'true') === 'true')
  const [onMobile,      setOnMobile]      = useState(() => ls('nod_dlMobile', 'true') === 'true')
  const [onWifi,        setOnWifi]        = useState(() => ls('nod_dlWifi', 'true') === 'true')
  const [onRoaming,     setOnRoaming]     = useState(() => ls('nod_dlRoaming', 'false') === 'true')
  const [storageUsed, setStorageUsed] = useState('—')
  const [dataUsed, setDataUsed]       = useState('—')

  useEffect(() => {
    // Storage used via Storage API (IndexedDB + localStorage + cache)
    if (navigator.storage?.estimate) {
      navigator.storage.estimate().then(({ usage }) => {
        setStorageUsed(usage ? fmt(usage) : '—')
      })
    }
    // Data usage: sum all localStorage string lengths as a proxy for cached data
    try {
      let total = 0
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i) ?? ''
        total += key.length + (localStorage.getItem(key)?.length ?? 0)
      }
      setDataUsed(fmt(total * 2)) // UTF-16 = 2 bytes per char
    } catch {}
  }, [])


  useEffect(() => { lsSet('nod_autoImg', String(autoImg)) }, [autoImg])
  useEffect(() => { lsSet('nod_autoVideo', String(autoVideo)) }, [autoVideo])
  useEffect(() => { lsSet('nod_autoAudio', String(autoAudio)) }, [autoAudio])
  useEffect(() => { lsSet('nod_dlMobile', String(onMobile)) }, [onMobile])
  useEffect(() => { lsSet('nod_dlWifi', String(onWifi)) }, [onWifi])
  useEffect(() => { lsSet('nod_dlRoaming', String(onRoaming)) }, [onRoaming])

  function clearCache() {
    try {
      Object.keys(localStorage).filter((k) => k.startsWith('nod_cache_')).forEach((k) => localStorage.removeItem(k))
    } catch {}
    alert('Cache cleared.')
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <Panel>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '13px 16px' }}>
          <span style={{ width: 30, height: 30, borderRadius: 10, background: 'linear-gradient(160deg, #38bdf8, #0284c7)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <HardDrive size={16} color="#fff" />
          </span>
          <span style={{ flex: 1, fontSize: 15, color: 'var(--text)' }}>Storage Used</span>
          <span style={{ fontSize: 14, color: 'var(--text-3)' }}>{storageUsed}</span>
        </div>
        <FieldDivider />
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '13px 16px' }}>
          <span style={{ width: 30, height: 30, borderRadius: 10, background: 'linear-gradient(160deg, #34d399, #059669)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Activity size={16} color="#fff" />
          </span>
          <span style={{ flex: 1, fontSize: 15, color: 'var(--text)' }}>Data Usage</span>
          <span style={{ fontSize: 14, color: 'var(--text-3)' }}>{dataUsed}</span>
        </div>
      </Panel>
      <Panel>
        <div style={{ padding: '10px 16px 4px' }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>Automatic Media Download</div>
        </div>
        <ToggleRow label="When using mobile data" value={onMobile}  onChange={setOnMobile} />
        <FieldDivider />
        <ToggleRow label="When connected to Wi-Fi" value={onWifi}   onChange={setOnWifi} />
        <FieldDivider />
        <ToggleRow label="When roaming"            value={onRoaming} onChange={setOnRoaming} />
      </Panel>
      <Panel>
        <div style={{ padding: '10px 16px 4px' }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>Auto-Download</div>
        </div>
        <ToggleRow label="Images" desc="Automatically download images" value={autoImg}   onChange={setAutoImg} />
        <FieldDivider />
        <ToggleRow label="Videos" desc="Automatically download videos" value={autoVideo} onChange={setAutoVideo} />
        <FieldDivider />
        <ToggleRow label="Audio"  desc="Automatically download voice messages" value={autoAudio} onChange={setAutoAudio} />
      </Panel>
      <Panel>
        <button
          onClick={clearCache}
          style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '13px 16px', color: 'var(--danger)' }}
        >
          <Trash2 size={16} />
          <span style={{ fontSize: 15 }}>Clear Cache</span>
        </button>
      </Panel>
    </div>
  )
}

// ── Devices ───────────────────────────────────────────────────────────────────

function DevicesPage() {
  const { user } = useAuthStore()
  const ua = navigator.userAgent
  const platform = /android/i.test(ua) ? 'Android' : /iphone|ipad/i.test(ua) ? 'iOS' : /mac/i.test(ua) ? 'macOS' : /win/i.test(ua) ? 'Windows' : 'Unknown'
  const browser = /chrome/i.test(ua) ? 'Chrome' : /firefox/i.test(ua) ? 'Firefox' : /safari/i.test(ua) ? 'Safari' : 'Browser'
  const [terminating, setTerminating] = useState(false)
  const [autoTerminate, setAutoTerminate] = useState(() => ls('nod_autoTerminate', '1 week'))
  const sessionStart = new Date(parseInt(SESSION_ID.split('-')[0])).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })

  useEffect(() => { lsSet('nod_autoTerminate', autoTerminate) }, [autoTerminate])

  async function terminateOthers() {
    if (!user) return
    setTerminating(true)
    await updateDoc(doc(db, 'users', user.uid), { terminateExcept: SESSION_ID })
    setTerminating(false)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <Panel>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px' }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--bg-4)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Smartphone size={20} color="var(--accent)" />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 500 }}>This Device</div>
            <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>{platform} · {browser}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#22c55e' }} />
            <span style={{ fontSize: 12, color: 'var(--text-3)' }}>Active now</span>
          </div>
        </div>
        <button
          onClick={terminateOthers}
          disabled={terminating}
          style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '14px 16px', color: 'var(--danger)' }}
        >
          <LogOutIcon size={16} style={{ flexShrink: 0 }} />
          <span style={{ fontSize: 15, fontWeight: 500 }}>
            {terminating ? 'Terminating…' : 'Terminate All Other Sessions'}
          </span>
        </button>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '13px 16px' }}>
          <span style={{ fontSize: 15, color: 'var(--text)' }}>Active session</span>
          <span style={{ fontSize: 13, color: 'var(--text-3)' }}>{sessionStart}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', gap: 12 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 15, color: 'var(--text)' }}>Auto-terminate old sessions</div>
            <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>Sign out sessions older than</div>
          </div>
          <Dropdown value={autoTerminate} options={['1 week', '3 weeks', '6 months', '1 year']} onChange={setAutoTerminate} />
        </div>
      </Panel>
    </div>
  )
}

// ── Power Saving ──────────────────────────────────────────────────────────────

function PowerSavingPage() {
  const [reduceAnim, setReduceAnim]   = useState(() => ls('nod_reduceAnim', 'false') === 'true')
  const [reduceBg,   setReduceBg]     = useState(() => ls('nod_reduceBg', 'false') === 'true')
  const [lowData,    setLowData]      = useState(() => ls('nod_lowData', 'false') === 'true')

  useEffect(() => {
    lsSet('nod_reduceAnim', String(reduceAnim))
    document.body.classList.toggle('reduce-motion', reduceAnim)
  }, [reduceAnim])
  useEffect(() => { lsSet('nod_reduceBg', String(reduceBg)) }, [reduceBg])
  useEffect(() => { lsSet('nod_lowData', String(lowData)) }, [lowData])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <Panel>
        <ToggleRow label="Reduce Animations"   desc="Disable motion effects"           value={reduceAnim} onChange={setReduceAnim} />
        <FieldDivider />
        <ToggleRow label="Reduce Background Activity" desc="Pause syncing when app is in background" value={reduceBg} onChange={setReduceBg} />
        <FieldDivider />
        <ToggleRow label="Low Data Mode"       desc="Load lower quality media"         value={lowData}    onChange={setLowData} />
      </Panel>
    </div>
  )
}

// ── Language ──────────────────────────────────────────────────────────────────

const LANGUAGES = ['English', 'Spanish', 'French', 'German', 'Portuguese', 'Russian', 'Japanese', 'Korean', 'Chinese']

function LanguagePage() {
  const { currentLang, setLang, translating } = useLang()

  return (
    <>
      {translating && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 4px 12px', color: 'var(--text-3)', fontSize: 13 }}>
          <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
          Translating…
          <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        </div>
      )}
      <Panel>
        {LANGUAGES.map((l, i) => (
          <div key={l}>
            <button
              onClick={() => setLang(l)}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '13px 16px' }}
            >
              <span style={{ fontSize: 15, color: 'var(--text)' }}>{l}</span>
              {currentLang === l && <Check size={16} color="var(--accent)" />}
            </button>
            {i < LANGUAGES.length - 1 && <FieldDivider />}
          </div>
        ))}
      </Panel>
    </>
  )
}

// ── Account ───────────────────────────────────────────────────────────────────

function InfoField({ icon, iconBg, label, value, onChange, placeholder, type = 'text' }: {
  icon: React.ReactNode
  iconBg: string
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: string
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '10px 16px' }}>
      <span style={{
        width: 30, height: 30, borderRadius: 10, flexShrink: 0,
        background: `linear-gradient(160deg, ${lighten(iconBg)}, ${darken(iconBg)})`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
      }}>
        {icon}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 3 }}>{label}</div>
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          style={{ width: '100%', fontSize: 15, color: 'var(--text)', background: 'none' }}
        />
      </div>
    </div>
  )
}

function Field({ label, value, onChange, placeholder, type = 'text', multiline }: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: string
  multiline?: boolean
}) {
  return (
    <div style={{ padding: '12px 16px' }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>
        {label}
      </div>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={3}
          style={{ width: '100%', fontSize: 15, color: 'var(--text)', background: 'none', lineHeight: 1.5, resize: 'none' }}
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          style={{ width: '100%', fontSize: 15, color: 'var(--text)', background: 'none' }}
        />
      )}
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

function FieldDivider() {
  return <div style={{ height: 1, background: 'var(--border)', marginLeft: 16 }} />
}

function Dropdown({ value, options, onChange }: { value: string; options: string[]; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false)
  const [rect, setRect] = useState<DOMRect | null>(null)
  const btnRef = useRef<HTMLButtonElement>(null)

  function toggle() {
    if (!open) setRect(btnRef.current?.getBoundingClientRect() ?? null)
    setOpen((o) => !o)
  }

  return (
    <div style={{ flexShrink: 0 }}>
      <button
        ref={btnRef}
        onClick={toggle}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          background: 'var(--bg-4)', borderRadius: 8, padding: '5px 10px',
          fontSize: 13, color: 'var(--text)', fontWeight: 500,
        }}
      >
        {value}
        <ChevronRight size={13} style={{ color: 'var(--text-3)', transform: open ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.15s' }} />
      </button>
      {open && rect && createPortal(
        <>
          <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 100 }} />
          <div style={{
            position: 'fixed',
            top: rect.bottom + 6,
            right: window.innerWidth - rect.right,
            background: 'var(--bg-3)', border: '1px solid var(--border)',
            borderRadius: 20, overflow: 'hidden', zIndex: 101, minWidth: 130, padding: 4,
            boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
          }}>
            {options.map((o) => (
              <button
                key={o}
                onClick={() => { onChange(o); setOpen(false) }}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  width: '100%', padding: '8px 12px', fontSize: 13,
                  color: value === o ? 'var(--accent)' : 'var(--text)',
                  background: value === o ? 'rgba(59,130,246,0.12)' : 'transparent',
                  fontWeight: value === o ? 600 : 400,
                  borderRadius: 999,
                }}
              >
                {o}
                {value === o && <Check size={13} color="var(--accent)" />}
              </button>
            ))}
          </div>
        </>,
        document.body
      )}
    </div>
  )
}

function Panel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: 'var(--bg-2)', borderRadius: 14, overflow: 'hidden', marginBottom: 16 }}>
      {children}
    </div>
  )
}

function Row({ icon, iconBg, label, desc, onClick, danger }: {
  icon: React.ReactNode
  iconBg: string
  label: string
  desc: string
  onClick: () => void
  danger?: boolean
}) {
  return (
    <button
      onClick={onClick}
      style={{ display: 'flex', alignItems: 'center', gap: 14, width: '100%', padding: '11px 16px', textAlign: 'left', color: danger ? 'var(--danger)' : 'var(--text)' }}
    >
      <span style={{
        width: 30, height: 30, borderRadius: 10,
        background: `linear-gradient(160deg, ${lighten(iconBg)}, ${darken(iconBg)})`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', flexShrink: 0,
      }}>
        {icon}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 500, color: danger ? 'var(--danger)' : 'var(--text)' }}>{label}</div>
        <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{desc}</div>
      </div>
      <ChevronRight size={15} style={{ color: 'var(--text-3)', flexShrink: 0 }} />
    </button>
  )
}
