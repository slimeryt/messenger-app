import { create } from 'zustand'
import { Chat } from '../types'
import { isListedChat, sortChats } from '../lib/chats'

interface ChatStore {
  chats: Chat[]
  activeChatId: string | null
  chatsReady: boolean
  setChats: (chats: Chat[]) => void
  setChatsReady: (v: boolean) => void
  setActiveChatId: (id: string | null) => void
  upsertChat: (chat: Chat) => void
  patchChat: (id: string, patch: Partial<Chat>) => void
}

export const useChatStore = create<ChatStore>((set) => ({
  chats: [],
  activeChatId: null,
  chatsReady: false,
  setChatsReady: (chatsReady) => set({ chatsReady }),
  setChats: (chats) => set({ chats: sortChats(chats.filter(isListedChat)) }),
  setActiveChatId: (activeChatId) => set({ activeChatId }),
  upsertChat: (chat) =>
    set((s) => {
      if (!isListedChat(chat)) return s
      const idx = s.chats.findIndex((c) => c.id === chat.id)
      if (idx === -1) return { chats: sortChats([chat, ...s.chats]) }
      const updated = [...s.chats]
      updated[idx] = { ...updated[idx], ...chat }
      return { chats: sortChats(updated) }
    }),
  patchChat: (id, patch) =>
    set((s) => {
      const idx = s.chats.findIndex((c) => c.id === id)
      if (idx === -1) {
        const created = { id, type: 'dm', name: '', avatarUrl: null, memberIds: [], lastMessage: '', lastMessageTime: 0, createdBy: '', ...patch } as Chat
        if (!isListedChat(created)) return s
        return { chats: sortChats([created, ...s.chats]) }
      }
      const merged = { ...s.chats[idx], ...patch }
      if (!isListedChat(merged)) {
        return { chats: s.chats.filter((c) => c.id !== id) }
      }
      const updated = [...s.chats]
      updated[idx] = merged
      return { chats: sortChats(updated) }
    }),
}))
