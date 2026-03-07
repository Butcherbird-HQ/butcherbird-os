'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type Client = { id: string; name: string; status: string }
type CreativeTask = { id: string; stage: string }
type Analysis = { id: string; client_id: string; status: string; created_at: string }

const STAGES = ['Brief', 'In Progress', 'Review', 'Approved', 'Queued', 'Live']

const stageColor: Record<string, string> = {
  Brief:        'var(--c-resources)',
  'In Progress':'var(--blue)',
  Review:       'var(--amber)',
  Approved:     'var(--c-clients)',
  Queued:       'var(--gold)',
  Live:         'var(--green)',
}

const statusColor = (s: string) => {
  if (s === 'confirmed') return { color: 'var(--c-clients)', bg: 'rgba(46,170,122,0.1)', border: 'rgba(46,170,122,0.22)' }
  if (s === 'rejected')  return { color: 'var(--red)',       bg: 'rgba(239,68,68,0.1)',   border: 'rgba(239,68,68,0.22)' }
  return                        { color: 'var(--amber)',     bg: 'rgba(245,158,11,0.1)',  border: 'rgba(245,158,11,0.22)' }
}

export default function CommandCentre() {
  const router = useRouter()
  const [clients, setClients] = useState<Client[]>([])
  const [tasks, setTasks] = useState<CreativeTask[]>([])
  const [analyses, setAnalyses] = useState<Analysis[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      supabase.from('crm_clients').select('id,name,status'),
      supabase.from('creative_tasks').select('id,stage'),
      supabase.from('analyses').select('id,client_id,status,created_at').order('created_at', { ascending: false }).limit(20),
    ]).then(([{ data: c }, { data: t }, { data: a }]) => {
      if (c) setClients(c)
      if (t) setTasks(t)
      if (a) setAnalyses(a)
      setLoading(false)
    })
  }, [])

  const activeClients  = clients.filter(c => c.status === 'Active')
  const pendingAnalyses = analyses.filter(a => a.status !== 'confirmed' && a.status !== 'rejected')
  const liveTasks      = tasks.filter(t => t.stage === 'Live')

  if (loading) return (
    <div style={{ padding: '48px', color: 'var(--text-muted)', fontSize: '10px', letterSpacing: '.18em', textTransform: 'uppercase' }}>
      Loading...
    </div>
  )

  return (
    <>
      {/* Page header */}
      <div className="page-header">
        <div>
          <div className="page-dept-tag">Butcherbird OS</div>
          <div className="page-title">Command Centre</div>
          <div className="page-subtitle">Overview — all departments</div>
        </div>
      </div>

      <div className="page-body" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>

        {/* ── Key stats ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '10px' }}>

          <div className="stat-card" style={{ '--stat-color': 'var(--c-clients)' } as React.CSSProperties}>
            <div className="stat-card-val">{activeClients.length}</div>
            <div className="stat-card-label">Active Clients</div>
            <div className="stat-card-sub" onClick={() => router.push('/dashboard/clients')}
              style={{ cursor: 'pointer', fontSize: '9px', letterSpacing: '.12em' }}>
              View all →
            </div>
          </div>

          <div className="stat-card" style={{ '--stat-color': 'var(--c-creative)' } as React.CSSProperties}>
            <div className="stat-card-val">{tasks.length}</div>
            <div className="stat-card-label">Pipeline Tasks</div>
            <div className="stat-card-sub" onClick={() => router.push('/dashboard/creative')}
              style={{ cursor: 'pointer', fontSize: '9px', letterSpacing: '.12em' }}>
              {liveTasks.length} live →
            </div>
          </div>

          <div className="stat-card" style={{ '--stat-color': 'var(--amber)' } as React.CSSProperties}>
            <div className="stat-card-val">{pendingAnalyses.length}</div>
            <div className="stat-card-label">Pending Review</div>
            <div className="stat-card-sub" style={{ fontSize: '9px', letterSpacing: '.12em' }}>
              {pendingAnalyses.length > 0 ? 'Action required' : 'All clear'}
            </div>
          </div>

          <div className="stat-card" style={{ '--stat-color': 'var(--gold)' } as React.CSSProperties}>
            <div className="stat-card-val">{analyses.length}</div>
            <div className="stat-card-label">Analyses Run</div>
            <div className="stat-card-sub" style={{ fontSize: '9px', letterSpacing: '.12em' }}>
              {clients.length} clients total
            </div>
          </div>

        </div>

        {/* ── Pipeline breakdown ── */}
        <div>
          <div className="section-heading">Creative Pipeline</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: '8px' }}>
            {STAGES.map(stage => {
              const count = tasks.filter(t => t.stage === stage).length
              return (
                <div
                  key={stage}
                  onClick={() => router.push('/dashboard/creative')}
                  style={{
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderTop: `3px solid ${stageColor[stage]}`,
                    padding: '20px 18px 18px',
                    cursor: 'pointer',
                    transition: 'border-color .15s, box-shadow .15s',
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                  onMouseEnter={e => {
                    ;(e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-lg)'
                    ;(e.currentTarget as HTMLElement).style.borderColor = 'var(--border-strong)'
                  }}
                  onMouseLeave={e => {
                    ;(e.currentTarget as HTMLElement).style.boxShadow = ''
                    ;(e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'
                  }}
                >
                  <div style={{
                    fontFamily: "'Bebas Neue', 'Futura', sans-serif",
                    fontSize: '44px', fontWeight: 400, lineHeight: 1,
                    color: count > 0 ? 'var(--text)' : 'var(--text-muted)',
                    marginBottom: '8px',
                  }}>
                    {count}
                  </div>
                  <div style={{
                    fontSize: '8px', letterSpacing: '.18em', textTransform: 'uppercase',
                    color: stageColor[stage], fontWeight: 700,
                  }}>
                    {stage}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* ── Pending + Recent ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>

          {/* Pending confirmations */}
          <div className="card">
            <div className="card-header">
              <div className="card-title" style={{ marginBottom: 0 }}>Pending Confirmations</div>
              {pendingAnalyses.length > 0 && (
                <span style={{
                  fontFamily: "'Bebas Neue', sans-serif", fontSize: '22px',
                  color: 'var(--amber)', lineHeight: 1,
                }}>
                  {pendingAnalyses.length}
                </span>
              )}
            </div>

            {pendingAnalyses.length === 0 ? (
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', padding: '20px 0', letterSpacing: '.06em' }}>
                No pending actions.
              </div>
            ) : (
              pendingAnalyses.slice(0, 8).map(a => {
                const client = clients.find(c => c.id === a.client_id)
                return (
                  <div
                    key={a.id}
                    onClick={() => router.push(`/dashboard/clients/${a.client_id}`)}
                    style={{
                      padding: '13px 0', borderBottom: '1px solid var(--border)',
                      cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      transition: 'opacity .15s',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text)', letterSpacing: '.02em' }}>
                        {client?.name || '—'}
                      </div>
                      <div style={{ fontSize: '9px', color: 'var(--text-muted)', marginTop: '2px', letterSpacing: '.06em' }}>
                        {new Date(a.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                      </div>
                    </div>
                    <span style={{
                      fontSize: '7px', letterSpacing: '.16em', textTransform: 'uppercase',
                      fontWeight: 700, padding: '3px 10px',
                      color: 'var(--amber)', background: 'rgba(245,158,11,0.1)',
                      border: '1px solid rgba(245,158,11,0.22)',
                    }}>
                      Review
                    </span>
                  </div>
                )
              })
            )}
          </div>

          {/* Recent analyses */}
          <div className="card">
            <div className="card-header">
              <div className="card-title" style={{ marginBottom: 0 }}>Recent Analyses</div>
              {analyses.length > 0 && (
                <span style={{
                  fontFamily: "'Bebas Neue', sans-serif", fontSize: '22px',
                  color: 'var(--gold)', lineHeight: 1,
                }}>
                  {analyses.length}
                </span>
              )}
            </div>

            {analyses.length === 0 ? (
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', padding: '20px 0', letterSpacing: '.06em' }}>
                No analyses run yet.
              </div>
            ) : (
              analyses.slice(0, 8).map(a => {
                const client = clients.find(c => c.id === a.client_id)
                const s = statusColor(a.status)
                return (
                  <div
                    key={a.id}
                    onClick={() => router.push(`/dashboard/clients/${a.client_id}`)}
                    style={{
                      padding: '13px 0', borderBottom: '1px solid var(--border)',
                      cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text)', letterSpacing: '.02em' }}>
                        {client?.name || '—'}
                      </div>
                      <div style={{ fontSize: '9px', color: 'var(--text-muted)', marginTop: '2px', letterSpacing: '.06em' }}>
                        {new Date(a.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </div>
                    </div>
                    <span style={{
                      fontSize: '7px', letterSpacing: '.16em', textTransform: 'uppercase',
                      fontWeight: 700, padding: '3px 10px',
                      color: s.color, background: s.bg, border: `1px solid ${s.border}`,
                    }}>
                      {a.status}
                    </span>
                  </div>
                )
              })
            )}
          </div>

        </div>
      </div>
    </>
  )
}
