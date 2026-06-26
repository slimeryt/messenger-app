import { create } from 'zustand'
import { Message } from '../types'

interface MessageStore {
  messages: Record<string, Message[]> // chatId -> messages
  setMessages: (chatId: string, msgs: Message[]) => void
  addMessage: (chatId: string, msg: Message) => void
  updateMessage: (chatId: string, msgId: string, patch: Partial<Message>) => void
  deleteMessage: (chatId: string, msgId: string) => void
}

export const useMessageStore = create<MessageStore>((set) => ({
  messages: {},
  setMessages: (chatId, msgs) =>
    set((s) => ({ messages: { ...s.messages, [chatId]: msgs } })),
  addMessage: (chatId, msg) =>
    set((s) => ({
      messages: {
        ...s.messages,
        [chatId]: [...(s.messages[chatId] ?? []), msg],
      },
    })),
  updateMessage: (chatId, msgId, patch) =>
    set((s) => ({
      messages: {
        ...s.messages,
        [chatId]: (s.messages[chatId] ?? []).map((m) =>
          m.id === msgId ? { ...m, ...patch } : m
        ),
      },
    })),
  deleteMessage: (chatId, msgId) =>
    set((s) => ({
      messages: {
        ...s.messages,
        [chatId]: (s.messages[chatId] ?? []).map((m) =>
          m.id === msgId ? { ...m, deleted: true, content: '' } : m
        ),
      },
    })),
}))
