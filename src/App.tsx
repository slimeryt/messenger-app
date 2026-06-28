import { useEffect, useRef, useState } from 'react'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { doc, onSnapshot, updateDoc, deleteField } from 'firebase/firestore'
import { auth, db } from './firebase'
import { useAuthStore } from './store/authStore'
import { useUpdateStore } from './store/updateStore'
import { User } from './types'
import { AuthPage } from './pages/AuthPage'
import { AppLayout } from './components/layout/AppLayout'
import { UpdateModal } from './components/UpdateModal'
import { checkForUpdate } from './lib/updater'
import { installApkUpdate } from './lib/apkUpdate'
import { initSafeAreaInsets } from './lib/safeArea'
import { useChatSync } from './hooks/useChatSync'
import { useCallListener } from './hooks/useCallListener'
import { initPushNotifications } from './lib/push'
import { useCallStore } from './store/callStore'
import { CallModal } from './components/call/CallModal'
import { IncomingCallSheet } from './components/call/IncomingCallSheet'
import { firebaseConfigured } from './firebase'
import { LangProvider } from './contexts/LangContext'
import { Camera } from '@capacitor/camera'
import { App as CapApp } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'
import { PasscodeLockScreen } from './components/PasscodeLockScreen'

import { SESSION_ID, SESSION_START } from './lib/session'

function getDeviceInfo() {
  const ua = navigator.userAgent
  const platform = /android/i.test(ua) ? 'Android' : /iphone|ipad/i.test(ua) ? 'iOS' : /mac/i.test(ua) ? 'macOS' : /win/i.test(ua) ? 'Windows' : 'Unknown'
  const browser = /edg/i.test(ua) ? 'Edge' : /chrome/i.test(ua) ? 'Chrome' : /firefox/i.test(ua) ? 'Firefox' : /safari/i.test(ua) ? 'Safari' : 'Browser'
  return { platform, browser }
}

function applyStoredSettings() {
  const msgSize = localStorage.getItem('nod_msgFontSize') ?? '14'
  document.documentElement.style.setProperty('--msg-font-size', `${msgSize}px`)

  const reduceAnim = localStorage.getItem('nod_reduceAnim') === 'true'
  document.body.classList.toggle('reduce-motion', reduceAnim)
}

