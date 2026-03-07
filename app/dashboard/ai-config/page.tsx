'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

type ConfigModule = {
  id: string; title: string; category: string; content: string;
  active: boolean; sort_order: number; created_at: string;
}

const LAYERS = [
  {
    number: 1,
    label: 'Core Identity',
    category: 'Core Identity',
    color: 'var(--c-resources)',
    description: 'Who Claude is as an analyst. Reasoning frameworks, decision-making rules, and methodologies.',
  },
  {
    number: 2,
    label: 'Platform Intelligence',
    category: 'Platform Intelligence',
    color: 'var(--blue)',
    description: 'What Claude knows about Meta and advertising. Benchmarks, platform rules, best practices.',
  },
  {
    number: 3,
    label: 'Workflow & Output',
    category: 'Workflow & Output',
    color: 'var(--c-clients)',
    description: 'How Claude processes and formats its response. JSON schema, card types, and output rules.',
  },
]

const RUNTIME_LAYERS = [
  {
    number: 4,
    label: 'Client Context',
    color: 'var(--amber)',
    description: 'Injected at runtime from the client profile.',
    fields: [
      'Client name, category, and strategic goals',
      'Ad account ID and linked assets',
      'Current creative pipeline state (tasks by stage)',
      'Notes and any context loaded by the operator',
    ],
  },
  {
    number: 5,
    label: 'Live Meta Data',
    color: 'var(--red)',
    description: 'Injected at runtime from the Meta Marketing API.',
    fields: [
      'Active campaigns, ad sets, and ads',
      'Spend, ROAS, CPM, CPC, CTR by creative',
      'Frequency, reach, and impression data',
      'Ad-level performance breakdown',
    ],
  },
]

const blank: Omit<ConfigModule, 'id' | 'created_at'> = {
  title: '', category: 'Core Identity', content: '', active: true, sort_order: 0,
}

