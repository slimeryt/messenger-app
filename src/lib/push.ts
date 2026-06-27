import { Capacitor } from '@capacitor/core'
import { App } from '@capacitor/app'
import { PushNotifications } from '@capacitor/push-notifications'
import { arrayUnion, doc, updateDoc } from 'firebase/firestore'
import { db } from '../firebase'
import { useChatStore } from '../store/chatStore'
import { sendNotification } from './notifications'

const listeners: { remove: () => Promise<void> }[] = []

export async function initPushNotifications(uid: string): Promise<() => void> {
  if (!Capacitor.isNativePlatform()) return () => {}

  const perm = await PushNotifications.requestPermissions()
  if (perm.receive !== 'granted') return () => {}

  await PushNotifications.register()

  listeners.push(
    await PushNotifications.addListener('registration', async (token) => {
      await updateDoc(doc(db, 'users', uid), {
        fcmTokens: arrayUnion(token.value),
      }).catch(() => {})
    })
  )

  listeners.push(
    await PushNotifications.addListener('registrationError', (err) => {
      console.error('Push registration failed:', err)
    })
  )

  // Foreground push — show a local notification (background is handled by FCM + cloud function)
  listeners.push(
    await PushNotifications.addListener('pushNotificationReceived', async (notification) => {
      const chatId = notification.data?.chatId as string | undefined
      const activeChatId = useChatStore.getState().activeChatId
      if (chatId && chatId === activeChatId) return
      if (localStorage.getItem('nod_notif') === 'false') return

      const title = notification.title ?? 'Nod'
      const showPreview = localStorage.getItem('nod_notifPreview') !== 'false'
      const body = showPreview
        ? (notification.body ?? 'New message')
        : 'New message'
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

  // Keep Firestore listener warm briefly when app is backgrounded
  listeners.push(
    await App.addListener('appStateChange', ({ isActive }) => {
      if (isActive) PushNotifications.register().catch(() => {})
    })
  )

  return () => {
    void Promise.all(listeners.splice(0).map((l) => l.remove()))
  }
}
