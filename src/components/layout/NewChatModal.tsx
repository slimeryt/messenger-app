import { useState } from 'react'
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  doc,
  getDoc,
} from 'firebase/firestore'
import { db } from '../../firebase'
import { useAuthStore } from '../../store/authStore'
import { useChatStore } from '../../store/chatStore'
import { User } from '../../types'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Avatar } from '../ui/Avatar'
import { Search, Plus, X } from 'lucide-react'

interface Props { onClose: () => void }

type Step = 'type' | 'dm' | 'group' | 'channel'

export function NewChatModal({ onClose }: Props) {
  const [step, setStep] = useState<Step>('type')
  const [searchTag, setSearchTag] = useState('')
  const [found, setFound] = useState<User | null>(null)
  const [groupName, setGroupName] = useState('')
  const [channelName, setChannelName] = useState('')
  const [selectedUsers, setSelectedUsers] = useState<User[]>([])
  const [error, setError] = useState('')
  const me = useAuthStore((s) => s.user)
  const setActiveChatId = useChatStore((s) => s.setActiveChatId)

  async function searchUser() {
    setError('')
    setFound(null)
    const [uname, tag] = searchTag.trim().split('#')
    if (!uname || !tag) { setError('Format: username#0000'); return }
    const q = query(collection(db, 'users'), where('username', '==', uname), where('tag', '==', tag))
    const snap = await getDocs(q)
    if (snap.empty) { setError('User not found'); return }
    const u = { uid: snap.docs[0].id, ...snap.docs[0].data() } as User
    if (u.uid === me?.uid) { setError("That's you"); return }
    setFound(u)
  }

  async function startDM() {
    if (!found || !me) return
    const ids = [me.uid, found.uid].sort()
    const q = query(collection(db, 'chats'), where('type', '==', 'dm'), where('memberIds', '==', ids))
    const snap = await getDocs(q)
    let chatId: string
    if (!snap.empty) {
      chatId = snap.docs[0].id
    } else {
      const ref = await addDoc(collection(db, 'chats'), {
        type: 'dm',
        name: found.username,
        avatarUrl: found.avatarUrl,
        memberIds: ids,
        lastMessage: '',
        lastMessageTime: Date.now(),
        createdBy: me.uid,
      })
      chatId = ref.id
    }
    setActiveChatId(chatId)
    onClose()
  }

  async function createGroup() {
    if (!me || !groupName.trim() || selectedUsers.length === 0) return
    const ref = await addDoc(collection(db, 'chats'), {
      type: 'group',
      name: groupName.trim(),
      avatarUrl: null,
      memberIds: [me.uid, ...selectedUsers.map((u) => u.uid)],
      lastMessage: '',
      lastMessageTime: Date.now(),
      createdBy: me.uid,
    })
    setActiveChatId(ref.id)
    onClose()
  }

  async function createChannel() {
    if (!me || !channelName.trim()) return
    const ref = await addDoc(collection(db, 'chats'), {
      type: 'channel',
      name: channelName.trim(),
      avatarUrl: null,
      memberIds: [me.uid],
      lastMessage: '',
      lastMessageTime: Date.now(),
      createdBy: me.uid,
    })
    setActiveChatId(ref.id)
    onClose()
  }

  async function addToGroup() {
    const [uname, tag] = searchTag.trim().split('#')
    if (!uname || !tag) { setError('Format: username#0000'); return }
    const q = query(collection(db, 'users'), where('username', '==', uname), where('tag', '==', tag))
    const snap = await getDocs(q)
    if (snap.empty) { setError('User not found'); return }
    const u = { uid: snap.docs[0].id, ...snap.docs[0].data() } as User
    if (selectedUsers.find((x) => x.uid === u.uid)) return
    setSelectedUsers((p) => [...p, u])
    setSearchTag('')
    setError('')
  }

  if (step === 'type') {
    return (
      <Modal title="New Chat" onClose={onClose}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[
            { label: 'Direct Message', desc: '1-on-1 private chat', action: () => setStep('dm') },
            { label: 'Group Chat', desc: 'Chat with multiple people', action: () => setStep('group') },
            { label: 'Channel', desc: 'Broadcast to subscribers', action: () => setStep('channel') },
          ].map((item) => (
            <button
              key={item.label}
              onClick={item.action}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                gap: 2,
                padding: '12px 14px',
                background: 'var(--bg-3)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
                textAlign: 'left',
                cursor: 'pointer',
              }}
            >
              <span style={{ fontWeight: 500, color: 'var(--text)' }}>{item.label}</span>
              <span style={{ fontSize: 12, color: 'var(--text-2)' }}>{item.desc}</span>
            </button>
          ))}
        </div>
      </Modal>
    )
  }

  if (step === 'dm') {
    return (
      <Modal
        title="New Direct Message"
        onClose={onClose}
        footer={found ? <Button onClick={startDM}>Start Chat</Button> : undefined}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              placeholder="username#0000"
              value={searchTag}
              onChange={(e) => setSearchTag(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && searchUser()}
              style={{
                flex: 1,
                background: 'var(--bg-3)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
                padding: '8px 12px',
                color: 'var(--text)',
                fontSize: 14,
              }}
            />
            <Button onClick={searchUser}><Search size={15} /></Button>
          </div>
          {error && <div style={{ fontSize: 12, color: 'var(--danger)' }}>{error}</div>}
          {found && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0' }}>
              <Avatar url={found.avatarUrl} name={found.username} size={36} />
              <div>
                <div style={{ fontWeight: 500 }}>{found.username}#{found.tag}</div>
                <div style={{ fontSize: 12, color: 'var(--text-2)' }}>{found.bio || 'No bio'}</div>
              </div>
            </div>
          )}
        </div>
      </Modal>
    )
  }

  if (step === 'group') {
    return (
      <Modal
        title="New Group"
        onClose={onClose}
        footer={<Button onClick={createGroup} disabled={!groupName.trim() || selectedUsers.length === 0}>Create Group</Button>}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Input label="Group name" placeholder="My Group" value={groupName} onChange={(e) => setGroupName(e.target.value)} />
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              placeholder="Add member (username#0000)"
              value={searchTag}
              onChange={(e) => setSearchTag(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addToGroup()}
              style={{ flex: 1, background: 'var(--bg-3)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '8px 12px', color: 'var(--text)', fontSize: 14 }}
            />
            <Button onClick={addToGroup}><Plus size={15} /></Button>
          </div>
          {error && <div style={{ fontSize: 12, color: 'var(--danger)' }}>{error}</div>}
          {selectedUsers.map((u) => (
            <div key={u.uid} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Avatar url={u.avatarUrl} name={u.username} size={28} />
              <span style={{ flex: 1, fontSize: 13 }}>{u.username}#{u.tag}</span>
              <button onClick={() => setSelectedUsers((p) => p.filter((x) => x.uid !== u.uid))} style={{ color: 'var(--text-3)' }}>
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      </Modal>
    )
  }

  return (
    <Modal
      title="New Channel"
      onClose={onClose}
      footer={<Button onClick={createChannel} disabled={!channelName.trim()}>Create Channel</Button>}
    >
      <Input label="Channel name" placeholder="My Channel" value={channelName} onChange={(e) => setChannelName(e.target.value)} />
    </Modal>
  )
}
