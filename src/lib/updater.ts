import { UpdateInfo } from '../types'
import { APP_VERSION } from './version'

const REPO = import.meta.env.VITE_GITHUB_REPO ?? ''

function parseVersion(v: string): number[] {
  return v.replace(/^v/, '').split('.').map(Number)
}

function isNewer(latest: string, current: string): boolean {
  const a = parseVersion(latest)
  const b = parseVersion(current)
  for (let i = 0; i < 3; i++) {
    if ((a[i] ?? 0) > (b[i] ?? 0)) return true
    if ((a[i] ?? 0) < (b[i] ?? 0)) return false
  }
  return false
}

export async function checkForUpdate(): Promise<UpdateInfo | null> {
  if (!REPO) return null
  try {
    const res = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`)
    if (!res.ok) return null
    const data = await res.json()
    if (!isNewer(data.tag_name, APP_VERSION)) return null

    let meta: { force?: boolean; notes?: string } = {}
    try { meta = JSON.parse(data.body ?? '{}') } catch {}

    const apkAsset = data.assets?.find((a: { name: string }) => a.name.endsWith('.apk'))
    if (!apkAsset) return null

    return {
      version: data.tag_name,
      force: meta.force ?? false,
      notes: meta.notes ?? data.name ?? '',
      downloadUrl: apkAsset.browser_download_url,
    }
  } catch {
    return null
  }
}
