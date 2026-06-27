import { useState, useEffect, useRef, useLayoutEffect } from 'react'
import { collection, getDocs, query, where, addDoc } from 'firebase/firestore'
import { db } from '../../firebase'
import { ChatListScreen } from './ChatListScreen'
import { ChatPage } from '../../pages/ChatPage'
import { SettingsScreen } from './SettingsScreen'
import { ProfileScreen } from './ProfileScreen'
import { useChatStore } from '../../store/chatStore'
import { useAuthStore } from '../../store/authStore'
import { useLang } from '../../contexts/LangContext'
import { Avatar } from '../ui/Avatar'
import { MessageSquare, Settings, Users, Search, UserPlus, Phone, ChevronRight } from 'lucide-react'
import { User } from '../../types'
import { useSwipe } from '../../hooks/useSwipe'

type Tab = 'chats' | 'contacts' | 'settings' | 'profile'

export function AppLayout() {
  const [tab, setTab] = useState<Tab>('chats')
  const { activeChatId, setActiveChatId } = useChatStore()
  const me = useAuthStore((s) => s.user)
  const { t } = useLang()
  const navRef = useRef<HTMLDivElement>(null)
  const btnRefs = useRef<(HTMLButtonElement | null)[]>([])
  const [pill, setPill] = useState({ left: 0, width: 0, ready: false })

  const TAB_IDS: Tab[] = ['chats', 'contacts', 'settings', 'profile']

  useLayoutEffect(() => {
    const idx = TAB_IDS.indexOf(tab)
    const btn = btnRefs.current[idx]
    const nav = navRef.current
    if (!btn || !nav) return
    const btnRect = btn.getBoundingClientRect()
    const navRect = nav.getBoundingClientRect()
    setPill({ left: btnRect.left - navRect.left, width: btnRect.width, ready: true })
  }, [tab])

  // Swipe right-from-edge to go back from chat, with drag effect
  const dragX = useRef(0)
  const dragEl = useRef<HTMLDivElement>(null)
  const dragging = useRef(false)

  // Swipe left/right to switch tabs (must be before any early return)
  const tabSwipe = useSwipe({
    onSwipeLeft:  () => { const i = TAB_IDS.indexOf(tab); if (i < TAB_IDS.length - 1) setTab(TAB_IDS[i + 1]) },
    onSwipeRight: () => { const i = TAB_IDS.indexOf(tab); if (i > 0) setTab(TAB_IDS[i - 1]) },
    threshold: 60,
  })

  function onChatTouchStart(e: React.TouchEvent) {
    if (e.touches[0].clientX > 32) return
    dragging.current = true
    dragX.current = 0
  }
  function onChatTouchMove(e: React.TouchEvent) {
    if (!dragging.current) return
    const dx = Math.max(0, e.touches[0].clientX - 16)
    dragX.current = dx
    if (dragEl.current) dragEl.current.style.transform = `translateX(${dx}px)`
  }
  function onChatTouchEnd() {
    if (!dragging.current) return
    dragging.current = false
    if (dragX.current > 100) {
      setActiveChatId(null)
    } else {
      if (dragEl.current) {
        dragEl.current.style.transition = 'transform 0.25s cubic-bezier(0.25,1,0.5,1)'
        dragEl.current.style.transform = 'translateX(0)'
        setTimeout(() => { if (dragEl.current) dragEl.current.style.transition = '' }, 260)
      }
    }
    dragX.current = 0
  }

  if (activeChatId) {
    return (
      <div
        ref={dragEl}
        onTouchStart={onChatTouchStart}
        onTouchMove={onChatTouchMove}
        onTouchEnd={onChatTouchEnd}
        style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bg)', paddingTop: 'env(safe-area-inset-top)' }}
      >
        <ChatPage onBack={() => setActiveChatId(null)} />
      </div>
    )
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bg)', position: 'relative', paddingTop: 'env(safe-area-inset-top)' }}>
      <div {...tabSwipe} style={{ flex: 1, overflow: 'hidden', paddingBottom: 80 }}>
        {tab === 'chats' && <ChatListScreen />}
        {tab === 'contacts' && <ContactsScreen />}
        {tab === 'settings' && <SettingsScreen />}
        {tab === 'profile' && <ProfileScreen />}
      </div>

      {/* Floating pill navbar */}
      <div
        ref={navRef}
        style={{
          position: 'absolute',
          bottom: `calc(16px + env(safe-area-inset-bottom))`,
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          background: 'var(--bg-2)',
          border: '1px solid var(--border)',
          borderRadius: 999,
          padding: '6px 8px',
          overflow: 'hidden',
        }}
      >
        {/* Sliding pill indicator */}
        {pill.ready && (
          <div
            style={{
              position: 'absolute',
              top: 6,
              bottom: 6,
              left: pill.left - 4,
              width: pill.width + 8,
              background: 'var(--bg-4)',
              borderRadius: 999,
              transition: 'left 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), width 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
              pointerEvents: 'none',
            }}
          />
        )}

        {([
          { id: 'chats' as Tab, icon: (c: string, a: boolean) => <MessageSquare size={20} color={c} fill={a ? c : 'none'} />, label: t('chats') },
          { id: 'contacts' as Tab, icon: (c: string, a: boolean) => <Users size={20} color={c} fill={a ? c : 'none'} />, label: t('contacts') },
          { id: 'settings' as Tab, icon: (c: string, a: boolean) => <Settings size={20} color={c} fill={a ? c : 'none'} />, label: t('settings') },
          { id: 'profile' as Tab, label: t('profile'), icon: (_c: string, _a: boolean) => (
            <div style={{ borderRadius: '50%', outline: tab === 'profile' ? '2px solid var(--accent)' : '2px solid transparent', outlineOffset: 1 }}>
              <Avatar url={me?.avatarUrl ?? null} name={me?.username ?? '?'} size={20} />
            </div>
          ) },
        ]).map((item, idx) => {
          const active = tab === item.id
          const color = active ? 'var(--accent)' : 'var(--text-3)'
          return (
            <button
              key={item.id}
              ref={(el) => { btnRefs.current[idx] = el }}
              onClick={() => setTab(item.id)}
              style={{
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 3,
                padding: '8px 24px',
                borderRadius: 999,
                background: 'transparent',
                color,
                fontSize: 10,
                fontWeight: active ? 600 : 400,
                transition: 'color 0.2s',
                zIndex: 1,
              }}
            >
              {item.icon(color, active)}
              {item.label}
            </button>
          )
        })}

      </div>
    </div>
  )
}

