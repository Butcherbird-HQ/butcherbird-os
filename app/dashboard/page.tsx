'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

type CalEvent = {
  id: string; user_id: string; title: string; date: string; time: string;
  end_date: string; description: string; visibility: string; color: string;
}
type CreativeDeadline = { id: string; title: string; due_date: string; brand: string; stage: string }

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
const WEEKDAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']
const COLORS = ['gold','blue','green','red','purple','teal']
const COLOR_VAR: Record<string, string> = {
  gold: 'var(--gold)', blue: 'var(--blue)', green: 'var(--green)',
  red: 'var(--red)', purple: 'var(--c-resources)', teal: 'var(--c-clients)',
}

const blank = { title: '', date: '', time: '', end_date: '', description: '', visibility: 'all', color: 'gold' }

export default function CalendarPage() {
  const [events, setEvents] = useState<CalEvent[]>([])
  const [deadlines, setDeadlines] = useState<CreativeDeadline[]>([])
  const [viewDate, setViewDate] = useState(() => { const t = new Date(); return new Date(t.getFullYear(), t.getMonth(), 1) })
  const [view, setView] = useState<'month' | 'list'>('month')
  const [modal, setModal] = useState(false)
  const [selected, setSelected] = useState<CalEvent | null>(null)
  const [form, setForm] = useState(blank)
  const [userId, setUserId] = useState('')
  const [loading, setLoading] = useState(true)

  const today = new Date().toISOString().slice(0, 10)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)
      const [{ data: evts }, { data: dl }] = await Promise.all([
        supabase.from('calendar_events').select('*').or(`visibility.eq.all,user_id.eq.${user.id}`),
        supabase.from('creative_tasks').select('id,title,due_date,brand,stage').neq('due_date', ''),
      ])
      if (evts) setEvents(evts)
      if (dl) setDeadlines(dl.filter((d: CreativeDeadline) => d.due_date))
      setLoading(false)
    }
    load()
  }, [])

  function buildGrid() {
    const year = viewDate.getFullYear(), month = viewDate.getMonth()
    const firstDay = new Date(year, month, 1)
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const startOffset = (firstDay.getDay() + 6) % 7
    const cells: { dateStr: string; current: boolean }[] = []
    for (let i = startOffset - 1; i >= 0; i--) {
      const d = new Date(year, month, 0 - i)
      cells.push({ dateStr: d.toISOString().slice(0, 10), current: false })
    }
    for (let d = 1; d <= daysInMonth; d++)
      cells.push({ dateStr: new Date(year, month, d).toISOString().slice(0, 10), current: true })
    let next = 1
    while (cells.length % 7 !== 0)
      cells.push({ dateStr: new Date(year, month + 1, next++).toISOString().slice(0, 10), current: false })
    return cells
  }

  function dayEvents(dateStr: string) { return events.filter(e => e.date === dateStr) }
  function dayDeadlines(dateStr: string) { return deadlines.filter(d => d.due_date === dateStr) }

  function openNew(date?: string) { setSelected(null); setForm({ ...blank, date: date || '' }); setModal(true) }
  function openEdit(e: CalEvent) {
    if (e.user_id !== userId) return
    setSelected(e)
    setForm({ title: e.title, date: e.date, time: e.time, end_date: e.end_date, description: e.description, visibility: e.visibility, color: e.color })
    setModal(true)
  }

  async function save() {
    if (!form.title.trim() || !form.date) return
    if (selected) {
      setEvents(prev => prev.map(e => e.id === selected.id ? { ...e, ...form } : e))
      await supabase.from('calendar_events').update(form).eq('id', selected.id)
    } else {
      const evt: CalEvent = { id: Date.now().toString(), user_id: userId, ...form }
      setEvents(prev => [...prev, evt])
      await supabase.from('calendar_events').insert(evt)
    }
    setModal(false)
  }

  async function deleteEvent(id: string) {
    setEvents(prev => prev.filter(e => e.id !== id))
    await supabase.from('calendar_events').delete().eq('id', id)
    setModal(false)
  }

  // List view: next 90 days grouped by date
  function getUpcoming() {
    const end = new Date(today)
    end.setDate(end.getDate() + 90)
    const endStr = end.toISOString().slice(0, 10)
    const items: { date: string; title: string; type: 'event' | 'creative'; color: string; sub: string; eventObj?: CalEvent }[] = []
    events.filter(e => e.date >= today && e.date <= endStr)
      .forEach(e => items.push({ date: e.date, title: e.title, type: 'event', color: COLOR_VAR[e.color] || 'var(--gold)', sub: e.time || '', eventObj: e }))
    deadlines.filter(d => d.due_date >= today && d.due_date <= endStr)
      .forEach(d => items.push({ date: d.due_date, title: d.title, type: 'creative', color: 'var(--c-creative)', sub: `${d.brand} · ${d.stage}` }))
    items.sort((a, b) => a.date.localeCompare(b.date))
    const grouped: Record<string, typeof items> = {}
    items.forEach(i => { if (!grouped[i.date]) grouped[i.date] = []; grouped[i.date].push(i) })
    return grouped
  }

  const totalUpcoming = events.filter(e => e.date >= today).length + deadlines.filter(d => d.due_date >= today).length
  const grid = buildGrid()
  const upcoming = getUpcoming()

  if (loading) return <div style={{ padding: '48px', color: 'var(--text-muted)', fontSize: '11px', letterSpacing: '.1em' }}>Loading...</div>

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-dept-tag" style={{ background: 'var(--gold-alpha)', color: 'var(--gold)' }}>Workspace</div>
          <div className="page-title">Master Calendar</div>
          <div className="page-subtitle">{totalUpcoming} upcoming · {deadlines.filter(d => d.due_date >= today).length} creative deadlines</div>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <div style={{ display: 'flex', border: '1px solid var(--border)' }}>
            {(['month', 'list'] as const).map(v => (
              <button key={v} onClick={() => setView(v)}
                style={{ background: view === v ? 'var(--surface3)' : 'none', color: view === v ? 'var(--text)' : 'var(--text-muted)', border: 'none', fontFamily: 'inherit', fontSize: '9px', letterSpacing: '.15em', textTransform: 'uppercase', padding: '8px 16px', cursor: 'pointer' }}>
                {v === 'month' ? 'Month' : 'List'}
              </button>
            ))}
          </div>
          <button className="btn btn-primary" onClick={() => openNew()}>+ Add Event</button>
        </div>
      </div>

      <div className="page-body">
        {view === 'month' ? (
          <>
            {/* Nav */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <button onClick={() => setViewDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))}
                style={{ width: '32px', height: '32px', background: 'none', border: '1px solid var(--border)', color: 'var(--text)', fontSize: '18px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'inherit' }}>‹</button>
              <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)', letterSpacing: '.04em', minWidth: '180px', textAlign: 'center' }}>
                {MONTHS[viewDate.getMonth()]} {viewDate.getFullYear()}
              </div>
              <button onClick={() => setViewDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))}
                style={{ width: '32px', height: '32px', background: 'none', border: '1px solid var(--border)', color: 'var(--text)', fontSize: '18px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'inherit' }}>›</button>
              <button onClick={() => setViewDate(new Date(new Date().getFullYear(), new Date().getMonth(), 1))}
                style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--text-muted)', fontFamily: 'inherit', fontSize: '8px', letterSpacing: '.15em', textTransform: 'uppercase', padding: '0 14px', height: '32px', cursor: 'pointer' }}>
                Today
              </button>
            </div>

            {/* Day headers */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: '1px', marginBottom: '1px', background: 'var(--border)' }}>
              {WEEKDAYS.map(d => (
                <div key={d} style={{ background: 'var(--surface2)', padding: '8px 0', fontSize: '8px', letterSpacing: '.18em', textTransform: 'uppercase', color: 'var(--text-muted)', textAlign: 'center' }}>{d}</div>
              ))}
            </div>

            {/* Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: '1px', background: 'var(--border)' }}>
              {grid.map(({ dateStr, current }) => {
                const dl = dayDeadlines(dateStr)
                const ev = dayEvents(dateStr)
                const isToday = dateStr === today
                const dayNum = parseInt(dateStr.slice(8))
                const total = dl.length + ev.length
                return (
                  <div key={dateStr} onClick={() => openNew(dateStr)}
                    style={{ background: isToday ? 'var(--surface2)' : 'var(--surface)', minHeight: '96px', padding: '8px 6px', cursor: 'pointer', opacity: current ? 1 : 0.3, borderTop: isToday ? '2px solid var(--gold)' : '2px solid transparent', transition: 'background .1s' }}>
                    <div style={{ fontSize: '11px', fontWeight: isToday ? 700 : 400, color: isToday ? 'var(--gold)' : 'var(--text-muted)', marginBottom: '5px' }}>{dayNum}</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      {dl.slice(0, 2).map(d => (
                        <div key={d.id} style={{ fontSize: '9px', color: 'var(--c-creative)', background: 'rgba(224,123,57,0.13)', padding: '2px 5px', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', borderLeft: '2px solid var(--c-creative)' }}>
                          {d.title}
                        </div>
                      ))}
                      {ev.slice(0, Math.max(0, 2 - dl.length)).map(e => (
                        <div key={e.id} onClick={evt => { evt.stopPropagation(); openEdit(e) }}
                          style={{ fontSize: '9px', color: COLOR_VAR[e.color] || 'var(--gold)', background: `${COLOR_VAR[e.color] || 'var(--gold)'}20`, padding: '2px 5px', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', borderLeft: `2px solid ${COLOR_VAR[e.color] || 'var(--gold)'}`, cursor: e.user_id === userId ? 'pointer' : 'default' }}>
                          {e.visibility === 'private' ? '· ' : ''}{e.title}
                        </div>
                      ))}
                      {total > 2 && <div style={{ fontSize: '8px', color: 'var(--text-muted)', padding: '1px 5px' }}>+{total - 2} more</div>}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Legend */}
            <div style={{ display: 'flex', gap: '20px', marginTop: '14px', flexWrap: 'wrap' }}>
              {[
                { color: 'var(--c-creative)', label: 'Creative deadline' },
                { color: 'var(--gold)', label: 'Team event' },
                { color: 'var(--text-muted)', label: 'Private event (· prefix)' },
              ].map(l => (
                <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '9px', color: 'var(--text-muted)' }}>
                  <div style={{ width: '14px', height: '3px', background: l.color, flexShrink: 0 }} />{l.label}
                </div>
              ))}
            </div>
          </>
        ) : (
          /* List view */
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {Object.keys(upcoming).length === 0 ? (
              <div className="empty-state"><div className="empty-icon">◇</div><div className="empty-text">No upcoming events in the next 90 days.</div></div>
            ) : Object.entries(upcoming).map(([date, items]) => {
              const d = new Date(date + 'T12:00:00')
              const label = date === today ? 'Today' : d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })
              return (
                <div key={date}>
                  <div style={{ fontSize: '8px', letterSpacing: '.2em', textTransform: 'uppercase', color: date === today ? 'var(--gold)' : 'var(--text-muted)', padding: '18px 0 8px', borderTop: '1px solid var(--border)' }}>{label}</div>
                  {items.map((item, i) => (
                    <div key={i} onClick={() => item.eventObj && openEdit(item.eventObj)}
                      style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '12px 16px', background: 'var(--surface)', border: '1px solid var(--border)', borderLeft: `3px solid ${item.color}`, marginBottom: '3px', cursor: item.eventObj ? 'pointer' : 'default' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text)' }}>{item.title}</div>
                        {item.sub && <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>{item.sub}</div>}
                      </div>
                      <span style={{ fontSize: '8px', letterSpacing: '.12em', textTransform: 'uppercase', color: item.color, background: `${item.color}18`, padding: '3px 8px', whiteSpace: 'nowrap' }}>
                        {item.type === 'creative' ? 'Creative' : 'Event'}
                      </span>
                    </div>
                  ))}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {modal && (
        <div className="modal-backdrop" onClick={() => setModal(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-title">{selected ? 'Edit Event' : 'Add Event'}</div>
            <button className="modal-close" onClick={() => setModal(false)}>×</button>

            <div className="form-row">
              <label className="form-label">Title</label>
              <input className="form-input" placeholder="What's happening?" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} autoFocus />
            </div>
            <div className="form-grid-2">
              <div className="form-row">
                <label className="form-label">Date</label>
                <input className="form-input" type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
              </div>
              <div className="form-row">
                <label className="form-label">Time (optional)</label>
                <input className="form-input" type="time" value={form.time} onChange={e => setForm({ ...form, time: e.target.value })} />
              </div>
              <div className="form-row">
                <label className="form-label">End Date (optional)</label>
                <input className="form-input" type="date" value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })} />
              </div>
              <div className="form-row">
                <label className="form-label">Visibility</label>
                <select className="form-select" value={form.visibility} onChange={e => setForm({ ...form, visibility: e.target.value })}>
                  <option value="all">All team</option>
                  <option value="private">Only me</option>
                </select>
              </div>
              <div className="form-row">
                <label className="form-label">Colour</label>
                <select className="form-select" value={form.color} onChange={e => setForm({ ...form, color: e.target.value })}>
                  {COLORS.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                </select>
              </div>
            </div>
            <div className="form-row">
              <label className="form-label">Description</label>
              <textarea className="form-textarea" placeholder="Details, location, notes..." value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="submit-btn" onClick={save} style={{ flex: 1, marginTop: 0 }}>{selected ? 'Save Changes' : 'Add Event'}</button>
              {selected && (
                <button onClick={() => deleteEvent(selected.id)}
                  style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: 'var(--red)', fontFamily: 'inherit', fontSize: '9px', letterSpacing: '.15em', textTransform: 'uppercase', padding: '0 20px', cursor: 'pointer' }}>
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
