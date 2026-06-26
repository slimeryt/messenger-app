import { create } from 'zustand'
import { User } from '../types'

interface AuthStore {
  user: User | null
  ready: boolean
  setUser: (u: User | null) => void
  setReady: (r: boolean) => void
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  ready: false,
  setUser: (user) => set({ user }),
  setReady: (ready) => set({ ready }),
}))
