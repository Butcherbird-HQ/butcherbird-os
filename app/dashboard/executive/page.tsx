'use client'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'

type Task = { id: string; text: string; done: boolean }
type AssignedTask = { id: string; title: string; brand: string; stage: string; due_date: string; channel: string }

const stageColor: Record<string, string> = {
  Brief: 'var(--text-muted)', 'In Progress': 'var(--blue)',
  Review: 'var(--amber)', Approved: 'var(--c-clients)', Live: 'var(--green)',
}

export default function ExecutivePage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [assigned, setAssigned] = useState<AssignedTask[]>([])
  const [taskInput, setTaskInput] = useState('')
  const [noteContent, setNoteContent] = useState('')
  const [noteSaved, setNoteSaved] = useState(true)
  const [userId, setUserId] = useState('')
  const [userName, setUserName] = useState('')
  const [loading, setLoading] = useState(true)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)
      setUserName(user.user_metadata?.name?.split(' ')[0] || 'there')

      const [{ data: tasksData }, { data: noteData }, { data: assignedData }] = await Promise.all([
        supabase.from('tasks').select('id,text,done').eq('user_id', user.id).order('created_at'),
        supabase.from('user_notes').select('content').eq('user_id', user.id).single(),
        supabase.from('creative_tasks').select('id,title,brand,stage,due_date,channel').eq('assigned_to', user.email || ''),
      ])
      if (tasksData) setTasks(tasksData)
      if (noteData?.content) setNoteContent(noteData.content)
      if (assignedData) setAssigned(assignedData)
      setLoading(false)
    }
    load()
  }, [])

  function handleNoteChange(val: string) {
    setNoteContent(val)
    setNoteSaved(false)
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      if (!userId) return
      await supabase.from('user_notes').upsert({ user_id: userId, content: val }, { onConflict: 'user_id' })
      setNoteSaved(true)
    }, 1500)
  }

  async function addTask() {
    if (!taskInput.trim() || !userId) return
    const t: Task = { id: Date.now().toString(), text: taskInput.trim(), done: false }
    setTasks(prev => [...prev, t])
    await supabase.from('tasks').insert({ ...t, user_id: userId, type: 'daily' })
    setTaskInput('')
  }

  async function toggleTask(id: string) {
    const t = tasks.find(x => x.id === id)!
    setTasks(prev => prev.map(x => x.id === id ? { ...x, done: !x.done } : x))
    await supabase.from('tasks').update({ done: !t.done }).eq('id', id)
  }

  async function deleteTask(id: string) {
    setTasks(prev => prev.filter(t => t.id !== id))
    await supabase.from('tasks').delete().eq('id', id)
  }

  async function clearDone() {
    const doneIds = tasks.filter(t => t.done).map(t => t.id)
    setTasks(prev => prev.filter(t => !t.done))
    for (const id of doneIds) await supabase.from('tasks').delete().eq('id', id)
  }

  const open = tasks.filter(t => !t.done)
  const done = tasks.filter(t => t.done)
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const dateStr = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })

  if (loading) return <div style={{ padding: '48px', color: 'var(--text-muted)', fontSize: '11px', letterSpacing: '.1em' }}>Loading...</div>

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-dept-tag" style={{ background: 'var(--gold-alpha)', color: 'var(--gold)' }}>Executive</div>
          <div className="page-title">{greeting}, {userName}</div>
          <div className="page-subtitle">{dateStr} · {open.length} task{open.length !== 1 ? 's' : ''} open</div>
        </div>
      </div>

      <div className="page-body">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '16px', alignItems: 'start' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div className="card" style={{ borderTop: '2px solid var(--gold)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <div className="card-title" style={{ margin: 0 }}>Today's Tasks</div>
                {done.length > 0 && (
                  <button onClick={clearDone}
                    style={{ fontSize: '8px', letterSpacing: '.15em', textTransform: 'uppercase', color: 'var(--text-muted)', background: 'none', border: '1px solid var(--border)', padding: '4px 10px', cursor: 'pointer', fontFamily: 'inherit' }}>
                    Clear done ({done.length})
                  </button>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', marginBottom: '12px' }}>
                {open.map(t => (
                  <div key={t.id} onClick={() => toggleTask(t.id)}
                    style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '11px 14px', background: 'var(--surface2)', border: '1px solid var(--border)', cursor: 'pointer' }}>
                    <div style={{ width: '17px', height: '17px', border: '2px solid var(--border-strong)', borderRadius: '3px', flexShrink: 0 }} />
                    <span style={{ flex: 1, fontSize: '12px', color: 'var(--text)' }}>{t.text}</span>
                    <button onClick={e => { e.stopPropagation(); deleteTask(t.id) }}
                      style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '18px', lineHeight: 1, padding: 0 }}>×</button>
                  </div>
                ))}
                {done.map(t => (
                  <div key={t.id} onClick={() => toggleTask(t.id)}
                    style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '11px 14px', background: 'var(--surface2)', border: '1px solid var(--border)', cursor: 'pointer', opacity: 0.4 }}>
                    <div style={{ width: '17px', height: '17px', background: 'var(--gold)', border: '2px solid var(--gold)', borderRadius: '3px', flexShrink: 0 }} />
                    <span style={{ flex: 1, fontSize: '12px', color: 'var(--text-muted)', textDecoration: 'line-through' }}>{t.text}</span>
                    <button onClick={e => { e.stopPropagation(); deleteTask(t.id) }}
                      style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '18px', lineHeight: 1, padding: 0 }}>×</button>
                  </div>
                ))}
                {tasks.length === 0 && (
                  <div style={{ padding: '32px', textAlign: 'center', fontSize: '10px', color: 'var(--text-muted)', letterSpacing: '.1em' }}>No tasks yet.</div>
                )}
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input className="form-input" placeholder="Add task... press Enter" value={taskInput}
                  onChange={e => setTaskInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addTask()}
                  style={{ flex: 1 }} />
                <button className="add-btn" onClick={addTask}>Add</button>
              </div>
            </div>

            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div className="card-title" style={{ margin: 0 }}>Notes</div>
                <span style={{ fontSize: '8px', letterSpacing: '.15em', textTransform: 'uppercase', color: noteSaved ? 'var(--c-clients)' : 'var(--text-muted)' }}>
                  {noteSaved ? 'Saved' : 'Saving...'}
                </span>
              </div>
              <textarea className="form-textarea"
                placeholder="Scratch pad — notes, thoughts, meeting notes, reminders..."
                value={noteContent}
                onChange={e => handleNoteChange(e.target.value)}
                style={{ minHeight: '280px', resize: 'vertical' }} />
            </div>
          </div>

          <div className="card" style={{ borderTop: '2px solid var(--c-creative)', position: 'sticky', top: '24px' }}>
            <div className="card-title">My Queue</div>
            {assigned.length === 0 ? (
              <div style={{ padding: '40px 0', textAlign: 'center', fontSize: '10px', color: 'var(--text-muted)', letterSpacing: '.1em', lineHeight: 2 }}>
                Nothing assigned<br />to you yet.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {assigned.map(t => (
                  <div key={t.id} style={{ background: 'var(--surface2)', border: '1px solid var(--border)', padding: '14px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text)', marginBottom: '8px', lineHeight: 1.4 }}>{t.title}</div>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                      <span style={{ fontSize: '8px', letterSpacing: '.12em', textTransform: 'uppercase', color: stageColor[t.stage] || 'var(--text-muted)', background: 'var(--surface3)', padding: '3px 8px' }}>{t.stage}</span>
                      <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>{t.brand}</span>
                      {t.due_date && (
                        <span style={{ fontSize: '9px', color: 'var(--text-muted)', marginLeft: 'auto' }}>
                          Due {new Date(t.due_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
