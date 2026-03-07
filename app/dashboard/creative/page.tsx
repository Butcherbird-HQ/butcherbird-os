'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

type CreativeTask = {
  id: string; channel: 'static' | 'video' | 'email'; stage: string;
  title: string; brand: string; due_date: string; notes: string; links: string;
  assigned_to: string; funnel_stage: string; ad_format: string;
  angle: string; script_notes: string; client_id: string; from_analysis_id: string;
}
type Client = { id: string; name: string }
type TeamMember = { email: string; name: string }

const CHANNELS = ['static', 'video', 'email'] as const
const CHANNEL_LABELS = { static: 'Static Ads', video: 'Video Ads', email: 'Email Marketing' }
const STAGES = ['Brief', 'In Progress', 'Review', 'Approved', 'Queued', 'Live']
const FUNNEL_STAGES = ['', 'TOF', 'MOF', 'BOF']
const AD_FORMATS = ['', 'Static Image', 'Video', 'Carousel', 'Story', 'Reel', 'UGC']

const blank: Omit<CreativeTask, 'id'> = {
  channel: 'static', stage: 'Brief', title: '', brand: '', due_date: '',
  notes: '', links: '', assigned_to: '', funnel_stage: '', ad_format: '',
  angle: '', script_notes: '', client_id: '', from_analysis_id: '',
}

const stageColor: Record<string, string> = {
  Brief: 'var(--c-resources)',
  'In Progress': 'var(--blue)',
  Review: 'var(--amber)',
  Approved: 'var(--c-clients)',
  Queued: 'var(--gold)',
  Live: 'var(--green)',
  Archived: 'var(--text-muted)',
}
const funnelColor: Record<string, string> = {
  TOF: 'var(--blue)', MOF: 'var(--amber)', BOF: 'var(--c-clients)',
}

