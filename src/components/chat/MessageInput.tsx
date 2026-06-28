import { useRef, useState, useEffect } from 'react'
import {
  addDoc,
  collection,
  doc,
  setDoc,
  deleteDoc,
  updateDoc,
} from 'firebase/firestore'
import { db } from '../../firebase'
import { compressImage, fileToBase64 } from '../../lib/toBase64'
import { lastMessagePreview } from '../../lib/chats'
import { useAuthStore } from '../../store/authStore'
import { useChatStore } from '../../store/chatStore'
import { Message } from '../../types'
import { Send, Mic, Trash2, X, Image, Smile, Keyboard } from 'lucide-react'
import { ImagePickerSheet } from './ImagePickerSheet'
import { EmojiPicker } from './EmojiPicker'

interface Props {
  chatId: string
  replyTo: Message | null
  onCancelReply: () => void
  editMsg?: Message | null
  onCancelEdit?: () => void
  readOnly?: boolean
}

const bottomSafe = { paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + var(--nav-bar-extra))' } as const

function codeToFlagEmoji(code: string) {
  return code.toUpperCase().split('').map((c) => String.fromCodePoint(0x1F1E6 + c.charCodeAt(0) - 65)).join('')
}

function getEditableContent(el: HTMLElement): string {
  let out = ''
  el.childNodes.forEach((node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      out += node.textContent ?? ''
    } else if ((node as HTMLElement).tagName === 'IMG') {
      out += (node as HTMLImageElement).dataset.emoji ?? ''
    } else if ((node as HTMLElement).tagName === 'BR') {
      out += '\n'
    } else {
      out += getEditableContent(node as HTMLElement)
      const tag = (node as HTMLElement).tagName
      if ((tag === 'DIV' || tag === 'P') && out && !out.endsWith('\n')) out += '\n'
    }
  })
  return out
}

