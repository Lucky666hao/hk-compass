import { createClient } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'

function getSupabaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!url) throw new Error('NEXT_PUBLIC_SUPABASE_URL is not set')
  return url
}

function getSupabaseAnonKey(): string {
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!key) throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY is not set')
  return key
}

// 延迟初始化 — 避免构建时环境变量不可用导致崩溃
let _client: SupabaseClient | null = null

function getClient(): SupabaseClient {
  if (!_client) {
    _client = createClient(getSupabaseUrl(), getSupabaseAnonKey(), {
      auth: {
        // 显式启用 PKCE：与 Supabase 项目默认一致，确保邮件链接带 code、
        // verifier 存 localStorage，callback 的 exchangeCodeForSession 才能成功。
        flowType: 'pkce',
      },
    })
  }
  return _client
}

// 客户端组件用（Proxy 延迟访问）
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop: string) {
    return (getClient() as any)[prop]
  },
  apply(_target, _thisArg, args) {
    return (getClient() as any)(...args)
  },
})

// 服务端用 (带 service_role key — 仅 API routes 使用)
export const getServiceSupabase = () => {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set')
  }
  return createClient(getSupabaseUrl(), serviceKey)
}
