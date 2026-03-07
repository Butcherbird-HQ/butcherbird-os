'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

// ── PIPELINE TYPES ────────────────────────────────────────────────────────────
type Lead = {
  id: string; name: string; company: string; market: string; value: string
  stage: string; email: string; phone: string; website: string; social: string
  setup: string; notes: string; lastContacted: string
}

const STAGES = ['Lead', 'Contacted', 'Call Booked', 'Proposal Sent', 'Closed', 'Onboarding', 'Live']
const stageColors: Record<string, string> = {
  'Lead': 'var(--mid)', 'Contacted': 'var(--blue)', 'Call Booked': 'var(--amber)',
  'Proposal Sent': 'var(--gold)', 'Closed': 'var(--green)', 'Onboarding': 'var(--gold)', 'Live': 'var(--green)',
}
const defaultLeads: Lead[] = [
  { id: '1', name: 'Hiba Balfaqih', company: 'MindHacking / The Smash Room', market: 'UAE', value: '$6,000/mo', stage: 'Live', email: 'hiba@mindhacking.com', phone: '', website: 'mindhacking.com', social: '@hibabalfaqih', setup: 'Dubai psychologist/entrepreneur. 35K IG. Podcast. Digital products, courses, coaching. BBC/CNN featured. Course infrastructure built — awaiting launch.', notes: 'Course pre-launch. Ads not yet fired. Critical proving moment.', lastContacted: '' },
  { id: '2', name: 'Helpdesk', company: 'Helpdesk App', market: 'SA', value: '$5,000/mo', stage: 'Live', email: '', phone: '', website: '', social: '', setup: 'SA startup app. Meta ads + email. Early stage.', notes: 'Active. Churn risk — startup runway. Do not anchor headcount to this.', lastContacted: '' },
]

// ── CLIENT TYPES ──────────────────────────────────────────────────────────────
type Client = {
  id: string
  name: string
  type: 'performance' | 'flat'
  category: 'external' | 'internal'
  baseFee: number
  revSharePct: number
  status: 'Active' | 'Paused' | 'Churned'
}

type MonthEntry = {
  clientId: string
  month: string
  adSpend: number
  revenueGenerated: number  // gross inc VAT
}

const defaultClients: Client[] = [
  { id: 'c1', name: 'Numuti',     type: 'performance', category: 'external', baseFee: 12000, revSharePct: 0.20, status: 'Active' },
  { id: 'c2', name: 'Bonnie Bio', type: 'performance', category: 'external', baseFee: 15000, revSharePct: 0.10, status: 'Active' },
  { id: 'c3', name: 'Kokee',      type: 'performance', category: 'external', baseFee: 10000, revSharePct: 0.12, status: 'Active' },
  { id: 'c4', name: 'Lakrids',    type: 'performance', category: 'external', baseFee: 10000, revSharePct: 0.10, status: 'Active' },
  { id: 'c5', name: 'Helpdesk',   type: 'flat',        category: 'external', baseFee: 80000, revSharePct: 0,    status: 'Active' },
  { id: 'c6', name: 'HIBA',       type: 'flat',        category: 'external', baseFee: 90000, revSharePct: 0,    status: 'Active' },
  { id: 'c7', name: 'BUUB',       type: 'flat',        category: 'internal', baseFee: 75000, revSharePct: 0,    status: 'Active' },
  { id: 'c8', name: 'SCHNOZZ',    type: 'flat',        category: 'internal', baseFee: 75000, revSharePct: 0,    status: 'Active' },
  { id: 'c9', name: 'SUPERIOR',   type: 'flat',        category: 'internal', baseFee: 75000, revSharePct: 0,    status: 'Active' },
]

const defaultMonthEntries: MonthEntry[] = [
  { clientId: 'c1', month: '2026-02', adSpend: 30710.01, revenueGenerated: 124541.42 },
  { clientId: 'c2', month: '2026-02', adSpend: 30749.04, revenueGenerated: 75004.70  },
  { clientId: 'c3', month: '2026-02', adSpend: 16835.95, revenueGenerated: 56016.33  },
  { clientId: 'c4', month: '2026-02', adSpend: 30690.08, revenueGenerated: 120560.25 },
]

