import { Capacitor } from '@capacitor/core'
import { LocalNotifications } from '@capacitor/local-notifications'

let channelCreated = false

async function ensureChannel() {
  if (channelCreated || !Capacitor.isNativePlatform()) return
  try {
    await LocalNotifications.createChannel({
      id: 'messages',
      name: 'Messages',
      description: 'New message notifications',
      importance: 4,
      visibility: 1,
      vibration: true,
    })
    channelCreated = true
  } catch {}
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (Capacitor.isNativePlatform()) {
    await ensureChannel()
    const result = await LocalNotifications.requestPermissions()
    return result.display === 'granted'
  }
  const result = await Notification.requestPermission()
  return result === 'granted'
}

export async function getNotificationPermission(): Promise<'granted' | 'denied' | 'prompt'> {
  if (Capacitor.isNativePlatform()) {
    const result = await LocalNotifications.checkPermissions()
    return result.display === 'granted' ? 'granted' : result.display === 'denied' ? 'denied' : 'prompt'
  }
  return Notification.permission as 'granted' | 'denied' | 'prompt'
}

let notifId = 1

export async function sendNotification(title: string, body: string, silent = false, vibrate = true): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    await ensureChannel()
    await LocalNotifications.schedule({
      notifications: [{
        title,
        body,
        id: notifId++,
        channelId: 'messages',
        sound: silent ? undefined : 'default',
        // vibration is handled by the channel on Android
      }],
    })
  } else {
    if (Notification.permission === 'granted') {
      new Notification(title, { body, silent })
    }
  }

  if (vibrate && navigator.vibrate) {
    navigator.vibrate(silent ? 0 : [100, 50, 100])
  }
}
