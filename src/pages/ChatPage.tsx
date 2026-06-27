import { useEffect, useRef, useState } from 'react'
import {
  doc,
  onSnapshot,
  getDoc,
  collection,
  query,
  onSnapshot as onSnap,
} from 'firebase/firestore'
import { db } from '../firebase'
import { useChatStore } from '../store/chatStore'
import { useTypingStore } from '../store/typingStore'
import { useAuthStore } from '../store/authStore'
import { Chat, Message, User } from '../types'
import { ChatHeader } from '../components/chat/ChatHeader'
import { MessageList } from '../components/chat/MessageList'
import { MessageInput } from '../components/chat/MessageInput'
import { TypingIndicator } from '../components/chat/TypingIndicator'
import { CallModal } from '../components/call/CallModal'
import { PinnedModal } from '../components/chat/PinnedModal'
import { UserProfileSheet } from '../components/chat/UserProfileSheet'
import { ArrowLeft, MoreVertical } from 'lucide-react'

interface ChatPageProps { onBack?: () => void }

export const DEMO_CHAT_ID = 'demo-preview'

const DEMO_MSGS = [
  { id: '1', side: 'them', text: 'Hey! Are you free tonight? 🎉', time: '9:41 PM' },
  { id: '2', side: 'me', text: "Yeah, what's up?", time: '9:42 PM' },
  { id: '3', side: 'them', text: "We're doing a movie night at mine, wanna come?", time: '9:42 PM' },
  { id: '4', side: 'me', text: 'Sounds fun! What time?', time: '9:43 PM' },
  { id: '5', side: 'them', text: 'Around 8pm, bring snacks lol 🎉', time: '9:43 PM' },
  { id: '6', side: 'me', text: 'On it 😄', time: '9:44 PM' },
] as const

const ALEX: User = {
  uid: 'demo', username: 'alex', tag: '1234', firstName: 'Alex', lastName: 'Morgan',
  phone: '', email: '', bio: 'Movie nights and good vibes 🎬', lastSeen: Date.now(),
  createdAt: Date.now() - 1000 * 60 * 60 * 24 * 90, online: true,
  role: 'user', banned: false, avatarUrl: null, bannerUrl: null,
}