export function MessageInput({ chatId, replyTo, onCancelReply, editMsg, onCancelEdit, readOnly }: Props) {
  const [hasContent, setHasContent] = useState(false)
  const [recording, setRecording] = useState(false)
  const [recSeconds, setRecSeconds] = useState(0)
  const [uploading, setUploading] = useState(false)
  const [pendingFile, setPendingFile] = useState<{ data: string; name: string; size: number; mime: string; isImage: boolean } | null>(null)
  const [showPicker, setShowPicker] = useState(false)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [emojiPickerClosing, setEmojiPickerClosing] = useState(false)
  const emojiCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  function openEmojiPicker() {
    if (emojiCloseTimer.current) clearTimeout(emojiCloseTimer.current)
    setEmojiPickerClosing(false)
    setShowEmojiPicker(true)
  }
  function closeEmojiPicker() {
    setEmojiPickerClosing(true)
    emojiCloseTimer.current = setTimeout(() => { setShowEmojiPicker(false); setEmojiPickerClosing(false) }, 220)
  }
  const [pendingImages, setPendingImages] = useState<{ data: string; name: string; size: number }[]>([])
  const me = useAuthStore((s) => s.user)
  const mediaRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const recTimer = useRef<ReturnType<typeof setInterval> | null>(null)
  const shouldSendRef = useRef(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const editableRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (recording) {
      setRecSeconds(0)
      recTimer.current = setInterval(() => setRecSeconds(s => s + 1), 1000)
    } else {
      if (recTimer.current) clearInterval(recTimer.current)
      setRecSeconds(0)
    }
    return () => { if (recTimer.current) clearInterval(recTimer.current) }
  }, [recording])

  useEffect(() => {
    const el = editableRef.current
    if (!el) return
    if (editMsg) {
      el.textContent = editMsg.content
      setHasContent(true)
    } else {
      el.innerHTML = ''
      setHasContent(false)
    }
  }, [editMsg?.id])

  if (readOnly) {
    return (
      <div style={{ padding: '12px 16px', ...bottomSafe, color: 'var(--text-3)', fontSize: 13, textAlign: 'center', borderTop: '1px solid var(--border)' }}>
        You can't send messages here
      </div>
    )
  }

  function clearEditable() {
    const el = editableRef.current
    if (el) { el.innerHTML = ''; setHasContent(false) }
  }

  function insertAtCursor(node: Node) {
    const el = editableRef.current
    if (!el) return
    el.focus()
    const sel = window.getSelection()
    if (sel && sel.rangeCount) {
      const range = sel.getRangeAt(0)
      if (el.contains(range.commonAncestorContainer)) {
        range.deleteContents()
        range.insertNode(node)
        range.setStartAfter(node)
        range.collapse(true)
        sel.removeAllRanges()
        sel.addRange(range)
      } else {
        el.appendChild(node)
      }
    } else {
      el.appendChild(node)
    }
    const content = getEditableContent(el)
    setHasContent(!!content.trim() || !!el.querySelector('img'))
  }

  function insertEmoji(emoji: string) {
    insertAtCursor(document.createTextNode(emoji))
  }

  function insertFlag(code: string) {
    const img = document.createElement('img')
    img.src = `https://flagcdn.com/w40/${code}.png`
    img.dataset.emoji = codeToFlagEmoji(code)
    img.style.cssText = 'height:1.3em;width:auto;vertical-align:middle;display:inline;border-radius:3px;margin:0 1px;pointer-events:none'
    insertAtCursor(img)
  }

  async function sendMessage(
    content: string,
    type: Message['type'] = 'text',
    attachmentUrl?: string,
    attachmentMeta?: Message['attachmentMeta']
  ) {
    if (!me) return
    const preview = lastMessagePreview(content, type)
    const now = Date.now()
    await addDoc(collection(db, 'chats', chatId, 'messages'), {
      chatId, senderId: me.uid, content, type,
      replyToId: replyTo?.id ?? null,
      replyToContent: replyTo?.content ?? null,
      replyToSender: replyTo ? `${me.username}` : null,
      reactions: {}, attachmentUrl: attachmentUrl ?? null,
      attachmentMeta: attachmentMeta ?? null,
      edited: false, deleted: false, pinned: false, createdAt: Date.now(),
    })
    useChatStore.getState().patchChat(chatId, { lastMessage: preview, lastMessageTime: now, lastMessageSenderId: me.uid })
    try {
      await updateDoc(doc(db, 'chats', chatId), { lastMessage: preview, lastMessageTime: now, lastMessageSenderId: me.uid })
    } catch (err) { console.error('Failed to update chat preview:', err) }
    onCancelReply()
  }

  async function handleSend() {
    const el = editableRef.current
    const content = el ? getEditableContent(el).trim() : ''
    if (!pendingFile && !content && pendingImages.length === 0) return
    if (editMsg) {
      await updateDoc(doc(db, 'chats', chatId, 'messages', editMsg.id), { content, edited: true })
      clearEditable()
      onCancelEdit?.()
      return
    }
    clearEditable()
    clearTyping()
    if (pendingImages.length > 0) {
      setUploading(true)
      for (const img of pendingImages) {
        await sendMessage(img.name, 'image', img.data, { name: img.name, size: img.size, mime: 'image/jpeg' })
      }
      setPendingImages([])
      setUploading(false)
    }
    if (pendingFile) {
      setUploading(true)
      await sendMessage(pendingFile.name, pendingFile.isImage ? 'image' : 'file', pendingFile.data, {
        name: pendingFile.name, size: pendingFile.size, mime: pendingFile.mime,
      })
      setPendingFile(null)
      setUploading(false)
    }
    if (content) await sendMessage(content)
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement> | Event) {
    const input = (e as any).target as HTMLInputElement
    const file = input.files?.[0]
    if (!file || !me) return
    const isImage = file.type.startsWith('image/')
    const data = isImage ? await compressImage(file) : await fileToBase64(file)
    setPendingFile({ data, name: file.name, size: file.size, mime: file.type, isImage })
    input.value = ''
  }

  async function startRecording() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    const mr = new MediaRecorder(stream)
    chunksRef.current = []
    mr.ondataavailable = (e) => chunksRef.current.push(e.data)
    mr.onstop = async () => {
      stream.getTracks().forEach((t) => t.stop())
      if (!shouldSendRef.current) return
      const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
      const reader = new FileReader()
      reader.onload = async () => { await sendMessage('Voice message', 'audio', reader.result as string) }
      reader.readAsDataURL(blob)
    }
    mr.start()
    mediaRef.current = mr
    setRecording(true)
  }

  function sendRecording() {
    shouldSendRef.current = true
    mediaRef.current?.stop()
    mediaRef.current = null
    setRecording(false)
  }

  function cancelRecording() {
    shouldSendRef.current = false
    mediaRef.current?.stop()
    mediaRef.current = null
    setRecording(false)
  }

  async function notifyTyping() {
    if (!me) return
    await setDoc(doc(db, 'chats', chatId, 'typing', me.uid), { username: me.username, at: Date.now() })
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

  const mm = String(Math.floor(recSeconds / 60)).padStart(2, '0')
  const ss = String(recSeconds % 60).padStart(2, '0')

  if (recording) {
    return (
      <div style={{ borderTop: '1px solid var(--border)', background: 'var(--bg)', padding: '10px 14px', ...bottomSafe, display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={cancelRecording} style={{ width: 38, height: 38, borderRadius: '50%', background: 'var(--bg-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-2)', flexShrink: 0 }}>
          <Trash2 size={17} />
        </button>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10, background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 20, padding: '8px 14px' }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444', flexShrink: 0, animation: 'vm-pulse 1s ease-in-out infinite' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1 }}>
            {Array.from({ length: 28 }).map((_, i) => (
              <div key={i} style={{ width: 2, borderRadius: 2, background: 'var(--accent)', animationName: 'vm-wave', animationDuration: `${0.4 + (i % 5) * 0.1}s`, animationTimingFunction: 'ease-in-out', animationIterationCount: 'infinite', animationDirection: 'alternate', animationDelay: `${(i % 7) * 0.06}s`, height: 4 }} />
            ))}
          </div>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-2)', flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>{mm}:{ss}</span>
        </div>
        <button onClick={sendRecording} style={{ width: 38, height: 38, borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', flexShrink: 0 }}>
          <Send size={17} />
        </button>
      </div>
    )
  }

  return (
    <div style={{ background: 'var(--bg)', ...bottomSafe }}>
      {pendingImages.length > 0 && (
        <div style={{ display: 'flex', gap: 6, padding: '8px 14px', borderBottom: '1px solid var(--border)', overflowX: 'auto' }}>
          {pendingImages.map((img, i) => (
            <div key={i} style={{ position: 'relative', flexShrink: 0 }}>
              <img src={img.data} alt="" style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 8, display: 'block' }} />
              <button
                onClick={() => setPendingImages(p => p.filter((_, j) => j !== i))}
                style={{ position: 'absolute', top: -4, right: -4, width: 18, height: 18, borderRadius: '50%', background: 'var(--bg-3)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-2)' }}
              >
                <X size={10} />
              </button>
            </div>
          ))}
        </div>
      )}
      {pendingFile && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px', borderBottom: '1px solid var(--border)' }}>
          {pendingFile.isImage
            ? <img src={pendingFile.data} alt="" style={{ height: 56, width: 56, objectFit: 'cover', borderRadius: 8, flexShrink: 0 }} />
            : <div style={{ height: 56, width: 56, borderRadius: 8, background: 'var(--bg-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 11, color: 'var(--text-3)', textAlign: 'center', padding: 4 }}>{pendingFile.mime.split('/')[1]?.toUpperCase()}</div>
          }
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pendingFile.name}</div>
            <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>{(pendingFile.size / 1024).toFixed(1)} KB</div>
          </div>
          <button onClick={() => setPendingFile(null)} style={{ color: 'var(--text-3)', padding: 4, flexShrink: 0 }}>
            <X size={16} />
          </button>
        </div>
      )}
      {editMsg && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
          <div style={{ flex: 1, borderLeft: '3px solid #f59e0b', paddingLeft: 8, color: 'var(--text-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            <span style={{ color: '#f59e0b', fontWeight: 500 }}>Editing</span>
            <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{editMsg.content}</div>
          </div>
          <button onClick={() => { onCancelEdit?.(); clearEditable() }} style={{ color: 'var(--text-3)' }}>
            <X size={16} />
          </button>
        </div>
      )}
      {replyTo && !editMsg && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
          <div style={{ flex: 1, borderLeft: '3px solid var(--accent)', paddingLeft: 8, color: 'var(--text-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {replyTo.content || '[media]'}
          </div>
          <button onClick={onCancelReply} style={{ color: 'var(--text-3)' }}>
            <X size={16} />
          </button>
        </div>
      )}

      {showPicker && (
        <ImagePickerSheet
          onClose={() => setShowPicker(false)}
          onSend={(imgs) => setPendingImages(imgs)}
        />
      )}

      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, padding: '10px 12px' }}>
        <input ref={fileRef} type="file" style={{ display: 'none' }} onChange={handleFile} />

        <div style={{ flex: 1, display: 'flex', alignItems: 'center', background: 'var(--bg-3)', border: '1px solid var(--border)', borderRadius: 20, padding: '4px 6px 4px 4px', gap: 2 }}>
          <button
            onClick={() => setShowPicker(v => !v)}
            disabled={uploading}
            style={{ color: 'var(--text-3)', padding: '4px 6px', flexShrink: 0, display: 'flex', alignItems: 'center' }}
          >
            <Image size={18} />
          </button>
          <button
            onClick={() => showEmojiPicker ? closeEmojiPicker() : openEmojiPicker()}
            style={{ color: showEmojiPicker ? 'var(--accent)' : 'var(--text-3)', padding: '4px 6px', flexShrink: 0, display: 'flex', alignItems: 'center' }}
          >
            {showEmojiPicker ? <Keyboard size={18} /> : <Smile size={18} />}
          </button>

          <div style={{ flex: 1, position: 'relative' }}>
            {!hasContent && (
              <span style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', left: 4, color: 'var(--text-3)', fontSize: 14, pointerEvents: 'none', userSelect: 'none' }}>
                Message
              </span>
            )}
            <div
              ref={editableRef}
              contentEditable
              suppressContentEditableWarning
              onInput={(e) => {
                const el = e.currentTarget
                const content = getEditableContent(el)
                setHasContent(!!content.trim() || !!el.querySelector('img'))
                notifyTyping()
                el.style.height = 'auto'
                el.style.height = Math.min(el.scrollHeight, 120) + 'px'
              }}
              onKeyDown={handleKey}
              style={{
                outline: 'none',
                padding: '6px 4px',
                color: 'var(--text)',
                fontSize: 14,
                lineHeight: 1.5,
                maxHeight: 120,
                overflowY: 'auto',
                wordBreak: 'break-word',
              }}
            />
          </div>

          {hasContent || pendingFile || pendingImages.length > 0 ? (
            <button onClick={handleSend} style={{ color: 'var(--accent)', padding: '4px 6px', flexShrink: 0, display: 'flex', alignItems: 'center' }}>
              <Send size={18} />
            </button>
          ) : (
            <button onClick={startRecording} style={{ color: 'var(--text-3)', padding: '4px 6px', flexShrink: 0, display: 'flex', alignItems: 'center' }}>
              <Mic size={18} />
            </button>
          )}
        </div>
      </div>

      {showEmojiPicker && (
        <EmojiPicker
          isClosing={emojiPickerClosing}
          onSelect={(e) => { insertEmoji(e); closeEmojiPicker() }}
          onSelectFlag={(code) => { insertFlag(code); closeEmojiPicker() }}
          onSelectGif={async (url) => { closeEmojiPicker(); await sendMessage('GIF', 'image', url, { name: 'gif', size: 0, mime: 'image/gif' }) }}
          onClose={closeEmojiPicker}
        />
      )}
    </div>
  )
}
