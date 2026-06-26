import { useEffect, useState } from 'react'
import {
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
  getDocs,
  addDoc,
  doc,
  getDoc,
} from 'firebase/firestore'
import { signOut } from 'firebase/auth'
import { auth, db } from '../../firebase'
import { useChatStore } from '../../store/chatStore'
import { useAuthStore } from '../../store/authStore'
import { Chat, User } from '../../types'
import { Avatar } from '../ui/Avatar'
import {
  Edit,
  LogOut,
  Search,
  Settings,
  Users,
  ShieldAlert,
  BookmarkCheck,
} from 'lucide-react'
import { NewChatModal } from './NewChatModal'
import { ProfileModal } from './ProfileModal'
import { StaffMenu } from './StaffMenu'

export function Sidebar() {
  const { chats, setChats, activeChatId, setActiveChatId } = useChatStore()
  const me = useAuthStore((s) => s.user)
  const [search, setSearch] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [showStaff, setShowStaff] = useState(false)

  useEffect(() => {
    if (!me) return
    const q = query(
      collection(db, 'chats'),
      where('memberIds', 'array-contains', me.uid),
      orderBy('lastMessageTime', 'desc')
    )
    const unsub = onSnapshot(q, (snap) => {
      const list: Chat[] = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Chat))
      setChats(list)
    })
    return unsub
  }, [me?.uid])

  async function openSavedMessages() {
    if (!me) return
    const existing = chats.find(
      (c) => c.type === 'dm' && c.memberIds.length === 1 && c.memberIds[0] === me.uid
    )
    if (existing) { setActiveChatId(existing.id); return }
    const ref = await addDoc(collection(db, 'chats'), {
      type: 'dm',
      name: 'Saved Messages',
      avatarUrl: null,
      memberIds: [me.uid],
      lastMessage: '',
      lastMessageTime: Date.now(),
      createdBy: me.uid,
    })
    setActiveChatId(ref.id)
  }

  const filtered = chats.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div
      style={{
        width: 300,
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        borderRight: '1px solid var(--border)',
        background: 'var(--bg)',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '0 12px',
          height: 56,
          borderBottom: '1px solid var(--border)',
          flexShrink: 0,
        }}
      >
        <button onClick={() => setShowProfile(true)} style={{ flexShrink: 0 }}>
          <Avatar url={me?.avatarUrl ?? null} name={me?.username ?? '?'} size={34} online={true} />
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {me?.username}
            <span style={{ color: 'var(--text-3)', fontWeight: 400 }}>#{me?.tag}</span>
          </div>
        </div>
        <button onClick={() => setShowNew(true)} style={{ color: 'var(--text-2)', padding: 6 }} title="New chat">
          <Edit size={18} />
        </button>
      </div>

      {/* Search */}
      <div style={{ padding: '8px 12px', flexShrink: 0 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: 'var(--bg-3)',
            border: '1px solid var(--border)',
            borderRadius: 20,
            padding: '6px 12px',
          }}
        >
          <Search size={14} style={{ color: 'var(--text-3)', flexShrink: 0 }} />
          <input
            placeholder="Search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ flex: 1, fontSize: 13, color: 'var(--text)', background: 'none' }}
          />
        </div>
      </div>

      {/* Saved messages shortcut */}
      <button
        onClick={openSavedMessages}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '8px 12px',
          color: 'var(--text-2)',
          fontSize: 13,
          borderBottom: '1px solid var(--border)',
          flexShrink: 0,
        }}
      >
        <BookmarkCheck size={18} />
        Saved Messages
      </button>

      {/* Chat list */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {filtered.map((chat) => (
          <ChatRow
            key={chat.id}
            chat={chat}
            active={chat.id === activeChatId}
            onClick={() => setActiveChatId(chat.id)}
          />
        ))}
        {filtered.length === 0 && (
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>
            No chats
          </div>
        )}
      </div>

      {/* Bottom bar */}
      <div
        style={{
          display: 'flex',
          gap: 4,
          padding: '8px 12px',
          borderTop: '1px solid var(--border)',
          flexShrink: 0,
        }}
      >
        {me?.role === 'staff' || me?.role === 'owner' ? (
          <NavBtn title="Staff" onClick={() => setShowStaff(true)}>
            <ShieldAlert size={18} />
          </NavBtn>
        ) : null}
        <NavBtn title="Settings" onClick={() => setShowProfile(true)}>
          <Settings size={18} />
        </NavBtn>
        <NavBtn title="Sign out" onClick={() => signOut(auth)}>
          <LogOut size={18} />
        </NavBtn>
      </div>

      {showNew && <NewChatModal onClose={() => setShowNew(false)} />}
      {showProfile && <ProfileModal onClose={() => setShowProfile(false)} />}
      {showStaff && <StaffMenu onClose={() => setShowStaff(false)} />}
    </div>
  )
}

function ChatRow({ chat, active, onClick }: { chat: Chat; active: boolean; onClick: () => void }) {
  const time = chat.lastMessageTime
    ? new Date(chat.lastMessageTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : ''

  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        width: '100%',
        padding: '8px 12px',
        background: active ? 'var(--bg-3)' : 'transparent',
        textAlign: 'left',
        borderRadius: 0,
      }}
    >
      <Avatar url={chat.avatarUrl} name={chat.name} size={44} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 2 }}>
          <span style={{ fontWeight: 500, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
            {chat.name}
          </span>
          <span style={{ fontSize: 11, color: 'var(--text-3)', flexShrink: 0, marginLeft: 8 }}>{time}</span>
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {chat.lastMessage || 'No messages yet'}
        </div>
      </div>
    </button>
  )
}

function NavBtn({ children, title, onClick }: { children: React.ReactNode; title: string; onClick: () => void }) {
  return (
    <button
      title={title}
      onClick={onClick}
      style={{
        color: 'var(--text-2)',
        padding: 7,
        borderRadius: 'var(--radius)',
        display: 'flex',
        alignItems: 'center',
      }}
    >
      {children}
    </button>
  )
}
