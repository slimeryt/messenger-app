import { useEffect, useRef } from 'react'
import { collection, onSnapshot, orderBy, query, where } from 'firebase/firestore'
import { db } from '../firebase'
import { useAuthStore } from '../store/authStore'
import { useChatStore } from '../store/chatStore'
import { Chat } from '../types'
import { getNotificationPermission, sendNotification } from '../lib/notifications'

async function notifyNewMessages(chats: Chat[], prevTimes: Record<string, number>) {
  try {
    const notifEnabled = localStorage.getItem('nod_notif') !== 'false'
    if (!notifEnabled) return
    const notifSound = localStorage.getItem('nod_notifSound') !== 'false'
    const perm = await getNotificationPermission()
    if (perm !== 'granted') return
    const notifVibrate = localStorage.getItem('nod_notifVibrate') !== 'false'
    for (const chat of chats) {
      const prev = prevTimes[chat.id] ?? 0
      if (chat.lastMessageTime > prev && chat.lastMessage) {
        await sendNotification(chat.name, chat.lastMessage, !notifSound, notifVibrate)
      }
    }
  } catch {
    // Never block chat list updates on notification failures
  }
}

export function useChatSync() {
  const me = useAuthStore((s) => s.user)
  const setChats = useChatStore((s) => s.setChats)
  const prevTimesRef = useRef<Record<string, number>>({})
  const initialLoadRef = useRef(true)

  useEffect(() => {
    if (!me) {
      setChats([])
      return
    }

    const q = query(
      collection(db, 'chats'),
      where('memberIds', 'array-contains', me.uid),
      orderBy('lastMessageTime', 'desc')
    )

    const unsub = onSnapshot(
      q,
      (snap) => {
        const updated = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Chat))
        const prevTimes = prevTimesRef.current

        setChats(updated)

        if (!initialLoadRef.current) {
          void notifyNewMessages(updated, prevTimes)
        }

        prevTimesRef.current = Object.fromEntries(updated.map((c) => [c.id, c.lastMessageTime]))
        initialLoadRef.current = false
      },
      (err) => console.error('Chat sync failed:', err)
    )

    return () => {
      unsub()
      initialLoadRef.current = true
      prevTimesRef.current = {}
    }
  }, [me?.uid, setChats])
}
