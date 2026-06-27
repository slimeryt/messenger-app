import { Timestamp } from 'firebase/firestore'
import { Chat } from '../types'
import { User } from '../types'

export function toMillis(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (value instanceof Timestamp) return value.toMillis()
  if (value && typeof value === 'object' && 'seconds' in value) {
    return (value as { seconds: number }).seconds * 1000
  }
  return 0
}

export function parseChat(id: string, data: Record<string, unknown>): Chat {
  const lastMessage = String(data.lastMessage ?? '')
  const lastMessageTime = toMillis(data.lastMessageTime)
  return {
    id,
    type: (data.type as Chat['type']) ?? 'dm',
    name: String(data.name ?? ''),
    avatarUrl: (data.avatarUrl as string | null) ?? null,
    memberIds: Array.isArray(data.memberIds) ? (data.memberIds as string[]) : [],
    lastMessage,
    lastMessageTime: lastMessage ? lastMessageTime : 0,
    lastMessageSenderId: data.lastMessageSenderId ? String(data.lastMessageSenderId) : undefined,
    createdBy: String(data.createdBy ?? ''),
    unread: typeof data.unread === 'number' ? data.unread : undefined,
    participantNames: data.participantNames as Record<string, string> | undefined,
    participantAvatars: data.participantAvatars as Record<string, string | null> | undefined,
  }
}

/** Chats that belong in the list — only conversations with at least one message. */
export function isListedChat(chat: Chat): boolean {
  if (chat.type === 'dm' && chat.memberIds.length === 1) return false
  return !!chat.lastMessage.trim()
}

export function filterListedChats(chats: Chat[]): Chat[] {
  return sortChats(chats.filter(isListedChat))
}

export function sortChats(chats: Chat[]): Chat[] {
  return [...chats].sort((a, b) => b.lastMessageTime - a.lastMessageTime)
}

export function getOtherMemberUid(chat: Chat, myUid: string): string | null {
  if (chat.type !== 'dm' || chat.memberIds.length !== 2) return null
  return chat.memberIds.find((id) => id !== myUid) ?? null
}

export function getChatTitle(chat: Chat, myUid: string): string {
  if (chat.type === 'dm' && chat.memberIds.length === 1) return 'Saved Messages'
  const otherUid = getOtherMemberUid(chat, myUid)
  if (otherUid && chat.participantNames?.[otherUid]) return chat.participantNames[otherUid]
  if (otherUid && chat.createdBy === myUid) return chat.name
  return chat.name || 'Chat'
}

export function getChatAvatar(chat: Chat, myUid: string): string | null {
  const otherUid = getOtherMemberUid(chat, myUid)
  if (otherUid && chat.participantAvatars && otherUid in chat.participantAvatars) {
    return chat.participantAvatars[otherUid]
  }
  if (otherUid && chat.createdBy === myUid) return chat.avatarUrl
  return chat.avatarUrl
}

export function buildDmChatFields(me: User, other: User) {
  const memberIds = [me.uid, other.uid].sort()
  return {
    type: 'dm' as const,
    name: other.username,
    avatarUrl: other.avatarUrl,
    memberIds,
    participantNames: { [me.uid]: me.username, [other.uid]: other.username },
    participantAvatars: { [me.uid]: me.avatarUrl, [other.uid]: other.avatarUrl },
    lastMessage: '',
    lastMessageTime: 0,
    createdBy: me.uid,
  }
}

export function lastMessagePreview(
  content: string,
  type: 'text' | 'image' | 'audio' | 'file' | 'system' = 'text'
): string {
  return type === 'text' ? content : `[${type}]`
}
