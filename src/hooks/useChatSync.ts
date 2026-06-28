import { useEffect, useRef } from 'react'
import { App } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'
import { collection, doc, getDoc, onSnapshot, query, where } from 'firebase/firestore'
import { db } from '../firebase'
import { useAuthStore } from '../store/authStore'
import { useChatStore } from '../store/chatStore'
import { Chat } from '../types'
import { getNotificationPermission, sendNotification } from '../lib/notifications'
import { filterListedChats, getChatTitle, parseChat } from '../lib/chats'

async function notifyNewMessages(
  chats: Chat[],
  prevTimes: Record<string, number>,
  myUid: string,
  appIsActive: boolean
) {
  if (!appIsActive) return
  try {
    const notifEnabled = localStorage.getItem('nod_notif') !== 'false'
    if (!notifEnabled) return
    const notifSound = localStorage.getItem('nod_notifSound') !== 'false'
    const perm = await getNotificationPermission()
    if (perm !== 'granted') return
    const notifVibrate = localStorage.getItem('nod_notifVibrate') !== 'false'
    const activeChatId = useChatStore.getState().activeChatId
    const showPreview = localStorage.getItem('nod_notifPreview') !== 'false'

    for (const chat of chats) {
      if (chat.id === activeChatId) continue
      if (chat.lastMessageSenderId === myUid) continue
      const prev = prevTimes[chat.id] ?? 0
      if (chat.lastMessageTime > prev && chat.lastMessage) {
        const body = showPreview ? chat.lastMessage : 'New message'
        await sendNotification(getChatTitle(chat, myUid), body, !notifSound, notifVibrate)
      }
    }
  } catch {
    // Never block chat list updates on notification failures
  }
}

async function enrichParticipantProfiles(chats: Chat[]): Promise<Chat[]> {
  const needs = chats.filter(
    (c) => c.type === 'dm' && c.memberIds.length === 2 && !c.participantNames
  )
  if (needs.length === 0) return chats

  const uids = [...new Set(needs.flatMap((c) => c.memberIds))]
  const profiles = await Promise.all(
    uids.map(async (uid) => {
      const snap = await getDoc(doc(db, 'users', uid))
      if (!snap.exists()) return null
      const data = snap.data()
      return { uid, username: String(data.username ?? ''), avatarUrl: (data.avatarUrl as string | null) ?? null }
    })
  )
  const byUid = Object.fromEntries(
    profiles.filter(Boolean).map((p) => [p!.uid, p!])
  )

  return chats.map((chat) => {
    if (chat.type !== 'dm' || chat.memberIds.length !== 2 || chat.participantNames) return chat
    const participantNames: Record<string, string> = {}
    const participantAvatars: Record<string, string | null> = {}
    for (const uid of chat.memberIds) {
      const p = byUid[uid]
      if (p) {
        participantNames[uid] = p.username
        participantAvatars[uid] = p.avatarUrl
      }
    }
    return { ...chat, participantNames, participantAvatars }
  })
}

export function useChatSync() {
  const me = useAuthStore((s) => s.user)
  const setChats = useChatStore((s) => s.setChats)
  const setChatsReady = useChatStore((s) => s.setChatsReady)
  const prevTimesRef = useRef<Record<string, number>>({})
  const initialLoadRef = useRef(true)
  const appIsActiveRef = useRef(true)

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return
    let handle: { remove: () => Promise<void> } | undefined
    void App.addListener('appStateChange', ({ isActive }) => {
      appIsActiveRef.current = isActive
    }).then((h) => { handle = h })
    return () => { void handle?.remove() }
  }, [])

  useEffect(() => {
    if (!me) {
      setChats([])
      setChatsReady(false)
      return
    }

    const q = query(
      collection(db, 'chats'),
      where('memberIds', 'array-contains', me.uid)
    )

    const unsub = onSnapshot(
      q,
      (snap) => {
        const parsed = filterListedChats(snap.docs.map((d) => parseChat(d.id, d.data())))
        const prevTimes = prevTimesRef.current

        setChats(parsed)

        void enrichParticipantProfiles(parsed).then((enriched) => {
          const listed = filterListedChats(enriched)
          setChats(listed)
        })

        if (!initialLoadRef.current) {
          void notifyNewMessages(parsed, prevTimes, me.uid, appIsActiveRef.current)
        }

        prevTimesRef.current = Object.fromEntries(parsed.map((c) => [c.id, c.lastMessageTime]))
        if (initialLoadRef.current) setChatsReady(true)
        initialLoadRef.current = false
      },
      (err) => console.error('Chat sync failed:', err)
    )

    return () => {
      unsub()
      initialLoadRef.current = true
      prevTimesRef.current = {}
      setChatsReady(false)
    }
  }, [me?.uid, setChats])
}
