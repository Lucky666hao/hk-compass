'use client'

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import { type Locale, getBrowserLocale } from './translations'

interface LanguageContextType {
  locale: Locale
  setLocale: (l: Locale) => void
}

const LanguageContext = createContext<LanguageContextType>({
  locale: 'zh-CN',
  setLocale: () => {},
})

const STORAGE_KEY = 'hk-compass-locale'

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('zh-CN')
  const [mounted, setMounted] = useState(false)

  // 初始化：localStorage > 浏览器语言 > zh-CN
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as Locale | null
    if (stored && ['en', 'zh-CN', 'zh-HK'].includes(stored)) {
      setLocaleState(stored)
    } else {
      setLocaleState(getBrowserLocale())
    }
    setMounted(true)
  }, [])

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l)
    localStorage.setItem(STORAGE_KEY, l)
    // 更新 <html lang>
    document.documentElement.lang = l === 'zh-HK' ? 'zh-Hant-HK' : l === 'zh-CN' ? 'zh-Hans-CN' : 'en'
  }, [])

  // 避免 hydration mismatch：服务端始终渲染 zh-CN，客户端 hydration 后再切换
  if (!mounted) {
    return (
      <LanguageContext.Provider value={{ locale: 'zh-CN', setLocale }}>
        {children}
      </LanguageContext.Provider>
    )
  }

  return (
    <LanguageContext.Provider value={{ locale, setLocale }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLocale() {
  return useContext(LanguageContext)
}
