import { create } from 'zustand'
import { Chat } from '../types'

interface ChatStore {
  chats: Chat[]
  activeChatId: string | null
  setChats: (chats: Chat[]) => void
  setActiveChatId: (id: string | null) => void
  upsertChat: (chat: Chat) => void
}

export const useChatStore = create<ChatStore>((set) => ({
  chats: [],
  activeChatId: null,
  setChats: (chats) => set({ chats }),
  setActiveChatId: (activeChatId) => set({ activeChatId }),
  upsertChat: (chat) =>
    set((s) => {
      const idx = s.chats.findIndex((c) => c.id === chat.id)
      if (idx === -1) return { chats: [chat, ...s.chats] }
      const updated = [...s.chats]
      updated[idx] = chat
      return { chats: updated.sort((a, b) => b.lastMessageTime - a.lastMessageTime) }
    }),
}))
