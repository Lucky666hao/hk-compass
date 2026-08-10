'use client'

import { useEffect } from 'react'

/**
 * 进入匿名地下板块时，强制整个 App 切换到暗色模式。
 * 卸载时恢复之前的模式。
 */
export function ForceDark({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const html = document.documentElement
    const wasDark = html.classList.contains('dark')
    html.classList.add('dark')

    return () => {
      if (!wasDark) {
        html.classList.remove('dark')
      }
    }
  }, [])

  return <>{children}</>
}
