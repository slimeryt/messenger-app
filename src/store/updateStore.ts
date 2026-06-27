import { create } from 'zustand'
import { UpdateInfo } from '../types'

interface UpdateStore {
  updateInfo: UpdateInfo | null
  setUpdateInfo: (info: UpdateInfo | null) => void
}

export const useUpdateStore = create<UpdateStore>((set) => ({
  updateInfo: null,
  setUpdateInfo: (info) => set({ updateInfo: info }),
}))
