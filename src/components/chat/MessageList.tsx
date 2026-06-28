import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
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
import { CornerUpLeft, Copy, Pencil, Trash2, Pin } from 'lucide-react'

interface Props {
  chatId: string
  members: Record<string, { username: string; tag: string; avatarUrl: string | null }>
  onReply: (msg: Message) => void
  lastRead?: Record<string, number>
  otherUid?: string
  onEdit?: (msg: Message) => void
  selectedIds: Set<string>
  onToggleSelect: (msg: Message) => void
}

const EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🔥']

type CtxState = { msg: Message; x: number; y: number; showEmoji: boolean }

function dateLabel(ts: number) {
  const d = new Date(ts)
  const today = new Date()
  if (d.toDateString() === today.toDateString()) return 'Today'
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday'
  return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
}

export function MessageList({ chatId, members, onReply, lastRead, otherUid, onEdit, selectedIds, onToggleSelect }: Props) {
  const messages = useMessageStore((s) => s.messages[chatId] ?? [])
  const setMessages = useMessageStore((s) => s.setMessages)
  const me = useAuthStore((s) => s.user)
  const bottomRef = useRef<HTMLDivElement>(null)
  const [ctx, setCtx] = useState<CtxState | null>(null)
  const selectionMode = selectedIds.size > 0

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

  // Dismiss context menu on outside click
  useEffect(() => {
    if (!ctx) return
    function handler(e: MouseEvent | TouchEvent) {
      const target = e.target as Node
      const menu = document.getElementById('nod-ctx-menu')
      if (menu && !menu.contains(target)) setCtx(null)
    }
    document.addEventListener('mousedown', handler)
    document.addEventListener('touchstart', handler)
    return () => {
      document.removeEventListener('mousedown', handler)
      document.removeEventListener('touchstart', handler)
    }
  }, [ctx])

  async function handleReact(msgId: string, emoji: string) {
    if (!me) return
    const msgRef = doc(db, 'chats', chatId, 'messages', msgId)
    const msg = messages.find((m) => m.id === msgId)
    const already = (msg?.reactions?.[emoji] ?? []).includes(me.uid)
    await updateDoc(msgRef, {
      [`reactions.${emoji}`]: already ? arrayRemove(me.uid) : arrayUnion(me.uid),
    })
  }

  function handleContextMenu(msg: Message, x: number, y: number) {
    if (selectionMode) return
    setCtx({ msg, x, y, showEmoji: false })
  }

  function handleSelect(msg: Message) {
    setCtx(null)
    onToggleSelect(msg)
  }

  async function ctxDelete() {
    if (!ctx) return
    await updateDoc(doc(db, 'chats', chatId, 'messages', ctx.msg.id), { deleted: true, content: '' })
    setCtx(null)
  }

  async function ctxPin() {
    if (!ctx) return
    await updateDoc(doc(db, 'chats', chatId, 'messages', ctx.msg.id), { pinned: !ctx.msg.pinned })
    setCtx(null)
  }

  function ctxCopy() {
    if (!ctx) return
    navigator.clipboard.writeText(ctx.msg.content).catch(() => {})
    setCtx(null)
  }

  function ctxReply() {
    if (!ctx) return
    onReply(ctx.msg)
    setCtx(null)
  }

  function ctxEdit() {
    if (!ctx || !onEdit) return
    onEdit(ctx.msg)
    setCtx(null)
  }

  async function ctxReact(emoji: string) {
    if (!ctx) return
    await handleReact(ctx.msg.id, emoji)
    setCtx(null)
  }

  // Group messages by date
  const grouped: { date: string; msgs: Message[] }[] = []
  for (const msg of messages) {
    const label = dateLabel(msg.createdAt)
    const last = grouped[grouped.length - 1]
    if (last?.date === label) last.msgs.push(msg)
    else grouped.push({ date: label, msgs: [msg] })
  }

  // Smart context menu positioning
  const menuW = 200, menuH = ctx?.showEmoji ? 280 : 220
  const vw = window.innerWidth, vh = window.innerHeight
  const menuX = ctx ? Math.min(ctx.x, vw - menuW - 8) : 0
  const menuY = ctx ? (ctx.y + menuH > vh ? ctx.y - menuH : ctx.y) : 0

  const ctxIsOwn = ctx ? ctx.msg.senderId === me?.uid : false
  const ctxIsText = ctx?.msg.type === 'text'

  return (
    <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2, paddingBlock: 8, position: 'relative' }}>
      {grouped.map((g) => (
        <div key={g.date}>
          <div style={{ textAlign: 'center', fontSize: 11, color: 'var(--text-3)', padding: '8px 0' }}>
            {g.date}
          </div>
          {g.msgs.map((msg) => {
            const sender = members[msg.senderId]
              ? { ...members[msg.senderId], uid: msg.senderId, email: '', bio: '', phone: '', createdAt: 0, lastSeen: 0, online: false, role: 'user' as const, banned: false, bannerUrl: null }
              : null
            const isOwn = msg.senderId === me?.uid
            const isRead = isOwn && !!otherUid && !!lastRead?.[otherUid] && lastRead[otherUid] >= msg.createdAt
            return (
              <MessageItem
                key={msg.id}
                msg={msg}
                sender={sender}
                isOwn={isOwn}
                isRead={isRead}
                onReply={onReply}
                onReact={handleReact}
                onContextMenu={handleContextMenu}
                selectionMode={selectionMode}
                selected={selectedIds.has(msg.id)}
                onSelect={handleSelect}
              />
            )
          })}
        </div>
      ))}
      <div ref={bottomRef} />

      {ctx && createPortal(
        <div
          id="nod-ctx-menu"
          style={{
            position: 'fixed',
            top: menuY,
            left: menuX,
            width: menuW,
            background: 'var(--bg-2)',
            border: '1px solid var(--border)',
            borderRadius: 14,
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
            zIndex: 1000,
            overflow: 'hidden',
          }}
        >
          {/* Emoji row */}
          <div style={{ display: 'flex', justifyContent: 'space-around', padding: '10px 12px 8px', borderBottom: '1px solid var(--border)' }}>
            {EMOJIS.map((e) => (
              <button
                key={e}
                onClick={() => ctxReact(e)}
                style={{ fontSize: 20, background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px', borderRadius: 8 }}
              >
                {e}
              </button>
            ))}
          </div>

          {/* Actions */}
          <CtxItem icon={<CornerUpLeft size={15} />} label="Reply" onClick={ctxReply} />
          {ctxIsText && <CtxItem icon={<Copy size={15} />} label="Copy" onClick={ctxCopy} />}
          {ctxIsOwn && ctxIsText && onEdit && <CtxItem icon={<Pencil size={15} />} label="Edit" onClick={ctxEdit} />}
          <CtxItem icon={<Pin size={15} />} label={ctx.msg.pinned ? 'Unpin' : 'Pin'} onClick={ctxPin} />
          {ctxIsOwn && <CtxItem icon={<Trash2 size={15} />} label="Delete" onClick={ctxDelete} danger />}
        </div>,
        document.body
      )}
    </div>
  )
}

function CtxItem({ icon, label, onClick, danger }: { icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        width: '100%', padding: '11px 14px',
        fontSize: 14, color: danger ? '#ef4444' : 'var(--text)',
        background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left',
      }}
    >
      {icon}{label}
    </button>
  )
}