// ── TEMPLATES ─────────────────────────────────────────────────────────────────
const TEMPLATES = [
  {
    label: 'Initial Outreach',
    subject: '[Brand] × Butcherbird — Worth 10 minutes?',
    body: `Hi [Name],\n\nI came across [Brand] — [specific observation about their ads/product/positioning].\n\nWe're Butcherbird, a Cape Town-based growth agency. We've generated R5M+ in revenue from R1.6M in ad spend across 6 brands (3.10× blended ROAS). Our edge: world-class Meta and email execution at a fraction of what a London or New York agency charges — SA cost base, hard currency clients.\n\nI think there's a real opportunity to scale [Brand]'s paid acquisition. Worth a 10-minute call to show you what we'd do specifically?\n\n[Your name]`,
  },
  {
    label: '2-Day Follow-Up',
    subject: 'Re: [Brand] × Butcherbird',
    body: `Hi [Name],\n\nJust bumping this up — I know inboxes get full.\n\nQuick version: we'd take [Brand]'s Meta and email completely off your plate, and our fee is tied to results (we take 10% of revenue above your last 3-month average — so you only pay more when you earn more).\n\nHappy to send a quick breakdown of what we'd do specifically for [Brand] if that's easier than a call.\n\n[Your name]`,
  },
  {
    label: '7-Day Follow-Up',
    subject: 'Last one from me — [Brand]',
    body: `Hi [Name],\n\nLast outreach from me on this — I don't want to be noise in your inbox.\n\nIf the timing is off or you're already sorted on paid media, completely understand. If things change, we're at hello@butcherbird.global.\n\nEither way — [Brand] is doing interesting things. Worth keeping an eye on.\n\n[Your name]`,
  },
]

// ── HELPERS ───────────────────────────────────────────────────────────────────
function followUpStatus(lastContacted: string): { label: string; color: string } | null {
  if (!lastContacted) return null
  const days = Math.floor((Date.now() - new Date(lastContacted).getTime()) / 86400000)
  if (days >= 7) return { label: `${days}d — 7-day follow-up overdue`, color: 'var(--red)' }
  if (days >= 2) return { label: `${days}d — 2-day follow-up due`, color: 'var(--amber)' }
  return { label: `${days}d since contact`, color: 'var(--green)' }
}

function calcRevShare(revSharePct: number, revenueGenerated: number): number {
  return (revenueGenerated / 1.15) * revSharePct
}

function fmtMonth(month: string): string {
  const [y, m] = month.split('-')
  return `${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][parseInt(m) - 1]} ${y}`
}

