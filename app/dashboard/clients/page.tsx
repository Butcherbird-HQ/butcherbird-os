'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

type Client = {
  id: string; name: string; type: string; category: string;
  baseFee: number; revSharePct: number; status: string;
  drive_link?: string; instagram?: string; website?: string; notes?: string;
}

type MonthEntry = { clientId: string; month: string; adSpend: number; revenueGenerated: number }

const blank: Omit<Client, 'id'> = {
  name: '', type: 'performance', category: 'external', baseFee: 0,
  revSharePct: 10, status: 'Active', drive_link: '', instagram: '', website: '', notes: '',
}

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [entries, setEntries] = useState<MonthEntry[]>([])
  const [modal, setModal] = useState(false)
  const [selected, setSelected] = useState<Client | null>(null)
  const [form, setForm] = useState<Omit<Client, 'id'>>(blank)
  const [loading, setLoading] = useState(true)
  const [selectedMonth] = useState(() => new Date().toISOString().slice(0, 7))

  useEffect(() => {
    Promise.all([
      supabase.from('crm_clients').select('*'),
      supabase.from('crm_monthly').select('*').eq('month', selectedMonth),
    ]).then(([{ data: c }, { data: e }]) => {
      if (c) setClients(c)
      if (e) setEntries(e)
      setLoading(false)
    })
  }, [selectedMonth])

  function openNew() { setSelected(null); setForm(blank); setModal(true) }
  function openEdit(c: Client) { setSelected(c); setForm({ name: c.name, type: c.type, category: c.category, baseFee: c.baseFee, revSharePct: c.revSharePct, status: c.status, drive_link: c.drive_link || '', instagram: c.instagram || '', website: c.website || '', notes: c.notes || '' }); setModal(true) }

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

  function getEntry(clientId: string) { return entries.find(e => e.clientId === clientId) }

  const active = clients.filter(c => c.status === 'Active')
  const totalMRR = active.reduce((s, c) => s + c.baseFee, 0)

  if (loading) return <div style={{ padding: '48px', color: 'var(--text-muted)', fontSize: '11px', letterSpacing: '.1em' }}>Loading...</div>

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-dept-tag" style={{ background: 'rgba(45,155,111,0.12)', color: 'var(--c-clients)' }}>Clients</div>
          <div className="page-title">Live Clients</div>
          <div className="page-subtitle">{active.length} active · ${totalMRR.toLocaleString()}/mo base</div>
        </div>
        <button className="btn btn-primary" onClick={openNew}>+ Add Client</button>
      </div>

      <div className="page-body">
        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '8px', marginBottom: '24px' }}>
          {[
            { val: active.length, label: 'Active Clients', color: 'var(--c-clients)' },
            { val: `$${totalMRR.toLocaleString()}`, label: 'Base MRR', color: 'var(--gold)' },
            { val: clients.filter(c => c.category === 'external').length, label: 'External', color: 'var(--c-outreach)' },
          ].map(s => (
            <div key={s.label} className="stat-card" style={{ '--stat-color': s.color } as React.CSSProperties}>
              <div className="stat-card-val" style={{ fontSize: '24px' }}>{s.val}</div>
              <div className="stat-card-label">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Client cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {clients.length === 0 && (
            <div className="empty-state">
              <div className="empty-icon">◇</div>
              <div className="empty-text">No clients yet. Add one above.</div>
            </div>
          )}
          {clients.map(c => {
            const entry = getEntry(c.id)
            const rev = entry?.revenueGenerated || 0
            const spend = entry?.adSpend || 0
            const roas = spend > 0 ? (rev / spend).toFixed(2) : '—'
            return (
              <div key={c.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderLeft: `3px solid ${c.status === 'Active' ? 'var(--c-clients)' : 'var(--text-muted)'}`, padding: '20px 24px', display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap' }}>
                <div style={{ flex: '0 0 200px' }}>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)', letterSpacing: '.05em', marginBottom: '4px' }}>{c.name}</div>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    <span className={`pill pill-${c.status === 'Active' ? 'teal' : 'red'}`}>{c.status}</span>
                    <span className="pill" style={{ background: 'var(--surface3)', color: 'var(--text-muted)' }}>{c.category}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '32px', flex: 1 }}>
                  {[
                    { label: 'Base Fee', val: `$${c.baseFee.toLocaleString()}/mo` },
                    { label: 'Rev Share', val: `${c.revSharePct}%` },
                    { label: 'This Month Rev', val: rev > 0 ? `$${rev.toLocaleString()}` : '—' },
                    { label: 'ROAS', val: roas },
                  ].map(m => (
                    <div key={m.label}>
                      <div style={{ fontSize: '8px', letterSpacing: '.18em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '3px' }}>{m.label}</div>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text)' }}>{m.val}</div>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  {c.drive_link && (
                    <a href={c.drive_link} target="_blank" rel="noopener noreferrer"
                      style={{ fontSize: '8px', letterSpacing: '.15em', textTransform: 'uppercase', color: 'var(--text-muted)', border: '1px solid var(--border)', padding: '7px 12px', transition: 'color .15s' }}
                      onMouseOver={e => (e.currentTarget.style.color = 'var(--text)')} onMouseOut={e => (e.currentTarget.style.color = 'var(--text-muted)')}>
                      Drive ↗
                    </a>
                  )}
                  <button onClick={() => openEdit(c)}
                    style={{ fontSize: '8px', letterSpacing: '.15em', textTransform: 'uppercase', color: 'var(--text-muted)', background: 'none', border: '1px solid var(--border)', padding: '7px 12px', cursor: 'pointer', fontFamily: 'inherit' }}>
                    Edit
                  </button>
                </div>
              </div>
            )
          })}
        </div>
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
              <div className="form-row">
                <label className="form-label">Base Fee ($/mo)</label>
                <input className="form-input" type="number" value={form.baseFee} onChange={e => setForm({ ...form, baseFee: +e.target.value })} />
              </div>
              <div className="form-row">
                <label className="form-label">Rev Share %</label>
                <input className="form-input" type="number" value={form.revSharePct} onChange={e => setForm({ ...form, revSharePct: +e.target.value })} />
              </div>
            </div>
            <div className="form-row">
              <label className="form-label">Google Drive Folder Link</label>
              <input className="form-input" placeholder="https://drive.google.com/..." value={form.drive_link || ''} onChange={e => setForm({ ...form, drive_link: e.target.value })} />
            </div>
            <div className="form-grid-2">
              <div className="form-row">
                <label className="form-label">Website</label>
                <input className="form-input" placeholder="https://..." value={form.website || ''} onChange={e => setForm({ ...form, website: e.target.value })} />
              </div>
              <div className="form-row">
                <label className="form-label">Instagram</label>
                <input className="form-input" placeholder="@handle" value={form.instagram || ''} onChange={e => setForm({ ...form, instagram: e.target.value })} />
              </div>
            </div>
            <div className="form-row">
              <label className="form-label">Notes</label>
              <textarea className="form-textarea" value={form.notes || ''} onChange={e => setForm({ ...form, notes: e.target.value })} />
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
