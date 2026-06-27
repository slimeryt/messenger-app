export const LANG_CODES: Record<string, string> = {
  English: 'en',
  Spanish: 'es',
  French: 'fr',
  German: 'de',
  Portuguese: 'pt',
  Russian: 'ru',
  Japanese: 'ja',
  Korean: 'ko',
  Chinese: 'zh',
}

export const EN: Record<string, string> = {
  chats: 'Chats',
  contacts: 'Contacts',
  settings: 'Settings',
  profile: 'Profile',
  account: 'Account',
  chat_settings: 'Chat Settings',
  privacy: 'Privacy & Security',
  notifications: 'Notifications',
  data_storage: 'Data and Storage',
  devices: 'Devices',
  power_saving: 'Power Saving',
  language: 'Language',
  sign_out: 'Sign Out',
  staff_menu: 'Staff Menu',
  saved_messages: 'Saved Messages',
  message: 'Message',
  search: 'Search',
  no_chats: 'No chats yet.\nTap the pencil icon to start one.',
  no_results: 'No results',
}

export async function translateAll(langName: string): Promise<Record<string, string>> {
  if (langName === 'English') return EN

  const code = LANG_CODES[langName]
  if (!code || code === 'en') return EN

  const cacheKey = `nod_trans_${code}`
  const cached = localStorage.getItem(cacheKey)
  if (cached) {
    try { return JSON.parse(cached) } catch {}
  }

  const results: Record<string, string> = {}

  for (const [key, text] of Object.entries(EN)) {
    try {
      const res = await fetch(
        `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|${code}`
      )
      const data = await res.json()
      results[key] = data.responseData?.translatedText ?? text
    } catch {
      results[key] = text
    }
  }

  localStorage.setItem(cacheKey, JSON.stringify(results))
  return results
}