export default function App() {
  const { user, ready, setUser, setReady } = useAuthStore()
  const { updateInfo, setUpdateInfo, dismissed: updateDismissed, setDismissed: setUpdateDismissed } = useUpdateStore()
  const [downloading, setDownloading] = useState(false)
  const [updateError, setUpdateError] = useState<string | null>(null)
  const [locked, setLocked] = useState(false)
  const prevUidRef = useRef<string | null>(null)

  useChatSync()
  useCallListener(user?.uid)
  const activeCall = useCallStore((s) => s.activeCall)
  const endCall = useCallStore((s) => s.endCall)

  useEffect(() => { applyStoredSettings() }, [])

  useEffect(() => {
    if (user?.uid !== prevUidRef.current) {
      prevUidRef.current = user?.uid ?? null
      if (user?.uid) {
        const shouldLock = localStorage.getItem('nod_sec_passcode') === 'true' || localStorage.getItem('nod_sec_passkeys') === 'true'
        setLocked(shouldLock)
      } else {
        setLocked(false)
      }
    }
  }, [user?.uid])

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return
    let handle: { remove: () => void } | null = null
    CapApp.addListener('appStateChange', ({ isActive }) => {
      if (isActive && user?.uid) {
        const shouldLock = localStorage.getItem('nod_sec_passcode') === 'true' || localStorage.getItem('nod_sec_passkeys') === 'true'
        if (shouldLock) setLocked(true)
      }
    }).then(h => { handle = h })
    return () => { handle?.remove() }
  }, [user?.uid])


  useEffect(() => initSafeAreaInsets(), [])

  useEffect(() => {
    async function requestPermissions() {
      if (!Capacitor.isNativePlatform()) return
      try { await Camera.requestPermissions({ permissions: ['camera', 'photos'] }) } catch {}
    }
    requestPermissions()
  }, [])

  useEffect(() => {
    if (!user?.uid || !Capacitor.isNativePlatform()) return
    let cleanup = () => {}
    const timer = setTimeout(() => {
      void initPushNotifications(user.uid).then((fn) => { cleanup = fn })
    }, 1500)
    return () => {
      clearTimeout(timer)
      cleanup()
    }
  }, [user?.uid])

  useEffect(() => {
    let userUnsub: (() => void) | undefined

    const unsub = onAuthStateChanged(auth, (firebaseUser) => {
      userUnsub?.()
      userUnsub = undefined

      if (!firebaseUser) {
        setUser(null)
        setReady(true)
        return
      }

      const userRef = doc(db, 'users', firebaseUser.uid)
      const { platform, browser } = getDeviceInfo()
      let sessionWritten = false
      userUnsub = onSnapshot(userRef, (snap) => {
        if (!snap.exists()) {
          setReady(true)
          return
        }

        const data = snap.data()
        const terminateExcept = data.terminateExcept as string | undefined
        const sessionKickAt = data.sessionKickAt as number | undefined

        if (
          sessionKickAt &&
          sessionKickAt > SESSION_START &&
          terminateExcept &&
          terminateExcept !== SESSION_ID
        ) {
          void updateDoc(userRef, { [`sessions.${SESSION_ID}`]: deleteField() }).catch(() => {})
          signOut(auth)
          return
        }

        if (!sessionWritten) {
          sessionWritten = true
          const existingSessions = (data.sessions ?? {}) as Record<string, { platform: string }>
          const updates: Record<string, any> = {
            online: true,
            lastSeen: Date.now(),
            terminateExcept: SESSION_ID,
            [`sessions.${SESSION_ID}`]: { platform, browser, startedAt: SESSION_START, lastActive: Date.now() },
          }
          for (const [id, s] of Object.entries(existingSessions)) {
            if (id !== SESSION_ID && s.platform === platform) {
              updates[`sessions.${id}`] = deleteField()
            }
          }
          void updateDoc(userRef, updates).catch(() => {})
        }

        setUser({ uid: snap.id, ...data } as User)
        setReady(true)
      })
    })

    window.addEventListener('beforeunload', () => {
      const uid = auth.currentUser?.uid
      if (uid) updateDoc(doc(db, 'users', uid), {
        online: false,
        lastSeen: Date.now(),
        [`sessions.${SESSION_ID}`]: deleteField(),
      }).catch(() => {})
    })

    return () => {
      userUnsub?.()
      unsub()
    }
  }, [])

  useEffect(() => {
    checkForUpdate().then((info) => {
      if (info) setUpdateInfo(info)
    }).catch(() => {})
  }, [])

  async function handleUpdate() {
    if (!updateInfo) return
    setDownloading(true)
    setUpdateError(null)
    try {
      await installApkUpdate(updateInfo.downloadUrl)
    } catch (e: unknown) {
      setUpdateError(e instanceof Error ? e.message : 'Update failed')
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
      {user && <IncomingCallSheet />}
      {user && activeCall && (
        <CallModal
          callId={activeCall.callId}
          chatId={activeCall.chatId}
          type={activeCall.type}
          role={activeCall.role}
          members={activeCall.members}
          participantIds={activeCall.participantIds}
          onClose={endCall}
        />
      )}
      {showUpdate && (
        <UpdateModal
          info={updateInfo!}
          downloading={downloading}
          error={updateError}
          onUpdate={handleUpdate}
          onLater={updateInfo?.force ? undefined : () => setUpdateDismissed(true)}
        />
      )}
      {user && locked && <PasscodeLockScreen onUnlock={() => setLocked(false)} />}
    </LangProvider>
  )
}
