'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

type CreativeTask = {
  id: string; channel: 'static' | 'video' | 'email'; stage: string;
  title: string; brand: string; due_date: string; notes: string; links: string; assigned_to: string;
}

const CHANNELS = ['static', 'video', 'email'] as const
const CHANNEL_LABELS = { static: 'Static Ads', video: 'Video Ads', email: 'Email Marketing' }
const STAGES = ['Brief', 'In Progress', 'Review', 'Approved', 'Live']
const BRANDS = ['BBG', 'BUUB', 'Schnozz', 'Superior', 'Gobblers', 'Hiba', 'Helpdesk', 'Other']
const TEAM = [
  { email: '', name: 'Unassigned' },
  { email: 'g@butcherbird.global', name: 'Gascoyne' },
  { email: 'tian@butcherbird.global', name: 'Tian' },
]

const blank: Omit<CreativeTask, 'id'> = { channel: 'static', stage: 'Brief', title: '', brand: 'BBG', due_date: '', notes: '', links: '', assigned_to: '' }

const stageColor: Record<string, string> = {
  Brief: 'var(--text-muted)', 'In Progress': 'var(--blue)', Review: 'var(--amber)',
  Approved: 'var(--c-clients)', Live: 'var(--green)',
}

export default function CreativePage() {
  const [tasks, setTasks] = useState<CreativeTask[]>([])
  const [channel, setChannel] = useState<'static' | 'video' | 'email'>('static')
  const [modal, setModal] = useState(false)
  const [selected, setSelected] = useState<CreativeTask | null>(null)
  const [form, setForm] = useState<Omit<CreativeTask, 'id'>>(blank)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('creative_tasks').select('*').then(({ data }) => {
      if (data) setTasks(data)
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
    setForm({ channel: t.channel, stage: t.stage, title: t.title, brand: t.brand, due_date: t.due_date, notes: t.notes, links: t.links, assigned_to: t.assigned_to || '' })
    setModal(true)
  }

  async function save() {
    if (!form.title.trim()) return
    if (selected) {
      const updated = { ...selected, ...form }
      setTasks(prev => prev.map(t => t.id === selected.id ? updated : t))
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

  const channelTasks = tasks.filter(t => t.channel === channel)
  const total = channelTasks.length
  const live = channelTasks.filter(t => t.stage === 'Live').length

  const assigneeName = (email: string) => TEAM.find(t => t.email === email)?.name || ''

  if (loading) return <div style={{ padding: '48px', color: 'var(--text-muted)', fontSize: '11px', letterSpacing: '.1em' }}>Loading...</div>

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-dept-tag" style={{ background: 'rgba(224,123,57,0.12)', color: 'var(--c-creative)' }}>Creative</div>
          <div className="page-title">Creative Pipeline</div>
          <div className="page-subtitle">{total} cards · {live} live</div>
        </div>
        <button className="btn btn-primary" onClick={() => openNew('Brief')}>+ New Card</button>
      </div>

      <div className="page-body" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div className="tabs" style={{ '--tab-color': 'var(--c-creative)' } as React.CSSProperties}>
          {CHANNELS.map(c => (
            <button key={c} className={`tab${channel === c ? ' active' : ''}`} onClick={() => setChannel(c)}>
              {CHANNEL_LABELS[c]}
              <span style={{ marginLeft: '8px', fontSize: '9px', background: 'var(--surface2)', padding: '1px 7px', borderRadius: '2px', color: 'var(--text-muted)' }}>
                {tasks.filter(t => t.channel === c).length}
              </span>
            </button>
          ))}
        </div>

        <div className="pipeline">
          {STAGES.map(stage => {
            const cards = channelTasks.filter(t => t.stage === stage)
            return (
              <div key={stage} className="pipeline-col">
                <div className="pipeline-col-header">
                  <span className="pipeline-col-title" style={{ color: stageColor[stage] }}>{stage}</span>
                  <span className="pipeline-col-count">{cards.length}</span>
                </div>
                <div className="pipeline-cards">
                  {cards.map(t => (
                    <div key={t.id} className="pipeline-card" onClick={() => openEdit(t)}>
                      <div className="pipeline-card-name">{t.title}</div>
                      <div className="pipeline-card-detail">{t.brand}{t.due_date ? ` · Due ${new Date(t.due_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}` : ''}</div>
                      {t.assigned_to && (
                        <div style={{ fontSize: '9px', color: 'var(--c-creative)', marginTop: '5px', letterSpacing: '.05em' }}>
                          → {assigneeName(t.assigned_to)}
                        </div>
                      )}
                      {t.notes && <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '6px', lineHeight: 1.5 }}>{t.notes}</div>}
                      <div style={{ display: 'flex', gap: '4px', marginTop: '10px', flexWrap: 'wrap' }}>
                        {STAGES.filter(s => s !== stage).map(s => (
                          <button key={s} onClick={e => { e.stopPropagation(); moveStage(t.id, s) }}
                            style={{ background: 'var(--surface3)', border: 'none', color: 'var(--text-muted)', fontFamily: 'inherit', fontSize: '7px', letterSpacing: '.12em', textTransform: 'uppercase', padding: '3px 7px', cursor: 'pointer' }}>
                            → {s}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="pipeline-add">
                  <button className="pipeline-add-btn" onClick={() => openNew(stage)}>+ Add</button>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {modal && (
        <div className="modal-backdrop" onClick={() => setModal(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-title">{selected ? 'Edit Card' : 'New Creative Card'}</div>
            <button className="modal-close" onClick={() => setModal(false)}>×</button>

            <div className="form-row">
              <label className="form-label">Title</label>
              <input className="form-input" placeholder="What needs to be made?" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} autoFocus />
            </div>
            <div className="form-grid-2">
              <div className="form-row">
                <label className="form-label">Channel</label>
                <select className="form-select" value={form.channel} onChange={e => setForm({ ...form, channel: e.target.value as CreativeTask['channel'] })}>
                  {CHANNELS.map(c => <option key={c} value={c}>{CHANNEL_LABELS[c]}</option>)}
                </select>
              </div>
              <div className="form-row">
                <label className="form-label">Stage</label>
                <select className="form-select" value={form.stage} onChange={e => setForm({ ...form, stage: e.target.value })}>
                  {STAGES.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div className="form-row">
                <label className="form-label">Brand</label>
                <select className="form-select" value={form.brand} onChange={e => setForm({ ...form, brand: e.target.value })}>
                  {BRANDS.map(b => <option key={b}>{b}</option>)}
                </select>
              </div>
              <div className="form-row">
                <label className="form-label">Assign To</label>
                <select className="form-select" value={form.assigned_to} onChange={e => setForm({ ...form, assigned_to: e.target.value })}>
                  {TEAM.map(m => <option key={m.email} value={m.email}>{m.name}</option>)}
                </select>
              </div>
              <div className="form-row">
                <label className="form-label">Due Date</label>
                <input className="form-input" type="date" value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })} />
              </div>
            </div>
            <div className="form-row">
              <label className="form-label">Notes</label>
              <textarea className="form-textarea" placeholder="Briefing notes, context, feedback..." value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
            </div>
            <div className="form-row">
              <label className="form-label">Links (comma separated)</label>
              <input className="form-input" placeholder="Drive link, reference URLs..." value={form.links} onChange={e => setForm({ ...form, links: e.target.value })} />
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="submit-btn" onClick={save} style={{ flex: 1, marginTop: 0 }}>
                {selected ? 'Save Changes' : 'Create Card'}
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
