import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
} from 'firebase/firestore'
import { db } from '../../firebase'
import { useAuthStore } from '../../store/authStore'
import { useChatStore } from '../../store/chatStore'
import { User } from '../../types'
import { buildDmChatFields, parseChat } from '../../lib/chats'
import { Button } from '../ui/Button'
import { Avatar } from '../ui/Avatar'
import { ArrowLeft, Search, Plus, X, MessageSquare, Users, Radio, ChevronRight } from 'lucide-react'

interface Props { onClose: () => void }

type Step = 'type' | 'dm' | 'group' | 'channel'

function FullscreenHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <div style={{
      position: 'absolute',
      top: 'calc(12px + env(safe-area-inset-top))',
      left: 16, right: 16,
      display: 'flex', alignItems: 'center', gap: 4,
      background: 'var(--bg-2)',
      border: '1px solid var(--border)',
      borderRadius: 999,
      padding: '6px 16px 6px 6px',
      zIndex: 1,
      boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
    }}>
      <button onClick={onBack} style={{ color: 'var(--accent)', padding: '6px 8px', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
        <ArrowLeft size={20} />
      </button>
      <span style={{ fontSize: 16, fontWeight: 600 }}>{title}</span>
    </div>
  )
}

export function NewChatModal({ onClose }: Props) {
  const [step, setStep] = useState<Step>('type')
  const [searchTag, setSearchTag] = useState('')
  const [found, setFound] = useState<User | null>(null)
  const [groupName, setGroupName] = useState('')
  const [channelName, setChannelName] = useState('')
  const [selectedUsers, setSelectedUsers] = useState<User[]>([])
  const [error, setError] = useState('')
  const [contacts, setContacts] = useState<User[]>([])
  const me = useAuthStore((s) => s.user)
  const { chats, setActiveChatId, upsertChat } = useChatStore()

  useEffect(() => {
    if (!me) return
    const dmChats = chats.filter((c) => c.type === 'dm' && c.memberIds.length === 2)
    const otherUids = [...new Set(dmChats.flatMap((c) => c.memberIds).filter((uid) => uid !== me.uid))]
    if (otherUids.length === 0) return
    Promise.all(otherUids.map((uid) => getDocs(query(collection(db, 'users'), where('__name__', '==', uid)))))
      .then((snaps) => {
        const users = snaps.flatMap((s) => s.docs.map((d) => ({ uid: d.id, ...d.data() } as User)))
          .filter((u) => !u.banned)
          .sort((a, b) => a.username.localeCompare(b.username))
        setContacts(users)
      })
  }, [me?.uid])

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
      upsertChat(parseChat(chatId, snap.docs[0].data()))
    } else {
      const fields = buildDmChatFields(me, found)
      const ref = await addDoc(collection(db, 'chats'), fields)
      chatId = ref.id
      upsertChat({ id: chatId, ...fields })
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

  const screen = (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 900,
      background: 'var(--bg)',
      display: 'flex', flexDirection: 'column',
      paddingTop: 'env(safe-area-inset-top)',
    }}>
      {step === 'type' && (
        <>
          <FullscreenHeader title="New Chat" onBack={onClose} />
          <div style={{ flex: 1, overflowY: 'auto', padding: 16, paddingTop: 'calc(72px + env(safe-area-inset-top))', display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* DM / Group / Channel — single card, no separators */}
            <div style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
              {[
                { label: 'Direct Message', desc: '1-on-1 private chat', icon: <MessageSquare size={20} color="#fff" />, color: '#3b82f6', action: () => setStep('dm') },
                { label: 'Group Chat', desc: 'Chat with multiple people', icon: <Users size={20} color="#fff" />, color: '#8b5cf6', action: () => setStep('group') },
                { label: 'Channel', desc: 'Broadcast to subscribers', icon: <Radio size={20} color="#fff" />, color: '#10b981', action: () => setStep('channel') },
              ].map((item) => (
                <button
                  key={item.label}
                  onClick={item.action}
                  style={{ display: 'flex', alignItems: 'center', gap: 14, width: '100%', padding: '12px 16px', textAlign: 'left' }}
                >
                  <div style={{ width: 38, height: 38, borderRadius: 11, flexShrink: 0, background: item.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {item.icon}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--text)' }}>{item.label}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 2 }}>{item.desc}</div>
                  </div>
                  <ChevronRight size={16} color="var(--text-3)" />
                </button>
              ))}
            </div>

            {/* Contacts list */}
            {contacts.length > 0 && (
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8, paddingLeft: 4 }}>Contacts</div>
                <div style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
                  {contacts.map((u) => (
                    <button
                      key={u.uid}
                      onClick={async () => {
                        if (!me) return
                        const ids = [me.uid, u.uid].sort()
                        const q = query(collection(db, 'chats'), where('type', '==', 'dm'), where('memberIds', '==', ids))
                        const snap = await getDocs(q)
                        let chatId: string
                        if (!snap.empty) {
                          chatId = snap.docs[0].id
                          upsertChat(parseChat(chatId, snap.docs[0].data()))
                        } else {
                          const fields = buildDmChatFields(me, u)
                          const ref = await addDoc(collection(db, 'chats'), fields)
                          chatId = ref.id
                          upsertChat({ id: chatId, ...fields })
                        }
                        setActiveChatId(chatId)
                        onClose()
                      }}
                      style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '10px 16px', textAlign: 'left' }}
                    >
                      <div style={{ position: 'relative', flexShrink: 0 }}>
                        <Avatar url={u.avatarUrl} name={u.username} size={44} />
                        {u.online && <div style={{ position: 'absolute', bottom: 1, right: 1, width: 11, height: 11, borderRadius: '50%', background: '#22c55e', border: '2px solid var(--bg-2)' }} />}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 15, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {u.firstName ? `${u.firstName}${u.lastName ? ' ' + u.lastName : ''}` : u.username}
                          <span style={{ color: 'var(--text-3)', fontWeight: 400 }}> #{u.tag}</span>
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{u.online ? 'Online' : 'Offline'}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

          </div>
        </>
      )}

      {step === 'dm' && (
        <>
          <FullscreenHeader title="Direct Message" onBack={() => setStep('type')} />
          <div style={{ flex: 1, overflowY: 'auto', padding: 16, paddingTop: 'calc(72px + env(safe-area-inset-top))', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                autoFocus
                placeholder="username#0000"
                value={searchTag}
                onChange={(e) => setSearchTag(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && searchUser()}
                style={{
                  flex: 1, background: 'var(--bg-2)', border: '1px solid var(--border)',
                  borderRadius: 10, padding: '10px 14px', color: 'var(--text)', fontSize: 15,
                }}
              />
              <Button onClick={searchUser}><Search size={15} /></Button>
            </div>
            {error && <div style={{ fontSize: 13, color: 'var(--danger)' }}>{error}</div>}
            {found && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 14 }}>
                <Avatar url={found.avatarUrl} name={found.username} size={44} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 15 }}>{found.username}#{found.tag}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 2 }}>{found.bio || 'No bio'}</div>
                </div>
              </div>
            )}
          </div>
          {found && (
            <div style={{ padding: '12px 16px', paddingBottom: 'calc(12px + env(safe-area-inset-bottom))', borderTop: '1px solid var(--border)' }}>
              <Button onClick={startDM} fullWidth>Start Chat</Button>
            </div>
          )}
        </>
      )}

      {step === 'group' && (
        <>
          <FullscreenHeader title="New Group" onBack={() => setStep('type')} />
          <div style={{ flex: 1, overflowY: 'auto', padding: 16, paddingTop: 'calc(72px + env(safe-area-inset-top))', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <input
              autoFocus
              placeholder="Group name"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              style={{
                background: 'var(--bg-2)', border: '1px solid var(--border)',
                borderRadius: 10, padding: '10px 14px', color: 'var(--text)', fontSize: 15,
              }}
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                placeholder="Add member (username#0000)"
                value={searchTag}
                onChange={(e) => setSearchTag(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addToGroup()}
                style={{
                  flex: 1, background: 'var(--bg-2)', border: '1px solid var(--border)',
                  borderRadius: 10, padding: '10px 14px', color: 'var(--text)', fontSize: 15,
                }}
              />
              <Button onClick={addToGroup}><Plus size={15} /></Button>
            </div>
            {error && <div style={{ fontSize: 13, color: 'var(--danger)' }}>{error}</div>}
            {selectedUsers.map((u) => (
              <div key={u.uid} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 14 }}>
                <Avatar url={u.avatarUrl} name={u.username} size={36} />
                <span style={{ flex: 1, fontSize: 14, fontWeight: 500 }}>{u.username}#{u.tag}</span>
                <button onClick={() => setSelectedUsers((p) => p.filter((x) => x.uid !== u.uid))} style={{ color: 'var(--text-3)', padding: 4 }}>
                  <X size={16} />
                </button>
              </div>
            ))}
          </div>
          <div style={{ padding: '12px 16px', paddingBottom: 'calc(12px + env(safe-area-inset-bottom))', borderTop: '1px solid var(--border)' }}>
            <Button onClick={createGroup} fullWidth disabled={!groupName.trim() || selectedUsers.length === 0}>Create Group</Button>
          </div>
        </>
      )}

      {step === 'channel' && (
        <>
          <FullscreenHeader title="New Channel" onBack={() => setStep('type')} />
          <div style={{ flex: 1, overflowY: 'auto', padding: 16, paddingTop: 'calc(72px + env(safe-area-inset-top))', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <input
              autoFocus
              placeholder="Channel name"
              value={channelName}
              onChange={(e) => setChannelName(e.target.value)}
              style={{
                background: 'var(--bg-2)', border: '1px solid var(--border)',
                borderRadius: 10, padding: '10px 14px', color: 'var(--text)', fontSize: 15,
              }}
            />
          </div>
          <div style={{ padding: '12px 16px', paddingBottom: 'calc(12px + env(safe-area-inset-bottom))', borderTop: '1px solid var(--border)' }}>
            <Button onClick={createChannel} fullWidth disabled={!channelName.trim()}>Create Channel</Button>
          </div>
        </>
      )}
    </div>
  )

  return createPortal(screen, document.body)
}
