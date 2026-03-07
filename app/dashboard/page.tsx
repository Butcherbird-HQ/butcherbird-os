'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type Client = { id: string; name: string; status: string }
type CreativeTask = { id: string; stage: string }
type Analysis = { id: string; client_id: string; status: string; created_at: string }

const STAGES = ['Brief', 'In Progress', 'Review', 'Approved', 'Live']
const stageColor: Record<string, string> = {
  Brief: 'var(--text-muted)', 'In Progress': 'var(--blue)', Review: 'var(--amber)',
  Approved: 'var(--c-clients)', Live: 'var(--green)',
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

  const activeClients = clients.filter(c => c.status === 'Active')
  const pendingAnalyses = analyses.filter(a => a.status !== 'confirmed' && a.status !== 'rejected')

  if (loading) return <div style={{ padding: '48px', color: 'var(--text-muted)', fontSize: '11px', letterSpacing: '.1em' }}>Loading...</div>

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Command Centre</div>
          <div className="page-subtitle">Butcherbird Operating System</div>
        </div>
      </div>

      <div className="page-body" style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>

        {/* Pipeline breakdown */}
        <div>
          <div style={{ fontSize: '9px', letterSpacing: '.18em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '10px' }}>Creative Pipeline</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: '8px' }}>
            {STAGES.map(stage => (
              <div key={stage} onClick={() => router.push('/dashboard/creative')}
                style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderTop: `2px solid ${stageColor[stage]}`, padding: '20px 16px', cursor: 'pointer' }}>
                <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text)', marginBottom: '6px' }}>
                  {tasks.filter(t => t.stage === stage).length}
                </div>
                <div style={{ fontSize: '9px', letterSpacing: '.12em', textTransform: 'uppercase', color: stageColor[stage] }}>{stage}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Analyses */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>

          {/* Pending confirmations */}
          <div className="card">
            <div className="card-title">Pending Confirmations</div>
            {pendingAnalyses.length === 0 ? (
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', padding: '12px 0' }}>No pending actions.</div>
            ) : (
              pendingAnalyses.slice(0, 8).map(a => {
                const client = clients.find(c => c.id === a.client_id)
                return (
                  <div key={a.id} onClick={() => router.push(`/dashboard/clients/${a.client_id}`)}
                    style={{ padding: '12px 0', borderBottom: '1px solid var(--border)', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text)' }}>{client?.name || '—'}</div>
                      <div style={{ fontSize: '9px', color: 'var(--text-muted)', marginTop: '2px' }}>
                        {new Date(a.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                      </div>
                    </div>
                    <span style={{ fontSize: '8px', letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--amber)', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', padding: '3px 10px' }}>
                      Review
                    </span>
                  </div>
                )
              })
            )}
          </div>

          {/* Recent analyses */}
          <div className="card">
            <div className="card-title">Recent Analyses</div>
            {analyses.length === 0 ? (
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', padding: '12px 0' }}>No analyses run yet.</div>
            ) : (
              analyses.slice(0, 8).map(a => {
                const client = clients.find(c => c.id === a.client_id)
                return (
                  <div key={a.id} onClick={() => router.push(`/dashboard/clients/${a.client_id}`)}
                    style={{ padding: '12px 0', borderBottom: '1px solid var(--border)', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text)' }}>{client?.name || '—'}</div>
                      <div style={{ fontSize: '9px', color: 'var(--text-muted)', marginTop: '2px' }}>
                        {new Date(a.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </div>
                    </div>
                    <span style={{ fontSize: '8px', letterSpacing: '.12em', textTransform: 'uppercase', padding: '3px 10px',
                      color: a.status === 'confirmed' ? 'var(--c-clients)' : a.status === 'rejected' ? 'var(--red)' : 'var(--amber)',
                      background: a.status === 'confirmed' ? 'rgba(45,155,111,0.1)' : a.status === 'rejected' ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)' }}>
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
