import { useState } from 'react'
import { addDoc, collection } from 'firebase/firestore'
import { db } from '../../firebase'
import { useChatStore } from '../../store/chatStore'
import { useAuthStore } from '../../store/authStore'
import { Chat } from '../../types'
import { Avatar } from '../ui/Avatar'
import { Search, Edit, BookmarkCheck } from 'lucide-react'
import { NewChatModal } from './NewChatModal'
import { getChatAvatar, getChatTitle } from '../../lib/chats'

export function ChatListScreen() {
  const { chats, setActiveChatId, upsertChat } = useChatStore()
  const me = useAuthStore((s) => s.user)
  const [search, setSearch] = useState('')
  const [showNew, setShowNew] = useState(false)

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
    upsertChat({
      id: ref.id,
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

  const filtered = chats.filter((c) => {
    if (c.type === 'dm' && c.memberIds.length === 1) return false
    const title = me ? getChatTitle(c, me.uid) : c.name
    return title.toLowerCase().includes(search.toLowerCase())
  })

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 16px',
          height: 56,
          borderBottom: '1px solid var(--border)',
          flexShrink: 0,
        }}
      >
        <span style={{ fontSize: 18, fontWeight: 700 }}>Chats</span>
        <button onClick={() => setShowNew(true)} style={{ color: 'var(--accent)', padding: 6 }}>
          <Edit size={20} />
        </button>
      </div>

      {/* Search */}
      <div style={{ padding: '8px 12px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg-3)', border: '1px solid var(--border)', borderRadius: 20, padding: '7px 14px' }}>
          <Search size={14} style={{ color: 'var(--text-3)', flexShrink: 0 }} />
          <input
            placeholder="Search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ flex: 1, fontSize: 14, color: 'var(--text)', background: 'none' }}
          />
        </div>
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {/* Saved Messages */}
        <button
          onClick={openSavedMessages}
          style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '10px 16px', textAlign: 'left' }}
        >
          <div style={{ width: 50, height: 50, borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <BookmarkCheck size={22} color="#fff" />
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 15 }}>Saved Messages</div>
            <div style={{ fontSize: 13, color: 'var(--text-2)' }}>Your personal space</div>
          </div>
        </button>

        {/* Demo preview */}
        <button
          onClick={() => setActiveChatId('demo-preview')}
          style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '10px 16px', textAlign: 'left' }}
        >
          <div style={{ width: 50, height: 50, borderRadius: '50%', background: 'linear-gradient(135deg,#f59e0b,#ef4444)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 22, fontWeight: 700, color: '#fff' }}>
            A
          </div>
          <div style={{ flex: 1, minWidth: 0, borderBottom: '1px solid var(--border)', paddingBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 3 }}>
              <span style={{ fontWeight: 600, fontSize: 15 }}>Alex</span>
              <span style={{ fontSize: 12, color: 'var(--text-3)', flexShrink: 0, marginLeft: 8 }}>2m</span>
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              Around 8pm, bring snacks lol 🎉
            </div>
          </div>
        </button>

        {filtered.map((chat) => (
          <ChatRow key={chat.id} chat={chat} myUid={me?.uid ?? ''} onClick={() => setActiveChatId(chat.id)} />
        ))}

        {filtered.length === 0 && chats.length > 0 && (
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>No results</div>
        )}
        {chats.length === 0 && (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-3)', fontSize: 13, lineHeight: 1.6 }}>
            No chats yet.<br />Tap the pencil icon to start one.
          </div>
        )}
      </div>

      {showNew && <NewChatModal onClose={() => setShowNew(false)} />}
    </div>
  )
}

function ChatRow({ chat, myUid, onClick }: { chat: Chat; myUid: string; onClick: () => void }) {
  const title = getChatTitle(chat, myUid)
  const avatar = getChatAvatar(chat, myUid)
  const time = chat.lastMessageTime
    ? new Date(chat.lastMessageTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : ''

  return (
    <button
      onClick={onClick}
      style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '10px 16px', textAlign: 'left' }}
    >
      <Avatar url={avatar} name={title} size={50} />
      <div style={{ flex: 1, minWidth: 0, borderBottom: '1px solid var(--border)', paddingBottom: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 3 }}>
          <span style={{ fontWeight: 600, fontSize: 15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
            {title}
          </span>
          <span style={{ fontSize: 12, color: 'var(--text-3)', flexShrink: 0, marginLeft: 8 }}>{time}</span>
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {chat.lastMessage || 'No messages yet'}
        </div>
      </div>
    </button>
  )
}
