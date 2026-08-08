/// <reference lib="webworker" />

const CACHE_NAME = 'hk-compass-v1'

const PRECACHE_URLS = [
  '/',
  '/manifest.json',
]

// ============================================
// Install & Activate
// ============================================
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    )
  )
  self.clients.claim()
})

// ============================================
// 网络优先策略
// ============================================
self.addEventListener('fetch', (event) => {
  if (
    event.request.url.includes('/api/') ||
    event.request.url.includes('supabase.co') ||
    event.request.url.includes('_next/')
  ) {
    return
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok) {
          const clone = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone))
        }
        return response
      })
      .catch(() => caches.match(event.request).then((cached) => cached || new Response('Offline')))
  )
})

// ============================================
// Push 通知
// ============================================
self.addEventListener('push', (event) => {
  if (!event.data) return

  try {
    const data = event.data.json()

    const title = data.title || 'HK Compass'
    const options = {
      body: data.body || '',
      icon: data.icon || '/icon-192.png',
      badge: '/icon-192.png',
      tag: data.tag || 'hk-compass-reminder',
      data: {
        url: data.url || '/',
      },
      vibrate: [200, 100, 200],
      requireInteraction: data.requireInteraction || false,
    }

    event.waitUntil(self.registration.showNotification(title, options))
  } catch {
    // 非 JSON 数据，显示为纯文本
    event.waitUntil(
      self.registration.showNotification('HK Compass', {
        body: event.data.text(),
        icon: '/icon-192.png',
      })
    )
  }
})

// 点击通知 → 打开对应页面
self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const url = event.notification.data?.url || '/'

  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clientList) => {
      // 如果已有打开的窗口，聚焦并导航
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus()
          client.postMessage({ type: 'navigate', url })
          return
        }
      }
      // 否则打开新窗口
      if (self.clients.openWindow) {
        self.clients.openWindow(url)
      }
    })
  )
})
