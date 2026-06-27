export interface VersionCounters {
  major: number
  minor: number
  ui: number
  bugfixMajor: number
  bugfixMinor: number
}

export const VERSION: VersionCounters = {
  major: 1,
  minor: 0,
  ui: 4,
  bugfixMajor: 1,
  bugfixMinor: 1,
}

export const APP_VERSION =
  `v${VERSION.major}.${VERSION.minor}${VERSION.ui}${VERSION.bugfixMajor}${VERSION.bugfixMinor}`
