import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { EN, translateAll } from '../lib/i18n'

interface LangCtx {
  t: (key: string) => string
  setLang: (lang: string) => Promise<void>
  currentLang: string
  translating: boolean
}

const LangContext = createContext<LangCtx>({
  t: (k) => EN[k] ?? k,
  setLang: async () => {},
  currentLang: 'English',
  translating: false,
})

export function LangProvider({ children }: { children: React.ReactNode }) {
  const [strings, setStrings] = useState<Record<string, string>>(EN)
  const [currentLang, setCurrentLang] = useState(() => localStorage.getItem('nod_lang') ?? 'English')
  const [translating, setTranslating] = useState(false)

  useEffect(() => {
    const lang = localStorage.getItem('nod_lang') ?? 'English'
    if (lang !== 'English') {
      setTranslating(true)
      translateAll(lang).then((s) => { setStrings(s); setTranslating(false) })
    }
  }, [])

  const setLang = useCallback(async (lang: string) => {
    setCurrentLang(lang)
    localStorage.setItem('nod_lang', lang)
    setTranslating(true)
    const s = await translateAll(lang)
    setStrings(s)
    setTranslating(false)
  }, [])

  const t = useCallback((k: string) => strings[k] ?? EN[k] ?? k, [strings])

  return (
    <LangContext.Provider value={{ t, setLang, currentLang, translating }}>
      {children}
    </LangContext.Provider>
  )
}

export const useLang = () => useContext(LangContext)
