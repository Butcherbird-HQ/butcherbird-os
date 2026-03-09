'use client'
import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

// --- TYPES ---

type Client = {
  id: string; name: string; type: string; category: string;
  status: string; drive_link: string; instagram: string;
  website: string; notes: string; ad_account_id: string;
  client_context: string;
  profit_margin_pct: number; breakeven_roas: number; roas_target: number; monthly_budget_cap_zar: number;
}

type Metrics8 = {
  spend_30d: number; revenue_30d: number; results_30d: number; roas_30d: number;
  aov_30d: number; cpp_30d: number; reach_30d: number; frequency_30d: number;
  spend_7d: number; revenue_7d: number; results_7d: number; roas_7d: number;
  aov_7d: number; cpp_7d: number; reach_7d: number; frequency_7d: number;
}

type AdData = {
  ad_id: string; ad_name: string; adset_id: string; adset_name: string; effective_status: string;
  spend_30d: number; revenue_30d: number; results_30d: number; roas_30d: number;
  aov_30d: number; cpp_30d: number; reach_30d: number; frequency_30d: number;
  spend_7d: number; revenue_7d: number; results_7d: number; roas_7d: number; aov_7d: number; cpp_7d: number;
  impressions_30d: number; clicks_30d: number; ctr_30d: number;
}

type AdsetData = {
  adset_id: string; adset_name: string; status: string; daily_budget_zar: number; targeting_summary: string;
}

type FunnelCoverage = { has_tof: boolean; has_mof: boolean; has_bof: boolean; assessment: string }
type BudgetEfficiency = { active_ad_count: number; avg_spend_per_ad_7d: number; verdict: string }
type AudienceInsights = { who: string; why: string; gaps: string }

type CampaignAnalysisCard = {
  campaign_id: string; campaign_name: string;
  funnel_coverage: FunnelCoverage;
  budget_efficiency: BudgetEfficiency;
  audience_insights: AudienceInsights;
  top_performer: string; worst_performer: string;
  narrative: string; strategic_direction: string;
}

type AccountSynthesis = {
  structure_assessment: string; product_promotion_strategy: string;
  audience_architecture: string; overall_narrative: string;
}

type CampaignData = {
  campaign_id: string; campaign_name: string; objective: string;
  daily_budget_zar: number; lifetime_budget_zar?: number;
  metrics: Metrics8;
  adsets: AdsetData[];
  ads: AdData[];
  campaign_analysis: CampaignAnalysisCard | null;
  campaign_cards: Record<string, unknown>[];
}

type StructuredOutput = {
  account_metrics: Metrics8;
  account_synthesis: AccountSynthesis | null;
  account_cards: Record<string, unknown>[];
  campaigns: CampaignData[];
}

type AnalysisRecord = {
  id: string; client_id: string; created_by: string; status: string;
  output: StructuredOutput | null; action_summary: string; created_at: string;
}

type AnalysisAction = {
  id: string; analysis_id: string; client_id: string; type: string; title: string;
  reasoning: string; payload: Record<string, unknown>; status: string;
  confirmed_by?: string; confirmed_at?: string; meta_executed?: boolean; created_at: string;
}

type CreativeTask = {
  id: string; title: string; stage: string; funnel_stage: string;
  ad_format: string; channel: string; brand: string; due_date: string;
  assigned_to: string; from_analysis_id: string;
}

// --- CONSTANTS ---

const CARD_TYPE_COLOR: Record<string, string> = {
  cut_ad: 'var(--red)', change_budget: 'var(--gold)',
  create_brief: 'var(--blue)', restructure: 'var(--c-resources)', alert: 'var(--amber)',
}
const CARD_TYPE_LABEL: Record<string, string> = {
  cut_ad: 'Cut Ad', change_budget: 'Budget Change',
  create_brief: 'Brief', restructure: 'Restructure', alert: 'Alert',
}
const FUNNEL_COLORS: Record<string, string> = {
  TOF: 'var(--blue)', MOF: 'var(--amber)', BOF: 'var(--c-clients)',
}

// --- HELPERS ---

const fmtR = (n: number) => `R${Math.round(n).toLocaleString('en-ZA')}`
const fmtRoas = (n: number) => n === 0 ? '—' : `${n.toFixed(1)}×`
const fmtNum = (n: number) => n > 0 ? n.toLocaleString('en-ZA') : '—'
const roasColor = (r: number, bep: number) => r === 0 ? 'var(--text-muted)' : r >= bep ? 'var(--green)' : 'var(--red)'

