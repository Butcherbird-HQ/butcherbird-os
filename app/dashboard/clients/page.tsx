'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type Client = {
  id: string; name: string; type: string; category: string;
  status: string; drive_link: string; instagram: string;
  website: string; notes: string; ad_account_id: string;
}

const blank: Omit<Client, 'id'> = {
  name: '', type: 'performance', category: 'external',
  status: 'Active', drive_link: '', instagram: '',
  website: '', notes: '', ad_account_id: '',
}

export default function ClientsPage() {
  const router = useRouter()
  const [clients, setClients] = useState<Client[]>([])
  const [latestAnalyses, setLatestAnalyses] = useState<Record<string, string>>({})
  const [modal, setModal] = useState(false)
  const [selected, setSelected] = useState<Client | null>(null)
  const [form, setForm] = useState<Omit<Client, 'id'>>(blank)
  const [sort, setSort] = useState<'az' | 'analysis'>('az')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      supabase.from('crm_clients').select('id,name,type,category,status,drive_link,instagram,website,notes,ad_account_id').order('name'),
      supabase.from('analyses').select('client_id,created_at').order('created_at', { ascending: false }),
    ]).then(([{ data: c }, { data: a }]) => {
      if (c) setClients(c)
      if (a) {
        const latest: Record<string, string> = {}
        a.forEach((analysis: { client_id: string; created_at: string }) => {
          if (!latest[analysis.client_id]) latest[analysis.client_id] = analysis.created_at
        })
        setLatestAnalyses(latest)
      }
      setLoading(false)
    })
  }, [])

  function openNew() { setSelected(null); setForm(blank); setModal(true) }
  function openEdit(e: React.MouseEvent, c: Client) {
    e.stopPropagation()
    setSelected(c)
    setForm({ name: c.name, type: c.type, category: c.category, status: c.status, drive_link: c.drive_link || '', instagram: c.instagram || '', website: c.website || '', notes: c.notes || '', ad_account_id: c.ad_account_id || '' })
    setModal(true)
  }

  async function save() {
    if (!form.name.trim()) return
    if (selected) {
      const updated = { ...selected, ...form }
      setClients(prev => prev.map(c => c.id === selected.id ? updated : c))
      await supabase.from('crm_clients').update(form).eq('id', selected.id)
    } else {
      const c: Client = { id: Date.now().toString(), ...form }
      setClients(prev => [...prev, c])
      await supabase.from('crm_clients').insert(c)
    }
    setModal(false)
  }

  async function deleteClient(id: string) {
    setClients(prev => prev.filter(c => c.id !== id))
    await supabase.from('crm_clients').delete().eq('id', id)
    setModal(false)
  }

  const sorted = [...clients].sort((a, b) => {
    if (sort === 'az') return a.name.localeCompare(b.name)
    const aDate = latestAnalyses[a.id] || ''
    const bDate = latestAnalyses[b.id] || ''
    if (!aDate && !bDate) return a.name.localeCompare(b.name)
    if (!aDate) return 1
    if (!bDate) return -1
    return bDate.localeCompare(aDate)
  })

  const active = clients.filter(c => c.status === 'Active')

  if (loading) return <div style={{ padding: '48px', color: 'var(--text-muted)', fontSize: '11px', letterSpacing: '.1em' }}>Loading...</div>

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-dept-tag" style={{ background: 'rgba(45,155,111,0.12)', color: 'var(--c-clients)' }}>Clients</div>
          <div className="page-title">Clients</div>
          <div className="page-subtitle">{active.length} active · {clients.length} total</div>
        </div>
        <button className="btn btn-primary" onClick={openNew}>+ Add Client</button>
      </div>

      <div className="page-body">
        <div className="tabs" style={{ '--tab-color': 'var(--c-clients)', marginBottom: '20px' } as React.CSSProperties}>
          <button className={`tab${sort === 'az' ? ' active' : ''}`} onClick={() => setSort('az')}>A–Z</button>
          <button className={`tab${sort === 'analysis' ? ' active' : ''}`} onClick={() => setSort('analysis')}>Latest Analysis</button>
        </div>

        {sorted.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">◇</div>
            <div className="empty-text">No clients yet. Add one above.</div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '12px' }}>
            {sorted.map(c => (
              <div key={c.id} onClick={() => router.push(`/dashboard/clients/${c.id}`)}
                style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderTop: `3px solid ${c.status === 'Active' ? 'var(--c-clients)' : 'var(--text-muted)'}`, padding: '24px', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '14px', opacity: c.status === 'Active' ? 1 : 0.65 }}>

                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                  <div>
                    <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text)', marginBottom: '8px', letterSpacing: '.02em' }}>{c.name}</div>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      <span className={`pill pill-${c.status === 'Active' ? 'teal' : 'red'}`}>{c.status}</span>
                      <span className="pill" style={{ background: 'var(--surface3)', color: 'var(--text-muted)' }}>{c.category}</span>
                    </div>
                  </div>
                  <button onClick={e => openEdit(e, c)}
                    style={{ fontSize: '8px', letterSpacing: '.15em', textTransform: 'uppercase', color: 'var(--text-muted)', background: 'none', border: '1px solid var(--border)', padding: '6px 12px', cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}>
                    Edit
                  </button>
                </div>

                {/* Details */}
                {(c.ad_account_id || c.instagram || c.website) && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    {c.ad_account_id && (
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'baseline' }}>
                        <span style={{ fontSize: '8px', letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--text-muted)', minWidth: '84px' }}>Meta Account</span>
                        <span style={{ fontSize: '11px', color: 'var(--text)', fontFamily: 'monospace' }}>{c.ad_account_id}</span>
                      </div>
                    )}
                    {c.instagram && (
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'baseline' }}>
                        <span style={{ fontSize: '8px', letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--text-muted)', minWidth: '84px' }}>Instagram</span>
                        <span style={{ fontSize: '11px', color: 'var(--text)' }}>{c.instagram}</span>
                      </div>
                    )}
                    {c.website && (
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'baseline' }}>
                        <span style={{ fontSize: '8px', letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--text-muted)', minWidth: '84px' }}>Website</span>
                        <span style={{ fontSize: '11px', color: 'var(--text)' }}>{c.website}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Notes preview */}
                {c.notes && (
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.6, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const, borderTop: '1px solid var(--border)', paddingTop: '12px' }}>
                    {c.notes}
                  </div>
                )}

                {/* Footer */}
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
                  <div style={{ fontSize: '9px', color: 'var(--text-muted)', letterSpacing: '.06em' }}>
                    {latestAnalyses[c.id]
                      ? `Last analysis: ${new Date(latestAnalyses[c.id]).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`
                      : 'No analyses run'}
                  </div>
                  {c.drive_link && (
                    <a href={c.drive_link} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
                      style={{ fontSize: '8px', letterSpacing: '.15em', textTransform: 'uppercase', color: 'var(--text-muted)', border: '1px solid var(--border)', padding: '5px 10px', textDecoration: 'none' }}>
                      Drive ↗
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {modal && (
        <div className="modal-backdrop" onClick={() => setModal(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-title">{selected ? 'Edit Client' : 'Add Client'}</div>
            <button className="modal-close" onClick={() => setModal(false)}>×</button>

            <div className="form-row">
              <label className="form-label">Client Name</label>
              <input className="form-input" placeholder="e.g. Hiba Balfaqih" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} autoFocus />
            </div>
            <div className="form-grid-2">
              <div className="form-row">
                <label className="form-label">Category</label>
                <select className="form-select" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                  <option value="external">External</option>
                  <option value="internal">Internal Brand</option>
                </select>
              </div>
              <div className="form-row">
                <label className="form-label">Status</label>
                <select className="form-select" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                  <option>Active</option><option>Paused</option><option>Churned</option>
                </select>
              </div>
            </div>
            <div className="form-row">
              <label className="form-label">Meta Ad Account ID</label>
              <input className="form-input" placeholder="act_XXXXXXXXXX" value={form.ad_account_id} onChange={e => setForm({ ...form, ad_account_id: e.target.value })} />
            </div>
            <div className="form-row">
              <label className="form-label">Google Drive Folder</label>
              <input className="form-input" placeholder="https://drive.google.com/..." value={form.drive_link} onChange={e => setForm({ ...form, drive_link: e.target.value })} />
            </div>
            <div className="form-grid-2">
              <div className="form-row">
                <label className="form-label">Website</label>
                <input className="form-input" placeholder="https://..." value={form.website} onChange={e => setForm({ ...form, website: e.target.value })} />
              </div>
              <div className="form-row">
                <label className="form-label">Instagram</label>
                <input className="form-input" placeholder="@handle" value={form.instagram} onChange={e => setForm({ ...form, instagram: e.target.value })} />
              </div>
            </div>
            <div className="form-row">
              <label className="form-label">Notes</label>
              <textarea className="form-textarea" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="submit-btn" onClick={save} style={{ flex: 1, marginTop: 0 }}>{selected ? 'Save Changes' : 'Add Client'}</button>
              {selected && (
                <button onClick={() => deleteClient(selected.id)}
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
