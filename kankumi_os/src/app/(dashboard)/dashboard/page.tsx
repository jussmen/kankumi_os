import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { signOut } from '@/app/actions/auth'

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-800">Kankumi OS</h1>
        <form action={signOut}>
          <button
            type="submit"
            className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            ログアウト
          </button>
        </form>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          ダッシュボード
        </h2>
        <p className="text-gray-600">
          ようこそ、<span className="font-medium">{user.email}</span> さん
        </p>
      </main>
    </div>
  )
}
