export interface User {
  uid: string
  username: string
  tag: string // 4-digit discriminator e.g. "0042"
  firstName?: string
  lastName?: string
  phone: string
  email: string
  birthday?: string
  avatarUrl: string | null
  bannerUrl: string | null
  bio: string
  lastSeen: number
  createdAt: number
  online: boolean
  role: 'user' | 'staff' | 'owner'
  banned: boolean
  blockedUsers?: string[]
  lastSeenVisibility?: 'everyone' | 'contacts' | 'nobody'
}

export type ChatType = 'dm' | 'group' | 'channel'

export interface Chat {
  id: string
  type: ChatType
  name: string
  avatarUrl: string | null
  memberIds: string[]
  lastMessage: string
  lastMessageTime: number
  createdBy: string
  unread?: number
  participantNames?: Record<string, string>
  participantAvatars?: Record<string, string | null>
}

export type MessageType = 'text' | 'image' | 'audio' | 'file' | 'system'

export interface Message {
  id: string
  chatId: string
  senderId: string
  content: string
  type: MessageType
  replyToId: string | null
  replyToContent?: string
  replyToSender?: string
  reactions: Record<string, string[]> // emoji -> uid[]
  attachmentUrl: string | null
  attachmentMeta: { name: string; size: number; mime: string } | null
  edited: boolean
  deleted: boolean
  createdAt: number
  pinned: boolean
}

export interface TypingState {
  [uid: string]: string // uid -> username
}

export type UpdateType = 'minor' | 'major' | 'ui' | 'bugfix-minor' | 'bugfix-major'

export interface UpdateInfo {
  version: string
  type: UpdateType
  force: boolean
  notes: string
  changelog: string[]
  downloadUrl: string
}
