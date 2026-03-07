'use client'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type Client = {
  id: string; name: string; type: string; category: string;
  status: string; drive_link: string; instagram: string;
  website: string; notes: string; ad_account_id: string;
  client_context: string;
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
type MetaAction = {
  id: string; analysis_id: string; type: string; title: string;
  reasoning: string; payload: Record<string, string | number | boolean | null>; status: string;
  confirmed_by: string; confirmed_at: string; meta_executed: boolean; created_at: string;
}

const FUNNEL_COLORS: Record<string, string> = {
  TOF: 'var(--blue)', MOF: 'var(--amber)', BOF: 'var(--c-clients)',
}
const ACTION_TYPE_LABEL: Record<string, string> = {
  budget_change: 'Budget Change', cut_ad: 'Cut Ad', restructure: 'Restructure',
}
const ACTION_TYPE_COLOR: Record<string, string> = {
  budget_change: 'var(--gold)', cut_ad: 'var(--red)', restructure: 'var(--blue)',
}

export default function ClientDetailPage() {
  const { id } = useParams() as { id: string }
  const router = useRouter()
  const [client, setClient] = useState<Client | null>(null)
  const [analyses, setAnalyses] = useState<Analysis[]>([])
  const [readyToDraft, setReadyToDraft] = useState<CreativeTask[]>([])
  const [metaActions, setMetaActions] = useState<MetaAction[]>([])
  const [tab, setTab] = useState<'overview' | 'analyses' | 'ready' | 'meta' | 'reporting'>('overview')
  const [userRole, setUserRole] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) setUserRole(user.user_metadata?.role || '')

      const [{ data: c }, { data: a }, { data: r }] = await Promise.all([
        supabase.from('crm_clients').select('*').eq('id', id).single(),
        supabase.from('analyses').select('id,client_id,created_by,status,action_summary,created_at').eq('client_id', id).order('created_at', { ascending: false }),
        supabase.from('creative_tasks').select('*').eq('client_id', id).eq('stage', 'Queued'),
      ])
      if (c) setClient(c)
      if (a) setAnalyses(a)
      if (r) setReadyToDraft(r)

      // analysis_actions table exists in Phase 2 — handle gracefully if not yet created
      const { data: ma } = await supabase
        .from('analysis_actions')
        .select('*')
        .eq('client_id', id)
        .neq('type', 'brief')
        .order('created_at', { ascending: false })
      if (ma) setMetaActions(ma)

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
            {client.category}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {client.drive_link && (
            <a href={client.drive_link} target="_blank" rel="noopener noreferrer" className="btn"
              style={{ fontSize: '8px', letterSpacing: '.15em', textTransform: 'uppercase', color: 'var(--text-muted)', border: '1px solid var(--border)', padding: '0 16px', textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
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
            { key: 'meta', label: `Meta Actions${metaActions.length ? ` (${metaActions.length})` : ''}` },
            { key: 'reporting', label: 'Reporting' },
          ] as const).map(t => (
            <button key={t.key} className={`tab${tab === t.key ? ' active' : ''}`} onClick={() => setTab(t.key)}>
              {t.label}
            </button>
          ))}
        </div>

        {/* OVERVIEW */}
        {tab === 'overview' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '20px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="card">
                <div className="card-title">Client Details</div>
                {[
                  { label: 'Category', val: client.category },
                  { label: 'Type', val: client.type },
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
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div className="card-title" style={{ marginBottom: 0 }}>Client Context</div>
                {client.client_context
                  ? <span style={{ fontSize: '8px', letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--c-resources)', background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.2)', padding: '3px 10px' }}>
                      {client.client_context.trim().split(/\s+/).filter(Boolean).length.toLocaleString()} words loaded
                    </span>
                  : <span style={{ fontSize: '8px', letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--text-muted)', background: 'var(--surface2)', border: '1px solid var(--border)', padding: '3px 10px' }}>Not loaded</span>
                }
              </div>
              {client.client_context
                ? <div style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.8, whiteSpace: 'pre-wrap', fontFamily: 'monospace', maxHeight: '300px', overflowY: 'auto', background: 'var(--surface2)', border: '1px solid var(--border)', padding: '16px' }}>
                    {client.client_context}
                  </div>
                : <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                    No context document uploaded. Edit this client to upload or paste one — it will be injected into every AI analysis run as Layer 4.
                  </div>
              }
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
                <div className="empty-text">No analyses yet.</div>
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
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{readyToDraft.length} creative{readyToDraft.length !== 1 ? 's' : ''} queued for launch</div>
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
                <div className="empty-text">No creatives queued yet. Move briefs to Queued in the Creative Pipeline once they're done and approved.</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {readyToDraft.map(t => (
                  <div key={t.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderLeft: '3px solid var(--gold)', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '20px' }}>
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
                    <span style={{ fontSize: '9px', color: 'var(--gold)', letterSpacing: '.08em' }}>Queued for launch</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* META ACTIONS */}
        {tab === 'meta' && (
          <div style={{ marginTop: '20px' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '16px' }}>
              {metaActions.length > 0
                ? `${metaActions.length} Meta action${metaActions.length !== 1 ? 's' : ''} recorded`
                : 'Meta actions taken on this account will appear here once Phase 2 is active.'}
            </div>
            {metaActions.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">◇</div>
                <div className="empty-text">No Meta actions yet.</div>
                <div style={{ fontSize: '9px', color: 'var(--text-muted)', marginTop: '8px', letterSpacing: '.06em', maxWidth: '380px', lineHeight: 1.7, textAlign: 'center' }}>
                  Budget changes, ad cuts, and campaign restructures confirmed through the OS will be logged here with their status, execution result, and who confirmed them.
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {metaActions.map(a => {
                  const p = a.payload
                  const color = ACTION_TYPE_COLOR[a.type] || 'var(--text-muted)'
                  return (
                    <div key={a.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderLeft: `3px solid ${color}`, padding: '16px 20px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', marginBottom: '8px' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                            <span style={{ fontSize: '7px', letterSpacing: '.14em', textTransform: 'uppercase', color, background: `${color}18`, padding: '2px 8px' }}>
                              {ACTION_TYPE_LABEL[a.type] || a.type}
                            </span>
                            <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text)' }}>{a.title}</span>
                          </div>
                          {a.reasoning && (
                            <div style={{ fontSize: '10px', color: 'var(--text-muted)', lineHeight: 1.6 }}>{a.reasoning}</div>
                          )}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px', flexShrink: 0 }}>
                          <span className="pill" style={{
                            background: a.status === 'confirmed' || a.meta_executed ? 'rgba(45,155,111,0.1)' : a.status === 'rejected' || a.status === 'void' ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)',
                            color: a.status === 'confirmed' || a.meta_executed ? 'var(--c-clients)' : a.status === 'rejected' || a.status === 'void' ? 'var(--red)' : 'var(--amber)',
                            textTransform: 'capitalize',
                          }}>
                            {a.meta_executed ? 'Executed' : a.status}
                          </span>
                          {a.confirmed_at && (
                            <span style={{ fontSize: '8px', color: 'var(--text-muted)' }}>
                              {new Date(a.confirmed_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </span>
                          )}
                        </div>
                      </div>
                      {/* Payload detail */}
                      {a.type === 'budget_change' && p.current_budget !== undefined && (
                        <div style={{ fontSize: '10px', color: 'var(--text-muted)', background: 'var(--surface2)', padding: '8px 12px', marginTop: '8px' }}>
                          ${String(p.current_budget)}/day → ${String(p.proposed_budget)}/day
                          {p.currency ? ` (${String(p.currency)})` : ''}
                        </div>
                      )}
                      {a.type === 'cut_ad' && p.ad_name && (
                        <div style={{ fontSize: '10px', color: 'var(--text-muted)', background: 'var(--surface2)', padding: '8px 12px', marginTop: '8px' }}>
                          {String(p.ad_name)}{p.current_roas ? ` · ${String(p.current_roas)}× ROAS` : ''}{p.current_spend ? ` · $${String(p.current_spend)} spent` : ''}
                        </div>
                      )}
                      {a.confirmed_by && (
                        <div style={{ fontSize: '8px', color: 'var(--text-muted)', marginTop: '6px' }}>Confirmed by {a.confirmed_by}</div>
                      )}
                    </div>
                  )
                })}
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
