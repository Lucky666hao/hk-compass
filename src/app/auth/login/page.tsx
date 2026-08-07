import { Suspense } from 'react'
import { LoginForm } from './login-form'

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-[80vh] items-center justify-center">
        <div className="animate-pulse text-muted-foreground">加载中...</div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  )
}
