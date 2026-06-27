import { Capacitor } from '@capacitor/core'

const ANDROID_NAV_FALLBACK = 32

function measureSafeAreaBottom(): number {
  const probe = document.createElement('div')
  probe.style.cssText =
    'position:fixed;bottom:0;left:0;padding-bottom:env(safe-area-inset-bottom);visibility:hidden;pointer-events:none;'
  document.body.appendChild(probe)
  const px = parseFloat(getComputedStyle(probe).paddingBottom) || 0
  document.body.removeChild(probe)
  return px
}

function applyNavBarExtra() {
  let extra = 0
  if (Capacitor.getPlatform() === 'android' && measureSafeAreaBottom() < 8) {
    extra = ANDROID_NAV_FALLBACK
  }
  document.documentElement.style.setProperty('--nav-bar-extra', `${extra}px`)
}

export function initSafeAreaInsets() {
  applyNavBarExtra()
  window.visualViewport?.addEventListener('resize', applyNavBarExtra)
  return () => window.visualViewport?.removeEventListener('resize', applyNavBarExtra)
}