export default function AIConfigPage() {
  const [modules, setModules] = useState<ConfigModule[]>([])
  const [modal, setModal] = useState(false)
  const [preview, setPreview] = useState(false)
  const [selected, setSelected] = useState<ConfigModule | null>(null)
  const [form, setForm] = useState(blank)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('ai_config').select('*').order('sort_order').order('created_at').then(({ data }) => {
      if (data) setModules(data)
      setLoading(false)
    })
  }, [])

  function openNew(category?: string) {
    setSelected(null)
    setForm({ ...blank, category: category || 'Core Identity', sort_order: modules.length })
    setModal(true)
  }

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
      const { data } = await supabase.from('ai_config').insert(form).select().single()
      if (data) setModules(prev => [...prev, data])
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
          <button className="btn btn-primary" onClick={() => openNew()}>+ Add Module</button>
        </div>
      </div>

      <div className="page-body" style={{ display: 'flex', flexDirection: 'column', gap: '36px' }}>

        {/* Assembly Architecture */}
        <div>
          <div style={{ fontSize: '9px', letterSpacing: '.18em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '12px' }}>Assembly Architecture</div>
          <div style={{ display: 'flex', alignItems: 'stretch' }}>
            {[
              ...LAYERS.map(l => ({ number: l.number, label: l.label, color: l.color, description: l.description, runtime: false })),
              ...RUNTIME_LAYERS.map(l => ({ number: l.number, label: l.label, color: l.color, description: l.description, runtime: true })),
            ].map((layer, i, arr) => (
              <div key={layer.number} style={{ display: 'flex', alignItems: 'stretch', flex: 1 }}>
                <div style={{ flex: 1, background: 'var(--surface)', border: '1px solid var(--border)', borderTop: `2px solid ${layer.color}`, padding: '16px', opacity: layer.runtime ? 0.6 : 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                    <span style={{ fontSize: '8px', fontWeight: 700, color: layer.color, background: `${layer.color}18`, padding: '2px 7px', letterSpacing: '.1em' }}>L{layer.number}</span>
                    {layer.runtime && <span style={{ fontSize: '7px', letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--text-muted)', background: 'var(--surface2)', padding: '2px 6px' }}>Runtime</span>}
                  </div>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text)', marginBottom: '4px' }}>{layer.label}</div>
                  <div style={{ fontSize: '9px', color: 'var(--text-muted)', lineHeight: 1.6 }}>{layer.description}</div>
                </div>
                {i < arr.length - 1 && (
                  <div style={{ display: 'flex', alignItems: 'center', padding: '0 6px', color: 'var(--border)', fontSize: '12px', flexShrink: 0 }}>›</div>
                )}
              </div>
            ))}
          </div>
          <div style={{ fontSize: '8px', color: 'var(--text-muted)', marginTop: '8px', letterSpacing: '.08em' }}>
            Layers 1–3 are configured below and assembled in sort order into a single system prompt. Layers 4–5 are appended automatically at analysis time.
          </div>
        </div>

        {/* Configurable layers */}
        {LAYERS.map(layer => {
          const layerModules = modules.filter(m => m.category === layer.category).sort((a, b) => a.sort_order - b.sort_order)
          const activeCount = layerModules.filter(m => m.active).length
          return (
            <div key={layer.number}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '8px', fontWeight: 700, color: layer.color, background: `${layer.color}18`, padding: '3px 9px', letterSpacing: '.12em' }}>LAYER {layer.number}</span>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text)', letterSpacing: '.04em', textTransform: 'uppercase' }}>{layer.label}</span>
                  {layerModules.length > 0 && (
                    <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>{activeCount}/{layerModules.length} active</span>
                  )}
                </div>
                <button onClick={() => openNew(layer.category)}
                  style={{ fontSize: '8px', letterSpacing: '.12em', textTransform: 'uppercase', color: layer.color, background: `${layer.color}10`, border: `1px solid ${layer.color}35`, padding: '5px 12px', cursor: 'pointer', fontFamily: 'inherit' }}>
                  + Add
                </button>
              </div>

              {layerModules.length === 0 ? (
                <div style={{ border: '1px dashed var(--border)', padding: '28px', textAlign: 'center', fontSize: '10px', color: 'var(--text-muted)' }}>
                  No modules in this layer yet.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {layerModules.map(m => (
                    <div key={m.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderLeft: `3px solid ${m.active ? layer.color : 'var(--border)'}`, padding: '14px 20px', display: 'flex', alignItems: 'flex-start', gap: '16px', opacity: m.active ? 1 : 0.5 }}>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700, minWidth: '20px', paddingTop: '2px', textAlign: 'right' }}>
                        {m.active ? activeModules.indexOf(m) + 1 : '—'}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)', marginBottom: '4px' }}>{m.title}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.6, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const }}>
                          {m.content}
                        </div>
                        <div style={{ fontSize: '8px', color: 'var(--text-muted)', marginTop: '6px', letterSpacing: '.1em' }}>
                          {wordCount(m.content).toLocaleString()} words · {m.content.length.toLocaleString()} chars
                        </div>
                      </div>
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
          )
        })}

        {/* Runtime injection reference */}
        <div>
          <div style={{ fontSize: '9px', letterSpacing: '.18em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '12px' }}>Runtime Injections — Auto-assembled, not configurable here</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            {RUNTIME_LAYERS.map(layer => (
              <div key={layer.number} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderLeft: `3px solid ${layer.color}`, padding: '20px', opacity: 0.65 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                  <span style={{ fontSize: '8px', fontWeight: 700, color: layer.color, background: `${layer.color}18`, padding: '2px 7px', letterSpacing: '.1em' }}>LAYER {layer.number}</span>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text)' }}>{layer.label}</span>
                  <span style={{ fontSize: '7px', letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--text-muted)', background: 'var(--surface2)', padding: '2px 6px', marginLeft: 'auto' }}>Auto-injected</span>
                </div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '12px' }}>{layer.description}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  {layer.fields.map((f, i) => (
                    <div key={i} style={{ fontSize: '9px', color: 'var(--text-muted)', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                      <span style={{ color: layer.color, flexShrink: 0 }}>·</span>
                      {f}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Preview assembled prompt */}
      {preview && (
        <div className="modal-backdrop" onClick={() => setPreview(false)}>
          <div className="modal-box" style={{ maxWidth: '800px', maxHeight: '85vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div className="modal-title">Assembled Prompt Preview</div>
            <button className="modal-close" onClick={() => setPreview(false)}>×</button>
            <div style={{ fontSize: '9px', color: 'var(--text-muted)', marginBottom: '16px', letterSpacing: '.1em' }}>
              {activeModules.length} active modules · ~{wordCount(assembledPrompt).toLocaleString()} words · Layers 4–5 (client context + Meta data) are appended at runtime and not shown here.
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
                <label className="form-label">Layer</label>
                <select className="form-select" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                  {LAYERS.map(l => <option key={l.category} value={l.category}>Layer {l.number} — {l.label}</option>)}
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
