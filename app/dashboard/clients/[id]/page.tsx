'use client'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type Client = {
  id: string; name: string; type: string; category: string;
  status: string; drive_link: string; instagram: string;
  website: string; notes: string; ad_account_id: string;
  client_context: string;
  profit_margin_pct: number; breakeven_roas: number; roas_target: number; monthly_budget_cap_zar: number;
}
type AccountMetrics = {
  spend_30d: number; revenue_30d: number; roas_30d: number; aov_30d: number; cpp_30d: number;
  spend_7d: number; revenue_7d: number; roas_7d: number; aov_7d: number; cpp_7d: number;
  active_ads: number; total_ads: number;
}
type AdSummary = {
  ad_id: string; ad_name: string; adset_id: string; adset_name: string; status: string;
  spend_30d: number; revenue_30d: number; roas_30d: number; aov_30d: number; cpp_30d: number;
  spend_7d: number; revenue_7d: number; roas_7d: number; aov_7d: number; cpp_7d: number;
  impressions_30d: number; clicks_30d: number; ctr_30d: number;
}
type CampaignGroup = {
  campaign_id: string; campaign_name: string; budget_zar: number; objective: string;
  ads: AdSummary[];
  totals: {
    spend_30d: number; revenue_30d: number; roas_30d: number; aov_30d: number; cpp_30d: number;
    spend_7d: number; revenue_7d: number; roas_7d: number; aov_7d: number; cpp_7d: number;
  }
}
type Analysis = {
  id: string; client_id: string; created_by: string; status: string;
  output?: string; action_summary: string; created_at: string;
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
type AnalysisCard = Record<string, unknown>

const FUNNEL_COLORS: Record<string, string> = {
  TOF: 'var(--blue)', MOF: 'var(--amber)', BOF: 'var(--c-clients)',
}
const ACTION_TYPE_LABEL: Record<string, string> = {
  budget_change: 'Budget Change', cut_ad: 'Cut Ad', restructure: 'Restructure',
}
const ACTION_TYPE_COLOR: Record<string, string> = {
  budget_change: 'var(--gold)', cut_ad: 'var(--red)', restructure: 'var(--blue)',
}
const CARD_TYPE_COLOR: Record<string, string> = {
  cut_ad: 'var(--red)',
  change_budget: 'var(--gold)',
  create_brief: 'var(--blue)',
  restructure: 'var(--c-resources)',
  alert: 'var(--amber)',
}
const CARD_TYPE_LABEL: Record<string, string> = {
  cut_ad: 'Cut Ad',
  change_budget: 'Budget Change',
  create_brief: 'Brief',
  restructure: 'Restructure',
  alert: 'Alert',
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
  const [userEmail, setUserEmail] = useState('')
  const [loading, setLoading] = useState(true)
  const [analysing, setAnalysing] = useState(false)
  const [analysisError, setAnalysisError] = useState<string | null>(null)
  const [latestCards, setLatestCards] = useState<AnalysisCard[]>([])
  const [cardStatuses, setCardStatuses] = useState<Record<number, string>>({})
  const [latestMetrics, setLatestMetrics] = useState<AccountMetrics | null>(null)
  const [latestNarrative, setLatestNarrative] = useState('')
  const [editingBriefIdx, setEditingBriefIdx] = useState<number | null>(null)
  const [briefEdits, setBriefEdits] = useState<Record<number, Record<string, string>>>({})
  const [campaignGroups, setCampaignGroups] = useState<CampaignGroup[]>([])

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUserRole(user.user_metadata?.role || '')
        setUserEmail(user.email || '')
      }

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

  async function runAnalysis() {
    if (!client) return
    setAnalysing(true)
    setAnalysisError(null)
    setLatestCards([])
    setCardStatuses({})
    setLatestMetrics(null)
    setLatestNarrative('')
    setEditingBriefIdx(null)
    setBriefEdits({})
    setCampaignGroups([])
    try {
      const edgeFnUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/run-analysis`
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        setAnalysisError('Session expired — please refresh the page and log in again.')
        return
      }
      const res = await fetch(edgeFnUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ client_id: client.id, user_email: userEmail })
      })
      if (!res.ok) {
        const errText = await res.text()
        setAnalysisError(`Edge function error ${res.status}: ${errText.slice(0, 300)}`)
        return
      }
      const data = await res.json()
      if (data.cards) {
        setLatestCards(data.cards)
        if (data.metrics) setLatestMetrics(data.metrics)
        if (data.narrative) setLatestNarrative(data.narrative)
        if (data.campaign_groups) setCampaignGroups(data.campaign_groups)
        const { data: a } = await supabase
          .from('analyses')
          .select('id,client_id,created_by,status,action_summary,created_at')
          .eq('client_id', id)
          .order('created_at', { ascending: false })
        if (a) setAnalyses(a)
      } else if (data.error) {
        setAnalysisError(`${data.error}${data.detail ? ': ' + data.detail : ''}`)
      }
    } catch (err) {
      setAnalysisError(String(err))
    } finally {
      setAnalysing(false)
    }
  }

  async function confirmCard(card: AnalysisCard, cardIndex: number) {
    if (!client) return
    setCardStatuses(prev => ({ ...prev, [cardIndex]: 'confirming' }))

    if (card.type === 'create_brief') {
      const edits = briefEdits[cardIndex] || {}
      await supabase.from('creative_tasks').insert({
        client_id: client.id,
        title: edits.angle || card.angle as string,
        stage: 'Brief',
        funnel_stage: '',
        ad_format: card.format as string,
        channel: 'Meta',
        brand: client.name,
        assigned_to: userEmail,
        from_analysis_id: null,
      })
    } else {
      const { data: action } = await supabase
        .from('analysis_actions')
        .select('id')
        .eq('client_id', client.id)
        .eq('type', card.type as string)
        .eq('title', (card.ad_name || card.target_name || card.angle || card.type) as string)
        .eq('status', 'proposed')
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (action) {
        await supabase
          .from('analysis_actions')
          .update({ status: 'confirmed', confirmed_by: userEmail, confirmed_at: new Date().toISOString() })
          .eq('id', action.id)
      }
    }

    setCardStatuses(prev => ({ ...prev, [cardIndex]: 'confirmed' }))
  }

  async function rejectCard(card: AnalysisCard, cardIndex: number) {
    if (!client) return
    setCardStatuses(prev => ({ ...prev, [cardIndex]: 'rejecting' }))

    const { data: action } = await supabase
      .from('analysis_actions')
      .select('id')
      .eq('client_id', client.id)
      .eq('type', card.type as string)
      .eq('title', (card.ad_name || card.target_name || card.angle || card.type) as string)
      .eq('status', 'proposed')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (action) {
      await supabase
        .from('analysis_actions')
        .update({ status: 'rejected' })
        .eq('id', action.id)
    }

    setCardStatuses(prev => ({ ...prev, [cardIndex]: 'rejected' }))
  }

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
        {tab === 'analyses' && (() => {
          const fmtR = (n: number) => `R${Math.round(n).toLocaleString('en-ZA')}`
          const fmtRoas = (n: number) => n === 0 ? '—' : `${n.toFixed(1)}×`
          const roasColor = (roas: number, bep: number) =>
            roas === 0 ? 'var(--text-muted)' : roas >= bep ? 'var(--green)' : 'var(--red)'
          const bep = client?.breakeven_roas || 2.22

          // Group action cards by campaign_id
          const cardsByCampaign: Record<string, { card: AnalysisCard; idx: number }[]> = {}
          const accountWideCards: { card: AnalysisCard; idx: number }[] = []
          latestCards.forEach((card, i) => {
            if (card.type === 'campaign_overview') return
            const cid = card.campaign_id as string | undefined
            if (cid) {
              if (!cardsByCampaign[cid]) cardsByCampaign[cid] = []
              cardsByCampaign[cid].push({ card, idx: i })
            } else {
              accountWideCards.push({ card, idx: i })
            }
          })

          // Ad IDs flagged for cutting
          const adsFlaggedForCut = new Set(
            latestCards.filter(c => c.type === 'cut_ad').map(c => c.ad_id as string)
          )

          const renderCard = (card: AnalysisCard, i: number) => {
            const status = cardStatuses[i]
            const isDone = status === 'confirmed' || status === 'rejected'
            const color = CARD_TYPE_COLOR[card.type as string] || 'var(--text-muted)'
            const label = CARD_TYPE_LABEL[card.type as string] || String(card.type)
            const isEditing = editingBriefIdx === i
            const edits = briefEdits[i] || {}

            return (
              <div key={i} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderLeft: `4px solid ${color}`, padding: '28px 32px', opacity: isDone ? 0.45 : 1, transition: 'opacity .2s' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
                  <div>
                    <span style={{ fontSize: '7px', letterSpacing: '.16em', textTransform: 'uppercase', color, background: `${color}18`, padding: '3px 10px', display: 'inline-block' }}>{label}</span>
                    {card.type === 'cut_ad' && <div style={{ fontFamily: "'Bebas Neue', 'Futura', sans-serif", fontSize: '20px', letterSpacing: '.05em', color: 'var(--text)', marginTop: '10px' }}>{String(card.ad_name)}</div>}
                    {card.type === 'change_budget' && <div style={{ fontFamily: "'Bebas Neue', 'Futura', sans-serif", fontSize: '20px', letterSpacing: '.05em', color: 'var(--text)', marginTop: '10px' }}>{String(card.target_name)}</div>}
                    {card.type === 'alert' && <div style={{ fontFamily: "'Bebas Neue', 'Futura', sans-serif", fontSize: '20px', letterSpacing: '.05em', color: 'var(--text)', marginTop: '10px' }}>{String(card.metric)}</div>}
                    {card.type === 'create_brief' && (
                      <div style={{ display: 'flex', gap: '6px', marginTop: '10px' }}>
                        <span className="pill pill-blue">{String(card.format).replace(/_/g, ' ')}</span>
                        <span className="pill" style={{ background: card.priority === 'high' ? 'rgba(239,68,68,0.1)' : card.priority === 'medium' ? 'rgba(74,152,232,0.1)' : 'var(--surface3)', color: card.priority === 'high' ? 'var(--red)' : card.priority === 'medium' ? 'var(--blue)' : 'var(--text-muted)' }}>{String(card.priority)}</span>
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexShrink: 0, alignItems: 'center' }}>
                    {isDone ? (
                      <span className="pill" style={{ background: status === 'confirmed' ? 'rgba(45,155,111,0.1)' : 'rgba(239,68,68,0.1)', color: status === 'confirmed' ? 'var(--c-clients)' : 'var(--red)', textTransform: 'capitalize' }}>{status}</span>
                    ) : card.type === 'alert' ? (
                      <span style={{ fontSize: '8px', color: 'var(--text-muted)', letterSpacing: '.1em' }}>Watching</span>
                    ) : (
                      <>
                        {card.type === 'create_brief' && !isEditing && (
                          <button onClick={() => { setEditingBriefIdx(i); setBriefEdits(prev => ({ ...prev, [i]: { hook: card.hook as string, angle: card.angle as string, offer: card.offer as string, rationale: card.rationale as string } })) }}
                            style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--text-muted)', fontFamily: 'inherit', fontSize: '8px', letterSpacing: '.12em', textTransform: 'uppercase', padding: '7px 14px', cursor: 'pointer' }}>
                            Edit
                          </button>
                        )}
                        {card.type === 'create_brief' && isEditing && (
                          <button onClick={() => setEditingBriefIdx(null)}
                            style={{ background: 'none', border: `1px solid var(--blue)`, color: 'var(--blue)', fontFamily: 'inherit', fontSize: '8px', letterSpacing: '.12em', textTransform: 'uppercase', padding: '7px 14px', cursor: 'pointer' }}>
                            Done
                          </button>
                        )}
                        <button onClick={() => confirmCard(card, i)} disabled={status === 'confirming' || status === 'rejecting'}
                          style={{ background: 'var(--c-clients)', border: 'none', color: '#fff', fontFamily: 'inherit', fontSize: '8px', letterSpacing: '.12em', textTransform: 'uppercase', padding: '7px 18px', cursor: 'pointer', opacity: (status === 'confirming' || status === 'rejecting') ? 0.6 : 1 }}>
                          {status === 'confirming' ? '...' : 'Confirm'}
                        </button>
                        <button onClick={() => rejectCard(card, i)} disabled={status === 'confirming' || status === 'rejecting'}
                          style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--text-muted)', fontFamily: 'inherit', fontSize: '8px', letterSpacing: '.12em', textTransform: 'uppercase', padding: '7px 14px', cursor: 'pointer', opacity: (status === 'confirming' || status === 'rejecting') ? 0.6 : 1 }}>
                          {status === 'rejecting' ? '...' : 'Reject'}
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {card.type === 'cut_ad' && (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '22px' }}>
                      {[
                        { val: fmtRoas(card.roas_7day as number), label: '7-Day ROAS', sub: `vs ${card.roas_breakeven}× breakeven`, color: roasColor(card.roas_7day as number, card.roas_breakeven as number) },
                        { val: fmtR(card.spend_7day as number), label: '7-Day Spend', sub: null, color: 'var(--text)' },
                        { val: String(card.days_running), label: 'Days Running', sub: null, color: 'var(--text)' },
                        { val: `${card.days_below_breakeven}/7`, label: 'Below Breakeven', sub: `${String(card.trend_3day)} trend`, color: 'var(--red)' },
                      ].map(m => (
                        <div key={m.label}>
                          <div style={{ fontFamily: "'Bebas Neue', 'Futura', sans-serif", fontSize: '52px', lineHeight: .88, color: m.color, letterSpacing: '.01em' }}>{m.val}</div>
                          <div style={{ fontSize: '7px', letterSpacing: '.2em', textTransform: 'uppercase', color: 'var(--text-muted)', marginTop: '8px' }}>{m.label}</div>
                          {m.sub && <div style={{ fontSize: '9px', color: 'var(--text-light)', marginTop: '3px' }}>{m.sub}</div>}
                        </div>
                      ))}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.85, borderTop: '1px solid var(--border)', paddingTop: '18px' }}>{String(card.reason)}</div>
                  </>
                )}

                {card.type === 'change_budget' && (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '22px' }}>
                      {[
                        { val: `R${card.current_budget_zar}`, label: 'Current Budget / Day', sub: null, color: 'var(--text)' },
                        { val: `R${card.new_budget_zar}`, label: 'New Budget / Day', sub: String(card.direction), color: card.direction === 'increase' ? 'var(--green)' : 'var(--red)' },
                        { val: fmtRoas(card.roas_7day as number), label: '7-Day ROAS', sub: `vs ${card.roas_breakeven}× bep`, color: roasColor(card.roas_7day as number, card.roas_breakeven as number) },
                        { val: fmtR(card.projected_monthly_spend as number), label: 'Projected Monthly', sub: null, color: 'var(--text-muted)' },
                      ].map(m => (
                        <div key={m.label}>
                          <div style={{ fontFamily: "'Bebas Neue', 'Futura', sans-serif", fontSize: '52px', lineHeight: .88, color: m.color, letterSpacing: '.01em' }}>{String(m.val)}</div>
                          <div style={{ fontSize: '7px', letterSpacing: '.2em', textTransform: 'uppercase', color: 'var(--text-muted)', marginTop: '8px' }}>{m.label}</div>
                          {m.sub && <div style={{ fontSize: '9px', color: 'var(--text-light)', marginTop: '3px' }}>{m.sub}</div>}
                        </div>
                      ))}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.85, borderTop: '1px solid var(--border)', paddingTop: '18px' }}>{String(card.reason)}</div>
                  </>
                )}

                {card.type === 'create_brief' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                    {(['hook', 'angle', 'offer', 'rationale'] as const).map((field) => {
                      const fieldLabels: Record<string, string> = { hook: 'Hook — First 3 Seconds', angle: 'Creative Direction', offer: 'Offer', rationale: 'Rationale' }
                      const displayVal = edits[field] ?? (card[field] as string)
                      return (
                        <div key={field}>
                          <div style={{ fontSize: '7px', letterSpacing: '.2em', textTransform: 'uppercase', color: 'var(--blue)', marginBottom: '7px' }}>{fieldLabels[field]}</div>
                          {isEditing ? (
                            <textarea value={edits[field] ?? (card[field] as string)}
                              onChange={(e) => setBriefEdits(prev => ({ ...prev, [i]: { ...prev[i], [field]: e.target.value } }))}
                              style={{ width: '100%', background: 'var(--surface2)', border: '1px solid var(--blue)', color: 'var(--text)', fontFamily: 'inherit', fontSize: '13px', padding: '12px 14px', lineHeight: 1.75, resize: 'vertical', minHeight: field === 'angle' || field === 'rationale' ? '96px' : '56px', outline: 'none' }} />
                          ) : (
                            <div style={{ fontSize: '13px', color: 'var(--text)', lineHeight: 1.85 }}>{displayVal}</div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}

                {card.type === 'alert' && (
                  <>
                    <div style={{ marginBottom: '18px' }}>
                      <div style={{ fontFamily: "'Bebas Neue', 'Futura', sans-serif", fontSize: '40px', lineHeight: .88, color: 'var(--amber)', letterSpacing: '.01em' }}>{String(card.current_value)}</div>
                      <div style={{ fontSize: '7px', letterSpacing: '.2em', textTransform: 'uppercase', color: 'var(--text-muted)', marginTop: '8px' }}>{String(card.data_window)}</div>
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--text)', lineHeight: 1.85, marginBottom: '16px' }}>{String(card.observation)}</div>
                    <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', padding: '12px 18px', fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.75 }}>
                      <span style={{ fontSize: '7px', letterSpacing: '.16em', textTransform: 'uppercase', color: 'var(--amber)', marginRight: '10px' }}>Watch</span>
                      {String(card.what_to_watch)}
                    </div>
                  </>
                )}

                {card.type === 'restructure' && (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '16px', alignItems: 'center', marginBottom: '20px' }}>
                      <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', padding: '16px 20px' }}>
                        <div style={{ fontSize: '7px', letterSpacing: '.18em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '6px' }}>Current</div>
                        <div style={{ fontSize: '13px', color: 'var(--text)', lineHeight: 1.6 }}>{String(card.current_structure)}</div>
                      </div>
                      <div style={{ fontFamily: "'Bebas Neue', 'Futura', sans-serif", fontSize: '28px', color: 'var(--c-resources)' }}>→</div>
                      <div style={{ background: 'var(--surface2)', border: `1px solid var(--c-resources)`, padding: '16px 20px' }}>
                        <div style={{ fontSize: '7px', letterSpacing: '.18em', textTransform: 'uppercase', color: 'var(--c-resources)', marginBottom: '6px' }}>Recommended</div>
                        <div style={{ fontSize: '13px', color: 'var(--text)', lineHeight: 1.6 }}>{String(card.recommended_structure)}</div>
                      </div>
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.85, borderTop: '1px solid var(--border)', paddingTop: '18px' }}>
                      {String(card.weeks_of_signal)} weeks of signal · {String(card.reason)}
                    </div>
                  </>
                )}
              </div>
            )
          }

          return (
            <div style={{ marginTop: '20px' }}>
              {/* TOP BAR */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{analyses.length} past {analyses.length === 1 ? 'analysis' : 'analyses'}</div>
                {canAnalyse ? (
                  <button onClick={runAnalysis} disabled={analysing}
                    style={{ background: 'var(--c-clients)', border: 'none', color: '#fff', fontFamily: 'inherit', fontSize: '9px', letterSpacing: '.15em', textTransform: 'uppercase', padding: '10px 24px', cursor: analysing ? 'not-allowed' : 'pointer', opacity: analysing ? 0.6 : 1 }}>
                    {analysing ? 'Running...' : 'Run Analysis'}
                  </button>
                ) : (
                  <div style={{ fontSize: '9px', color: 'var(--text-muted)', letterSpacing: '.1em' }}>Requires Paid Media or Founder role</div>
                )}
              </div>

              {/* ERROR */}
              {analysisError && (
                <div style={{ marginBottom: '20px', padding: '14px 16px', background: 'rgba(255,60,60,0.08)', border: '1px solid rgba(255,60,60,0.25)', fontSize: '12px', color: 'var(--red)', fontFamily: 'monospace', wordBreak: 'break-all' }}>
                  {analysisError}
                </div>
              )}

              {/* FRESH ANALYSIS RESULTS */}
              {(latestCards.length > 0 || campaignGroups.length > 0) && (
                <div style={{ marginBottom: '40px' }}>

                  {/* ACCOUNT METRICS STRIP */}
                  {latestMetrics && (
                    <>
                      {/* Primary 4 stats */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '8px' }}>
                        {[
                          { label: '30-Day Spend', val: fmtR(latestMetrics.spend_30d), valColor: 'var(--text)', sub: `${fmtR(latestMetrics.revenue_30d)} revenue` },
                          { label: '30-Day ROAS', val: latestMetrics.roas_30d > 0 ? fmtRoas(latestMetrics.roas_30d) : '—', valColor: latestMetrics.roas_30d > 0 ? roasColor(latestMetrics.roas_30d, bep) : 'var(--text-muted)', sub: `vs ${bep}× breakeven` },
                          { label: 'Avg Order Value', val: latestMetrics.aov_30d > 0 ? fmtR(latestMetrics.aov_30d) : '—', valColor: 'var(--text)', sub: '30-day account' },
                          { label: 'Cost Per Purchase', val: latestMetrics.cpp_30d > 0 ? fmtR(latestMetrics.cpp_30d) : '—', valColor: 'var(--text)', sub: '30-day account' },
                        ].map(m => (
                          <div key={m.label} style={{ background: 'var(--surface)', border: '1px solid var(--border)', padding: '20px 22px', position: 'relative', overflow: 'hidden' }}>
                            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: m.valColor }} />
                            <div style={{ fontFamily: "'Bebas Neue', 'Futura', sans-serif", fontSize: '46px', lineHeight: .88, color: m.valColor, marginTop: '6px', marginBottom: '10px', letterSpacing: '.01em' }}>{m.val}</div>
                            <div style={{ fontSize: '7px', letterSpacing: '.22em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>{m.label}</div>
                            {m.sub && <div style={{ fontSize: '10px', color: 'var(--text-light)', marginTop: '4px' }}>{m.sub}</div>}
                          </div>
                        ))}
                      </div>
                      {/* 7-day comparison row */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '20px' }}>
                        {[
                          { label: '7-Day Spend', val: fmtR(latestMetrics.spend_7d), sub: `${fmtR(latestMetrics.revenue_7d)} revenue`, color: 'var(--text-muted)' },
                          { label: '7-Day ROAS', val: latestMetrics.roas_7d > 0 ? fmtRoas(latestMetrics.roas_7d) : '—', sub: `vs ${bep}× bep`, color: latestMetrics.roas_7d > 0 ? roasColor(latestMetrics.roas_7d, bep) : 'var(--text-muted)' },
                          { label: '7-Day AOV', val: latestMetrics.aov_7d > 0 ? fmtR(latestMetrics.aov_7d) : '—', sub: null, color: 'var(--text-muted)' },
                          { label: '7-Day CPP', val: latestMetrics.cpp_7d > 0 ? fmtR(latestMetrics.cpp_7d) : '—', sub: null, color: 'var(--text-muted)' },
                        ].map(m => (
                          <div key={m.label} style={{ background: 'var(--surface2)', border: '1px solid var(--border)', padding: '10px 22px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <div style={{ fontSize: '7px', letterSpacing: '.2em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '2px' }}>{m.label}</div>
                              {m.sub && <div style={{ fontSize: '9px', color: 'var(--text-light)' }}>{m.sub}</div>}
                            </div>
                            <div style={{ fontFamily: "'Bebas Neue', 'Futura', sans-serif", fontSize: '24px', color: m.color }}>{m.val}</div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}

                  {/* NARRATIVE */}
                  {latestNarrative && (
                    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderLeft: '4px solid var(--c-clients)', padding: '18px 24px', marginBottom: '28px' }}>
                      <div style={{ fontSize: '7px', letterSpacing: '.2em', textTransform: 'uppercase', color: 'var(--c-clients)', marginBottom: '8px' }}>Analysis Summary</div>
                      <div style={{ fontSize: '13px', color: 'var(--text)', lineHeight: 1.85 }}>{latestNarrative}</div>
                    </div>
                  )}

                  {/* CAMPAIGN SECTIONS */}
                  {campaignGroups.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', marginBottom: '28px' }}>
                      {campaignGroups.map(camp => {
                        const overviewCard = latestCards.find(c => c.type === 'campaign_overview' && c.campaign_id === camp.campaign_id)
                        const campActionEntries = cardsByCampaign[camp.campaign_id] || []

                        return (
                          <div key={camp.campaign_id} style={{ border: '1px solid var(--border)' }}>
                            {/* CAMPAIGN HEADER */}
                            <div style={{ background: 'var(--surface2)', borderBottom: '1px solid var(--border)', padding: '18px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                              <div>
                                <div style={{ fontSize: '7px', letterSpacing: '.18em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '5px' }}>Campaign</div>
                                <div style={{ fontFamily: "'Bebas Neue', 'Futura', sans-serif", fontSize: '22px', letterSpacing: '.04em', color: 'var(--text)', marginBottom: '4px' }}>{camp.campaign_name}</div>
                                <div style={{ fontSize: '9px', color: 'var(--text-muted)' }}>{camp.objective} · R{camp.budget_zar}/day · {camp.ads.length} active ad{camp.ads.length !== 1 ? 's' : ''}</div>
                              </div>
                              <div style={{ display: 'flex', gap: '28px', textAlign: 'right', flexShrink: 0 }}>
                                {[
                                  { val: fmtRoas(camp.totals.roas_30d), label: '30d ROAS', color: roasColor(camp.totals.roas_30d, bep) },
                                  { val: fmtRoas(camp.totals.roas_7d), label: '7d ROAS', color: roasColor(camp.totals.roas_7d, bep) },
                                  { val: fmtR(camp.totals.spend_30d), label: '30d Spend', color: 'var(--text)' },
                                  { val: camp.totals.aov_30d > 0 ? fmtR(camp.totals.aov_30d) : '—', label: 'AOV', color: 'var(--text)' },
                                  { val: camp.totals.cpp_30d > 0 ? fmtR(camp.totals.cpp_30d) : '—', label: 'CPP', color: 'var(--text)' },
                                ].map(m => (
                                  <div key={m.label}>
                                    <div style={{ fontFamily: "'Bebas Neue', 'Futura', sans-serif", fontSize: '26px', color: m.color, lineHeight: 1 }}>{m.val}</div>
                                    <div style={{ fontSize: '7px', letterSpacing: '.15em', textTransform: 'uppercase', color: 'var(--text-muted)', marginTop: '3px' }}>{m.label}</div>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* CAMPAIGN OVERVIEW TEXT */}
                            {overviewCard && (
                              <div style={{ padding: '18px 24px', background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
                                <div style={{ fontSize: '12px', color: 'var(--text)', lineHeight: 1.85, marginBottom: '10px' }}>{String(overviewCard.narrative)}</div>
                                <div style={{ fontSize: '11px', color: 'var(--c-clients)', fontStyle: 'italic' }}>Direction: {String(overviewCard.strategic_direction)}</div>
                              </div>
                            )}

                            {/* AD PERFORMANCE TABLE */}
                            {camp.ads.length > 0 && (
                              <div>
                                <div style={{ display: 'grid', gridTemplateColumns: '2fr 130px 90px 90px 80px 80px 90px', padding: '8px 24px', background: 'var(--surface3)', borderBottom: '1px solid var(--border)' }}>
                                  {['Ad', 'Adset', '30d ROAS', '7d ROAS', 'AOV', 'CPP', '30d Spend'].map(h => (
                                    <div key={h} style={{ fontSize: '7px', letterSpacing: '.15em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>{h}</div>
                                  ))}
                                </div>
                                {camp.ads.map(ad => {
                                  const isFlagged = adsFlaggedForCut.has(ad.ad_id)
                                  return (
                                    <div key={ad.ad_id} style={{ display: 'grid', gridTemplateColumns: '2fr 130px 90px 90px 80px 80px 90px', padding: '12px 24px', borderBottom: '1px solid var(--border)', background: isFlagged ? 'rgba(239,68,68,0.04)' : 'var(--surface)' }}>
                                      <div>
                                        <div style={{ fontSize: '11px', color: isFlagged ? 'var(--red)' : 'var(--text)', fontWeight: isFlagged ? 600 : 400 }}>{ad.ad_name}</div>
                                        {isFlagged && <div style={{ fontSize: '7px', letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--red)', marginTop: '2px' }}>Cut proposed</div>}
                                      </div>
                                      <div style={{ fontSize: '10px', color: 'var(--text-muted)', alignSelf: 'center' }}>{ad.adset_name}</div>
                                      <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '18px', color: roasColor(ad.roas_30d, bep), alignSelf: 'center' }}>{fmtRoas(ad.roas_30d)}</div>
                                      <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '18px', color: roasColor(ad.roas_7d, bep), alignSelf: 'center' }}>{fmtRoas(ad.roas_7d)}</div>
                                      <div style={{ fontSize: '10px', color: 'var(--text)', alignSelf: 'center' }}>{ad.aov_30d > 0 ? fmtR(ad.aov_30d) : '—'}</div>
                                      <div style={{ fontSize: '10px', color: 'var(--text)', alignSelf: 'center' }}>{ad.cpp_30d > 0 ? fmtR(ad.cpp_30d) : '—'}</div>
                                      <div style={{ fontSize: '10px', color: 'var(--text-muted)', alignSelf: 'center' }}>{fmtR(ad.spend_30d)}</div>
                                    </div>
                                  )
                                })}
                              </div>
                            )}

                            {/* CAMPAIGN ACTION CARDS */}
                            {campActionEntries.length > 0 && (
                              <div style={{ padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: '12px', background: 'var(--surface)', borderTop: '1px solid var(--border)' }}>
                                {campActionEntries.map(({ card, idx }) => renderCard(card, idx))}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {/* ACCOUNT-WIDE ACTIONS (no campaign_id — typically briefs & restructures) */}
                  {accountWideCards.length > 0 && (
                    <div style={{ marginBottom: '28px' }}>
                      <div className="section-heading" style={{ marginBottom: '16px' }}>Account-Level Recommendations</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {accountWideCards.map(({ card, idx }) => renderCard(card, idx))}
                      </div>
                    </div>
                  )}

                  <div className="divider" style={{ marginTop: '36px' }} />
                </div>
              )}

              {/* PAST ANALYSES LIST */}
              {analyses.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">◇</div>
                  <div className="empty-text">No analyses yet.</div>
                </div>
              ) : (
                <div>
                  <div className="section-heading" style={{ marginBottom: '12px' }}>Run history</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {analyses.map(a => (
                      <div key={a.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderLeft: `3px solid ${a.status === 'confirmed' ? 'var(--c-clients)' : a.status === 'rejected' ? 'var(--red)' : 'var(--amber)'}`, padding: '14px 20px', display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text)', marginBottom: '3px' }}>
                            {new Date(a.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} · {new Date(a.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                          {a.action_summary && a.action_summary !== 'No actionable cards produced.' && (
                            <div style={{ fontSize: '10px', color: 'var(--text-muted)', lineHeight: 1.65, marginTop: '5px', whiteSpace: 'pre-wrap' }}>{a.action_summary}</div>
                          )}
                        </div>
                        <span className="pill" style={{ background: a.status === 'confirmed' ? 'rgba(45,155,111,0.1)' : a.status === 'rejected' ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)', color: a.status === 'confirmed' ? 'var(--c-clients)' : a.status === 'rejected' ? 'var(--red)' : 'var(--amber)', textTransform: 'capitalize', flexShrink: 0 }}>
                          {a.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )
        })()}

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
