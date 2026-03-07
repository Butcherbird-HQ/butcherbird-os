'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

type Mover = {
  id: string
  text: string
  detail: string
  entity: string
  priority: 'critical' | 'high' | 'normal'
  dueDate: string
  done: boolean
}

type Task = {
  id: string
  text: string
  entity: string
  done: boolean
}

type Lead = { id: string; value: string; stage: string }

const ENTITIES = ['BBG', 'BUUB', 'Schnozz', 'Superior', 'Gobblers', 'Personal']
const PRIORITIES = ['critical', 'high', 'normal'] as const

const priorityStyle: Record<string, { label: string; color: string; bg: string }> = {
  critical: { label: 'Critical', color: 'var(--red)', bg: 'rgba(224,90,90,.12)' },
  high: { label: 'High', color: 'var(--amber)', bg: 'rgba(224,168,90,.12)' },
  normal: { label: 'Normal', color: 'var(--mid)', bg: 'var(--dark3)' },
}

const defaultMovers: Mover[] = [
  { id: '1', text: 'Sign first new external client at $6K+/month', detail: 'Target: UAE/UK/US DTC founder. Clone the Hiba Balfaqih profile. Build outreach ICP list first.', entity: 'BBG', priority: 'critical', dueDate: '', done: false },
  { id: '2', text: 'Launch Hiba Balfaqih course campaign', detail: 'Infrastructure is fully built. Coordinate go-live date. Fire Meta campaigns on launch day.', entity: 'BBG', priority: 'critical', dueDate: '', done: false },
  { id: '3', text: 'Fix Schnozz sold-out stock / staging issue', detail: 'All adult strips showing sold out — killing all conversions. Diagnose: stock issue or staging bug?', entity: 'Schnozz', priority: 'high', dueDate: '', done: false },
  { id: '4', text: 'Brief Gobblers brand world + 3 hero SKUs', detail: 'Define mascot universe, product positioning, packaging brief. Nothing built yet.', entity: 'Gobblers', priority: 'high', dueDate: '', done: false },
  { id: '5', text: 'Build cold outreach ICP list — first 25 leads', detail: 'UAE, UK, US DTC founders. $1M+ revenue. Actively running Meta ads. Use Ad Library + LinkedIn.', entity: 'BBG', priority: 'high', dueDate: '', done: false },
]

const defaultTasks: Task[] = [
  { id: '1', text: 'Review Helpdesk ad performance', entity: 'BBG', done: false },
  { id: '2', text: 'Brief new UGC batch for Schnozz', entity: 'Schnozz', done: false },
  { id: '3', text: 'Update BBG website copy', entity: 'BBG', done: false },
]

const PIPELINE_STAGES = ['Lead', 'Contacted', 'Call Booked', 'Proposal Sent', 'Closed', 'Onboarding', 'Live']
const stageColors: Record<string, string> = {
  'Lead': 'var(--mid)', 'Contacted': 'var(--blue)', 'Call Booked': 'var(--amber)',
  'Proposal Sent': 'var(--gold)', 'Closed': 'var(--green)', 'Onboarding': 'var(--gold)', 'Live': 'var(--green)',
}

const emptyMover: Omit<Mover, 'id' | 'done'> = { text: '', detail: '', entity: 'BBG', priority: 'high', dueDate: '' }

