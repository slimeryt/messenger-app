import { create } from 'zustand'

interface TypingStore {
  typing: Record<string, Record<string, string>> // chatId -> { uid: username }
  setTyping: (chatId: string, uid: string, username: string | null) => void
}

export const useTypingStore = create<TypingStore>((set) => ({
  typing: {},
  setTyping: (chatId, uid, username) =>
    set((s) => {
      const prev = s.typing[chatId] ?? {}
      if (username === null) {
        const { [uid]: _, ...rest } = prev
        return { typing: { ...s.typing, [chatId]: rest } }
      }
      return { typing: { ...s.typing, [chatId]: { ...prev, [uid]: username } } }
    }),
}))
