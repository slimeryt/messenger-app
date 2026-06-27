import { useEffect, useState } from 'react'
import { collection, getDocs, doc, updateDoc, query, orderBy } from 'firebase/firestore'
import { db } from '../../firebase'
import { User } from '../../types'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { Avatar } from '../ui/Avatar'
import { ShieldAlert, Ban } from 'lucide-react'

interface Props { onClose: () => void; inline?: boolean }

export function StaffMenu({ onClose }: Props) {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getDocs(collection(db, 'users')).then((snap) => {
      setUsers(snap.docs.map((d) => ({ uid: d.id, ...d.data() } as User)))
      setLoading(false)
    })
  }, [])

  async function toggleBan(user: User) {
    await updateDoc(doc(db, 'users', user.uid), { banned: !user.banned })
    setUsers((prev) => prev.map((u) => u.uid === user.uid ? { ...u, banned: !u.banned } : u))
  }

  async function setRole(user: User, role: User['role']) {
    await updateDoc(doc(db, 'users', user.uid), { role })
    setUsers((prev) => prev.map((u) => u.uid === user.uid ? { ...u, role } : u))
  }

  return (
    <Modal title="Staff Menu" onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, maxHeight: 400, overflowY: 'auto' }}>
        {loading && <div style={{ color: 'var(--text-2)', fontSize: 13, textAlign: 'center', padding: 16 }}>Loading…</div>}
        {users.map((u) => (
          <div
            key={u.uid}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '8px 4px',
              borderBottom: '1px solid var(--border)',
            }}
          >
            <Avatar url={u.avatarUrl} name={u.username} size={32} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 500 }}>
                {u.username}#{u.tag}
                {u.banned && <span style={{ fontSize: 11, color: 'var(--danger)', marginLeft: 6 }}>BANNED</span>}
                {u.role !== 'user' && (
                  <span style={{ fontSize: 11, color: 'var(--accent)', marginLeft: 6 }}>{u.role.toUpperCase()}</span>
                )}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{u.email}</div>
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              <button
                onClick={() => toggleBan(u)}
                title={u.banned ? 'Unban' : 'Ban'}
                style={{
                  color: u.banned ? 'var(--accent)' : 'var(--danger)',
                  padding: 5,
                  borderRadius: 'var(--radius-sm)',
                }}
              >
                <Ban size={15} />
              </button>
              {u.role === 'user' && (
                <button
                  onClick={() => setRole(u, 'staff')}
                  title="Make staff"
                  style={{ color: 'var(--text-2)', padding: 5, borderRadius: 'var(--radius-sm)' }}
                >
                  <ShieldAlert size={15} />
                </button>
              )}
              {u.role === 'staff' && (
                <button
                  onClick={() => setRole(u, 'user')}
                  title="Remove staff"
                  style={{ color: 'var(--text-3)', padding: 5, borderRadius: 'var(--radius-sm)', fontSize: 11 }}
                >
                  Demote
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </Modal>
  )
}