export default function DashboardPage() {
  const [movers, setMovers] = useState<Mover[]>(defaultMovers)
  const [tasks, setTasks] = useState<Task[]>(defaultTasks)
  const [liveClients, setLiveClients] = useState<Lead[]>([])
  const [pipelineCounts, setPipelineCounts] = useState<Record<string, number>>({})
  const [taskInput, setTaskInput] = useState('')
  const [taskEntity, setTaskEntity] = useState('BBG')
  const [showMoverForm, setShowMoverForm] = useState(false)
  const [moverForm, setMoverForm] = useState<Omit<Mover, 'id' | 'done'>>(emptyMover)
  const [expandedMover, setExpandedMover] = useState<string | null>(null)
  const [filterEntity, setFilterEntity] = useState('All')

  useEffect(() => {
    const m = localStorage.getItem('bbg-movers')
    if (m) setMovers(JSON.parse(m))
    const t = localStorage.getItem('bbg-tasks-v2')
    if (t) setTasks(JSON.parse(t))
    supabase.from('crm_leads').select('id,value,stage').then(({ data }) => {
      if (!data) return
      setLiveClients(data.filter((l: Lead) => l.stage === 'Live'))
      const counts: Record<string, number> = {}
      data.forEach((l: Lead) => { counts[l.stage] = (counts[l.stage] || 0) + 1 })
      setPipelineCounts(counts)
    })
  }, [])

  function saveMovers(u: Mover[]) { setMovers(u); localStorage.setItem('bbg-movers', JSON.stringify(u)) }
  function saveTasks(u: Task[]) { setTasks(u); localStorage.setItem('bbg-tasks-v2', JSON.stringify(u)) }

  function toggleMover(id: string) { saveMovers(movers.map(m => m.id === id ? { ...m, done: !m.done } : m)) }
  function deleteMover(id: string) { saveMovers(movers.filter(m => m.id !== id)) }
  function addMover() {
    if (!moverForm.text.trim()) return
    saveMovers([...movers, { id: Date.now().toString(), done: false, ...moverForm }])
    setMoverForm(emptyMover)
    setShowMoverForm(false)
  }

  function toggleTask(id: string) { saveTasks(tasks.map(t => t.id === id ? { ...t, done: !t.done } : t)) }
  function deleteTask(id: string) { saveTasks(tasks.filter(t => t.id !== id)) }
  function addTask() {
    if (!taskInput.trim()) return
    saveTasks([...tasks, { id: Date.now().toString(), text: taskInput.trim(), entity: taskEntity, done: false }])
    setTaskInput('')
  }

  const openMovers = movers.filter(m => !m.done)
  const doneMovers = movers.filter(m => m.done)
  const openTasks = tasks.filter(t => !t.done)
  const doneTasks = tasks.filter(t => t.done)

  const filteredMovers = filterEntity === 'All' ? openMovers : openMovers.filter(m => m.entity === filterEntity)

  const entityColor: Record<string, string> = {
    'BBG': 'var(--gold)', 'BUUB': 'var(--blue)', 'Schnozz': 'var(--amber)',
    'Superior': 'var(--light)', 'Gobblers': 'var(--green)', 'Personal': 'var(--mid)',
  }

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Dashboard</div>
          <div className="page-subtitle">{openMovers.length} big movers · {openTasks.length} tasks open</div>
        </div>
      </div>

      <div className="page-body">

        {/* Stats */}
        <div className="stat-row" style={{ gridTemplateColumns: 'repeat(2, 1fr)', marginBottom: '24px' }}>
          <div className="stat-card">
            <div className="stat-card-val">{liveClients.length}</div>
            <div className="stat-card-label">Live Clients</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-val" style={{ fontSize: '16px', paddingTop: '4px' }}>
              {liveClients.length === 0 ? '—' : liveClients.map(c => c.value).filter(Boolean).join(' + ') || '—'}
            </div>
            <div className="stat-card-label">Est. Monthly Revenue</div>
          </div>
        </div>

        {/* Big Movers */}
        <div className="card" style={{ borderLeft: '3px solid var(--gold)', marginBottom: '2px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div className="card-title" style={{ marginBottom: 0 }}>Big Movers</div>
              <div style={{ background: 'var(--gold)', color: 'var(--black)', fontWeight: 700, fontSize: '11px', minWidth: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 6px' }}>{openMovers.length}</div>
              <span style={{ fontSize: '9px', color: 'var(--mid)', letterSpacing: '.08em' }}>High-leverage actions that move the needle</span>
            </div>
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
              {/* Entity filter */}
              {['All', ...ENTITIES].map(e => (
                <button key={e} onClick={() => setFilterEntity(e)}
                  style={{ background: filterEntity === e ? 'var(--dark3)' : 'none', color: filterEntity === e ? 'var(--off-white)' : 'var(--mid)', border: '1px solid var(--border)', fontFamily: 'inherit', fontSize: '8px', letterSpacing: '.15em', textTransform: 'uppercase', padding: '4px 10px', cursor: 'pointer' }}>
                  {e}
                </button>
              ))}
              <button onClick={() => setShowMoverForm(!showMoverForm)}
                style={{ background: 'var(--gold)', color: 'var(--black)', border: 'none', fontFamily: 'inherit', fontSize: '8px', fontWeight: 700, letterSpacing: '.15em', textTransform: 'uppercase', padding: '6px 14px', cursor: 'pointer', marginLeft: '4px' }}>
                + Add
              </button>
            </div>
          </div>

          {/* Add mover form */}
          {showMoverForm && (
            <div style={{ background: 'var(--dark)', border: '1px solid var(--gold)', padding: '16px', marginBottom: '12px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label">Task</label>
                  <input className="form-input" placeholder="What needs to happen?" value={moverForm.text} onChange={e => setMoverForm({ ...moverForm, text: e.target.value })} autoFocus />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label">Detail / Context</label>
                  <input className="form-input" placeholder="Why does this matter? What's the context?" value={moverForm.detail} onChange={e => setMoverForm({ ...moverForm, detail: e.target.value })} />
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
                    {PRIORITIES.map(p => <option key={p} value={p}>{priorityStyle[p].label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="form-label">Due Date (optional)</label>
                  <input className="form-input" type="date" value={moverForm.dueDate} onChange={e => setMoverForm({ ...moverForm, dueDate: e.target.value })} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="add-btn" onClick={addMover} style={{ padding: '10px 20px' }}>Add Big Mover</button>
                <button onClick={() => { setShowMoverForm(false); setMoverForm(emptyMover) }}
                  style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--mid)', fontFamily: 'inherit', fontSize: '9px', letterSpacing: '.15em', textTransform: 'uppercase', padding: '10px 16px', cursor: 'pointer' }}>Cancel</button>
              </div>
            </div>
          )}

          {/* Mover list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {filteredMovers.sort((a, b) => {
              const order = { critical: 0, high: 1, normal: 2 }
              return order[a.priority] - order[b.priority]
            }).map(m => (
              <div key={m.id}
                style={{ background: 'var(--dark)', border: `1px solid var(--border)`, borderLeft: `3px solid ${priorityStyle[m.priority].color}`, overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '12px 14px', cursor: 'pointer' }}
                  onClick={() => setExpandedMover(expandedMover === m.id ? null : m.id)}>
                  <div onClick={e => { e.stopPropagation(); toggleMover(m.id) }}
                    style={{ width: '16px', height: '16px', border: `1px solid ${priorityStyle[m.priority].color}`, borderRadius: '2px', flexShrink: 0, marginTop: '1px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none' }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--off-white)', letterSpacing: '.02em' }}>{m.text}</span>
                      <span style={{ fontSize: '8px', letterSpacing: '.15em', textTransform: 'uppercase', padding: '2px 7px', background: priorityStyle[m.priority].bg, color: priorityStyle[m.priority].color, flexShrink: 0 }}>{priorityStyle[m.priority].label}</span>
                      <span style={{ fontSize: '8px', letterSpacing: '.15em', textTransform: 'uppercase', padding: '2px 7px', background: 'var(--dark2)', color: entityColor[m.entity] || 'var(--mid)', flexShrink: 0 }}>{m.entity}</span>
                      {m.dueDate && <span style={{ fontSize: '9px', color: 'var(--mid)' }}>Due {new Date(m.dueDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>}
                    </div>
                    {m.detail && expandedMover !== m.id && (
                      <div style={{ fontSize: '10px', color: 'var(--mid)', marginTop: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.detail}</div>
                    )}
                    {expandedMover === m.id && m.detail && (
                      <div style={{ fontSize: '11px', color: 'var(--light)', marginTop: '8px', lineHeight: 1.7 }}>{m.detail}</div>
                    )}
                  </div>
                  <button onClick={e => { e.stopPropagation(); deleteMover(m.id) }}
                    style={{ background: 'none', border: 'none', color: 'var(--mid)', cursor: 'pointer', fontSize: '16px', lineHeight: 1, flexShrink: 0, padding: '0 4px' }}>×</button>
                </div>
              </div>
            ))}
            {filteredMovers.length === 0 && (
              <div style={{ padding: '24px', textAlign: 'center', fontSize: '10px', color: 'var(--mid)' }}>
                {filterEntity !== 'All' ? `No open big movers for ${filterEntity}` : 'No big movers. Add one above.'}
              </div>
            )}
          </div>

          {/* Done movers (collapsed) */}
          {doneMovers.length > 0 && (
            <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--border)' }}>
              <div style={{ fontSize: '8px', letterSpacing: '.2em', textTransform: 'uppercase', color: 'var(--mid)', marginBottom: '8px' }}>Completed ({doneMovers.length})</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                {doneMovers.map(m => (
                  <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px', background: 'var(--dark)', border: '1px solid var(--border)', opacity: 0.45 }}>
                    <div onClick={() => toggleMover(m.id)}
                      style={{ width: '16px', height: '16px', background: 'var(--gold)', border: '1px solid var(--gold)', borderRadius: '2px', flexShrink: 0, cursor: 'pointer' }} />
                    <span style={{ fontSize: '11px', color: 'var(--mid)', textDecoration: 'line-through', flex: 1 }}>{m.text}</span>
                    <span style={{ fontSize: '8px', color: 'var(--mid)', textTransform: 'uppercase', letterSpacing: '.12em' }}>{m.entity}</span>
                    <button onClick={() => deleteMover(m.id)} style={{ background: 'none', border: 'none', color: 'var(--mid)', cursor: 'pointer', fontSize: '14px' }}>×</button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Tasks + Pipeline row */}
        <div className="grid-2" style={{ marginTop: '2px' }}>
          {/* Tasks */}
          <div className="card">
            <div className="card-title">Tasks</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginBottom: '10px' }}>
              {openTasks.map(t => (
                <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', background: 'var(--dark)', border: '1px solid var(--border)' }}>
                  <div onClick={() => toggleTask(t.id)}
                    style={{ width: '14px', height: '14px', border: '1px solid var(--mid)', borderRadius: '2px', flexShrink: 0, cursor: 'pointer' }} />
                  <span style={{ fontSize: '11px', color: 'var(--light)', flex: 1 }}>{t.text}</span>
                  <span style={{ fontSize: '8px', letterSpacing: '.12em', textTransform: 'uppercase', color: entityColor[t.entity] || 'var(--mid)', background: 'var(--dark2)', padding: '2px 7px', flexShrink: 0 }}>{t.entity}</span>
                  <button onClick={() => deleteTask(t.id)} style={{ background: 'none', border: 'none', color: 'var(--mid)', cursor: 'pointer', fontSize: '14px', lineHeight: 1 }}>×</button>
                </div>
              ))}
              {doneTasks.map(t => (
                <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', background: 'var(--dark)', border: '1px solid var(--border)', opacity: 0.4 }}>
                  <div onClick={() => toggleTask(t.id)}
                    style={{ width: '14px', height: '14px', background: 'var(--gold)', border: '1px solid var(--gold)', borderRadius: '2px', flexShrink: 0, cursor: 'pointer' }} />
                  <span style={{ fontSize: '11px', color: 'var(--mid)', flex: 1, textDecoration: 'line-through' }}>{t.text}</span>
                  <button onClick={() => deleteTask(t.id)} style={{ background: 'none', border: 'none', color: 'var(--mid)', cursor: 'pointer', fontSize: '14px' }}>×</button>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              <input className="task-input" style={{ flex: 1 }} placeholder="Add a task..." value={taskInput}
                onChange={e => setTaskInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && addTask()} />
              <select className="form-select" style={{ width: '90px', padding: '0 8px' }} value={taskEntity} onChange={e => setTaskEntity(e.target.value)}>
                {ENTITIES.map(e => <option key={e}>{e}</option>)}
              </select>
              <button className="add-btn" onClick={addTask} style={{ padding: '0 14px' }}>Add</button>
            </div>
          </div>

          {/* Pipeline snapshot */}
          <div className="card">
            <div className="card-title">Pipeline Snapshot</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {PIPELINE_STAGES.map(s => (
                <div key={s} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'var(--dark)', border: '1px solid var(--border)' }}>
                  <span style={{ fontSize: '10px', letterSpacing: '.12em', textTransform: 'uppercase', color: stageColors[s] }}>{s}</span>
                  <span style={{ fontSize: '18px', fontWeight: 700, color: pipelineCounts[s] ? stageColors[s] : 'var(--dark3)' }}>{pipelineCounts[s] || 0}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </>
  )
}
