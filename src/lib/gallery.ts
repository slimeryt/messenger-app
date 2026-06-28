import { registerPlugin } from '@capacitor/core'

interface GalleryPlugin {
  checkPermission(): Promise<{ granted: boolean }>
  requestPermission(): Promise<{ granted: boolean; requested?: boolean }>
  getPhotos(opts: { offset: number; limit: number }): Promise<{ photos: GalleryPhoto[] }>
  getThumbnail(opts: { id: string }): Promise<{ data: string }>
  getPhotoData(opts: { id: string }): Promise<{ data: string }>
}

export interface GalleryPhoto {
  id: string
  name: string
}

const Native = registerPlugin<GalleryPlugin>('Gallery')

export async function checkGalleryPermission(): Promise<boolean> {
  const { granted } = await Native.checkPermission()
  return granted
}

export async function requestGalleryPermission(): Promise<boolean> {
  const { granted } = await Native.requestPermission()
  return granted
}

export function listPhotos(offset = 0, limit = 60): Promise<GalleryPhoto[]> {
  return Native.getPhotos({ offset, limit }).then(r => r.photos)
}

export function getPhotoThumbnail(id: string): Promise<string> {
  return Native.getThumbnail({ id }).then(r => r.data)
}

export function getPhotoData(id: string): Promise<string> {
  return Native.getPhotoData({ id }).then(r => r.data)
}
