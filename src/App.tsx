import { useEffect, useRef, useState } from 'react'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { doc, onSnapshot, updateDoc } from 'firebase/firestore'
import { auth, db } from './firebase'
import { useAuthStore } from './store/authStore'
import { useUpdateStore } from './store/updateStore'
import { User } from './types'
import { AuthPage } from './pages/AuthPage'
import { AppLayout } from './components/layout/AppLayout'
import { UpdateModal } from './components/UpdateModal'
import { checkForUpdate } from './lib/updater'
import { initSafeAreaInsets } from './lib/safeArea'
import { useChatSync } from './hooks/useChatSync'
import { firebaseConfigured } from './firebase'
import { LangProvider } from './contexts/LangContext'
import { PushNotifications } from '@capacitor/push-notifications'
import { Camera } from '@capacitor/camera'
import { Capacitor, CapacitorHttp, registerPlugin } from '@capacitor/core'
import { Filesystem, Directory } from '@capacitor/filesystem'

interface ApkInstallerPlugin { install(opts: { path: string }): Promise<void> }
const ApkInstaller = registerPlugin<ApkInstallerPlugin>('ApkInstaller')

export const SESSION_ID = `${Date.now()}-${Math.random().toString(36).slice(2)}`

function applyStoredSettings() {
  const msgSize = localStorage.getItem('nod_msgFontSize') ?? '14'
  document.documentElement.style.setProperty('--msg-font-size', `${msgSize}px`)

  const reduceAnim = localStorage.getItem('nod_reduceAnim') === 'true'
  document.body.classList.toggle('reduce-motion', reduceAnim)
}

export default function App() {
  const { user, ready, setUser, setReady } = useAuthStore()
  const { updateInfo, setUpdateInfo } = useUpdateStore()
  const [updateDismissed, setUpdateDismissed] = useState(false)
  const [downloading, setDownloading] = useState(false)

  useChatSync()

  useEffect(() => { applyStoredSettings() }, [])

  useEffect(() => initSafeAreaInsets(), [])

  useEffect(() => {
    async function requestPermissions() {
      if (!Capacitor.isNativePlatform()) return
      // Notifications
      try { await PushNotifications.requestPermissions() } catch {}
      // Camera + Photos (covers gallery READ_MEDIA_IMAGES)
      try { await Camera.requestPermissions({ permissions: ['camera', 'photos'] }) } catch {}
      // Microphone
      try {
        const s = await navigator.mediaDevices.getUserMedia({ audio: true })
        s.getTracks().forEach(t => t.stop())
      } catch {}
    }
    requestPermissions()
  }, [])

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
          // Sign out if another session triggered "terminate all"
          const terminateExcept = snap.data().terminateExcept as string | undefined
          if (terminateExcept && terminateExcept !== SESSION_ID) {
            signOut(auth)
            return
          }
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
    try {
      if (Capacitor.isNativePlatform()) {
        const res = await CapacitorHttp.get({
          url: updateInfo.downloadUrl,
          headers: { Accept: 'application/octet-stream' },
          responseType: 'blob',
        })
        if (res.status < 200 || res.status >= 300) throw new Error(`HTTP ${res.status}`)
        const base64 = res.data as string
        await Filesystem.writeFile({ path: 'update.apk', data: base64, directory: Directory.Cache })
        const { uri } = await Filesystem.getUri({ path: 'update.apk', directory: Directory.Cache })
        await ApkInstaller.install({ path: uri.replace('file://', '') })
      } else {
        window.open(updateInfo.downloadUrl, '_blank')
      }
    } catch (e: any) {
      alert(`Update failed: ${e?.message ?? e}`)
    } finally {
      setDownloading(false)
    }
  }

  if (!firebaseConfigured) {
    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24, background: 'var(--bg)' }}>
        <div style={{ fontSize: 20, fontWeight: 700 }}>Firebase not configured</div>
        <div style={{ color: 'var(--text-2)', fontSize: 13, textAlign: 'center', maxWidth: 340, lineHeight: 1.6 }}>
          Copy <code style={{ background: 'var(--bg-3)', padding: '2px 6px', borderRadius: 4 }}>.env.example</code> to <code style={{ background: 'var(--bg-3)', padding: '2px 6px', borderRadius: 4 }}>.env</code> and fill in your Firebase project credentials, then restart the dev server.
        </div>
      </div>
    )
  }

  if (!ready) {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-2)', fontSize: 13, background: 'var(--bg)' }}>
        Loading…
      </div>
    )
  }

  const showUpdate = updateInfo && (updateInfo.force || !updateDismissed)

  return (
    <LangProvider>
      {!user ? <AuthPage /> : <AppLayout />}
      {showUpdate && (
        <UpdateModal
          info={updateInfo!}
          downloading={downloading}
          onUpdate={handleUpdate}
          onLater={updateInfo?.force ? undefined : () => setUpdateDismissed(true)}
        />
      )}
    </LangProvider>
  )
}
