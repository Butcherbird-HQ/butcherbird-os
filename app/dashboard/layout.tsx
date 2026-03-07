'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type NavLink = { href: string; exact: boolean; label: string; color: string; icon: React.ReactNode }
type NavSection = { section: string; links: NavLink[] }

const nav: NavSection[] = [
  {
    section: 'Workspace',
    links: [
      {
        href: '/dashboard', exact: true, label: 'Executive', color: 'var(--c-executive)',
        icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
      },
      {
        href: '/dashboard/creative', exact: false, label: 'Creative Pipeline', color: 'var(--c-creative)',
        icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,
      },
    ],
  },
  {
    section: 'Knowledge',
    links: [
      {
        href: '/dashboard/resources', exact: false, label: 'Resources', color: 'var(--c-resources)',
        icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>,
      },
    ],
  },
  {
    section: 'Admin',
    links: [
      {
        href: '/dashboard/crm', exact: false, label: 'CRM', color: 'var(--c-crm)',
        icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
      },
      {
        href: '/dashboard/staff', exact: false, label: 'Staff', color: 'var(--c-staff)',
        icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
      },
    ],
  },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [date, setDate] = useState('')
  const [userName, setUserName] = useState('Loading...')
  const [userRole, setUserRole] = useState('')
  const [theme, setTheme] = useState('dark')

  useEffect(() => {
    setDate(new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }))
    const saved = localStorage.getItem('bbg-theme') || 'dark'
    setTheme(saved)

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push('/login'); return }
      const name = user.user_metadata?.name || user.email?.split('@')[0] || 'User'
      const role = user.user_metadata?.role || 'team'
      setUserName(name)
      setUserRole(role)
    })
  }, [router])

  function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    localStorage.setItem('bbg-theme', next)
    document.documentElement.setAttribute('data-theme', next)
  }

  async function logout() {
    await fetch('/api/logout', { method: 'POST' })
    router.push('/login')
  }

  const initials = userName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-gold-bar" />
          <div>
            <div className="sidebar-wordmark">Butcherbird</div>
            <div className="sidebar-sub">Operating System</div>
          </div>
        </div>

        <div className="sidebar-user">
          <div className="sidebar-avatar">{initials || '??'}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="sidebar-user-name">{userName}</div>
            <div className="sidebar-user-role">{userRole}</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          {nav.map(section => (
            <div key={section.section}>
              <div className="sidebar-section-label">{section.section}</div>
              {section.links.map(link => {
                const active = link.exact ? pathname === link.href : pathname.startsWith(link.href)
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`sidebar-link${active ? ' active' : ''}`}
                    style={active ? { '--active-color': link.color } as React.CSSProperties : {}}
                  >
                    {link.icon}
                    {link.label}
                  </Link>
                )
              })}
            </div>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="sidebar-date">{date}</div>
          <button className="theme-toggle" onClick={toggleTheme}>
            {theme === 'dark' ? (
              <><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>Light Mode</>
            ) : (
              <><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>Dark Mode</>
            )}
          </button>
          <button className="logout-btn" onClick={logout}>Sign Out</button>
        </div>
      </aside>

      <main className="main-content">{children}</main>
    </div>
  )
}