function ContactsScreen() {
  const me = useAuthStore((s) => s.user)
  const { chats, setActiveChatId } = useChatStore()
  const [search, setSearch] = useState('')
  const [contacts, setContacts] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [showCalls, setShowCalls] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!me) return
    // Only show users you have a DM with
    const dmChats = chats.filter((c) => c.type === 'dm' && c.memberIds.length === 2)
    const otherUids = [...new Set(dmChats.flatMap((c) => c.memberIds).filter((uid) => uid !== me.uid))]
    if (otherUids.length === 0) { setContacts([]); setLoading(false); return }
    Promise.all(otherUids.map((uid) => getDocs(query(collection(db, 'users'), where('__name__', '==', uid)))))
      .then((snaps) => {
        const users = snaps.flatMap((s) => s.docs.map((d) => ({ uid: d.id, ...d.data() } as User)))
          .filter((u) => !u.banned)
          .sort((a, b) => a.username.localeCompare(b.username))
        setContacts(users)
        setLoading(false)
      })
  }, [me?.uid, chats])

  async function openDM(user: User) {
    if (!me) return
    const ids = [me.uid, user.uid].sort()
    const q = query(collection(db, 'chats'), where('type', '==', 'dm'), where('memberIds', '==', ids))
    const snap = await getDocs(q)
    let chatId: string
    if (!snap.empty) {
      chatId = snap.docs[0].id
    } else {
      const ref = await addDoc(collection(db, 'chats'), {
        type: 'dm',
        name: user.username,
        avatarUrl: user.avatarUrl,
        memberIds: ids,
        lastMessage: '',
        lastMessageTime: Date.now(),
        createdBy: me.uid,
      })
      chatId = ref.id
    }
    setActiveChatId(chatId)
  }

  async function inviteFriend() {
    const url = window.location.origin
    if (navigator.share) {
      navigator.share({ title: 'Join me on Nod', text: 'Chat with me on Nod!', url }).catch(() => {})
    } else {
      navigator.clipboard.writeText(url).catch(() => {})
    }
  }

  const filtered = contacts.filter((u) =>
    `${u.username}#${u.tag}`.toLowerCase().includes(search.toLowerCase()) ||
    (u.firstName ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (u.lastName ?? '').toLowerCase().includes(search.toLowerCase())
  )

  // group alphabetically
  const groups: Record<string, User[]> = {}
  for (const u of filtered) {
    const letter = u.username[0].toUpperCase()
    if (!groups[letter]) groups[letter] = []
    groups[letter].push(u)
  }
  const sortedLetters = Object.keys(groups).sort()

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '16px 16px 8px', flexShrink: 0 }}>
        <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 12 }}>Contacts</div>

        {/* Search bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 12, padding: '8px 12px' }}>
          <Search size={15} color="var(--text-3)" />
          <input
            ref={searchRef}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search contacts"
            style={{ flex: 1, fontSize: 14, color: 'var(--text)', background: 'none', border: 'none', outline: 'none' }}
          />
          {search && (
            <button onClick={() => setSearch('')} style={{ color: 'var(--text-3)', lineHeight: 0 }}>
              <ChevronRight size={14} style={{ transform: 'rotate(180deg)' }} />
            </button>
          )}
        </div>
      </div>

      {/* Scrollable list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 12px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>

        {/* Invite friends + Recent calls */}
        <div style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
          <button
            onClick={inviteFriend}
            style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '5px 14px', textAlign: 'left' }}
          >
            <div style={{ width: 34, height: 34, borderRadius: 10, background: 'linear-gradient(135deg,#3b82f6,#6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <UserPlus size={16} color="#fff" />
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 500 }}>Invite Friends</div>
              <div style={{ fontSize: 12, color: 'var(--text-3)' }}>Share your invite link</div>
            </div>
          </button>

          <button
            onClick={() => setShowCalls((v) => !v)}
            style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '5px 14px', textAlign: 'left' }}
          >
            <div style={{ width: 34, height: 34, borderRadius: 10, background: 'linear-gradient(135deg,#10b981,#059669)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Phone size={16} color="#fff" />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 500 }}>Recent Calls</div>
              <div style={{ fontSize: 12, color: 'var(--text-3)' }}>View call history</div>
            </div>
            <ChevronRight size={16} color="var(--text-3)" style={{ transform: showCalls ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }} />
          </button>

          {showCalls && (
            <div style={{ padding: '8px 14px 12px 72px', color: 'var(--text-3)', fontSize: 13 }}>
              No recent calls
            </div>
          )}
        </div>

        {/* Contact list */}
        <div style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
          {loading ? (
            <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>Loading…</div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>
              {search ? 'No results' : 'No contacts yet'}
            </div>
          ) : (
            sortedLetters.map((letter, i) => (
              <div key={letter}>
                {i > 0 && <div style={{ height: 1, background: 'var(--border)', marginInline: 14 }} />}
                <div style={{ padding: '6px 14px 2px', fontSize: 11, fontWeight: 700, color: 'var(--text-3)', letterSpacing: '0.06em' }}>{letter}</div>
                {groups[letter].map((u) => (
                  <button
                    key={u.uid}
                    onClick={() => openDM(u)}
                    style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '9px 14px', textAlign: 'left' }}
                  >
                  <div style={{ position: 'relative', flexShrink: 0 }}>
                    <Avatar url={u.avatarUrl} name={u.username} size={44} />
                    {u.online && (
                      <div style={{ position: 'absolute', bottom: 1, right: 1, width: 11, height: 11, borderRadius: '50%', background: '#22c55e', border: '2px solid var(--bg)' }} />
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {u.firstName ? `${u.firstName}${u.lastName ? ' ' + u.lastName : ''}` : u.username}
                      <span style={{ color: 'var(--text-3)', fontWeight: 400 }}> #{u.tag}</span>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {u.bio || (u.online ? 'Online' : 'Offline')}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ))
        )}
        </div>

      </div>
    </div>
  )
}
