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
  ui: 5,
  bugfixMajor: 0,
  bugfixMinor: 18,
}

export const APP_VERSION =
  `v${VERSION.major}.${VERSION.minor}${VERSION.ui}${VERSION.bugfixMajor}${VERSION.bugfixMinor}`
