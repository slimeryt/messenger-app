import { UpdateInfo, UpdateType } from '../types'
import { VERSION, APP_VERSION, VersionCounters } from './version'

const REPO = import.meta.env.VITE_GITHUB_REPO ?? ''

function isNewer(remote: VersionCounters, local: VersionCounters): boolean {
  if (remote.major !== local.major) return remote.major > local.major
  if (remote.minor !== local.minor) return remote.minor > local.minor
  if (remote.ui !== local.ui) return remote.ui > local.ui
  if (remote.bugfixMajor !== local.bugfixMajor) return remote.bugfixMajor > local.bugfixMajor
  return remote.bugfixMinor > local.bugfixMinor
}

const VALID_TYPES: UpdateType[] = ['minor', 'major', 'ui', 'bugfix-minor', 'bugfix-major']

export async function checkForUpdate(): Promise<UpdateInfo | null> {
  if (!REPO) return null
  try {
    const res = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`)
    if (!res.ok) return null
    const data = await res.json()

    let meta: {
      type?: string
      force?: boolean
      notes?: string
      counters?: VersionCounters
    } = {}
    try { meta = JSON.parse(data.body ?? '{}') } catch {}

    if (!meta.counters) return null
    if (!isNewer(meta.counters, VERSION)) return null

    const type: UpdateType = VALID_TYPES.includes(meta.type as UpdateType)
      ? (meta.type as UpdateType)
      : 'minor'

    const force = meta.force ?? type === 'bugfix-major'

    const apkAsset = data.assets?.find((a: { name: string }) => a.name.endsWith('.apk'))
    if (!apkAsset) return null

    const { major, minor, ui, bugfixMajor, bugfixMinor } = meta.counters
    const displayVersion = `v${major}.${minor}${ui}${bugfixMajor}${bugfixMinor}`

    return {
      version: displayVersion,
      type,
      force,
      notes: meta.notes ?? data.name ?? '',
      downloadUrl: apkAsset.browser_download_url,
    }
  } catch {
    return null
  }
}

export { APP_VERSION }
