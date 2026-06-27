import { Capacitor } from '@capacitor/core'
import { App } from '@capacitor/app'
import { PushNotifications } from '@capacitor/push-notifications'
import { arrayUnion, doc, updateDoc } from 'firebase/firestore'
import { db } from '../firebase'
import { useChatStore } from '../store/chatStore'
import { sendNotification } from './notifications'

let pushEnabled = false

/** Call PushNotifications APIs only after a successful register(). */
export function isPushEnabled() {
  return pushEnabled
}

export async function initPushNotifications(uid: string): Promise<() => void> {
  if (!Capacitor.isNativePlatform()) return () => {}

  const listeners: { remove: () => Promise<void> }[] = []

  try {
    const perm = await PushNotifications.requestPermissions()
    if (perm.receive !== 'granted') return () => {}

    await PushNotifications.register()
    pushEnabled = true

    listeners.push(
      await PushNotifications.addListener('registration', async (token) => {
        await updateDoc(doc(db, 'users', uid), {
          fcmTokens: arrayUnion(token.value),
        }).catch(() => {})
      })
    )

    listeners.push(
      await PushNotifications.addListener('registrationError', (err) => {
        console.warn('Push registration failed:', err)
        pushEnabled = false
      })
    )

    listeners.push(
      await PushNotifications.addListener('pushNotificationReceived', async (notification) => {
        const chatId = notification.data?.chatId as string | undefined
        const activeChatId = useChatStore.getState().activeChatId
        if (chatId && chatId === activeChatId) return
        if (localStorage.getItem('nod_notif') === 'false') return

        const title = notification.title ?? 'Nod'
        const showPreview = localStorage.getItem('nod_notifPreview') !== 'false'
        const body = showPreview ? (notification.body ?? 'New message') : 'New message'
        const silent = localStorage.getItem('nod_notifSound') === 'false'
        const vibrate = localStorage.getItem('nod_notifVibrate') !== 'false'
        await sendNotification(title, body, silent, vibrate)
      })
    )

    listeners.push(
      await PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
        const chatId = action.notification.data?.chatId as string | undefined
        if (chatId) useChatStore.getState().setActiveChatId(chatId)
      })
    )

    listeners.push(
      await App.addListener('appStateChange', ({ isActive }) => {
        if (isActive && pushEnabled) PushNotifications.register().catch(() => {})
      })
    )
  } catch (err) {
    // Missing google-services.json or FCM not configured — skip push, app still works
    console.warn('Push notifications unavailable:', err)
    pushEnabled = false
  }

  return () => {
    pushEnabled = false
    void Promise.all(listeners.map((l) => l.remove()))
  }
}
