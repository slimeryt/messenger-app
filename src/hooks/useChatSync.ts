import { useEffect, useRef } from 'react'
import { collection, doc, getDoc, onSnapshot, query, where } from 'firebase/firestore'
import { db } from '../firebase'
import { useAuthStore } from '../store/authStore'
import { useChatStore } from '../store/chatStore'
import { Chat } from '../types'
import { getNotificationPermission, sendNotification } from '../lib/notifications'
import { parseChat, sortChats, getChatTitle } from '../lib/chats'

async function notifyNewMessages(chats: Chat[], prevTimes: Record<string, number>, myUid: string) {
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
        await sendNotification(getChatTitle(chat, myUid), chat.lastMessage, !notifSound, notifVibrate)
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
  const prevTimesRef = useRef<Record<string, number>>({})
  const initialLoadRef = useRef(true)

  useEffect(() => {
    if (!me) {
      setChats([])
      return
    }

    // No orderBy — avoids composite index requirement; sort client-side instead
    const q = query(
      collection(db, 'chats'),
      where('memberIds', 'array-contains', me.uid)
    )

    const unsub = onSnapshot(
      q,
      (snap) => {
        const parsed = sortChats(snap.docs.map((d) => parseChat(d.id, d.data())))
        const prevTimes = prevTimesRef.current

        setChats(parsed)

        void enrichParticipantProfiles(parsed).then((enriched) => {
          if (enriched !== parsed) setChats(sortChats(enriched))
        })

        if (!initialLoadRef.current) {
          void notifyNewMessages(parsed, prevTimes, me.uid)
        }

        prevTimesRef.current = Object.fromEntries(parsed.map((c) => [c.id, c.lastMessageTime]))
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