function MetricChip({ label, primary, secondary, color }: {
  label: string; primary: string; secondary?: string; color?: string
}) {
  return (
    <div>
      <div style={{ fontSize: '7px', letterSpacing: '.2em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '5px' }}>{label}</div>
      <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '32px', lineHeight: .9, color: color || 'var(--text)', letterSpacing: '.01em' }}>{primary}</div>
      {secondary && <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px' }}>{secondary}</div>}
    </div>
  )
}

function MetricsStrip({ m, bep, padded }: { m: Metrics8; bep: number; padded?: boolean }) {
  const chips = [
    { label: 'Spend',     primary: fmtR(m.spend_30d),       secondary: `7d ${fmtR(m.spend_7d)}`,         color: 'var(--text)' },
    { label: 'Revenue',   primary: fmtR(m.revenue_30d),     secondary: `7d ${fmtR(m.revenue_7d)}`,       color: 'var(--text)' },
    { label: 'Results',   primary: fmtNum(m.results_30d),   secondary: `7d ${fmtNum(m.results_7d)}`,     color: 'var(--text)' },
    { label: 'ROAS',      primary: fmtRoas(m.roas_30d),     secondary: `7d ${fmtRoas(m.roas_7d)} · ${bep}× bep`, color: roasColor(m.roas_30d, bep) },
    { label: 'CPP',       primary: m.cpp_30d > 0 ? fmtR(m.cpp_30d) : '—',     secondary: `7d ${m.cpp_7d > 0 ? fmtR(m.cpp_7d) : '—'}`,         color: 'var(--text)' },
    { label: 'Frequency', primary: m.frequency_30d > 0 ? String(m.frequency_30d) : '—', secondary: `7d ${m.frequency_7d > 0 ? String(m.frequency_7d) : '—'}`, color: 'var(--text)' },
    { label: 'Reach',     primary: m.reach_30d > 0 ? fmtNum(m.reach_30d) : '—', secondary: `7d ${m.reach_7d > 0 ? fmtNum(m.reach_7d) : '—'}`,   color: 'var(--text)' },
    { label: 'AOV',       primary: m.aov_30d > 0 ? fmtR(m.aov_30d) : '—',     secondary: `7d ${m.aov_7d > 0 ? fmtR(m.aov_7d) : '—'}`,         color: 'var(--text)' },
  ]
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: '12px', padding: padded ? '20px 24px' : '0' }}>
      {chips.map(c => <MetricChip key={c.label} {...c} />)}
    </div>
  )
}

// --- MAIN COMPONENT ---