function DemoChatPage({ onBack }: { onBack?: () => void }) {
  const bottomRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [showProfile, setShowProfile] = useState(false)

  useEffect(() => { bottomRef.current?.scrollIntoView() }, [])

  useEffect(() => {
    if (!menuOpen) return
    function handler(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [menuOpen])

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--bg)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', flexShrink: 0, gap: 10, background: 'var(--bg)' }}>
        {onBack ? (
          <button onClick={onBack} style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--bg-2)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: 'var(--text)' }}>
            <ArrowLeft size={20} />
          </button>
        ) : <div style={{ width: 40 }} />}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 999, padding: '6px 14px 6px 6px', flex: 1 }}>
          <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg,#f59e0b,#ef4444)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#fff', fontSize: 13, flexShrink: 0 }}>A</div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: 13, lineHeight: 1.2 }}>Alex</div>
            <div style={{ fontSize: 11, color: '#22c55e', lineHeight: 1.2 }}>Online</div>
          </div>
          <button onClick={() => setShowProfile(true)} style={{ position: 'absolute', inset: 0, borderRadius: 999, cursor: 'pointer' }} />
        </div>
        <div ref={menuRef} style={{ position: 'relative', flexShrink: 0 }}>
          <button
            onClick={() => setMenuOpen(v => !v)}
            style={{ width: 40, height: 40, borderRadius: '50%', background: menuOpen ? 'var(--bg-3)' : 'var(--bg-2)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text)' }}
          >
            <MoreVertical size={20} />
          </button>
          {menuOpen && (
            <div className="menu-dropdown" style={{ position: 'fixed', top: 64, right: 12, background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', minWidth: 180, zIndex: 200, boxShadow: '0 8px 24px rgba(0,0,0,0.3)' }}>
              {['Audio Call', 'Video Call', 'Pinned Messages', 'Mute'].map(label => (
                <button key={label} onClick={() => setMenuOpen(false)} style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '11px 14px', fontSize: 14, color: 'var(--text)', textAlign: 'left' }}>{label}</button>
              ))}
              <div style={{ height: 1, background: 'var(--border)', marginInline: 12 }} />
              <button onClick={() => setMenuOpen(false)} style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '11px 14px', fontSize: 14, color: '#ef4444', textAlign: 'left' }}>Clear History</button>
            </div>
          )}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 12px 8px', display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ textAlign: 'center', fontSize: 11, color: 'var(--text-3)', margin: '8px 0 12px', fontWeight: 600, letterSpacing: '0.04em' }}>TODAY</div>
        {DEMO_MSGS.map((m) => {
          const isOwn = m.side === 'me'
          return (
            <div key={m.id} style={{ display: 'flex', justifyContent: isOwn ? 'flex-end' : 'flex-start', marginBottom: 2 }}>
              {!isOwn && (
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg,#f59e0b,#ef4444)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#fff', fontSize: 12, marginRight: 8, flexShrink: 0, alignSelf: 'flex-end', marginBottom: 2 }}>A</div>
              )}
              <div style={{ maxWidth: '72%' }}>
                <div style={{ background: isOwn ? 'var(--accent)' : 'var(--bg-3)', color: isOwn ? '#fff' : 'var(--text)', padding: '8px 12px', borderRadius: isOwn ? '12px 12px 2px 12px' : '12px 12px 12px 2px', fontSize: 14, lineHeight: 1.4 }}>
                  {m.text}
                </div>
                <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 3, textAlign: isOwn ? 'right' : 'left', paddingInline: 4 }}>{m.time}</div>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      <div style={{ padding: '8px 12px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ flex: 1, background: 'var(--bg-3)', border: '1px solid var(--border)', borderRadius: 20, padding: '9px 14px', fontSize: 14, color: 'var(--text-3)' }}>
          Message Alex…
        </div>
      </div>

      {showProfile && (
        <UserProfileSheet user={ALEX} onClose={() => setShowProfile(false)} onMessage={() => setShowProfile(false)} />
      )}
    </div>
  )
}

function RealChatPage({ chatId, onBack }: { chatId: string; onBack?: () => void }) {
  const [chat, setChat] = useState<Chat | null>(null)
  const [members, setMembers] = useState<Record<string, User>>({})
  const [replyTo, setReplyTo] = useState<Message | null>(null)
  const [callType, setCallType] = useState<'audio' | 'video' | null>(null)
  const [showPinned, setShowPinned] = useState(false)
  const [profileUser, setProfileUser] = useState<User | null>(null)
  const setTyping = useTypingStore((s) => s.setTyping)
  const me = useAuthStore((s) => s.user)

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'chats', chatId), (snap) => {
      if (snap.exists()) setChat({ id: snap.id, ...snap.data() } as Chat)
    })
    return unsub
  }, [chatId])

  useEffect(() => {
    if (!chat) return
    Promise.all(
      chat.memberIds.map((uid) =>
        getDoc(doc(db, 'users', uid)).then((d) => ({ uid, ...(d.data() ?? {}) } as User))
      )
    ).then((users) => {
      const map: Record<string, User> = {}
      users.forEach((u) => (map[u.uid] = u))
      setMembers(map)
    })
  }, [chat?.memberIds.join(',')])

  useEffect(() => {
    const q = query(collection(db, 'chats', chatId, 'typing'))
    const unsub = onSnap(q, (snap) => {
      const now = Date.now()
      snap.docs.forEach((d) => {
        const data = d.data()
        if (now - data.at < 5000) setTyping(chatId, d.id, data.username)
        else setTyping(chatId, d.id, null)
      })
      snap.docChanges().forEach((c) => {
        if (c.type === 'removed') setTyping(chatId, c.doc.id, null)
      })
    })
    return unsub
  }, [chatId])

  if (!chat) return null

  const isChannel = chat.type === 'channel'
  const isAdmin = chat.createdBy === me?.uid || me?.role === 'staff'
  const readOnly = isChannel && !isAdmin

  const memberSummary: Record<string, { username: string; tag: string; avatarUrl: string | null }> = {}
  Object.entries(members).forEach(([uid, u]) => {
    memberSummary[uid] = { username: u.username, tag: u.tag, avatarUrl: u.avatarUrl }
  })

  const otherUid = chat.memberIds.find((id) => id !== me?.uid) ?? chat.memberIds[0]

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--bg)' }}>
      <ChatHeader
        chat={chat}
        memberCount={chat.memberIds.length}
        onBack={onBack}
        onCall={(t) => setCallType(t)}
        onShowPinned={() => setShowPinned(true)}
        onShowMenu={() => {}}
        onShowProfile={async () => {
          const snap = await getDoc(doc(db, 'users', otherUid))
          if (snap.exists()) setProfileUser({ uid: snap.id, ...snap.data() } as User)
        }}
      />
      <MessageList chatId={chatId} members={memberSummary} onReply={setReplyTo} />
      <TypingIndicator chatId={chatId} />
      <MessageInput
        chatId={chatId}
        replyTo={replyTo}
        onCancelReply={() => setReplyTo(null)}
        readOnly={readOnly}
      />
      {callType && (
        <CallModal chatId={chatId} type={callType} members={members} onClose={() => setCallType(null)} />
      )}
      {showPinned && (
        <PinnedModal chatId={chatId} onClose={() => setShowPinned(false)} />
      )}
      {profileUser && (
        <UserProfileSheet
          user={profileUser}
          onClose={() => setProfileUser(null)}
          onMessage={() => setProfileUser(null)}
        />
      )}
    </div>
  )
}

export function ChatPage({ onBack }: ChatPageProps) {
  const chatId = useChatStore((s) => s.activeChatId)

  if (chatId === DEMO_CHAT_ID) {
    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bg)' }}>
        <DemoChatPage onBack={onBack} />
      </div>
    )
  }

  if (!chatId) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-3)', fontSize: 14 }}>
        Select a chat to start messaging
      </div>
    )
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bg)' }}>
      <RealChatPage chatId={chatId} onBack={onBack} />
    </div>
  )
}
