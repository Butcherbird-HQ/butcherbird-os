'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

type Resource = {
  id: string; title: string; category: string; description: string;
  url: string; content: string; tags: string;
}

const CATEGORIES = ['All', 'SOP', 'Brand Guide', 'Template', 'Training', 'Research', 'Finance', 'Other']

const blank: Omit<Resource, 'id'> = {
  title: '', category: 'SOP', description: '', url: '', content: '', tags: '',
}

export default function ResourcesPage() {
  const [resources, setResources] = useState<Resource[]>([])
  const [filter, setFilter] = useState('All')
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(false)
  const [selected, setSelected] = useState<Resource | null>(null)
  const [form, setForm] = useState<Omit<Resource, 'id'>>(blank)
  const [viewing, setViewing] = useState<Resource | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('resources').select('*').order('title').then(({ data }) => {
      if (data) setResources(data)
      setLoading(false)
    })
  }, [])

  function openNew() { setSelected(null); setForm(blank); setModal(true) }
  function openEdit(r: Resource) {
    setSelected(r)
    setForm({ title: r.title, category: r.category, description: r.description, url: r.url, content: r.content, tags: r.tags })
    setModal(true)
  }

  async function save() {
    if (!form.title.trim()) return
    if (selected) {
      const updated = { ...selected, ...form }
      setResources(prev => prev.map(r => r.id === selected.id ? updated : r))
      await supabase.from('resources').update(form).eq('id', selected.id)
    } else {
      const r: Resource = { id: Date.now().toString(), ...form }
      setResources(prev => [...prev, r])
      await supabase.from('resources').insert(r)
    }
    setModal(false)
  }

  async function deleteResource(id: string) {
    setResources(prev => prev.filter(r => r.id !== id))
    await supabase.from('resources').delete().eq('id', id)
    setModal(false)
  }

  const filtered = resources.filter(r => {
    const matchCat = filter === 'All' || r.category === filter
    const matchSearch = !search || r.title.toLowerCase().includes(search.toLowerCase()) || r.tags.toLowerCase().includes(search.toLowerCase()) || r.description.toLowerCase().includes(search.toLowerCase())
    return matchCat && matchSearch
  })

  if (loading) return <div style={{ padding: '48px', color: 'var(--text-muted)', fontSize: '11px', letterSpacing: '.1em' }}>Loading...</div>

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-dept-tag" style={{ background: 'rgba(139,92,246,0.12)', color: 'var(--c-resources)' }}>Knowledge</div>
          <div className="page-title">Resources</div>
          <div className="page-subtitle">{resources.length} documents</div>
        </div>
        <button className="btn btn-primary" onClick={openNew}>+ Add Resource</button>
      </div>

      <div className="page-body">
        {/* Search + Filter */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            className="form-input"
            placeholder="Search resources..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ flex: '1', minWidth: '200px', maxWidth: '360px' }}
          />
          <div className="tabs" style={{ '--tab-color': 'var(--c-resources)' } as React.CSSProperties}>
            {CATEGORIES.map(c => (
              <button key={c} className={`tab${filter === c ? ' active' : ''}`} onClick={() => setFilter(c)}>
                {c}
                {c !== 'All' && (
                  <span style={{ marginLeft: '6px', fontSize: '9px', background: 'var(--surface2)', padding: '1px 6px', borderRadius: '2px', color: 'var(--text-muted)' }}>
                    {resources.filter(r => r.category === c).length}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Resource grid */}
        {filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">◇</div>
            <div className="empty-text">{search || filter !== 'All' ? 'No results.' : 'No resources yet. Add one above.'}</div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '8px' }}>
            {filtered.map(r => (
              <div key={r.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderTop: '2px solid var(--c-resources)', padding: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text)', letterSpacing: '.04em', lineHeight: 1.4 }}>{r.title}</div>
                  <span style={{ fontSize: '7px', letterSpacing: '.15em', textTransform: 'uppercase', color: 'var(--c-resources)', background: 'rgba(139,92,246,0.1)', padding: '3px 8px', whiteSpace: 'nowrap', flexShrink: 0 }}>{r.category}</span>
                </div>
                {r.description && (
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.6 }}>{r.description}</div>
                )}
                {r.tags && (
                  <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                    {r.tags.split(',').map(t => t.trim()).filter(Boolean).map(tag => (
                      <span key={tag} style={{ fontSize: '8px', letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--text-muted)', background: 'var(--surface3)', padding: '2px 7px' }}>{tag}</span>
                    ))}
                  </div>
                )}
                <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
                  {r.content && (
                    <button onClick={() => setViewing(r)}
                      style={{ fontSize: '8px', letterSpacing: '.15em', textTransform: 'uppercase', color: 'var(--text-muted)', background: 'none', border: '1px solid var(--border)', padding: '6px 12px', cursor: 'pointer', fontFamily: 'inherit' }}>
                      Read
                    </button>
                  )}
                  {r.url && (
                    <a href={r.url} target="_blank" rel="noopener noreferrer"
                      style={{ fontSize: '8px', letterSpacing: '.15em', textTransform: 'uppercase', color: 'var(--text-muted)', border: '1px solid var(--border)', padding: '6px 12px', textDecoration: 'none' }}>
                      Open ↗
                    </a>
                  )}
                  <button onClick={() => openEdit(r)}
                    style={{ fontSize: '8px', letterSpacing: '.15em', textTransform: 'uppercase', color: 'var(--text-muted)', background: 'none', border: '1px solid var(--border)', padding: '6px 12px', cursor: 'pointer', fontFamily: 'inherit', marginLeft: 'auto' }}>
                    Edit
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* View content modal */}
      {viewing && (
        <div className="modal-backdrop" onClick={() => setViewing(null)}>
          <div className="modal-box" style={{ maxWidth: '720px', maxHeight: '80vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div className="modal-title">{viewing.title}</div>
            <button className="modal-close" onClick={() => setViewing(null)}>×</button>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.8, whiteSpace: 'pre-wrap', marginTop: '8px' }}>{viewing.content}</div>
          </div>
        </div>
      )}

      {/* Add/Edit modal */}
      {modal && (
        <div className="modal-backdrop" onClick={() => setModal(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-title">{selected ? 'Edit Resource' : 'Add Resource'}</div>
            <button className="modal-close" onClick={() => setModal(false)}>×</button>

            <div className="form-row">
              <label className="form-label">Title</label>
              <input className="form-input" placeholder="e.g. Onboarding SOP" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} autoFocus />
            </div>
            <div className="form-grid-2">
              <div className="form-row">
                <label className="form-label">Category</label>
                <select className="form-select" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                  {CATEGORIES.filter(c => c !== 'All').map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div className="form-row">
                <label className="form-label">Tags (comma separated)</label>
                <input className="form-input" placeholder="e.g. onboarding, hr, ops" value={form.tags} onChange={e => setForm({ ...form, tags: e.target.value })} />
              </div>
            </div>
            <div className="form-row">
              <label className="form-label">Description</label>
              <input className="form-input" placeholder="One line summary" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="form-row">
              <label className="form-label">Link (Google Drive, Notion, etc.)</label>
              <input className="form-input" placeholder="https://..." value={form.url} onChange={e => setForm({ ...form, url: e.target.value })} />
            </div>
            <div className="form-row">
              <label className="form-label">Content (paste text / notes)</label>
              <textarea className="form-textarea" style={{ minHeight: '140px' }} placeholder="Paste document content, SOPs, notes..." value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} />
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="submit-btn" onClick={save} style={{ flex: 1, marginTop: 0 }}>{selected ? 'Save Changes' : 'Add Resource'}</button>
              {selected && (
                <button onClick={() => deleteResource(selected.id)}
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
