import { redirect }        from 'next/navigation'
import { auth }             from '@/auth'
import { createOrgAction }  from './actions'

export default async function OnboardingPage() {
  const session = await auth()
  if (!session?.user)     redirect('/auth/login')
  if (session.activeOrg)  redirect('/dashboard')   // already has an org

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0A0A0A] text-white">
      <div className="fixed inset-0 pointer-events-none opacity-[0.02]" style={{
        backgroundImage: 'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)',
        backgroundSize: '64px 64px'
      }} />

      <div className="relative z-10 w-full max-w-[440px] mx-4">
        <div className="flex items-center gap-2 mb-8">
          <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center font-bold text-[15px] text-black">D</div>
          <span className="text-[15px] font-semibold">Decky</span>
        </div>

        <div className="bg-white/[0.02] border border-white/[0.08] rounded-xl p-8">
          <h1 className="text-[22px] font-semibold mb-1">Create your workspace</h1>
          <p className="text-[14px] text-white/50 mb-7">
            Decky organizes decks around workspaces. Give yours a name — you can invite teammates after.
          </p>

          <form action={createOrgAction} className="space-y-5">
            <div>
              <label className="block text-[13px] font-medium text-white/60 mb-1.5">
                Workspace name
              </label>
              <input
                type="text"
                name="name"
                placeholder="Acme Consulting"
                autoFocus
                required
                minLength={2}
                maxLength={80}
                className="w-full px-3 py-2.5 bg-white/[0.05] border border-white/[0.08] rounded-md focus:outline-none focus:ring-1 focus:ring-white/20 text-[14px] placeholder:text-white/20"
              />
              <p className="mt-1.5 text-[12px] text-white/30">
                This becomes your team's URL slug and display name.
              </p>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-white text-black rounded-md hover:bg-white/90 transition text-[14px] font-medium"
            >
              Create workspace →
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
