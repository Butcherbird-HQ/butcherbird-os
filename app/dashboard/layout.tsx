'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

const nav = [
  {
    section: 'Command',
    links: [
      {
        href: '/dashboard', exact: true, label: 'Dashboard',
        icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>,
      },
      {
        href: '/dashboard/crm', exact: false, label: 'CRM',
        icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
      },
      {
        href: '/dashboard/outreach', exact: false, label: 'Outreach',
        icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>,
      },
    ],
  },
  {
    section: 'Operations',
    links: [
      {
        href: '/dashboard/staff', exact: false, label: 'Staff',
        icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
      },
      {
        href: '/dashboard/docs', exact: false, label: 'Docs',
        icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>,
      },
    ],
  },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [date, setDate] = useState('')

  useEffect(() => {
    setDate(new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }))
  }, [])

  async function logout() {
    await fetch('/api/logout', { method: 'POST' })
    router.push('/login')
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="sidebar-logo-mark">Butcherbird</div>
          <div className="sidebar-logo-sub">Operating System</div>
        </div>
        <nav className="sidebar-nav">
          {nav.map(section => (
            <div key={section.section}>
              <div className="sidebar-section-label">{section.section}</div>
              {section.links.map(link => {
                const active = link.exact ? pathname === link.href : pathname.startsWith(link.href)
                return (
                  <Link key={link.href} href={link.href} className={`sidebar-link${active ? ' active' : ''}`}>
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
          <button className="logout-btn" onClick={logout}>Sign Out</button>
        </div>
      </aside>
      <main className="main-content">{children}</main>
    </div>
  )
}
