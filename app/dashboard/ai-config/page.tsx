'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

type ConfigModule = {
  id: string; title: string; category: string; content: string;
  active: boolean; sort_order: number; created_at: string;
}

const CATEGORIES = ['Methodology', 'Workflow', 'Output Format', 'Rules', 'Client Template', 'Brand Context', 'Other']

const blank: Omit<ConfigModule, 'id' | 'created_at'> = {
  title: '', category: 'Methodology', content: '', active: true, sort_order: 0,
}

const CATEGORY_COLOR: Record<string, string> = {
  Methodology: 'var(--blue)',
  Workflow: 'var(--c-creative)',
  'Output Format': 'var(--c-resources)',
  Rules: 'var(--red)',
  'Client Template': 'var(--c-clients)',
  'Brand Context': 'var(--gold)',
  Other: 'var(--text-muted)',
}

export default function AIConfigPage() {
  const [modules, setModules] = useState<ConfigModule[]>([])
  const [modal, setModal] = useState(false)
  const [preview, setPreview] = useState(false)
  const [selected, setSelected] = useState<ConfigModule | null>(null)
  const [form, setForm] = useState(blank)
  const [loading, setLoading] = useState(true)
  const [filterCat, setFilterCat] = useState('All')

  useEffect(() => {
    supabase.from('ai_config').select('*').order('sort_order').order('created_at').then(({ data }) => {
      if (data) setModules(data)
      setLoading(false)
    })
  }, [])

  function openNew() { setSelected(null); setForm({ ...blank, sort_order: modules.length }); setModal(true) }
  function openEdit(m: ConfigModule) {
    setSelected(m)
    setForm({ title: m.title, category: m.category, content: m.content, active: m.active, sort_order: m.sort_order })
    setModal(true)
  }

  async function save() {
    if (!form.title.trim() || !form.content.trim()) return
    if (selected) {
      const updated = { ...selected, ...form }
      setModules(prev => prev.map(m => m.id === selected.id ? updated : m))
      await supabase.from('ai_config').update(form).eq('id', selected.id)
    } else {
      const m: ConfigModule = { id: Date.now().toString(), created_at: new Date().toISOString(), ...form }
      setModules(prev => [...prev, m])
      await supabase.from('ai_config').insert(m)
    }
    setModal(false)
  }

  async function toggleActive(m: ConfigModule) {
    const updated = { ...m, active: !m.active }
    setModules(prev => prev.map(x => x.id === m.id ? updated : x))
    await supabase.from('ai_config').update({ active: !m.active }).eq('id', m.id)
  }

  async function deleteModule(id: string) {
    setModules(prev => prev.filter(m => m.id !== id))
    await supabase.from('ai_config').delete().eq('id', id)
    setModal(false)
  }

  const activeModules = modules.filter(m => m.active).sort((a, b) => a.sort_order - b.sort_order)
  const assembledPrompt = activeModules.map(m => `## ${m.title}\n\n${m.content}`).join('\n\n---\n\n')
  const wordCount = (s: string) => s.trim().split(/\s+/).filter(Boolean).length

  const filtered = filterCat === 'All' ? modules : modules.filter(m => m.category === filterCat)

  if (loading) return <div style={{ padding: '48px', color: 'var(--text-muted)', fontSize: '11px', letterSpacing: '.1em' }}>Loading...</div>

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-dept-tag" style={{ background: 'rgba(139,92,246,0.12)', color: 'var(--c-resources)' }}>Knowledge</div>
          <div className="page-title">AI Config</div>
          <div className="page-subtitle">{modules.length} modules · {activeModules.length} active · ~{wordCount(assembledPrompt).toLocaleString()} words assembled</div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={() => setPreview(true)}
            style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--text-muted)', fontFamily: 'inherit', fontSize: '9px', letterSpacing: '.15em', textTransform: 'uppercase', padding: '0 16px', height: '36px', cursor: 'pointer' }}>
            Preview Prompt
          </button>
          <button className="btn btn-primary" onClick={openNew}>+ Add Module</button>
        </div>
      </div>

      <div className="page-body">
        {/* Category filter */}
        <div className="tabs" style={{ '--tab-color': 'var(--c-resources)', marginBottom: '20px' } as React.CSSProperties}>
          {['All', ...CATEGORIES].map(c => (
            <button key={c} className={`tab${filterCat === c ? ' active' : ''}`} onClick={() => setFilterCat(c)}>
              {c}
              {c !== 'All' && (
                <span style={{ marginLeft: '6px', fontSize: '9px', background: 'var(--surface2)', padding: '1px 6px', borderRadius: '2px', color: 'var(--text-muted)' }}>
                  {modules.filter(m => m.category === c).length}
                </span>
              )}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">◇</div>
            <div className="empty-text">No modules yet. Add the first one above.</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {filtered.sort((a, b) => a.sort_order - b.sort_order).map((m, i) => (
              <div key={m.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderLeft: `3px solid ${m.active ? CATEGORY_COLOR[m.category] || 'var(--text-muted)' : 'var(--border)'}`, padding: '16px 20px', display: 'flex', alignItems: 'flex-start', gap: '16px', opacity: m.active ? 1 : 0.5 }}>
                {/* Order number */}
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700, minWidth: '20px', paddingTop: '2px', textAlign: 'right' }}>
                  {m.active ? activeModules.indexOf(m) + 1 : '—'}
                </div>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)' }}>{m.title}</span>
                    <span style={{ fontSize: '7px', letterSpacing: '.15em', textTransform: 'uppercase', color: CATEGORY_COLOR[m.category] || 'var(--text-muted)', background: `${CATEGORY_COLOR[m.category] || 'var(--text-muted)'}15`, padding: '2px 8px' }}>
                      {m.category}
                    </span>
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.6, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const }}>
                    {m.content}
                  </div>
                  <div style={{ fontSize: '8px', color: 'var(--text-muted)', marginTop: '6px', letterSpacing: '.1em' }}>
                    {wordCount(m.content).toLocaleString()} words · {m.content.length.toLocaleString()} chars
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0 }}>
                  <button onClick={() => toggleActive(m)}
                    style={{ fontSize: '8px', letterSpacing: '.12em', textTransform: 'uppercase', color: m.active ? 'var(--c-clients)' : 'var(--text-muted)', background: m.active ? 'rgba(45,155,111,0.1)' : 'var(--surface3)', border: `1px solid ${m.active ? 'rgba(45,155,111,0.2)' : 'var(--border)'}`, padding: '5px 10px', cursor: 'pointer', fontFamily: 'inherit' }}>
                    {m.active ? 'Active' : 'Off'}
                  </button>
                  <button onClick={() => openEdit(m)}
                    style={{ fontSize: '8px', letterSpacing: '.15em', textTransform: 'uppercase', color: 'var(--text-muted)', background: 'none', border: '1px solid var(--border)', padding: '5px 10px', cursor: 'pointer', fontFamily: 'inherit' }}>
                    Edit
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Preview assembled prompt */}
      {preview && (
        <div className="modal-backdrop" onClick={() => setPreview(false)}>
          <div className="modal-box" style={{ maxWidth: '800px', maxHeight: '85vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div className="modal-title">Assembled Prompt Preview</div>
            <button className="modal-close" onClick={() => setPreview(false)}>×</button>
            <div style={{ fontSize: '9px', color: 'var(--text-muted)', marginBottom: '16px', letterSpacing: '.1em' }}>
              {activeModules.length} active modules · ~{wordCount(assembledPrompt).toLocaleString()} words · This is exactly what Claude receives on every analysis run.
            </div>
            {activeModules.length === 0 ? (
              <div style={{ padding: '32px', textAlign: 'center', fontSize: '11px', color: 'var(--text-muted)' }}>No active modules.</div>
            ) : (
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.9, whiteSpace: 'pre-wrap', fontFamily: 'monospace', background: 'var(--surface2)', padding: '20px', border: '1px solid var(--border)' }}>
                {assembledPrompt}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add / Edit modal */}
      {modal && (
        <div className="modal-backdrop" onClick={() => setModal(false)}>
          <div className="modal-box" style={{ maxWidth: '680px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-title">{selected ? 'Edit Module' : 'Add Module'}</div>
            <button className="modal-close" onClick={() => setModal(false)}>×</button>

            <div className="form-grid-2">
              <div className="form-row">
                <label className="form-label">Title</label>
                <input className="form-input" placeholder="e.g. Ben Heath Methodology" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} autoFocus />
              </div>
              <div className="form-row">
                <label className="form-label">Category</label>
                <select className="form-select" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                  {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div className="form-row">
                <label className="form-label">Order (lower = first)</label>
                <input className="form-input" type="number" value={form.sort_order} onChange={e => setForm({ ...form, sort_order: +e.target.value })} />
              </div>
              <div className="form-row" style={{ display: 'flex', alignItems: 'center', gap: '12px', paddingTop: '18px' }}>
                <label className="form-label" style={{ marginBottom: 0 }}>Active</label>
                <button onClick={() => setForm({ ...form, active: !form.active })}
                  style={{ fontSize: '9px', letterSpacing: '.12em', textTransform: 'uppercase', color: form.active ? 'var(--c-clients)' : 'var(--text-muted)', background: form.active ? 'rgba(45,155,111,0.1)' : 'var(--surface3)', border: `1px solid ${form.active ? 'rgba(45,155,111,0.2)' : 'var(--border)'}`, padding: '6px 14px', cursor: 'pointer', fontFamily: 'inherit' }}>
                  {form.active ? 'Active' : 'Inactive'}
                </button>
              </div>
            </div>

            <div className="form-row">
              <label className="form-label">
                Content
                {form.content && <span style={{ color: 'var(--text-muted)', fontWeight: 400, marginLeft: '8px' }}>— {wordCount(form.content).toLocaleString()} words</span>}
              </label>
              <textarea className="form-textarea" style={{ minHeight: '320px', fontFamily: 'monospace', fontSize: '11px', lineHeight: 1.7 }}
                placeholder="Paste the full content of this module here..."
                value={form.content}
                onChange={e => setForm({ ...form, content: e.target.value })} />
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="submit-btn" onClick={save} style={{ flex: 1, marginTop: 0 }}>{selected ? 'Save Changes' : 'Add Module'}</button>
              {selected && (
                <button onClick={() => deleteModule(selected.id)}
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