function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split('-').map(Number)
  const d = new Date(y, m - 1 + delta, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

const colGrid = '1.6fr 1fr 1.2fr 1.3fr 1.1fr 1.3fr 0.7fr 0.7fr 1.1fr 1.3fr'

// ── COMPONENT ─────────────────────────────────────────────────────────────────
export default function CRMPage() {
  // Pipeline state
  const [leads, setLeads] = useState<Lead[]>(defaultLeads)
  const [modal, setModal] = useState(false)
  const [selected, setSelected] = useState<Lead | null>(null)
  const [form, setForm] = useState<Partial<Lead>>({})
  const [dragId, setDragId] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState<string | null>(null)
  const [showTemplates, setShowTemplates] = useState(false)
  const [copiedTemplate, setCopiedTemplate] = useState<string | null>(null)

  // Live Clients state
  const [activeTab, setActiveTab] = useState<'pipeline' | 'clients'>('pipeline')
  const [clients, setClients] = useState<Client[]>(defaultClients)
  const [monthEntries, setMonthEntries] = useState<MonthEntry[]>(defaultMonthEntries)
  const [selectedMonth, setSelectedMonth] = useState('2026-02')
  const [clientModal, setClientModal] = useState(false)
  const [editingClient, setEditingClient] = useState<Client | null>(null)
  const [clientForm, setClientForm] = useState<Partial<Client>>({})

  useEffect(() => {
    async function load() {
      const { data: leadsData } = await supabase.from('crm_leads').select()
      if (leadsData && leadsData.length > 0) setLeads(leadsData as Lead[])
      else await supabase.from('crm_leads').insert(defaultLeads)

      const { data: clientsData } = await supabase.from('crm_clients').select()
      if (clientsData && clientsData.length > 0) setClients(clientsData as Client[])
      else { await supabase.from('crm_clients').insert(defaultClients); setClients(defaultClients) }

      const { data: entriesData } = await supabase.from('crm_monthly').select()
      if (entriesData && entriesData.length > 0) setMonthEntries(entriesData as MonthEntry[])
      else { await supabase.from('crm_monthly').insert(defaultMonthEntries); setMonthEntries(defaultMonthEntries) }
    }
    load()
  }, [])

  // ── PIPELINE HANDLERS ──────────────────────────────────────────────────────
  function openNew(stage = 'Lead') { setSelected(null); setForm({ stage }); setModal(true) }
  function openEdit(lead: Lead) { setSelected(lead); setForm({ ...lead }); setModal(true) }
  async function submitForm() {
    if (!form.name) return
    if (selected) {
      const updated = { ...selected, ...form } as Lead
      setLeads(prev => prev.map(l => l.id === selected.id ? updated : l))
      await supabase.from('crm_leads').update(form).eq('id', selected.id)
    } else {
      const blank: Lead = { id: Date.now().toString(), name: '', company: '', market: '', value: '', stage: 'Lead', email: '', phone: '', website: '', social: '', setup: '', notes: '', lastContacted: '' }
      const newLead = { ...blank, ...form } as Lead
      setLeads(prev => [...prev, newLead])
      await supabase.from('crm_leads').insert(newLead)
    }
    setModal(false)
  }
  async function deleteLead(id: string) {
    setLeads(prev => prev.filter(l => l.id !== id))
    await supabase.from('crm_leads').delete().eq('id', id)
    setModal(false)
  }
  async function markContacted(id: string, e: React.MouseEvent) {
    e.stopPropagation()
    const lastContacted = new Date().toISOString()
    setLeads(prev => prev.map(l => l.id === id ? { ...l, lastContacted } : l))
    await supabase.from('crm_leads').update({ lastContacted }).eq('id', id)
  }
  async function handleDrop(stage: string) {
    if (!dragId) return
    setLeads(prev => prev.map(l => l.id === dragId ? { ...l, stage } : l))
    await supabase.from('crm_leads').update({ stage }).eq('id', dragId)
    setDragId(null); setDragOver(null)
  }
  async function copyTemplate(text: string, label: string) {
    await navigator.clipboard.writeText(text)
    setCopiedTemplate(label)
    setTimeout(() => setCopiedTemplate(null), 2000)
  }

  // ── CLIENT HANDLERS ────────────────────────────────────────────────────────
  function openNewClient() {
    setEditingClient(null)
    setClientForm({ type: 'performance', category: 'external', status: 'Active', revSharePct: 0.10, baseFee: 0 })
    setClientModal(true)
  }
  function openEditClient(c: Client) { setEditingClient(c); setClientForm({ ...c }); setClientModal(true) }
  async function submitClient() {
    if (!clientForm.name) return
    if (editingClient) {
      setClients(prev => prev.map(c => c.id === editingClient.id ? { ...c, ...clientForm } as Client : c))
      await supabase.from('crm_clients').update(clientForm).eq('id', editingClient.id)
    } else {
      const newClient = { id: Date.now().toString(), name: '', type: 'performance', category: 'external', baseFee: 0, revSharePct: 0.10, status: 'Active', ...clientForm } as Client
      setClients(prev => [...prev, newClient])
      await supabase.from('crm_clients').insert(newClient)
    }
    setClientModal(false)
  }
  async function deleteClient(id: string) {
    setClients(prev => prev.filter(c => c.id !== id))
    await supabase.from('crm_clients').delete().eq('id', id)
    setClientModal(false)
  }

  function getEntry(clientId: string): MonthEntry {
    return monthEntries.find(e => e.clientId === clientId && e.month === selectedMonth)
      || { clientId, month: selectedMonth, adSpend: 0, revenueGenerated: 0 }
  }

  async function updateEntry(clientId: string, updates: Partial<MonthEntry>) {
    const existing = monthEntries.find(e => e.clientId === clientId && e.month === selectedMonth)
    const entry = existing
      ? { ...existing, ...updates }
      : { clientId, month: selectedMonth, adSpend: 0, revenueGenerated: 0, ...updates }
    setMonthEntries(prev => existing
      ? prev.map(e => e.clientId === clientId && e.month === selectedMonth ? entry : e)
      : [...prev, entry])
    await supabase.from('crm_monthly').upsert(entry)
  }

  // ── CALCULATIONS ──────────────────────────────────────────────────────────
  const activeClients = clients.filter(c => c.status === 'Active')
  const externalClients = activeClients.filter(c => c.category === 'external')
  const internalClients = activeClients.filter(c => c.category === 'internal')

  let totalExternal = 0, totalInternal = 0, totalRevShare = 0
  for (const client of activeClients) {
    const entry = getEntry(client.id)
    const rs = client.type === 'performance' ? calcRevShare(client.revSharePct, entry.revenueGenerated) : 0
    const total = client.baseFee + rs
    if (client.category === 'external') totalExternal += total
    else totalInternal += total
    totalRevShare += rs
  }
  const grandTotal = totalExternal + totalInternal
  const totalBaseFees = activeClients.reduce((s, c) => s + c.baseFee, 0)
  const totalAdSpend = activeClients.reduce((s, c) => { const e = getEntry(c.id); return s + e.adSpend }, 0)
  const totalRevGenerated = activeClients.reduce((s, c) => { const e = getEntry(c.id); return s + e.revenueGenerated }, 0)
  const totalVat = totalRevGenerated - (totalRevGenerated / 1.15)
  const totalRevExVat = totalRevGenerated / 1.15

  const live = leads.filter(l => l.stage === 'Live').length

  function renderClientRow(client: Client) {
    const entry = getEntry(client.id)
    const revExVat = entry.revenueGenerated / 1.15
    const vat = entry.revenueGenerated - revExVat
    const rs = client.type === 'performance' ? calcRevShare(client.revSharePct, entry.revenueGenerated) : 0
    const roas = entry.adSpend > 0 ? entry.revenueGenerated / entry.adSpend : 0
    const total = client.baseFee + rs

    return (
      <div key={client.id} style={{ display: 'grid', gridTemplateColumns: colGrid, gap: '2px', padding: '10px 16px', background: 'var(--dark2)', border: '1px solid var(--border)', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--off-white)' }}>{client.name}</span>
          <button onClick={() => openEditClient(client)} style={{ background: 'none', border: 'none', color: 'var(--mid)', fontSize: '10px', cursor: 'pointer', padding: 0, lineHeight: 1 }}>✎</button>
        </div>
        <div style={{ fontSize: '11px', color: 'var(--light)' }}>R{client.baseFee.toLocaleString()}</div>
        {client.type === 'performance' ? (
          <>
            <input
              type="number" value={entry.adSpend || ''}
              onChange={e => updateEntry(client.id, { adSpend: parseFloat(e.target.value) || 0 })}
              style={{ width: '100%', background: 'var(--dark)', border: '1px solid var(--border)', color: 'var(--off-white)', fontFamily: 'inherit', fontSize: '11px', padding: '4px 8px' }}
              placeholder="0"
            />
            <input
              type="number" value={entry.revenueGenerated || ''}
              onChange={e => updateEntry(client.id, { revenueGenerated: parseFloat(e.target.value) || 0 })}
              style={{ width: '100%', background: 'var(--dark)', border: '1px solid var(--border)', color: 'var(--off-white)', fontFamily: 'inherit', fontSize: '11px', padding: '4px 8px' }}
              placeholder="0"
            />
            <div style={{ fontSize: '11px', color: 'var(--mid)' }}>R{Math.round(vat).toLocaleString()}</div>
            <div style={{ fontSize: '11px', color: 'var(--light)' }}>R{Math.round(revExVat).toLocaleString()}</div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: roas >= 3 ? 'var(--green)' : roas >= 2 ? 'var(--amber)' : roas > 0 ? 'var(--red)' : 'var(--mid)' }}>
              {roas > 0 ? `${roas.toFixed(2)}×` : '—'}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--mid)' }}>{Math.round(client.revSharePct * 100)}%</div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--off-white)' }}>R{Math.round(rs).toLocaleString()}</div>
          </>
        ) : (
          <>
            <div style={{ fontSize: '10px', color: 'var(--mid)' }}>—</div>
            <div style={{ fontSize: '10px', color: 'var(--mid)' }}>—</div>
            <div style={{ fontSize: '10px', color: 'var(--mid)' }}>—</div>
            <div style={{ fontSize: '10px', color: 'var(--mid)' }}>—</div>
            <div style={{ fontSize: '10px', color: 'var(--mid)' }}>—</div>
            <div style={{ fontSize: '10px', color: 'var(--mid)' }}>—</div>
            <div style={{ fontSize: '10px', color: 'var(--mid)' }}>—</div>
          </>
        )}
        <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--off-white)' }}>R{Math.round(total).toLocaleString()}</div>
      </div>
    )
  }

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">CRM</div>
          <div className="page-subtitle">{leads.length} contacts · {live} live · {activeClients.length} active clients</div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {activeTab === 'pipeline' && (
            <>
              <button className="add-btn" style={{ padding: '10px 16px', background: 'var(--dark2)', color: 'var(--mid)', border: '1px solid var(--border)' }} onClick={() => setShowTemplates(!showTemplates)}>
                {showTemplates ? 'Hide Templates' : 'Email Templates'}
              </button>
              <button className="add-btn" style={{ padding: '10px 20px' }} onClick={() => openNew()}>+ Add Lead</button>
            </>
          )}
          {activeTab === 'clients' && (
            <button className="add-btn" style={{ padding: '10px 20px' }} onClick={openNewClient}>+ Add Client</button>
          )}
        </div>
      </div>

      {/* Tab nav */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', paddingLeft: '40px', background: 'var(--dark)', flexShrink: 0 }}>
        {[{ id: 'pipeline', label: 'Pipeline' }, { id: 'clients', label: 'Live Clients' }].map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id as typeof activeTab)}
            style={{ padding: '14px 24px', background: 'none', border: 'none', borderBottom: activeTab === t.id ? '2px solid var(--gold)' : '2px solid transparent', color: activeTab === t.id ? 'var(--gold)' : 'var(--mid)', fontFamily: 'inherit', fontSize: '9px', fontWeight: activeTab === t.id ? 700 : 400, letterSpacing: '.2em', textTransform: 'uppercase', cursor: 'pointer', marginBottom: '-1px' }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── PIPELINE TAB ──────────────────────────────────────────────────────── */}
      {activeTab === 'pipeline' && (
        <>
          <div style={{ background: 'var(--dark)', borderBottom: '1px solid var(--border)', padding: '12px 40px', display: 'flex', gap: '32px', alignItems: 'center' }}>
            <span style={{ fontSize: '8px', letterSpacing: '.2em', textTransform: 'uppercase', color: 'var(--gold)' }}>Follow-up Rules</span>
            {[
              { step: 'Day 0', action: 'Send initial outreach', color: 'var(--mid)' },
              { step: '→ No reply 2 days', action: 'Send follow-up #1', color: 'var(--amber)' },
              { step: '→ No reply 7 days', action: 'Send follow-up #2', color: 'var(--red)' },
              { step: '→ No reply after that', action: 'Mark as Dead', color: 'var(--mid)' },
            ].map(r => (
              <div key={r.step} style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                <span style={{ fontSize: '8px', color: r.color, letterSpacing: '.1em', textTransform: 'uppercase' }}>{r.step}</span>
                <span style={{ fontSize: '9px', color: 'var(--light)' }}>{r.action}</span>
              </div>
            ))}
            <span style={{ fontSize: '9px', color: 'var(--mid)', marginLeft: 'auto' }}>Drag cards between columns to move stages</span>
          </div>

          {showTemplates && (
            <div style={{ background: 'var(--dark2)', borderBottom: '1px solid var(--border)', padding: '24px 40px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                {TEMPLATES.map(t => (
                  <div key={t.label} style={{ background: 'var(--dark)', border: '1px solid var(--border)', padding: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <span style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '.18em', textTransform: 'uppercase', color: 'var(--gold)' }}>{t.label}</span>
                      <button onClick={() => copyTemplate(`Subject: ${t.subject}\n\n${t.body}`, t.label)}
                        style={{ background: copiedTemplate === t.label ? 'var(--green)' : 'var(--dark2)', border: '1px solid var(--border)', color: copiedTemplate === t.label ? 'var(--black)' : 'var(--mid)', fontFamily: 'inherit', fontSize: '8px', letterSpacing: '.15em', textTransform: 'uppercase', padding: '4px 10px', cursor: 'pointer' }}>
                        {copiedTemplate === t.label ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                    <div style={{ fontSize: '9px', color: 'var(--gold)', marginBottom: '6px' }}>Subject: {t.subject}</div>
                    <pre style={{ fontSize: '10px', color: 'var(--light)', lineHeight: 1.7, whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>{t.body}</pre>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="page-body" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column', flex: 1 }}>
            <div className="pipeline" style={{ flex: 1 }}>
              {STAGES.map(stage => {
                const stageLeads = leads.filter(l => l.stage === stage)
                return (
                  <div key={stage} className="pipeline-col"
                    style={{ borderColor: dragOver === stage ? 'var(--gold)' : undefined }}
                    onDragOver={e => { e.preventDefault(); setDragOver(stage) }}
                    onDragLeave={() => setDragOver(null)}
                    onDrop={() => handleDrop(stage)}>
                    <div className="pipeline-col-header">
                      <span className="pipeline-col-title" style={{ color: stageColors[stage] }}>{stage}</span>
                      <span className="pipeline-col-count">{stageLeads.length}</span>
                    </div>
                    <div className="pipeline-cards">
                      {stageLeads.map(lead => {
                        const fu = followUpStatus(lead.lastContacted)
                        return (
                          <div key={lead.id} className="pipeline-card" draggable
                            onDragStart={() => setDragId(lead.id)}
                            onDragEnd={() => { setDragId(null); setDragOver(null) }}
                            onClick={() => openEdit(lead)}
                            style={{ opacity: dragId === lead.id ? 0.4 : 1, cursor: 'grab' }}>
                            <div className="pipeline-card-name">{lead.name}</div>
                            <div className="pipeline-card-detail">{lead.company}</div>
                            {lead.market && <div className="pipeline-card-detail" style={{ marginTop: '2px' }}>{lead.market}</div>}
                            {lead.value && <div className="pipeline-card-value">{lead.value}</div>}
                            {lead.email && <div className="pipeline-card-detail" style={{ marginTop: '4px', fontSize: '9px' }}>{lead.email}</div>}
                            {fu && <div style={{ marginTop: '8px', fontSize: '8px', letterSpacing: '.12em', textTransform: 'uppercase', color: fu.color }}>{fu.label}</div>}
                            {(stage === 'Contacted' || stage === 'Call Booked') && (
                              <button onClick={e => markContacted(lead.id, e)}
                                style={{ marginTop: '8px', width: '100%', background: 'none', border: '1px solid var(--border)', color: 'var(--mid)', fontFamily: 'inherit', fontSize: '8px', letterSpacing: '.12em', textTransform: 'uppercase', padding: '5px', cursor: 'pointer' }}>
                                Mark Contacted Today
                              </button>
                            )}
                          </div>
                        )
                      })}
                    </div>
                    <div className="pipeline-add">
                      <button className="pipeline-add-btn" onClick={() => openNew(stage)}>+ Add</button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}

      {/* ── LIVE CLIENTS TAB ──────────────────────────────────────────────────── */}
      {activeTab === 'clients' && (
        <div className="page-body">

          {/* Month navigation */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
            <button onClick={() => setSelectedMonth(shiftMonth(selectedMonth, -1))}
              style={{ background: 'var(--dark2)', border: '1px solid var(--border)', color: 'var(--mid)', fontFamily: 'inherit', fontSize: '14px', width: '32px', height: '32px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>←</button>
            <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--off-white)', minWidth: '120px', textAlign: 'center', letterSpacing: '.04em' }}>{fmtMonth(selectedMonth)}</span>
            <button onClick={() => setSelectedMonth(shiftMonth(selectedMonth, 1))}
              style={{ background: 'var(--dark2)', border: '1px solid var(--border)', color: 'var(--mid)', fontFamily: 'inherit', fontSize: '14px', width: '32px', height: '32px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>→</button>
          </div>

          {/* Summary cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '2px', marginBottom: '24px' }}>
            {[
              { label: 'External Revenue', val: `R${Math.round(totalExternal).toLocaleString()}` },
              { label: 'Internal Revenue', val: `R${Math.round(totalInternal).toLocaleString()}` },
              { label: 'Rev Share Earned', val: `R${Math.round(totalRevShare).toLocaleString()}` },
              { label: 'Total Income', val: `R${Math.round(grandTotal).toLocaleString()}`, highlight: true },
            ].map(c => (
              <div key={c.label} className="stat-card" style={c.highlight ? { borderColor: 'rgba(212,175,55,.4)' } : {}}>
                <div className="stat-card-val" style={{ fontSize: '18px', color: c.highlight ? 'var(--gold)' : undefined }}>{c.val}</div>
                <div className="stat-card-label">{c.label}</div>
              </div>
            ))}
          </div>

          {/* Table header */}
          <div style={{ display: 'grid', gridTemplateColumns: colGrid, gap: '2px', padding: '10px 16px', background: 'var(--dark)' }}>
            {['Client', 'Base Fee', 'Ad Spend', 'Rev Generated', 'VAT 15%', 'Rev Ex VAT', 'ROAS', 'RS %', 'Rev Share', 'Total Invoice'].map(h => (
              <div key={h} style={{ fontSize: '8px', letterSpacing: '.2em', textTransform: 'uppercase', color: 'var(--mid)' }}>{h}</div>
            ))}
          </div>

          {/* External section */}
          <div style={{ fontSize: '8px', letterSpacing: '.2em', textTransform: 'uppercase', color: 'var(--gold)', padding: '8px 16px 6px', background: 'var(--dark)', borderTop: '1px solid var(--border)' }}>External</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {externalClients.map(renderClientRow)}
          </div>

          {/* Internal section */}
          <div style={{ fontSize: '8px', letterSpacing: '.2em', textTransform: 'uppercase', color: 'var(--gold)', padding: '8px 16px 6px', background: 'var(--dark)', borderTop: '1px solid var(--border)', marginTop: '8px' }}>Internal</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {internalClients.map(renderClientRow)}
          </div>

          {/* Totals row */}
          <div style={{ display: 'grid', gridTemplateColumns: colGrid, gap: '2px', padding: '12px 16px', background: 'var(--dark)', border: '1px solid rgba(212,175,55,.4)', marginTop: '8px' }}>
            <div style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '.15em', textTransform: 'uppercase', color: 'var(--gold)' }}>Total</div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--off-white)' }}>R{totalBaseFees.toLocaleString()}</div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--off-white)' }}>R{Math.round(totalAdSpend).toLocaleString()}</div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--off-white)' }}>R{Math.round(totalRevGenerated).toLocaleString()}</div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--off-white)' }}>R{Math.round(totalVat).toLocaleString()}</div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--off-white)' }}>R{Math.round(totalRevExVat).toLocaleString()}</div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--off-white)' }}>
              {totalAdSpend > 0 ? `${(totalRevGenerated / totalAdSpend).toFixed(2)}×` : '—'}
            </div>
            <div />
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--off-white)' }}>R{Math.round(totalRevShare).toLocaleString()}</div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--gold)' }}>R{Math.round(grandTotal).toLocaleString()}</div>
          </div>

          <div style={{ fontSize: '9px', color: 'var(--mid)', marginTop: '10px', paddingLeft: '4px' }}>
            Rev Share = Revenue Ex VAT × client rate. VAT deducted at 15%.
          </div>
        </div>
      )}

      {/* ── PIPELINE MODAL ────────────────────────────────────────────────────── */}
      {modal && (
        <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div className="modal-box" style={{ maxWidth: '640px', maxHeight: '90vh', overflowY: 'auto' }}>
            <button className="modal-close" onClick={() => setModal(false)}>×</button>
            <div className="modal-title">{selected ? 'Edit Lead' : 'New Lead'}</div>

            <div style={{ fontSize: '8px', letterSpacing: '.2em', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: '14px' }}>Contact Info</div>
            <div className="form-grid-2">
              <div className="form-row">
                <label className="form-label">Name</label>
                <input className="form-input" value={form.name || ''} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Contact name" />
              </div>
              <div className="form-row">
                <label className="form-label">Company / Brand</label>
                <input className="form-input" value={form.company || ''} onChange={e => setForm({ ...form, company: e.target.value })} placeholder="Company" />
              </div>
              <div className="form-row">
                <label className="form-label">Email</label>
                <input className="form-input" value={form.email || ''} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="email@brand.com" />
              </div>
              <div className="form-row">
                <label className="form-label">Phone</label>
                <input className="form-input" value={form.phone || ''} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="+971 50 000 0000" />
              </div>
              <div className="form-row">
                <label className="form-label">Website</label>
                <input className="form-input" value={form.website || ''} onChange={e => setForm({ ...form, website: e.target.value })} placeholder="brand.com" />
              </div>
              <div className="form-row">
                <label className="form-label">Social</label>
                <input className="form-input" value={form.social || ''} onChange={e => setForm({ ...form, social: e.target.value })} placeholder="@handle or link" />
              </div>
              <div className="form-row">
                <label className="form-label">Market</label>
                <input className="form-input" value={form.market || ''} onChange={e => setForm({ ...form, market: e.target.value })} placeholder="UAE, UK, US..." />
              </div>
              <div className="form-row">
                <label className="form-label">Retainer Value</label>
                <input className="form-input" value={form.value || ''} onChange={e => setForm({ ...form, value: e.target.value })} placeholder="$6,000/mo" />
              </div>
            </div>

            <div style={{ fontSize: '8px', letterSpacing: '.2em', textTransform: 'uppercase', color: 'var(--gold)', margin: '16px 0 14px' }}>Closer Brief</div>
            <div className="form-row">
              <label className="form-label">Current Setup (ads, email, pain points — brief the closer)</label>
              <textarea className="form-textarea" style={{ minHeight: '100px' }} value={form.setup || ''} onChange={e => setForm({ ...form, setup: e.target.value })} placeholder="What are they currently running? What's broken? Why are they a fit? What's the hook?" />
            </div>

            <div style={{ fontSize: '8px', letterSpacing: '.2em', textTransform: 'uppercase', color: 'var(--gold)', margin: '16px 0 14px' }}>Pipeline</div>
            <div className="form-grid-2">
              <div className="form-row">
                <label className="form-label">Stage</label>
                <select className="form-select" value={form.stage || 'Lead'} onChange={e => setForm({ ...form, stage: e.target.value })}>
                  {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="form-row">
                <label className="form-label">Last Contacted</label>
                <input className="form-input" type="date" value={form.lastContacted ? form.lastContacted.split('T')[0] : ''} onChange={e => setForm({ ...form, lastContacted: e.target.value ? new Date(e.target.value).toISOString() : '' })} />
              </div>
            </div>
            <div className="form-row">
              <label className="form-label">Notes / Next Steps</label>
              <textarea className="form-textarea" value={form.notes || ''} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Context, flags, next actions..." />
            </div>

            <button className="submit-btn" onClick={submitForm}>{selected ? 'Update' : 'Add to Pipeline'}</button>
            {selected && (
              <button onClick={() => deleteLead(selected.id)} style={{ width: '100%', marginTop: '8px', background: 'none', border: '1px solid rgba(224,90,90,.3)', color: 'var(--red)', fontFamily: 'inherit', fontSize: '9px', letterSpacing: '.2em', textTransform: 'uppercase', padding: '10px', cursor: 'pointer' }}>
                Remove
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── CLIENT MODAL ──────────────────────────────────────────────────────── */}
      {clientModal && (
        <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && setClientModal(false)}>
          <div className="modal-box" style={{ maxWidth: '480px' }}>
            <button className="modal-close" onClick={() => setClientModal(false)}>×</button>
            <div className="modal-title">{editingClient ? 'Edit Client' : 'Add Client'}</div>

            <div className="form-grid-2">
              <div className="form-row" style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">Client Name</label>
                <input className="form-input" value={clientForm.name || ''} onChange={e => setClientForm({ ...clientForm, name: e.target.value })} placeholder="Client / brand name" autoFocus />
              </div>
              <div className="form-row">
                <label className="form-label">Type</label>
                <div style={{ display: 'flex', gap: '2px' }}>
                  {(['performance', 'flat'] as const).map(t => (
                    <button key={t} onClick={() => setClientForm({ ...clientForm, type: t })}
                      style={{ flex: 1, padding: '9px', background: clientForm.type === t ? 'var(--gold)' : 'var(--dark)', color: clientForm.type === t ? 'var(--black)' : 'var(--mid)', border: '1px solid var(--border)', fontFamily: 'inherit', fontSize: '9px', fontWeight: clientForm.type === t ? 700 : 400, letterSpacing: '.12em', textTransform: 'uppercase', cursor: 'pointer' }}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <div className="form-row">
                <label className="form-label">Category</label>
                <div style={{ display: 'flex', gap: '2px' }}>
                  {(['external', 'internal'] as const).map(c => (
                    <button key={c} onClick={() => setClientForm({ ...clientForm, category: c })}
                      style={{ flex: 1, padding: '9px', background: clientForm.category === c ? 'var(--gold)' : 'var(--dark)', color: clientForm.category === c ? 'var(--black)' : 'var(--mid)', border: '1px solid var(--border)', fontFamily: 'inherit', fontSize: '9px', fontWeight: clientForm.category === c ? 700 : 400, letterSpacing: '.12em', textTransform: 'uppercase', cursor: 'pointer' }}>
                      {c}
                    </button>
                  ))}
                </div>
              </div>
              <div className="form-row">
                <label className="form-label">{clientForm.type === 'flat' ? 'Flat Rate (ZAR/mo)' : 'Base Fee (ZAR/mo)'}</label>
                <input className="form-input" type="number" min="0" value={clientForm.baseFee || ''} onChange={e => setClientForm({ ...clientForm, baseFee: parseFloat(e.target.value) || 0 })} placeholder="10000" />
              </div>
              {clientForm.type === 'performance' && (
                <div className="form-row">
                  <label className="form-label">Rev Share %</label>
                  <input className="form-input" type="number" min="0" max="100" step="1" value={clientForm.revSharePct !== undefined ? Math.round(clientForm.revSharePct * 100) : ''} onChange={e => setClientForm({ ...clientForm, revSharePct: (parseFloat(e.target.value) || 0) / 100 })} placeholder="10" />
                </div>
              )}
              <div className="form-row" style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">Status</label>
                <div style={{ display: 'flex', gap: '2px' }}>
                  {(['Active', 'Paused', 'Churned'] as const).map(s => (
                    <button key={s} onClick={() => setClientForm({ ...clientForm, status: s })}
                      style={{ flex: 1, padding: '9px', background: clientForm.status === s ? 'var(--gold)' : 'var(--dark)', color: clientForm.status === s ? 'var(--black)' : 'var(--mid)', border: '1px solid var(--border)', fontFamily: 'inherit', fontSize: '9px', fontWeight: clientForm.status === s ? 700 : 400, letterSpacing: '.12em', textTransform: 'uppercase', cursor: 'pointer' }}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button className="submit-btn" onClick={submitClient}>{editingClient ? 'Update' : 'Add Client'}</button>
            {editingClient && (
              <button onClick={() => deleteClient(editingClient.id)} style={{ width: '100%', marginTop: '8px', background: 'none', border: '1px solid rgba(224,90,90,.3)', color: 'var(--red)', fontFamily: 'inherit', fontSize: '9px', letterSpacing: '.2em', textTransform: 'uppercase', padding: '10px', cursor: 'pointer' }}>Remove Client</button>
            )}
          </div>
        </div>
      )}
    </>
  )
}
