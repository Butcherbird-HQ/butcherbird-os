'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

type Mover = {
  id: string; user_id?: string; type: 'mover'; text: string; detail: string;
  entity: string; priority: 'critical' | 'high' | 'normal'; due_date: string; done: boolean;
}
type Task = { id: string; user_id?: string; type: 'daily'; text: string; entity: string; done: boolean; }
type Lead = { id: string; value: string; stage: string }

const ENTITIES = ['BBG', 'BUUB', 'Schnozz', 'Superior', 'Gobblers', 'Personal']
const PIPELINE_STAGES = ['Lead', 'Contacted', 'Call Booked', 'Proposal Sent', 'Closed', 'Onboarding', 'Live']

const priorityMeta = {
  critical: { label: 'Critical', color: 'var(--red)',   bg: 'rgba(239,68,68,0.1)' },
  high:     { label: 'High',     color: 'var(--amber)',  bg: 'rgba(245,158,11,0.1)' },
  normal:   { label: 'Normal',   color: 'var(--text-muted)', bg: 'var(--surface3)' },
}

const stageColors: Record<string, string> = {
  'Lead': 'var(--text-muted)', 'Contacted': 'var(--blue)', 'Call Booked': 'var(--amber)',
  'Proposal Sent': 'var(--gold)', 'Closed': 'var(--green)', 'Onboarding': 'var(--gold)', 'Live': 'var(--green)',
}

const blankMover: { text: string; detail: string; entity: string; priority: 'critical' | 'high' | 'normal'; due_date: string } = { text: '', detail: '', entity: 'BBG', priority: 'high', due_date: '' }

