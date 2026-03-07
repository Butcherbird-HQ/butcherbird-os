'use client'
import { useState, useEffect } from 'react'

type User = { id: string; email: string; name: string; role: string; created_at: string }

const blank = { email: '', password: '', name: '', role: '' }

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [modal, setModal] = useState(false)
  const [selected, setSelected] = useState<User | null>(null)
  const [form, setForm] = useState(blank)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function load() {
    const r = await fetch('/api/admin/users')
    if (!r.ok) { setLoading(false); return }
    setUsers(await r.json())
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function openNew() { setSelected(null); setForm(blank); setError(''); setModal(true) }
  function openEdit(u: User) {
    setSelected(u)
    setForm({ email: u.email, password: '', name: u.name, role: u.role })
    setError('')
    setModal(true)
  }

  async function save() {
    if (!form.name.trim()) return
    setSaving(true); setError('')
    if (selected) {
      const body: Record<string, string> = { name: form.name, role: form.role }
      if (form.password) body.password = form.password
      const r = await fetch(`/api/admin/users/${selected.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      })
      if (!r.ok) { setError((await r.json()).error); setSaving(false); return }
    } else {
      const r = await fetch('/api/admin/users', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
      })
      if (!r.ok) { setError((await r.json()).error); setSaving(false); return }
    }
    await load(); setModal(false); setSaving(false)
  }

  async function deleteUser(id: string) {
    await fetch(`/api/admin/users/${id}`, { method: 'DELETE' })
    await load(); setModal(false)
  }

  const initials = (name: string) => name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?'

  if (loading) return <div style={{ padding: '48px', color: 'var(--text-muted)', fontSize: '11px', letterSpacing: '.1em' }}>Loading...</div>

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-dept-tag" style={{ background: 'var(--gold-alpha)', color: 'var(--gold)' }}>Super User</div>
          <div className="page-title">Users</div>
          <div className="page-subtitle">{users.length} account{users.length !== 1 ? 's' : ''}</div>
        </div>
        <button className="btn btn-primary" onClick={openNew}>+ Add User</button>
      </div>

      <div className="page-body">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {users.map(u => (
            <div key={u.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderLeft: `3px solid ${u.email === 'g@butcherbird.global' ? 'var(--gold)' : 'var(--border)'}`, padding: '18px 24px', display: 'flex', alignItems: 'center', gap: '20px' }}>
              <div style={{ width: '42px', height: '42px', background: 'var(--gold-alpha)', border: '1px solid var(--gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 700, color: 'var(--gold)', flexShrink: 0 }}>
                {initials(u.name)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)' }}>{u.name || '—'}</span>
                  {u.email === 'g@butcherbird.global' && (
                    <span className="pill" style={{ background: 'var(--gold-alpha)', color: 'var(--gold)' }}>Super User</span>
                  )}
                </div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{u.email}</div>
              </div>
              <span className="pill" style={{ background: 'var(--surface3)', color: 'var(--text-muted)' }}>{u.role || 'team'}</span>
              <button onClick={() => openEdit(u)}
                style={{ fontSize: '8px', letterSpacing: '.15em', textTransform: 'uppercase', color: 'var(--text-muted)', background: 'none', border: '1px solid var(--border)', padding: '7px 12px', cursor: 'pointer', fontFamily: 'inherit' }}>
                Edit
              </button>
            </div>
          ))}
        </div>
      </div>

      {modal && (
        <div className="modal-backdrop" onClick={() => setModal(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-title">{selected ? 'Edit User' : 'Add User'}</div>
            <button className="modal-close" onClick={() => setModal(false)}>×</button>

            <div className="form-row">
              <label className="form-label">Full Name</label>
              <input className="form-input" placeholder="e.g. Jane Smith" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} autoFocus />
            </div>
            {!selected && (
              <div className="form-row">
                <label className="form-label">Email</label>
                <input className="form-input" type="email" placeholder="name@butcherbird.global" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
              </div>
            )}
            <div className="form-grid-2">
              <div className="form-row">
                <label className="form-label">Role / Title</label>
                <input className="form-input" placeholder="e.g. Paid Media Lead" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} />
              </div>
              <div className="form-row">
                <label className="form-label">{selected ? 'New Password (optional)' : 'Password'}</label>
                <input className="form-input" type="password" placeholder={selected ? 'Leave blank to keep current' : ''} value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
              </div>
            </div>

            {error && (
              <div style={{ fontSize: '10px', color: 'var(--red)', padding: '10px 14px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', marginBottom: '12px' }}>
                {error}
              </div>
            )}

            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="submit-btn" onClick={save} style={{ flex: 1, marginTop: 0 }} disabled={saving}>
                {saving ? 'Saving...' : selected ? 'Save Changes' : 'Add User'}
              </button>
              {selected && selected.email !== 'g@butcherbird.global' && (
                <button onClick={() => deleteUser(selected.id)}
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
