import { useRef, useState } from 'react'
import {
  addDoc,
  collection,
  serverTimestamp,
  doc,
  setDoc,
  deleteDoc,
  updateDoc,
} from 'firebase/firestore'
import { db } from '../../firebase'
import { compressImage, fileToBase64 } from '../../lib/toBase64'
import { useAuthStore } from '../../store/authStore'
import { Message } from '../../types'
import { Send, Paperclip, Mic, MicOff, X } from 'lucide-react'

interface Props {
  chatId: string
  replyTo: Message | null
  onCancelReply: () => void
  readOnly?: boolean
}

export function MessageInput({ chatId, replyTo, onCancelReply, readOnly }: Props) {
  const [text, setText] = useState('')
  const [recording, setRecording] = useState(false)
  const [uploading, setUploading] = useState(false)
  const me = useAuthStore((s) => s.user)
  const mediaRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  if (readOnly) {
    return (
      <div style={{ padding: '12px 16px', color: 'var(--text-3)', fontSize: 13, textAlign: 'center', borderTop: '1px solid var(--border)' }}>
        You can't send messages here
      </div>
    )
  }

  async function sendMessage(
    content: string,
    type: Message['type'] = 'text',
    attachmentUrl?: string,
    attachmentMeta?: Message['attachmentMeta']
  ) {
    if (!me) return
    await addDoc(collection(db, 'chats', chatId, 'messages'), {
      chatId,
      senderId: me.uid,
      content,
      type,
      replyToId: replyTo?.id ?? null,
      replyToContent: replyTo?.content ?? null,
      replyToSender: replyTo ? `${me.username}` : null,
      reactions: {},
      attachmentUrl: attachmentUrl ?? null,
      attachmentMeta: attachmentMeta ?? null,
      edited: false,
      deleted: false,
      pinned: false,
      createdAt: Date.now(),
    })
    await updateDoc(doc(db, 'chats', chatId), {
      lastMessage: type === 'text' ? content : `[${type}]`,
      lastMessageTime: Date.now(),
    })
    onCancelReply()
  }

  async function handleSend() {
    const content = text.trim()
    if (!content) return
    setText('')
    clearTyping()
    await sendMessage(content)
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !me) return
    setUploading(true)
    const isImage = file.type.startsWith('image/')
    const data = isImage ? await compressImage(file) : await fileToBase64(file)
    await sendMessage(file.name, isImage ? 'image' : 'file', data, {
      name: file.name,
      size: file.size,
      mime: file.type,
    })
    setUploading(false)
    e.target.value = ''
  }

  async function startRecording() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    const mr = new MediaRecorder(stream)
    chunksRef.current = []
    mr.ondataavailable = (e) => chunksRef.current.push(e.data)
    mr.onstop = async () => {
      stream.getTracks().forEach((t) => t.stop())
      const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
      const reader = new FileReader()
      reader.onload = async () => {
        await sendMessage('Voice message', 'audio', reader.result as string)
      }
      reader.readAsDataURL(blob)
    }
    mr.start()
    mediaRef.current = mr
    setRecording(true)
  }

  function stopRecording() {
    mediaRef.current?.stop()
    mediaRef.current = null
    setRecording(false)
  }

  async function notifyTyping() {
    if (!me) return
    await setDoc(doc(db, 'chats', chatId, 'typing', me.uid), {
      username: me.username,
      at: Date.now(),
    })
    if (typingTimer.current) clearTimeout(typingTimer.current)
    typingTimer.current = setTimeout(clearTyping, 3000)
  }

  async function clearTyping() {
    if (!me) return
    await deleteDoc(doc(db, 'chats', chatId, 'typing', me.uid)).catch(() => {})
  }

  function handleKey(e: React.KeyboardEvent) {
    const enterSend = localStorage.getItem('nod_enterSend') !== 'false'
    if (e.key === 'Enter' && !e.shiftKey && enterSend) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div style={{ borderTop: '1px solid var(--border)', background: 'var(--bg)' }}>
      {replyTo && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 16px',
            borderBottom: '1px solid var(--border)',
            fontSize: 13,
          }}
        >
          <div
            style={{
              flex: 1,
              borderLeft: '3px solid var(--accent)',
              paddingLeft: 8,
              color: 'var(--text-2)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {replyTo.content || '[media]'}
          </div>
          <button onClick={onCancelReply} style={{ color: 'var(--text-3)' }}>
            <X size={16} />
          </button>
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, padding: '10px 12px' }}>
        <input ref={fileRef} type="file" style={{ display: 'none' }} onChange={handleFile} />
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          style={{ color: 'var(--text-2)', padding: 6, flexShrink: 0 }}
        >
          <Paperclip size={20} />
        </button>

        <textarea
          value={text}
          onChange={(e) => { setText(e.target.value); notifyTyping() }}
          onKeyDown={handleKey}
          placeholder="Message"
          rows={1}
          style={{
            flex: 1,
            background: 'var(--bg-3)',
            border: '1px solid var(--border)',
            borderRadius: 20,
            padding: '8px 14px',
            color: 'var(--text)',
            fontSize: 14,
            lineHeight: 1.5,
            maxHeight: 120,
            overflowY: 'auto',
          }}
          onInput={(e) => {
            const el = e.currentTarget
            el.style.height = 'auto'
            el.style.height = Math.min(el.scrollHeight, 120) + 'px'
          }}
        />

        {text.trim() ? (
          <button
            onClick={handleSend}
            style={{
              background: 'var(--accent)',
              color: '#fff',
              borderRadius: '50%',
              width: 36,
              height: 36,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Send size={16} />
          </button>
        ) : (
          <button
            onMouseDown={startRecording}
            onMouseUp={stopRecording}
            onTouchStart={startRecording}
            onTouchEnd={stopRecording}
            style={{
              color: recording ? 'var(--danger)' : 'var(--text-2)',
              padding: 6,
              flexShrink: 0,
            }}
          >
            {recording ? <MicOff size={20} /> : <Mic size={20} />}
          </button>
        )}
      </div>
    </div>
  )
}
