import { useEffect, useState } from 'react'
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

export function ChatPage() {
  const chatId = useChatStore((s) => s.activeChatId)
  const [chat, setChat] = useState<Chat | null>(null)
  const [members, setMembers] = useState<Record<string, User>>({})
  const [replyTo, setReplyTo] = useState<Message | null>(null)
  const [callType, setCallType] = useState<'audio' | 'video' | null>(null)
  const [showPinned, setShowPinned] = useState(false)
  const setTyping = useTypingStore((s) => s.setTyping)
  const me = useAuthStore((s) => s.user)

  useEffect(() => {
    if (!chatId) return
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
    if (!chatId) return
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

  if (!chatId || !chat) {
    return (
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text-3)',
          fontSize: 14,
        }}
      >
        Select a chat to start messaging
      </div>
    )
  }

  const isChannel = chat.type === 'channel'
  const isAdmin = chat.createdBy === me?.uid || me?.role === 'staff'
  const readOnly = isChannel && !isAdmin

  const memberSummary: Record<string, { username: string; tag: string; avatarUrl: string | null }> = {}
  Object.entries(members).forEach(([uid, u]) => {
    memberSummary[uid] = { username: u.username, tag: u.tag, avatarUrl: u.avatarUrl }
  })

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--bg)' }}>
      <ChatHeader
        chat={chat}
        memberCount={chat.memberIds.length}
        onCall={(t) => setCallType(t)}
        onShowPinned={() => setShowPinned(true)}
        onShowMenu={() => {}}
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
        <CallModal
          chatId={chatId}
          type={callType}
          members={members}
          onClose={() => setCallType(null)}
        />
      )}
      {showPinned && (
        <PinnedModal chatId={chatId} onClose={() => setShowPinned(false)} />
      )}
    </div>
  )
}