export default function ClientDetailPage() {
  const { id } = useParams() as { id: string }
  const router = useRouter()

  const [client, setClient] = useState<Client | null>(null)
  const [analyses, setAnalyses] = useState<AnalysisRecord[]>([])
  const [actionsByAnalysis, setActionsByAnalysis] = useState<Record<string, AnalysisAction[]>>({})
  const [readyToDraft, setReadyToDraft] = useState<CreativeTask[]>([])
  const [tab, setTab] = useState<'overview' | 'analyses' | 'ready' | 'reporting'>('overview')
  const [userRole, setUserRole] = useState('')
  const [userEmail, setUserEmail] = useState('')
  const [loading, setLoading] = useState(true)
  const [analysing, setAnalysing] = useState(false)
  const [analysisError, setAnalysisError] = useState<string | null>(null)

  // Collapsible analyses
  const [expandedAnalyses, setExpandedAnalyses] = useState<Set<string>>(new Set())
  // Expandable ads table per campaign (key: analysisId+campaignId)
  const [expandedAds, setExpandedAds] = useState<Set<string>>(new Set())
  // Reject confirmation pending (by action ID)
  const [rejectConfirm, setRejectConfirm] = useState<Set<string>>(new Set())
  // Edit state (by action ID)
  const [editingAction, setEditingAction] = useState<string | null>(null)
  const [actionEdits, setActionEdits] = useState<Record<string, Record<string, string>>>({})
  // Processing (by action ID)
  const [actionPending, setActionPending] = useState<Set<string>>(new Set())

  const canAnalyse = userRole.toLowerCase().includes('founder') || userRole.toLowerCase().includes('paid media') || userRole.toLowerCase().includes('media')

  const loadData = useCallback(async () => {
    const [
      { data: c },
      { data: a },
      { data: actions },
      { data: r }
    ] = await Promise.all([
      supabase.from('crm_clients').select('*').eq('id', id).single(),
      supabase.from('analyses').select('id,client_id,created_by,status,output,action_summary,created_at').eq('client_id', id).order('created_at', { ascending: false }),
      supabase.from('analysis_actions').select('*').eq('client_id', id).order('created_at', { ascending: false }),
      supabase.from('creative_tasks').select('*').eq('client_id', id).eq('stage', 'Queued'),
    ])

    if (c) setClient(c)
    if (r) setReadyToDraft(r)

    if (a) {
      setAnalyses(a)
      // Auto-expand latest
      if (a[0]) setExpandedAnalyses(new Set([a[0].id]))
    }

    if (actions) {
      const grouped: Record<string, AnalysisAction[]> = {}
      for (const action of actions) {
        if (!grouped[action.analysis_id]) grouped[action.analysis_id] = []
        grouped[action.analysis_id].push(action)
      }
      setActionsByAnalysis(grouped)
    }
  }, [id])

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUserRole(user.user_metadata?.role || '')
        setUserEmail(user.email || '')
      }
      await loadData()
      setLoading(false)
    }
    init()
  }, [loadData])

  async function runAnalysis() {
    if (!client) return
    setAnalysing(true)
    setAnalysisError(null)
    try {
      const edgeFnUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/run-analysis`
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        setAnalysisError('Session expired — please refresh and log in again.')
        return
      }
      const res = await fetch(edgeFnUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({ client_id: client.id, user_email: userEmail })
      })
      if (!res.ok) {
        const errText = await res.text()
        setAnalysisError(`Edge function error ${res.status}: ${errText.slice(0, 300)}`)
        return
      }
      const data = await res.json()
      if (data.error) {
        setAnalysisError(`${data.error}${data.detail ? ': ' + data.detail : ''}`)
        return
      }
      // Reload all data and auto-expand the new analysis
      await loadData()
      if (data.analysis_id) {
        setExpandedAnalyses(prev => new Set([data.analysis_id, ...prev]))
      }
    } catch (err) {
      setAnalysisError(String(err))
    } finally {
      setAnalysing(false)
    }
  }

  async function confirmAction(action: AnalysisAction) {
    if (!client) return
    setActionPending(prev => new Set([...prev, action.id]))

    await supabase.from('analysis_actions').update({
      status: 'confirmed', confirmed_by: userEmail, confirmed_at: new Date().toISOString()
    }).eq('id', action.id)

    // All card types go to creative pipeline
    const p = action.payload
    let taskTitle = action.title
    let adFormat = action.type

    if (action.type === 'create_brief') {
      taskTitle = (p.angle as string) || action.title
      adFormat = (p.format as string) || 'static_image'
    } else if (action.type === 'cut_ad') {
      taskTitle = `Cut Ad: ${p.ad_name}`
    } else if (action.type === 'change_budget') {
      taskTitle = `Budget ${p.direction}: ${p.target_name} R${p.current_budget_zar}→R${p.new_budget_zar}/day`
    } else if (action.type === 'restructure') {
      taskTitle = `Restructure: ${p.target_name}`
    }

    await supabase.from('creative_tasks').insert({
      client_id: client.id, title: taskTitle, stage: 'Brief',
      funnel_stage: '', ad_format: adFormat, channel: 'Meta',
      brand: client.name, assigned_to: userEmail, from_analysis_id: action.analysis_id,
    })

    setActionsByAnalysis(prev => ({
      ...prev,
      [action.analysis_id]: prev[action.analysis_id].map(a =>
        a.id === action.id ? { ...a, status: 'confirmed', confirmed_by: userEmail, confirmed_at: new Date().toISOString() } : a
      )
    }))
    setActionPending(prev => { const s = new Set(prev); s.delete(action.id); return s })
  }

  function initiateReject(actionId: string) {
    setRejectConfirm(prev => new Set([...prev, actionId]))
    setTimeout(() => {
      setRejectConfirm(prev => { const s = new Set(prev); s.delete(actionId); return s })
    }, 6000)
  }

  async function confirmReject(action: AnalysisAction) {
    setActionPending(prev => new Set([...prev, action.id]))
    await supabase.from('analysis_actions').delete().eq('id', action.id)
    setActionsByAnalysis(prev => ({
      ...prev,
      [action.analysis_id]: prev[action.analysis_id].filter(a => a.id !== action.id)
    }))
    setRejectConfirm(prev => { const s = new Set(prev); s.delete(action.id); return s })
    setActionPending(prev => { const s = new Set(prev); s.delete(action.id); return s })
  }

  function startEdit(action: AnalysisAction) {
    const p = action.payload as Record<string, string>
    setEditingAction(action.id)
    setActionEdits(prev => ({
      ...prev,
      [action.id]: { hook: p.hook || '', angle: p.angle || '', offer: p.offer || '', rationale: p.rationale || '' }
    }))
  }

  async function saveEdit(action: AnalysisAction) {
    const edits = actionEdits[action.id] || {}
    const newPayload = { ...action.payload, ...edits }
    await supabase.from('analysis_actions').update({
      payload: newPayload, title: edits.angle || action.title
    }).eq('id', action.id)
    setActionsByAnalysis(prev => ({
      ...prev,
      [action.analysis_id]: prev[action.analysis_id].map(a =>
        a.id === action.id ? { ...a, payload: newPayload } : a
      )
    }))
    setEditingAction(null)
  }

  function toggleAnalysis(analysisId: string) {
    setExpandedAnalyses(prev => {
      const s = new Set(prev)
      s.has(analysisId) ? s.delete(analysisId) : s.add(analysisId)
      return s
    })
  }

  function toggleAds(analysisId: string, campaignId: string) {
    const key = `${analysisId}:${campaignId}`
    setExpandedAds(prev => {
      const s = new Set(prev)
      s.has(key) ? s.delete(key) : s.add(key)
      return s
    })
  }

  function renderActionCard(action: AnalysisAction, bep: number) {
    const color = CARD_TYPE_COLOR[action.type] || 'var(--text-muted)'
    const label = CARD_TYPE_LABEL[action.type] || action.type
    const p = action.payload
    const isConfirmed = action.status === 'confirmed'
    const isPending = actionPending.has(action.id)
    const isRejectPending = rejectConfirm.has(action.id)
    const isEditing = editingAction === action.id
    const edits = actionEdits[action.id] || {}
    const isAlert = action.type === 'alert'

    return (
      <div key={action.id} style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderLeft: `4px solid ${color}`, padding: '22px 28px',
        opacity: isConfirmed ? 0.5 : 1, transition: 'opacity .2s'
      }}>
        {/* Header row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
          <div>
            <span style={{ fontSize: '7px', letterSpacing: '.16em', textTransform: 'uppercase', color, background: `${color}18`, padding: '3px 10px', display: 'inline-block' }}>{label}</span>
            {action.type === 'cut_ad' && <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '20px', letterSpacing: '.04em', color: 'var(--text)', marginTop: '8px' }}>{String(p.ad_name)}</div>}
            {action.type === 'change_budget' && <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '20px', letterSpacing: '.04em', color: 'var(--text)', marginTop: '8px' }}>{String(p.target_name)}</div>}
            {action.type === 'alert' && <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '20px', letterSpacing: '.04em', color: 'var(--text)', marginTop: '8px' }}>{String(p.metric)}</div>}
            {action.type === 'create_brief' && (
              <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
                <span className="pill pill-blue">{String(p.format).replace(/_/g, ' ')}</span>
                <span className="pill" style={{ background: p.priority === 'high' ? 'rgba(239,68,68,0.1)' : p.priority === 'medium' ? 'rgba(74,152,232,0.1)' : 'var(--surface3)', color: p.priority === 'high' ? 'var(--red)' : p.priority === 'medium' ? 'var(--blue)' : 'var(--text-muted)' }}>{String(p.priority)}</span>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0 }}>
            {isConfirmed ? (
              <span className="pill" style={{ background: 'rgba(45,155,111,0.1)', color: 'var(--c-clients)' }}>Confirmed</span>
            ) : isAlert ? (
              <span style={{ fontSize: '8px', color: 'var(--text-muted)', letterSpacing: '.1em' }}>Watching</span>
            ) : (
              <>
                {action.type === 'create_brief' && !isEditing && (
                  <button onClick={() => startEdit(action)} style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--text-muted)', fontFamily: 'inherit', fontSize: '8px', letterSpacing: '.12em', textTransform: 'uppercase', padding: '7px 14px', cursor: 'pointer' }}>Edit</button>
                )}
                {action.type === 'create_brief' && isEditing && (
                  <button onClick={() => saveEdit(action)} style={{ background: 'none', border: '1px solid var(--blue)', color: 'var(--blue)', fontFamily: 'inherit', fontSize: '8px', letterSpacing: '.12em', textTransform: 'uppercase', padding: '7px 14px', cursor: 'pointer' }}>Save</button>
                )}
                <button onClick={() => confirmAction(action)} disabled={isPending}
                  style={{ background: 'var(--c-clients)', border: 'none', color: '#fff', fontFamily: 'inherit', fontSize: '8px', letterSpacing: '.12em', textTransform: 'uppercase', padding: '7px 18px', cursor: isPending ? 'not-allowed' : 'pointer', opacity: isPending ? 0.6 : 1 }}>
                  {isPending ? '...' : 'Confirm'}
                </button>
                {isRejectPending ? (
                  <button onClick={() => confirmReject(action)} disabled={isPending}
                    style={{ background: 'var(--red)', border: 'none', color: '#fff', fontFamily: 'inherit', fontSize: '8px', letterSpacing: '.12em', textTransform: 'uppercase', padding: '7px 14px', cursor: 'pointer' }}>
                    Confirm Reject
                  </button>
                ) : (
                  <button onClick={() => initiateReject(action.id)} disabled={isPending}
                    style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--text-muted)', fontFamily: 'inherit', fontSize: '8px', letterSpacing: '.12em', textTransform: 'uppercase', padding: '7px 14px', cursor: isPending ? 'not-allowed' : 'pointer', opacity: isPending ? 0.6 : 1 }}>
                    Reject
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Card body */}
        {action.type === 'cut_ad' && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '18px' }}>
              {[
                { val: fmtRoas(p.roas_7day as number), label: '7-Day ROAS', sub: `vs ${p.roas_breakeven}× breakeven`, color: roasColor(p.roas_7day as number, bep) },
                { val: fmtR(p.spend_7day as number), label: '7-Day Spend', sub: null, color: 'var(--text)' },
                { val: String(p.days_running), label: 'Days Running', sub: null, color: 'var(--text)' },
                { val: `${p.days_below_breakeven}/7`, label: 'Below Breakeven', sub: `${String(p.trend_3day)} trend`, color: 'var(--red)' },
              ].map(m => (
                <div key={m.label}>
                  <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '36px', lineHeight: .88, color: m.color }}>{String(m.val)}</div>
                  <div style={{ fontSize: '7px', letterSpacing: '.2em', textTransform: 'uppercase', color: 'var(--text-muted)', marginTop: '6px' }}>{m.label}</div>
                  {m.sub && <div style={{ fontSize: '9px', color: 'var(--text-light)', marginTop: '3px' }}>{m.sub}</div>}
                </div>
              ))}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.85, borderTop: '1px solid var(--border)', paddingTop: '16px' }}>{String(p.reason)}</div>
          </>
        )}

        {action.type === 'change_budget' && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '18px' }}>
              {[
                { val: `R${p.current_budget_zar}`, label: 'Current /Day', sub: null, color: 'var(--text)' },
                { val: `R${p.new_budget_zar}`, label: 'New /Day', sub: String(p.direction), color: p.direction === 'increase' ? 'var(--green)' : 'var(--red)' },
                { val: fmtRoas(p.roas_7day as number), label: '7-Day ROAS', sub: `vs ${p.roas_breakeven}× bep`, color: roasColor(p.roas_7day as number, bep) },
                { val: fmtR(p.projected_monthly_spend as number), label: 'Projected Monthly', sub: null, color: 'var(--text-muted)' },
              ].map(m => (
                <div key={m.label}>
                  <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '36px', lineHeight: .88, color: m.color }}>{String(m.val)}</div>
                  <div style={{ fontSize: '7px', letterSpacing: '.2em', textTransform: 'uppercase', color: 'var(--text-muted)', marginTop: '6px' }}>{m.label}</div>
                  {m.sub && <div style={{ fontSize: '9px', color: 'var(--text-light)', marginTop: '3px' }}>{m.sub}</div>}
                </div>
              ))}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.85, borderTop: '1px solid var(--border)', paddingTop: '16px' }}>{String(p.reason)}</div>
          </>
        )}

        {action.type === 'create_brief' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {(['hook', 'angle', 'offer', 'rationale'] as const).map(field => {
              const labels: Record<string, string> = { hook: 'Hook — First 3 Seconds', angle: 'Creative Direction', offer: 'Offer', rationale: 'Rationale' }
              const val = edits[field] ?? (p[field] as string)
              return (
                <div key={field}>
                  <div style={{ fontSize: '7px', letterSpacing: '.2em', textTransform: 'uppercase', color: 'var(--blue)', marginBottom: '6px' }}>{labels[field]}</div>
                  {isEditing ? (
                    <textarea value={edits[field] ?? (p[field] as string)}
                      onChange={e => setActionEdits(prev => ({ ...prev, [action.id]: { ...(prev[action.id] || {}), [field]: e.target.value } }))}
                      style={{ width: '100%', background: 'var(--surface2)', border: '1px solid var(--blue)', color: 'var(--text)', fontFamily: 'inherit', fontSize: '13px', padding: '10px 14px', lineHeight: 1.75, resize: 'vertical', minHeight: field === 'angle' || field === 'rationale' ? '90px' : '52px', outline: 'none', boxSizing: 'border-box' }} />
                  ) : (
                    <div style={{ fontSize: '13px', color: 'var(--text)', lineHeight: 1.85 }}>{val}</div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {action.type === 'alert' && (
          <>
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '36px', lineHeight: .88, color: 'var(--amber)' }}>{String(p.current_value)}</div>
              <div style={{ fontSize: '7px', letterSpacing: '.2em', textTransform: 'uppercase', color: 'var(--text-muted)', marginTop: '6px' }}>{String(p.data_window)}</div>
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text)', lineHeight: 1.85, marginBottom: '14px' }}>{String(p.observation)}</div>
            <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', padding: '10px 16px', fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.75 }}>
              <span style={{ fontSize: '7px', letterSpacing: '.16em', textTransform: 'uppercase', color: 'var(--amber)', marginRight: '10px' }}>Watch</span>
              {String(p.what_to_watch)}
            </div>
          </>
        )}

        {action.type === 'restructure' && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '14px', alignItems: 'center', marginBottom: '18px' }}>
              <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', padding: '14px 18px' }}>
                <div style={{ fontSize: '7px', letterSpacing: '.18em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '6px' }}>Current</div>
                <div style={{ fontSize: '13px', color: 'var(--text)', lineHeight: 1.6 }}>{String(p.current_structure)}</div>
              </div>
              <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '24px', color: 'var(--c-resources)' }}>→</div>
              <div style={{ background: 'var(--surface2)', border: '1px solid var(--c-resources)', padding: '14px 18px' }}>
                <div style={{ fontSize: '7px', letterSpacing: '.18em', textTransform: 'uppercase', color: 'var(--c-resources)', marginBottom: '6px' }}>Recommended</div>
                <div style={{ fontSize: '13px', color: 'var(--text)', lineHeight: 1.6 }}>{String(p.recommended_structure)}</div>
              </div>
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.85, borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
              {String(p.weeks_of_signal)} weeks of signal · {String(p.reason)}
            </div>
          </>
        )}
      </div>
    )
  }

  function renderAnalysis(analysis: AnalysisRecord, bep: number) {
    const isExpanded = expandedAnalyses.has(analysis.id)
    const output = analysis.output
    const actions = actionsByAnalysis[analysis.id] || []

    return (
      <div key={analysis.id} style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}>
        {/* Collapsed header — always visible */}
        <div
          onClick={() => toggleAnalysis(analysis.id)}
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', cursor: 'pointer', borderBottom: isExpanded ? '1px solid var(--border)' : 'none' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text)' }}>
              {new Date(analysis.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} · {new Date(analysis.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
            </div>
            {analysis.action_summary && analysis.action_summary !== 'No actionable cards produced.' && (
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', maxWidth: '600px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {analysis.action_summary.split('\n')[0]}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {actions.filter(a => a.status === 'proposed').length > 0 && (
              <span className="pill" style={{ background: 'rgba(245,158,11,0.1)', color: 'var(--amber)' }}>
                {actions.filter(a => a.status === 'proposed').length} pending
              </span>
            )}
            <span style={{ fontSize: '10px', color: 'var(--text-muted)', letterSpacing: '.05em' }}>{isExpanded ? '▲' : '▼'}</span>
          </div>
        </div>

        {/* Expanded content */}
        {isExpanded && output && (
          <div style={{ padding: '28px 24px', display: 'flex', flexDirection: 'column', gap: '32px' }}>

            {/* ACCOUNT METRICS */}
            <div>
              <div className="section-heading" style={{ marginBottom: '16px' }}>Account Metrics</div>
              <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', padding: '20px 24px' }}>
                <MetricsStrip m={output.account_metrics} bep={bep} />
              </div>
            </div>

            {/* ACCOUNT INSIGHT */}
            {output.account_synthesis && (
              <div>
                <div className="section-heading" style={{ marginBottom: '16px' }}>Account Insight</div>
                <div style={{ border: '1px solid var(--border)', borderLeft: '4px solid var(--c-clients)' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                    {[
                      { label: 'Structure', text: output.account_synthesis.structure_assessment },
                      { label: 'Product Strategy', text: output.account_synthesis.product_promotion_strategy },
                      { label: 'Audience Architecture', text: output.account_synthesis.audience_architecture },
                      { label: 'Overall', text: output.account_synthesis.overall_narrative },
                    ].map(row => (
                      <div key={row.label} style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)' }}>
                        <div style={{ fontSize: '7px', letterSpacing: '.2em', textTransform: 'uppercase', color: 'var(--c-clients)', marginBottom: '6px' }}>{row.label}</div>
                        <div style={{ fontSize: '13px', color: 'var(--text)', lineHeight: 1.85 }}>{row.text}</div>
                      </div>
                    ))}
                  </div>
                  {/* Account-level action cards */}
                  {actions.filter(a => !a.payload.campaign_id && a.type !== 'alert').length > 0 && (
                    <div style={{ padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {actions.filter(a => !a.payload.campaign_id && a.type !== 'alert').map(a => renderActionCard(a, bep))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* CAMPAIGNS */}
            {output.campaigns && output.campaigns.length > 0 && (
              <div>
                <div className="section-heading" style={{ marginBottom: '16px' }}>Campaigns</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {output.campaigns.map(camp => {
                    const adsKey = `${analysis.id}:${camp.campaign_id}`
                    const adsExpanded = expandedAds.has(adsKey)
                    const campActions = actions.filter(a => a.payload.campaign_id === camp.campaign_id)
                    const adsFlaggedForCut = new Set(campActions.filter(a => a.type === 'cut_ad').map(a => a.payload.ad_id as string))
                    const ca = camp.campaign_analysis

                    return (
                      <div key={camp.campaign_id} style={{ border: '1px solid var(--border)' }}>
                        {/* Campaign header */}
                        <div style={{ background: 'var(--surface2)', borderBottom: '1px solid var(--border)', padding: '18px 24px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                            <div>
                              <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '20px', letterSpacing: '.04em', color: 'var(--text)', marginBottom: '4px' }}>{camp.campaign_name}</div>
                              <div style={{ fontSize: '9px', color: 'var(--text-muted)' }}>
                                {camp.objective} · R{camp.daily_budget_zar}/day · {camp.ads?.length || 0} active ad{(camp.ads?.length || 0) !== 1 ? 's' : ''}
                              </div>
                            </div>
                          </div>
                          <MetricsStrip m={camp.metrics} bep={bep} />
                        </div>

                        {/* Show/hide ads toggle */}
                        {camp.ads && camp.ads.length > 0 && (
                          <div>
                            <button
                              onClick={() => toggleAds(analysis.id, camp.campaign_id)}
                              style={{ width: '100%', background: 'none', border: 'none', borderBottom: '1px solid var(--border)', padding: '10px 24px', textAlign: 'left', cursor: 'pointer', fontSize: '8px', letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span>{adsExpanded ? 'Hide Ads' : `Show Ads (${camp.ads.length})`}</span>
                              <span>{adsExpanded ? '▲' : '▼'}</span>
                            </button>
                            {adsExpanded && (
                              <div style={{ borderBottom: '1px solid var(--border)', overflowX: 'auto' }}>
                                {/* Ad table header */}
                                <div style={{ display: 'grid', gridTemplateColumns: '2fr 100px 90px 90px 80px 80px 80px 80px 90px', padding: '8px 24px', background: 'var(--surface3)', minWidth: '900px' }}>
                                  {['Ad', 'Adset', 'Spend', 'Revenue', 'ROAS', 'CPP', 'Freq', 'Reach', 'AOV'].map(h => (
                                    <div key={h} style={{ fontSize: '7px', letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>{h}</div>
                                  ))}
                                </div>
                                {camp.ads.map(ad => {
                                  const isFlagged = adsFlaggedForCut.has(ad.ad_id)
                                  return (
                                    <div key={ad.ad_id} style={{ display: 'grid', gridTemplateColumns: '2fr 100px 90px 90px 80px 80px 80px 80px 90px', padding: '11px 24px', borderBottom: '1px solid var(--border)', background: isFlagged ? 'rgba(239,68,68,0.04)' : 'var(--surface)', minWidth: '900px' }}>
                                      <div>
                                        <div style={{ fontSize: '11px', color: isFlagged ? 'var(--red)' : 'var(--text)', fontWeight: isFlagged ? 600 : 400 }}>{ad.ad_name}</div>
                                        {isFlagged && <div style={{ fontSize: '7px', letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--red)', marginTop: '2px' }}>Cut proposed</div>}
                                        <div style={{ fontSize: '9px', color: 'var(--text-muted)', marginTop: '2px' }}>7d: {fmtRoas(ad.roas_7d)}</div>
                                      </div>
                                      <div style={{ fontSize: '10px', color: 'var(--text-muted)', alignSelf: 'center' }}>{ad.adset_name}</div>
                                      <div>
                                        <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '16px', color: 'var(--text)', alignSelf: 'center' }}>{fmtR(ad.spend_30d)}</div>
                                        <div style={{ fontSize: '9px', color: 'var(--text-muted)' }}>7d {fmtR(ad.spend_7d)}</div>
                                      </div>
                                      <div>
                                        <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '16px', color: 'var(--text)' }}>{fmtR(ad.revenue_30d)}</div>
                                        <div style={{ fontSize: '9px', color: 'var(--text-muted)' }}>7d {fmtR(ad.revenue_7d)}</div>
                                      </div>
                                      <div>
                                        <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '16px', color: roasColor(ad.roas_30d, bep) }}>{fmtRoas(ad.roas_30d)}</div>
                                        <div style={{ fontSize: '9px', color: roasColor(ad.roas_7d, bep) }}>7d {fmtRoas(ad.roas_7d)}</div>
                                      </div>
                                      <div style={{ fontSize: '11px', color: 'var(--text)', alignSelf: 'center' }}>{ad.cpp_30d > 0 ? fmtR(ad.cpp_30d) : '—'}</div>
                                      <div style={{ fontSize: '11px', color: 'var(--text)', alignSelf: 'center' }}>{ad.frequency_30d > 0 ? ad.frequency_30d : '—'}</div>
                                      <div style={{ fontSize: '11px', color: 'var(--text)', alignSelf: 'center' }}>{ad.reach_30d > 0 ? fmtNum(ad.reach_30d) : '—'}</div>
                                      <div style={{ fontSize: '11px', color: 'var(--text)', alignSelf: 'center' }}>{ad.aov_30d > 0 ? fmtR(ad.aov_30d) : '—'}</div>
                                    </div>
                                  )
                                })}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Campaign insights */}
                        {ca && (
                          <div style={{ borderBottom: '1px solid var(--border)' }}>
                            {/* Performance + Funnel */}
                            <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border)' }}>
                              <div style={{ fontSize: '7px', letterSpacing: '.2em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '10px' }}>Performance Insights</div>
                              <div style={{ fontSize: '13px', color: 'var(--text)', lineHeight: 1.85, marginBottom: '12px' }}>{ca.narrative}</div>
                              {/* Funnel coverage chips */}
                              <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                                {[
                                  { key: 'TOF', active: ca.funnel_coverage?.has_tof },
                                  { key: 'MOF', active: ca.funnel_coverage?.has_mof },
                                  { key: 'BOF', active: ca.funnel_coverage?.has_bof },
                                ].map(f => (
                                  <span key={f.key} className="pill" style={{
                                    background: f.active ? `${FUNNEL_COLORS[f.key]}20` : 'var(--surface3)',
                                    color: f.active ? FUNNEL_COLORS[f.key] : 'var(--text-muted)',
                                    opacity: f.active ? 1 : 0.5
                                  }}>{f.key}</span>
                                ))}
                                <span style={{ fontSize: '11px', color: 'var(--text-muted)', alignSelf: 'center', marginLeft: '4px' }}>{ca.funnel_coverage?.assessment}</span>
                              </div>
                              {/* Budget efficiency */}
                              {ca.budget_efficiency && (
                                <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', padding: '10px 16px', fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.7 }}>
                                  <span style={{ fontSize: '7px', letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--text-muted)', marginRight: '8px' }}>Budget Efficiency</span>
                                  {ca.budget_efficiency.active_ad_count} active ads · R{ca.budget_efficiency.avg_spend_per_ad_7d}/ad avg (7d) · {ca.budget_efficiency.verdict}
                                </div>
                              )}
                            </div>
                            {/* Audience insights */}
                            {ca.audience_insights && (
                              <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border)' }}>
                                <div style={{ fontSize: '7px', letterSpacing: '.2em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '10px' }}>Audience Insights</div>
                                {[
                                  { label: 'Who', text: ca.audience_insights.who },
                                  { label: 'Why', text: ca.audience_insights.why },
                                  { label: 'Gaps', text: ca.audience_insights.gaps },
                                ].map(row => (
                                  <div key={row.label} style={{ marginBottom: '10px' }}>
                                    <span style={{ fontSize: '7px', letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--text-muted)', marginRight: '10px' }}>{row.label}</span>
                                    <span style={{ fontSize: '12px', color: 'var(--text)', lineHeight: 1.8 }}>{row.text}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                            {/* Strategic direction */}
                            <div style={{ padding: '12px 24px', background: 'rgba(45,155,111,0.04)' }}>
                              <span style={{ fontSize: '7px', letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--c-clients)', marginRight: '10px' }}>Direction</span>
                              <span style={{ fontSize: '12px', color: 'var(--c-clients)', fontStyle: 'italic' }}>{ca.strategic_direction}</span>
                            </div>
                          </div>
                        )}

                        {/* Campaign action cards */}
                        {campActions.length > 0 && (
                          <div style={{ padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: '10px', background: 'var(--surface)' }}>
                            {campActions.map(a => renderActionCard(a, bep))}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Expanded but no structured output — show raw action summary */}
        {isExpanded && !output && (
          <div style={{ padding: '20px 24px' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{analysis.action_summary || 'No data available.'}</div>
          </div>
        )}
      </div>
    )
  }

  if (loading) return <div style={{ padding: '48px', color: 'var(--text-muted)', fontSize: '11px', letterSpacing: '.1em' }}>Loading...</div>
  if (!client) return <div style={{ padding: '48px', color: 'var(--text-muted)', fontSize: '11px' }}>Client not found.</div>

  const bep = client.breakeven_roas || 2.22

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
            { key: 'overview',  label: 'Overview' },
            { key: 'analyses',  label: `Analyses${analyses.length ? ` (${analyses.length})` : ''}` },
            { key: 'ready',     label: `Ready to Draft${readyToDraft.length ? ` (${readyToDraft.length})` : ''}` },
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
                <div className="card-title">AI Config</div>
                {[
                  { label: 'Profit Margin', val: client.profit_margin_pct ? `${client.profit_margin_pct}%` : '—' },
                  { label: 'Breakeven ROAS', val: client.breakeven_roas ? `${client.breakeven_roas}×` : '—' },
                  { label: 'ROAS Target', val: client.roas_target ? `${client.roas_target}×` : '—' },
                  { label: 'Monthly Budget Cap', val: client.monthly_budget_cap_zar ? fmtR(client.monthly_budget_cap_zar) : '—' },
                ].map(r => (
                  <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                    <span style={{ fontSize: '9px', letterSpacing: '.15em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>{r.label}</span>
                    <span style={{ fontSize: '12px', color: 'var(--text)', fontWeight: 500 }}>{r.val}</span>
                  </div>
                ))}
                <div style={{ marginTop: '12px' }}>
                  <div style={{ fontSize: '9px', letterSpacing: '.15em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '6px' }}>Notes</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>{client.notes || 'No notes.'}</div>
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
                    No context document uploaded. Edit this client to upload or paste one.
                  </div>
              }
            </div>
          </div>
        )}

        {/* ANALYSES */}
        {tab === 'analyses' && (
          <div style={{ marginTop: '20px' }}>
            {/* Top bar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{analyses.length} {analyses.length === 1 ? 'analysis' : 'analyses'}</div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                {canAnalyse ? (
                  <button onClick={runAnalysis} disabled={analysing}
                    style={{ background: 'var(--c-clients)', border: 'none', color: '#fff', fontFamily: 'inherit', fontSize: '9px', letterSpacing: '.15em', textTransform: 'uppercase', padding: '10px 24px', cursor: analysing ? 'not-allowed' : 'pointer', opacity: analysing ? 0.6 : 1 }}>
                    {analysing ? 'Running...' : 'Run Analysis'}
                  </button>
                ) : (
                  <div style={{ fontSize: '9px', color: 'var(--text-muted)', letterSpacing: '.1em' }}>Requires Paid Media or Founder role</div>
                )}
              </div>
            </div>

            {/* Error */}
            {analysisError && (
              <div style={{ marginBottom: '20px', padding: '14px 16px', background: 'rgba(255,60,60,0.08)', border: '1px solid rgba(255,60,60,0.25)', fontSize: '12px', color: 'var(--red)', fontFamily: 'monospace', wordBreak: 'break-all' }}>
                {analysisError}
              </div>
            )}

            {/* Analyses list */}
            {analyses.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">◇</div>
                <div className="empty-text">No analyses yet. Run the first one above.</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {analyses.map(a => renderAnalysis(a, bep))}
              </div>
            )}
          </div>
        )}

        {/* READY TO DRAFT */}
        {tab === 'ready' && (
          <div style={{ marginTop: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{readyToDraft.length} creative{readyToDraft.length !== 1 ? 's' : ''} queued</div>
            </div>
            {readyToDraft.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">◇</div>
                <div className="empty-text">No creatives queued. Move approved briefs to Queued in the Creative Pipeline.</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {readyToDraft.map(t => (
                  <div key={t.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderLeft: '3px solid var(--gold)', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text)', marginBottom: '6px' }}>{t.title}</div>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        {t.funnel_stage && (
                          <span className="pill" style={{ background: `${FUNNEL_COLORS[t.funnel_stage] || 'var(--text-muted)'}18`, color: FUNNEL_COLORS[t.funnel_stage] || 'var(--text-muted)' }}>{t.funnel_stage}</span>
                        )}
                        {t.ad_format && <span className="pill" style={{ background: 'var(--surface3)', color: 'var(--text-muted)' }}>{t.ad_format}</span>}
                        <span className="pill" style={{ background: 'var(--surface3)', color: 'var(--text-muted)' }}>{t.channel}</span>
                      </div>
                    </div>
                    <span style={{ fontSize: '9px', color: 'var(--gold)', letterSpacing: '.08em' }}>Queued</span>
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
            </div>
          </div>
        )}
      </div>
    </>
  )
}