export default function CreativePage() {
  const [tasks, setTasks] = useState<CreativeTask[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [team, setTeam] = useState<TeamMember[]>([{ email: '', name: 'Unassigned' }])
  const [channel, setChannel] = useState<'static' | 'video' | 'email'>('static')
  const [filterClient, setFilterClient] = useState('')
  const [showArchived, setShowArchived] = useState(false)
  const [modal, setModal] = useState(false)
  const [selected, setSelected] = useState<CreativeTask | null>(null)
  const [form, setForm] = useState<Omit<CreativeTask, 'id'>>(blank)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      supabase.from('creative_tasks').select('*'),
      supabase.from('crm_clients').select('id,name').eq('status', 'Active').order('name'),
      fetch('/api/team').then(r => r.json()).catch(() => null),
    ]).then(([{ data: t }, { data: c }, teamData]) => {
      if (t) setTasks(t)
      if (c) setClients(c)
      if (teamData && Array.isArray(teamData)) setTeam(teamData)
      setLoading(false)
    })
  }, [])

  function openNew(stage: string) {
    setSelected(null)
    setForm({ ...blank, channel, stage })
    setModal(true)
  }

  function openEdit(t: CreativeTask) {
    setSelected(t)
    setForm({
      channel: t.channel, stage: t.stage, title: t.title, brand: t.brand,
      due_date: t.due_date, notes: t.notes, links: t.links,
      assigned_to: t.assigned_to || '', funnel_stage: t.funnel_stage || '',
      ad_format: t.ad_format || '', angle: t.angle || '',
      script_notes: t.script_notes || '', client_id: t.client_id || '',
      from_analysis_id: t.from_analysis_id || '',
    })
    setModal(true)
  }

  async function save() {
    if (!form.title.trim()) return
    if (selected) {
      setTasks(prev => prev.map(t => t.id === selected.id ? { ...selected, ...form } : t))
      await supabase.from('creative_tasks').update(form).eq('id', selected.id)
    } else {
      const t: CreativeTask = { id: Date.now().toString(), ...form }
      setTasks(prev => [...prev, t])
      await supabase.from('creative_tasks').insert(t)
    }
    setModal(false)
  }

  async function moveStage(id: string, stage: string) {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, stage } : t))
    await supabase.from('creative_tasks').update({ stage }).eq('id', id)
  }

  async function deleteTask(id: string) {
    setTasks(prev => prev.filter(t => t.id !== id))
    await supabase.from('creative_tasks').delete().eq('id', id)
    setModal(false)
  }

  const visibleStages = showArchived ? [...STAGES, 'Archived'] : STAGES

  const filteredTasks = tasks
    .filter(t => t.channel === channel)
    .filter(t => !filterClient || t.client_id === filterClient)

  const stageTasks = (stage: string) => filteredTasks.filter(t =>
    stage === 'Archived' ? t.stage === 'Archived' : (t.stage === stage && t.stage !== 'Archived')
  )

  const assigneeName = (email: string) => team.find(t => t.email === email)?.name || ''
  const clientName = (cid: string) => clients.find(c => c.id === cid)?.name || ''

  if (loading) return <div style={{ padding: '48px', color: 'var(--text-muted)', fontSize: '11px', letterSpacing: '.1em' }}>Loading...</div>

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-dept-tag" style={{ background: 'rgba(224,123,57,0.12)', color: 'var(--c-creative)' }}>Creative</div>
          <div className="page-title">Creative Pipeline</div>
          <div className="page-subtitle">
            {filteredTasks.filter(t => t.stage !== 'Archived').length} active ·{' '}
            {filteredTasks.filter(t => t.stage === 'Queued').length} queued for launch ·{' '}
            {filteredTasks.filter(t => t.stage === 'Live').length} live
          </div>
        </div>
        <button className="btn btn-primary" onClick={() => openNew('Brief')}>+ New Brief</button>
      </div>

      <div className="page-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

        {/* Controls row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div className="tabs" style={{ '--tab-color': 'var(--c-creative)' } as React.CSSProperties}>
            {CHANNELS.map(c => (
              <button key={c} className={`tab${channel === c ? ' active' : ''}`} onClick={() => setChannel(c)}>
                {CHANNEL_LABELS[c]}
                <span style={{ marginLeft: '8px', fontSize: '9px', background: 'var(--surface2)', padding: '1px 7px', borderRadius: '2px', color: 'var(--text-muted)' }}>
                  {tasks.filter(t => t.channel === c && t.stage !== 'Archived').length}
                </span>
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <select
              value={filterClient}
              onChange={e => setFilterClient(e.target.value)}
              style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: filterClient ? 'var(--text)' : 'var(--text-muted)', fontFamily: 'inherit', fontSize: '9px', letterSpacing: '.08em', padding: '7px 12px', cursor: 'pointer' }}>
              <option value="">All Clients</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <button
              onClick={() => setShowArchived(v => !v)}
              style={{ fontSize: '9px', letterSpacing: '.12em', textTransform: 'uppercase', fontFamily: 'inherit', padding: '7px 14px', cursor: 'pointer', background: showArchived ? 'var(--surface3)' : 'none', border: '1px solid var(--border)', color: showArchived ? 'var(--text)' : 'var(--text-muted)' }}>
              {showArchived ? 'Hide Archived' : 'Show Archived'}
            </button>
          </div>
        </div>

        {/* Pipeline board */}
        <div className="pipeline">
          {visibleStages.map(stage => {
            const cards = stageTasks(stage)
            const isBrief = stage === 'Brief'
            const isQueued = stage === 'Queued'
            const isArchived = stage === 'Archived'

            return (
              <div key={stage} className="pipeline-col" style={isArchived ? { opacity: 0.65 } : {}}>
                <div className="pipeline-col-header"
                  style={isBrief ? { borderBottom: '1px solid rgba(139,92,246,0.2)', paddingBottom: '10px', marginBottom: '2px' }
                    : isQueued ? { borderBottom: '1px solid rgba(184,150,62,0.2)', paddingBottom: '10px', marginBottom: '2px' }
                    : {}}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className="pipeline-col-title" style={{ color: stageColor[stage] }}>{stage}</span>
                      {isBrief && (
                        <span style={{ fontSize: '7px', letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--c-resources)', background: 'rgba(139,92,246,0.12)', padding: '2px 7px' }}>AI Input</span>
                      )}
                      {isQueued && (
                        <span style={{ fontSize: '7px', letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--gold)', background: 'rgba(184,150,62,0.12)', padding: '2px 7px' }}>Launch Queue</span>
                      )}
                    </div>
                    {isBrief && (
                      <div style={{ fontSize: '8px', color: 'var(--c-resources)', letterSpacing: '.04em', opacity: 0.75 }}>Analysis output enters here</div>
                    )}
                    {isQueued && (
                      <div style={{ fontSize: '8px', color: 'var(--gold)', letterSpacing: '.04em', opacity: 0.75 }}>Done — awaiting Meta launch</div>
                    )}
                  </div>
                  <span className="pipeline-col-count">{cards.length}</span>
                </div>

                <div className="pipeline-cards">
                  {cards.map(t => (
                    <div key={t.id} className="pipeline-card" onClick={() => openEdit(t)}
                      style={
                        isBrief ? { borderLeft: '3px solid var(--c-resources)', background: 'rgba(139,92,246,0.04)' }
                        : isQueued ? { borderLeft: '3px solid var(--gold)', background: 'rgba(184,150,62,0.04)' }
                        : isArchived ? { borderLeft: '3px solid var(--text-muted)' }
                        : {}
                      }>
                      {t.from_analysis_id && isBrief && (
                        <div style={{ fontSize: '7px', letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--c-resources)', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span style={{ fontSize: '9px' }}>✦</span> From Analysis
                        </div>
                      )}
                      <div className="pipeline-card-name">{t.title}</div>
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', margin: '5px 0' }}>
                        {t.funnel_stage && (
                          <span style={{ fontSize: '7px', letterSpacing: '.12em', textTransform: 'uppercase', color: funnelColor[t.funnel_stage] || 'var(--text-muted)', background: `${funnelColor[t.funnel_stage] || 'var(--text-muted)'}18`, padding: '2px 6px' }}>{t.funnel_stage}</span>
                        )}
                        {t.ad_format && (
                          <span style={{ fontSize: '7px', letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--text-muted)', background: 'var(--surface3)', padding: '2px 6px' }}>{t.ad_format}</span>
                        )}
                      </div>
                      <div className="pipeline-card-detail">
                        {t.client_id ? clientName(t.client_id) : t.brand}
                        {t.due_date ? ` · Due ${new Date(t.due_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}` : ''}
                      </div>
                      {t.assigned_to && (
                        <div style={{ fontSize: '9px', color: 'var(--c-creative)', marginTop: '5px' }}>→ {assigneeName(t.assigned_to)}</div>
                      )}
                      {t.angle && <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '5px', lineHeight: 1.5, fontStyle: 'italic' }}>"{t.angle}"</div>}
                      {t.notes && <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px', lineHeight: 1.5 }}>{t.notes}</div>}

                      {/* Stage actions */}
                      <div style={{ display: 'flex', gap: '4px', marginTop: '10px', flexWrap: 'wrap' }}>
                        {isArchived ? (
                          <button onClick={e => { e.stopPropagation(); moveStage(t.id, 'Live') }}
                            style={{ background: 'var(--surface3)', border: 'none', color: 'var(--text-muted)', fontFamily: 'inherit', fontSize: '7px', letterSpacing: '.12em', textTransform: 'uppercase', padding: '3px 7px', cursor: 'pointer' }}>
                            ↩ Unarchive
                          </button>
                        ) : (
                          <>
                            {STAGES.filter(s => s !== stage).map(s => (
                              <button key={s} onClick={e => { e.stopPropagation(); moveStage(t.id, s) }}
                                style={{ background: 'var(--surface3)', border: 'none', color: 'var(--text-muted)', fontFamily: 'inherit', fontSize: '7px', letterSpacing: '.12em', textTransform: 'uppercase', padding: '3px 7px', cursor: 'pointer' }}>
                                → {s}
                              </button>
                            ))}
                            {stage === 'Live' && (
                              <button onClick={e => { e.stopPropagation(); moveStage(t.id, 'Archived') }}
                                style={{ background: 'rgba(239,68,68,0.06)', border: 'none', color: 'var(--text-muted)', fontFamily: 'inherit', fontSize: '7px', letterSpacing: '.12em', textTransform: 'uppercase', padding: '3px 7px', cursor: 'pointer' }}>
                                Archive
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {!isArchived && (
                  <div className="pipeline-add">
                    <button className="pipeline-add-btn" onClick={() => openNew(stage)}>+ Add</button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {modal && (
        <div className="modal-backdrop" onClick={() => setModal(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-title">{selected ? 'Edit Brief' : 'New Creative Brief'}</div>
            <button className="modal-close" onClick={() => setModal(false)}>×</button>

            <div className="form-row">
              <label className="form-label">Title</label>
              <input className="form-input" placeholder="What needs to be made?" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} autoFocus />
            </div>

            <div className="form-grid-2">
              <div className="form-row">
                <label className="form-label">Client</label>
                <select className="form-select" value={form.client_id} onChange={e => {
                  const c = clients.find(c => c.id === e.target.value)
                  setForm({ ...form, client_id: e.target.value, brand: c?.name || form.brand })
                }}>
                  <option value="">— Select client —</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="form-row">
                <label className="form-label">Channel</label>
                <select className="form-select" value={form.channel} onChange={e => setForm({ ...form, channel: e.target.value as CreativeTask['channel'] })}>
                  {CHANNELS.map(c => <option key={c} value={c}>{CHANNEL_LABELS[c]}</option>)}
                </select>
              </div>
              <div className="form-row">
                <label className="form-label">Funnel Stage</label>
                <select className="form-select" value={form.funnel_stage} onChange={e => setForm({ ...form, funnel_stage: e.target.value })}>
                  {FUNNEL_STAGES.map(s => <option key={s} value={s}>{s || '— None —'}</option>)}
                </select>
              </div>
              <div className="form-row">
                <label className="form-label">Ad Format</label>
                <select className="form-select" value={form.ad_format} onChange={e => setForm({ ...form, ad_format: e.target.value })}>
                  {AD_FORMATS.map(f => <option key={f} value={f}>{f || '— None —'}</option>)}
                </select>
              </div>
              <div className="form-row">
                <label className="form-label">Stage</label>
                <select className="form-select" value={form.stage} onChange={e => setForm({ ...form, stage: e.target.value })}>
                  {STAGES.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div className="form-row">
                <label className="form-label">Assign To</label>
                <select className="form-select" value={form.assigned_to} onChange={e => setForm({ ...form, assigned_to: e.target.value })}>
                  {team.map(m => <option key={m.email} value={m.email}>{m.name}</option>)}
                </select>
              </div>
              <div className="form-row">
                <label className="form-label">Due Date</label>
                <input className="form-input" type="date" value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })} />
              </div>
            </div>

            <div className="form-row">
              <label className="form-label">Angle / Pain Point</label>
              <input className="form-input" placeholder="e.g. 'Struggling to sleep? This fixed it for 10,000+ people'" value={form.angle} onChange={e => setForm({ ...form, angle: e.target.value })} />
            </div>
            <div className="form-row">
              <label className="form-label">Script / Creative Notes</label>
              <textarea className="form-textarea" style={{ minHeight: '100px' }} placeholder="Script outline, scene descriptions, key visuals, headlines, design direction..." value={form.script_notes} onChange={e => setForm({ ...form, script_notes: e.target.value })} />
            </div>
            <div className="form-row">
              <label className="form-label">Briefing Notes</label>
              <textarea className="form-textarea" placeholder="Additional context, references, do's and don'ts..." value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
            </div>
            <div className="form-row">
              <label className="form-label">Links</label>
              <input className="form-input" placeholder="Drive link, reference URLs..." value={form.links} onChange={e => setForm({ ...form, links: e.target.value })} />
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="submit-btn" onClick={save} style={{ flex: 1, marginTop: 0 }}>
                {selected ? 'Save Changes' : 'Create Brief'}
              </button>
              {selected && (
                <button onClick={() => deleteTask(selected.id)}
                  style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: 'var(--red)', fontFamily: 'inherit', fontSize: '9px', letterSpacing: '.15em', textTransform: 'uppercase', padding: '0 20px', cursor: 'pointer', marginTop: 0 }}>
                  Delete
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
