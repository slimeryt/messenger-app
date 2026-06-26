import { useEffect, useState } from 'react'
import { collection, query, where, onSnapshot } from 'firebase/firestore'
import { db } from '../../firebase'
import { Message } from '../../types'
import { Modal } from '../ui/Modal'
import { Pin } from 'lucide-react'

interface Props { chatId: string; onClose: () => void }

export function PinnedModal({ chatId, onClose }: Props) {
  const [pinned, setPinned] = useState<Message[]>([])

  useEffect(() => {
    const q = query(collection(db, 'chats', chatId, 'messages'), where('pinned', '==', true))
    const unsub = onSnapshot(q, (snap) => {
      setPinned(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Message)))
    })
    return unsub
  }, [chatId])

  return (
    <Modal title="Pinned Messages" onClose={onClose}>
      {pinned.length === 0 ? (
        <div style={{ color: 'var(--text-2)', fontSize: 13, textAlign: 'center', padding: '16px 0' }}>
          No pinned messages
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {pinned.map((m) => (
            <div
              key={m.id}
              style={{
                borderLeft: '3px solid var(--accent)',
                paddingLeft: 10,
                fontSize: 13,
                color: 'var(--text-2)',
              }}
            >
              <Pin size={12} style={{ display: 'inline', marginRight: 4 }} />
              {m.content || '[media]'}
            </div>
          ))}
        </div>
      )}
    </Modal>
  )
}
