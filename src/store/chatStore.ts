import { create } from 'zustand'
import { Chat } from '../types'
import { sortChats } from '../lib/chats'

interface ChatStore {
  chats: Chat[]
  activeChatId: string | null
  setChats: (chats: Chat[]) => void
  setActiveChatId: (id: string | null) => void
  upsertChat: (chat: Chat) => void
  patchChat: (id: string, patch: Partial<Chat>) => void
}

export const useChatStore = create<ChatStore>((set) => ({
  chats: [],
  activeChatId: null,
  setChats: (chats) => set({ chats: sortChats(chats) }),
  setActiveChatId: (activeChatId) => set({ activeChatId }),
  upsertChat: (chat) =>
    set((s) => {
      const idx = s.chats.findIndex((c) => c.id === chat.id)
      if (idx === -1) return { chats: sortChats([chat, ...s.chats]) }
      const updated = [...s.chats]
      updated[idx] = { ...updated[idx], ...chat }
      return { chats: sortChats(updated) }
    }),
  patchChat: (id, patch) =>
    set((s) => {
      const idx = s.chats.findIndex((c) => c.id === id)
      if (idx === -1) return s
      const updated = [...s.chats]
      updated[idx] = { ...updated[idx], ...patch }
      return { chats: sortChats(updated) }
    }),
}))
