import { useEffect, useRef } from 'react'
import {
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
  doc,
  updateDoc,
  arrayUnion,
  arrayRemove,
} from 'firebase/firestore'
import { db } from '../../firebase'
import { useMessageStore } from '../../store/messageStore'
import { useAuthStore } from '../../store/authStore'
import { Message } from '../../types'
import { MessageItem } from './MessageItem'

interface Props {
  chatId: string
  members: Record<string, { username: string; tag: string; avatarUrl: string | null }>
  onReply: (msg: Message) => void
}

function dateLabel(ts: number) {
  const d = new Date(ts)
  const today = new Date()
  if (d.toDateString() === today.toDateString()) return 'Today'
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday'
  return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
}

export function MessageList({ chatId, members, onReply }: Props) {
  const messages = useMessageStore((s) => s.messages[chatId] ?? [])
  const setMessages = useMessageStore((s) => s.setMessages)
  const me = useAuthStore((s) => s.user)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const q = query(collection(db, 'chats', chatId, 'messages'), orderBy('createdAt', 'asc'), limit(100))
    const unsub = onSnapshot(q, (snap) => {
      const msgs: Message[] = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Message))
      setMessages(chatId, msgs)
    })
    return unsub
  }, [chatId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  async function handleReact(msgId: string, emoji: string) {
    if (!me) return
    const msgRef = doc(db, 'chats', chatId, 'messages', msgId)
    const msg = messages.find((m) => m.id === msgId)
    const already = (msg?.reactions?.[emoji] ?? []).includes(me.uid)
    await updateDoc(msgRef, {
      [`reactions.${emoji}`]: already ? arrayRemove(me.uid) : arrayUnion(me.uid),
    })
  }

  // Group messages by date
  const grouped: { date: string; msgs: Message[] }[] = []
  for (const msg of messages) {
    const label = dateLabel(msg.createdAt)
    const last = grouped[grouped.length - 1]
    if (last?.date === label) last.msgs.push(msg)
    else grouped.push({ date: label, msgs: [msg] })
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2, paddingBlock: 8 }}>
      {grouped.map((g) => (
        <div key={g.date}>
          <div
            style={{
              textAlign: 'center',
              fontSize: 11,
              color: 'var(--text-3)',
              padding: '8px 0',
            }}
          >
            {g.date}
          </div>
          {g.msgs.map((msg) => {
            const sender = members[msg.senderId]
              ? { ...members[msg.senderId], uid: msg.senderId, email: '', bio: '', lastSeen: 0, online: false, role: 'user' as const, banned: false, bannerUrl: null }
              : null
            return (
              <MessageItem
                key={msg.id}
                msg={msg}
                sender={sender}
                isOwn={msg.senderId === me?.uid}
                onReply={onReply}
                onReact={handleReact}
              />
            )
          })}
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  )
}
