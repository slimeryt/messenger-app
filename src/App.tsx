import { useEffect, useState } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { doc, onSnapshot, updateDoc } from 'firebase/firestore'
import { auth, db } from './firebase'
import { useAuthStore } from './store/authStore'
import { User } from './types'
import { AuthPage } from './pages/AuthPage'
import { AppLayout } from './components/layout/AppLayout'
import { UpdateModal } from './components/UpdateModal'
import { checkForUpdate } from './lib/updater'
import { UpdateInfo } from './types'

export default function App() {
  const { user, ready, setUser, setReady } = useAuthStore()
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null)
  const [updateDismissed, setUpdateDismissed] = useState(false)
  const [downloading, setDownloading] = useState(false)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setUser(null)
        setReady(true)
        return
      }
      const userUnsub = onSnapshot(doc(db, 'users', firebaseUser.uid), (snap) => {
        if (snap.exists()) {
          const u = { uid: snap.id, ...snap.data() } as User
          setUser(u)
        }
        setReady(true)
      })
      await updateDoc(doc(db, 'users', firebaseUser.uid), { online: true, lastSeen: Date.now() }).catch(() => {})
      return () => userUnsub()
    })

    window.addEventListener('beforeunload', () => {
      const uid = auth.currentUser?.uid
      if (uid) updateDoc(doc(db, 'users', uid), { online: false, lastSeen: Date.now() }).catch(() => {})
    })

    return unsub
  }, [])

  useEffect(() => {
    checkForUpdate().then((info) => {
      if (info) setUpdateInfo(info)
    })
  }, [])

  async function handleUpdate() {
    if (!updateInfo) return
    setDownloading(true)
    window.open(updateInfo.downloadUrl, '_blank')
    setDownloading(false)
  }

  if (!ready) {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-2)', fontSize: 13 }}>
        Loading…
      </div>
    )
  }

  const showUpdate = updateInfo && (updateInfo.force || !updateDismissed)

  return (
    <>
      {!user ? <AuthPage /> : <AppLayout />}
      {showUpdate && (
        <UpdateModal
          info={updateInfo!}
          onUpdate={handleUpdate}
          onLater={updateInfo?.force ? undefined : () => setUpdateDismissed(true)}
        />
      )}
    </>
  )
}
