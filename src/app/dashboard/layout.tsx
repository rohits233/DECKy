import { redirect }       from 'next/navigation'
import { auth }            from '@/auth'
import Link                from 'next/link'
import { OrgSwitcher }     from '@/components/OrgSwitcher'
import { SignOutButton }   from '@/components/SignOutButton'

// Nav items — visibility is controlled by role + plan in the component
const NAV = [
  { href: '/dashboard',              label: 'Decks',    always: true },
  { href: '/dashboard/members',      label: 'Members',  adminOnly: true },
  { href: '/dashboard/api-keys',     label: 'API Keys', adminOnly: true },
  { href: '/dashboard/settings',     label: 'Settings', adminOnly: true },
  { href: '/dashboard/billing',      label: 'Billing',  adminOnly: true },
]

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user)    redirect('/auth/login')
  if (!session.activeOrg) redirect('/onboarding')

  const role      = session.activeOrg.role
  const isAdmin   = role === 'OWNER' || role === 'ADMIN'
  const planTier  = session.activeOrg.planTier

  const visibleNav = NAV.filter(n => n.always || (n.adminOnly && isAdmin))

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white flex flex-col">
      {/* Top nav */}
      <header className="border-b border-white/[0.08] bg-[#0A0A0A] sticky top-0 z-40">
        <div className="max-w-[1200px] mx-auto px-6 h-14 flex items-center justify-between gap-6">

          {/* Left: logo + org switcher */}
          <div className="flex items-center gap-4 min-w-0">
            <Link href="/dashboard" className="flex items-center gap-2 shrink-0">
              <div className="w-7 h-7 bg-white rounded-md flex items-center justify-center font-bold text-[13px] text-black">D</div>
              <span className="text-[14px] font-semibold">Decky</span>
            </Link>
            <span className="text-white/20 text-lg">/</span>
            <OrgSwitcher />
          </div>

          {/* Center: nav links */}
          <nav className="hidden md:flex items-center gap-1">
            {visibleNav.map(n => (
              <Link
                key={n.href}
                href={n.href}
                className="px-3 py-1.5 rounded-md text-[13px] text-white/60 hover:text-white hover:bg-white/[0.06] transition"
              >
                {n.label}
              </Link>
            ))}
          </nav>

          {/* Right: plan badge + sign out */}
          <div className="flex items-center gap-3 shrink-0">
            <span className={`hidden sm:inline text-[11px] font-semibold px-2 py-0.5 rounded-full ${
              planTier === 'FREE'       ? 'bg-white/[0.06] text-white/40' :
              planTier === 'STARTER'    ? 'bg-blue-500/20 text-blue-400' :
              planTier === 'GROWTH'     ? 'bg-violet-500/20 text-violet-400' :
                                          'bg-amber-500/20 text-amber-400'
            }`}>
              {planTier}
            </span>
            <SignOutButton />
          </div>
        </div>
      </header>

      {/* Page content */}
      <main className="flex-1 max-w-[1200px] w-full mx-auto px-6 py-8">
        {children}
      </main>
    </div>
  )
}