export default function ExecutivePage() {
  const [movers, setMovers] = useState<Mover[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [pipelineCounts, setPipelineCounts] = useState<Record<string, number>>({})
  const [liveCount, setLiveCount] = useState(0)
  const [userId, setUserId] = useState<string | null>(null)
  const [userName, setUserName] = useState('')
  const [taskInput, setTaskInput] = useState('')
  const [taskEntity, setTaskEntity] = useState('BBG')
  const [showMoverForm, setShowMoverForm] = useState(false)
  const [moverForm, setMoverForm] = useState(blankMover)
  const [expandedMover, setExpandedMover] = useState<string | null>(null)
  const [filterEntity, setFilterEntity] = useState('All')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)
      setUserName(user.user_metadata?.name?.split(' ')[0] || 'there')

      const [{ data: moversData }, { data: tasksData }, { data: leadsData }] = await Promise.all([
        supabase.from('tasks').select('*').eq('user_id', user.id).eq('type', 'mover'),
        supabase.from('tasks').select('*').eq('user_id', user.id).eq('type', 'daily'),
        supabase.from('crm_leads').select('id,value,stage'),
      ])
      if (moversData) setMovers(moversData)
      if (tasksData) setTasks(tasksData)
      if (leadsData) {
        const counts: Record<string, number> = {}
        leadsData.forEach((l: Lead) => { counts[l.stage] = (counts[l.stage] || 0) + 1 })
        setPipelineCounts(counts)
        setLiveCount(leadsData.filter((l: Lead) => l.stage === 'Live').length)
      }
      setLoading(false)
    }
    load()
  }, [])

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  const openMovers = movers.filter(m => !m.done)
  const doneMovers = movers.filter(m => m.done)
  const filtered = filterEntity === 'All' ? openMovers : openMovers.filter(m => m.entity === filterEntity)
  const openTasks = tasks.filter(t => !t.done)
  const doneTasks = tasks.filter(t => t.done)

  async function addMover() {
    if (!moverForm.text.trim() || !userId) return
    const m: Mover = { id: Date.now().toString(), user_id: userId, type: 'mover', done: false, ...moverForm }
    setMovers(prev => [...prev, m])
    await supabase.from('tasks').insert(m)
    setMoverForm(blankMover)
    setShowMoverForm(false)
  }

  async function toggleMover(id: string) {
    const m = movers.find(x => x.id === id)!
    const updated = { ...m, done: !m.done }
    setMovers(prev => prev.map(x => x.id === id ? updated : x))
    await supabase.from('tasks').update({ done: updated.done }).eq('id', id)
  }

  async function deleteMover(id: string) {
    setMovers(prev => prev.filter(x => x.id !== id))
    await supabase.from('tasks').delete().eq('id', id)
  }

  async function addTask() {
    if (!taskInput.trim() || !userId) return
    const t: Task = { id: Date.now().toString(), user_id: userId, type: 'daily', text: taskInput.trim(), entity: taskEntity, done: false }
    setTasks(prev => [...prev, t])
    await supabase.from('tasks').insert(t)
    setTaskInput('')
  }

  async function toggleTask(id: string) {
    const t = tasks.find(x => x.id === id)!
    const updated = { ...t, done: !t.done }
    setTasks(prev => prev.map(x => x.id === id ? updated : x))
    await supabase.from('tasks').update({ done: updated.done }).eq('id', id)
  }

  async function deleteTask(id: string) {
    setTasks(prev => prev.filter(x => x.id !== id))
    await supabase.from('tasks').delete().eq('id', id)
  }

  const entityColor: Record<string, string> = {
    BBG: 'var(--gold)', BUUB: 'var(--blue)', Schnozz: 'var(--amber)',
    Superior: 'var(--text-light)', Gobblers: 'var(--green)', Personal: 'var(--text-muted)',
  }

  if (loading) return <div style={{ padding: '48px', color: 'var(--text-muted)', fontSize: '11px', letterSpacing: '.1em' }}>Loading...</div>

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-dept-tag" style={{ background: 'var(--gold-alpha)', color: 'var(--gold)' }}>Executive</div>
          <div className="page-title">{greeting}, {userName}</div>
          <div className="page-subtitle">{openMovers.length} big movers · {openTasks.length} tasks open</div>
        </div>
      </div>

      <div className="page-body">
        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '8px', marginBottom: '24px' }}>
          {[
            { val: liveCount, label: 'Live Clients', color: 'var(--c-clients)' },
            { val: openMovers.length, label: 'Big Movers Open', color: 'var(--gold)' },
            { val: openTasks.length, label: 'Tasks Today', color: 'var(--c-outreach)' },
          ].map(s => (
            <div key={s.label} className="stat-card" style={{ '--stat-color': s.color } as React.CSSProperties}>
              <div className="stat-card-val">{s.val}</div>
              <div className="stat-card-label">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Big Movers */}
        <div className="card" style={{ borderLeft: '3px solid var(--gold)', marginBottom: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div className="card-title" style={{ margin: 0 }}>Big Movers</div>
              <div style={{ background: 'var(--gold)', color: '#0A0A0A', fontWeight: 700, fontSize: '11px', minWidth: '26px', height: '26px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 6px' }}>{openMovers.length}</div>
            </div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {['All', ...ENTITIES].map(e => (
                <button key={e} onClick={() => setFilterEntity(e)}
                  style={{ background: filterEntity === e ? 'var(--surface3)' : 'none', color: filterEntity === e ? 'var(--text)' : 'var(--text-muted)', border: '1px solid var(--border)', fontFamily: 'inherit', fontSize: '8px', letterSpacing: '.15em', textTransform: 'uppercase', padding: '5px 10px', cursor: 'pointer' }}>
                  {e}
                </button>
              ))}
              <button onClick={() => setShowMoverForm(!showMoverForm)}
                style={{ background: 'var(--gold)', color: '#0A0A0A', border: 'none', fontFamily: 'inherit', fontSize: '8px', fontWeight: 700, letterSpacing: '.15em', textTransform: 'uppercase', padding: '5px 14px', cursor: 'pointer' }}>
                + Add
              </button>
            </div>
          </div>

          {showMoverForm && (
            <div style={{ background: 'var(--surface2)', border: '1px solid var(--border-strong)', padding: '20px', marginBottom: '12px' }}>
              <div className="form-grid-2" style={{ marginBottom: '12px' }}>
                <div style={{ gridColumn: '1/-1' }}>
                  <label className="form-label">Task</label>
                  <input className="form-input" placeholder="What needs to happen?" value={moverForm.text} onChange={e => setMoverForm({ ...moverForm, text: e.target.value })} autoFocus />
                </div>
                <div style={{ gridColumn: '1/-1' }}>
                  <label className="form-label">Detail / Context</label>
                  <input className="form-input" placeholder="Why does this matter?" value={moverForm.detail} onChange={e => setMoverForm({ ...moverForm, detail: e.target.value })} />
                </div>
                <div>
                  <label className="form-label">Entity</label>
                  <select className="form-select" value={moverForm.entity} onChange={e => setMoverForm({ ...moverForm, entity: e.target.value })}>
                    {ENTITIES.map(e => <option key={e}>{e}</option>)}
                  </select>
                </div>
                <div>
                  <label className="form-label">Priority</label>
                  <select className="form-select" value={moverForm.priority} onChange={e => setMoverForm({ ...moverForm, priority: e.target.value as Mover['priority'] })}>
                    {(['critical', 'high', 'normal'] as const).map(p => <option key={p} value={p}>{priorityMeta[p].label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="form-label">Due Date (optional)</label>
                  <input className="form-input" type="date" value={moverForm.due_date} onChange={e => setMoverForm({ ...moverForm, due_date: e.target.value })} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="add-btn" onClick={addMover}>Add Big Mover</button>
                <button onClick={() => { setShowMoverForm(false); setMoverForm(blankMover) }}
                  style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--text-muted)', fontFamily: 'inherit', fontSize: '9px', letterSpacing: '.15em', textTransform: 'uppercase', padding: '0 16px', cursor: 'pointer' }}>
                  Cancel
                </button>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {filtered.sort((a, b) => ({ critical: 0, high: 1, normal: 2 }[a.priority] - { critical: 0, high: 1, normal: 2 }[b.priority])).map(m => (
              <div key={m.id} style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderLeft: `3px solid ${priorityMeta[m.priority].color}` }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '13px 16px', cursor: 'pointer' }} onClick={() => setExpandedMover(expandedMover === m.id ? null : m.id)}>
                  <div onClick={e => { e.stopPropagation(); toggleMover(m.id) }}
                    style={{ width: '18px', height: '18px', border: `2px solid ${priorityMeta[m.priority].color}`, borderRadius: '3px', flexShrink: 0, marginTop: '1px', cursor: 'pointer' }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text)' }}>{m.text}</span>
                      <span className="pill" style={{ background: priorityMeta[m.priority].bg, color: priorityMeta[m.priority].color }}>{priorityMeta[m.priority].label}</span>
                      <span className="pill" style={{ background: 'var(--surface3)', color: entityColor[m.entity] || 'var(--text-muted)' }}>{m.entity}</span>
                      {m.due_date && <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>Due {new Date(m.due_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>}
                    </div>
                    {m.detail && expandedMover !== m.id && <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.detail}</div>}
                    {expandedMover === m.id && m.detail && <div style={{ fontSize: '11px', color: 'var(--text-light)', marginTop: '8px', lineHeight: 1.7 }}>{m.detail}</div>}
                  </div>
                  <button onClick={e => { e.stopPropagation(); deleteMover(m.id) }} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '18px', lineHeight: 1, padding: '0 2px' }}>×</button>
                </div>
              </div>
            ))}
            {filtered.length === 0 && <div style={{ padding: '28px', textAlign: 'center', fontSize: '10px', color: 'var(--text-muted)' }}>No open big movers.</div>}
          </div>

          {doneMovers.length > 0 && (
            <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--border)' }}>
              <div style={{ fontSize: '8px', letterSpacing: '.2em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '8px' }}>Completed ({doneMovers.length})</div>
              {doneMovers.map(m => (
                <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 13px', background: 'var(--surface2)', border: '1px solid var(--border)', marginBottom: '3px', opacity: 0.4 }}>
                  <div onClick={() => toggleMover(m.id)} style={{ width: '18px', height: '18px', background: 'var(--gold)', border: '1px solid var(--gold)', borderRadius: '3px', flexShrink: 0, cursor: 'pointer' }} />
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', textDecoration: 'line-through', flex: 1 }}>{m.text}</span>
                  <button onClick={() => deleteMover(m.id)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '16px' }}>×</button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Tasks + Pipeline */}
        <div className="grid-2">
          <div className="card">
            <div className="card-title">Daily Tasks</div>
            <div className="task-list" style={{ marginBottom: '10px' }}>
              {openTasks.map(t => (
                <div key={t.id} className="task-item" onClick={() => toggleTask(t.id)}>
                  <div className="task-check" />
                  <span className="task-text">{t.text}</span>
                  <span className="task-tag" style={{ color: entityColor[t.entity] || 'var(--text-muted)' }}>{t.entity}</span>
                  <button onClick={e => { e.stopPropagation(); deleteTask(t.id) }} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '16px', lineHeight: 1 }}>×</button>
                </div>
              ))}
              {doneTasks.map(t => (
                <div key={t.id} className={`task-item done`} onClick={() => toggleTask(t.id)}>
                  <div className="task-check" />
                  <span className="task-text">{t.text}</span>
                  <button onClick={e => { e.stopPropagation(); deleteTask(t.id) }} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '16px', lineHeight: 1 }}>×</button>
                </div>
              ))}
              {openTasks.length === 0 && doneTasks.length === 0 && <div style={{ padding: '20px', textAlign: 'center', fontSize: '10px', color: 'var(--text-muted)' }}>No tasks. Add one below.</div>}
            </div>
            <div className="task-add">
              <input className="task-input" placeholder="Add a task..." value={taskInput} onChange={e => setTaskInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && addTask()} />
              <select className="form-select" style={{ width: '90px' }} value={taskEntity} onChange={e => setTaskEntity(e.target.value)}>
                {ENTITIES.map(e => <option key={e}>{e}</option>)}
              </select>
              <button className="add-btn" onClick={addTask}>Add</button>
            </div>
          </div>

          <div className="card">
            <div className="card-title">Pipeline Snapshot</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
              {PIPELINE_STAGES.map(s => (
                <div key={s} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '11px 14px', background: 'var(--surface2)', border: '1px solid var(--border)' }}>
                  <span style={{ fontSize: '10px', letterSpacing: '.12em', textTransform: 'uppercase', color: stageColors[s] }}>{s}</span>
                  <span style={{ fontSize: '20px', fontWeight: 700, color: pipelineCounts[s] ? stageColors[s] : 'var(--surface3)' }}>{pipelineCounts[s] || 0}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
