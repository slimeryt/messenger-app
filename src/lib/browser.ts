import { Capacitor } from '@capacitor/core'
import { Browser } from '@capacitor/browser'

export async function openUrl(url: string) {
  const inApp = localStorage.getItem('nod_inAppBrowser') !== 'false'

  if (inApp && Capacitor.isNativePlatform()) {
    await Browser.open({ url, presentationStyle: 'popover' })
  } else {
    window.open(url, '_blank', 'noopener,noreferrer')
  }
}
