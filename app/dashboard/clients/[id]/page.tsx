'use client'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type Client = {
  id: string; name: string; type: string; category: string;
  baseFee: number; revSharePct: number; status: string;
  drive_link: string; instagram: string; website: string;
  notes: string; ad_account_id: string;
}
type Analysis = {
  id: string; client_id: string; created_by: string; status: string;
  output: string; action_summary: string; created_at: string;
}
type CreativeTask = {
  id: string; title: string; stage: string; funnel_stage: string;
  ad_format: string; channel: string; brand: string; due_date: string;
  assigned_to: string; from_analysis_id: string;
}

const FUNNEL_COLORS: Record<string, string> = {
  TOF: 'var(--blue)', MOF: 'var(--amber)', BOF: 'var(--c-clients)',
}

export default function ClientDetailPage() {
  const { id } = useParams() as { id: string }
  const router = useRouter()
  const [client, setClient] = useState<Client | null>(null)
  const [analyses, setAnalyses] = useState<Analysis[]>([])
  const [readyToDraft, setReadyToDraft] = useState<CreativeTask[]>([])
  const [tab, setTab] = useState<'overview' | 'analyses' | 'ready' | 'reporting'>('overview')
  const [userRole, setUserRole] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) setUserRole(user.user_metadata?.role || '')

      const [{ data: c }, { data: a }, { data: r }] = await Promise.all([
        supabase.from('crm_clients').select('*').eq('id', id).single(),
        supabase.from('analyses').select('*').eq('client_id', id).order('created_at', { ascending: false }),
        supabase.from('creative_tasks').select('*').eq('client_id', id).eq('stage', 'Approved'),
      ])
      if (c) setClient(c)
      if (a) setAnalyses(a)
      if (r) setReadyToDraft(r)
      setLoading(false)
    }
    load()
  }, [id])

  const canAnalyse = userRole.toLowerCase().includes('founder') || userRole.toLowerCase().includes('paid media') || userRole.toLowerCase().includes('media')

  if (loading) return <div style={{ padding: '48px', color: 'var(--text-muted)', fontSize: '11px', letterSpacing: '.1em' }}>Loading...</div>
  if (!client) return <div style={{ padding: '48px', color: 'var(--text-muted)', fontSize: '11px' }}>Client not found.</div>

  return (
    <>
      <div className="page-header">
        <div>
          <button onClick={() => router.push('/dashboard/clients')}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontFamily: 'inherit', fontSize: '9px', letterSpacing: '.15em', textTransform: 'uppercase', cursor: 'pointer', padding: '0 0 8px', display: 'block' }}>
            ← Clients
          </button>
          <div className="page-dept-tag" style={{ background: 'rgba(45,155,111,0.12)', color: 'var(--c-clients)' }}>Client</div>
          <div className="page-title">{client.name}</div>
          <div className="page-subtitle">
            <span className={`pill pill-${client.status === 'Active' ? 'teal' : 'red'}`} style={{ marginRight: '8px' }}>{client.status}</span>
            {client.category} · ${client.baseFee.toLocaleString()}/mo
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {client.drive_link && (
            <a href={client.drive_link} target="_blank" rel="noopener noreferrer" className="btn" style={{ fontSize: '8px', letterSpacing: '.15em', textTransform: 'uppercase', color: 'var(--text-muted)', border: '1px solid var(--border)', padding: '0 16px', textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
              Drive ↗
            </a>
          )}
        </div>
      </div>

      <div className="page-body">
        <div className="tabs" style={{ '--tab-color': 'var(--c-clients)' } as React.CSSProperties}>
          {([
            { key: 'overview', label: 'Overview' },
            { key: 'analyses', label: `Analyses${analyses.length ? ` (${analyses.length})` : ''}` },
            { key: 'ready', label: `Ready to Draft${readyToDraft.length ? ` (${readyToDraft.length})` : ''}` },
            { key: 'reporting', label: 'Reporting' },
          ] as const).map(t => (
            <button key={t.key} className={`tab${tab === t.key ? ' active' : ''}`} onClick={() => setTab(t.key)}>
              {t.label}
            </button>
          ))}
        </div>

        {/* OVERVIEW */}
        {tab === 'overview' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '20px' }}>
            <div className="card">
              <div className="card-title">Client Details</div>
              {[
                { label: 'Category', val: client.category },
                { label: 'Type', val: client.type },
                { label: 'Base Fee', val: `$${client.baseFee.toLocaleString()}/mo` },
                { label: 'Rev Share', val: `${client.revSharePct}%` },
                { label: 'Meta Ad Account', val: client.ad_account_id || '—' },
                { label: 'Instagram', val: client.instagram || '—' },
                { label: 'Website', val: client.website || '—' },
              ].map(r => (
                <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ fontSize: '9px', letterSpacing: '.15em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>{r.label}</span>
                  <span style={{ fontSize: '12px', color: 'var(--text)', fontWeight: 500 }}>{r.val}</span>
                </div>
              ))}
            </div>
            <div className="card">
              <div className="card-title">Notes</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>
                {client.notes || 'No notes.'}
              </div>
            </div>
          </div>
        )}

        {/* ANALYSES */}
        {tab === 'analyses' && (
          <div style={{ marginTop: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{analyses.length} past {analyses.length === 1 ? 'analysis' : 'analyses'}</div>
              {canAnalyse ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                  <button
                    style={{ background: 'var(--c-clients)', border: 'none', color: '#fff', fontFamily: 'inherit', fontSize: '9px', letterSpacing: '.15em', textTransform: 'uppercase', padding: '10px 20px', cursor: 'not-allowed', opacity: 0.5 }}
                    disabled title="Requires Anthropic API key — coming in Phase 2">
                    Run Analysis
                  </button>
                  <span style={{ fontSize: '8px', color: 'var(--text-muted)', letterSpacing: '.05em' }}>Requires API key — Phase 2</span>
                </div>
              ) : (
                <div style={{ fontSize: '9px', color: 'var(--text-muted)', letterSpacing: '.1em' }}>Analysis requires Paid Media or Founder role</div>
              )}
            </div>

            {analyses.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">◇</div>
                <div className="empty-text">No analyses yet. Run the first one once the API key is connected.</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {analyses.map(a => (
                  <div key={a.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderLeft: `3px solid ${a.status === 'confirmed' ? 'var(--c-clients)' : a.status === 'rejected' ? 'var(--red)' : 'var(--amber)'}`, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '24px' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text)', marginBottom: '3px' }}>
                        Analysis — {new Date(a.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </div>
                      <div style={{ fontSize: '9px', color: 'var(--text-muted)' }}>
                        {new Date(a.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                    <span className="pill" style={{ background: a.status === 'confirmed' ? 'rgba(45,155,111,0.1)' : a.status === 'rejected' ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)', color: a.status === 'confirmed' ? 'var(--c-clients)' : a.status === 'rejected' ? 'var(--red)' : 'var(--amber)', textTransform: 'capitalize' }}>
                      {a.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* READY TO DRAFT */}
        {tab === 'ready' && (
          <div style={{ marginTop: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{readyToDraft.length} creative{readyToDraft.length !== 1 ? 's' : ''} approved</div>
              {readyToDraft.length > 0 && canAnalyse && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                  <button
                    style={{ background: 'var(--c-clients)', border: 'none', color: '#fff', fontFamily: 'inherit', fontSize: '9px', letterSpacing: '.15em', textTransform: 'uppercase', padding: '10px 20px', cursor: 'not-allowed', opacity: 0.5 }}
                    disabled>
                    Draft Ads to Meta
                  </button>
                  <span style={{ fontSize: '8px', color: 'var(--text-muted)', letterSpacing: '.05em' }}>Requires API key — Phase 2</span>
                </div>
              )}
            </div>

            {readyToDraft.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">◇</div>
                <div className="empty-text">No approved creatives yet. Once briefs move to Approved in the Creative Pipeline they'll appear here.</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {readyToDraft.map(t => (
                  <div key={t.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderLeft: '3px solid var(--c-clients)', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text)', marginBottom: '6px' }}>{t.title}</div>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        {t.funnel_stage && (
                          <span className="pill" style={{ background: `${FUNNEL_COLORS[t.funnel_stage]}18`, color: FUNNEL_COLORS[t.funnel_stage] }}>{t.funnel_stage}</span>
                        )}
                        {t.ad_format && (
                          <span className="pill" style={{ background: 'var(--surface3)', color: 'var(--text-muted)' }}>{t.ad_format}</span>
                        )}
                        <span className="pill" style={{ background: 'var(--surface3)', color: 'var(--text-muted)' }}>{t.channel}</span>
                      </div>
                    </div>
                    <span style={{ fontSize: '9px', color: 'var(--text-muted)', letterSpacing: '.08em' }}>Awaiting draft</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* REPORTING */}
        {tab === 'reporting' && (
          <div style={{ marginTop: '20px' }}>
            <div className="empty-state" style={{ minHeight: '300px' }}>
              <div className="empty-icon">◇</div>
              <div className="empty-text">Reporting coming in a future update.</div>
              <div style={{ fontSize: '9px', color: 'var(--text-muted)', marginTop: '8px', letterSpacing: '.08em' }}>Will pull live data from Meta once the API connection is active.</div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
