'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

type StaffMember = {
  id: string
  name: string
  role: string
  department: string
  type: 'Full-time' | 'Part-time' | 'Contractor'
  salary: number    // monthly, ZAR
  startDate: string
  status: 'Active' | 'On Leave' | 'Notice Period'
  notes: string
}

type Candidate = {
  id: string
  name: string
  role: string
  source: string
  notes: string
  stage: string
  dateAdded: string
}

const DEPARTMENTS = ['Leadership', 'Paid Media', 'Creative', 'Email Marketing', 'Operations', 'Tech', 'Fulfillment', 'Other']
const EMP_TYPES = ['Full-time', 'Part-time', 'Contractor'] as const
const STAFF_STATUSES = ['Active', 'On Leave', 'Notice Period'] as const

const HIRING_STAGES = ['Identified', 'Screening Call', 'Interview', 'Reference Check', 'Offer Sent', 'Hired', 'Not Progressing']
const hiringStageColors: Record<string, string> = {
  'Identified': 'var(--mid)', 'Screening Call': 'var(--blue)', 'Interview': 'var(--amber)',
  'Reference Check': 'var(--gold)', 'Offer Sent': 'var(--green)', 'Hired': 'var(--green)', 'Not Progressing': 'var(--red)',
}

const emptyStaff: Omit<StaffMember, 'id'> = { name: '', role: '', department: 'Paid Media', type: 'Full-time', salary: 0, startDate: '', status: 'Active', notes: '' }
const emptyCandidate: Omit<Candidate, 'id' | 'dateAdded'> = { name: '', role: '', source: '', notes: '', stage: 'Identified' }

export default function StaffPage() {
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [staffModal, setStaffModal] = useState(false)
  const [staffForm, setStaffForm] = useState<Omit<StaffMember, 'id'>>(emptyStaff)
  const [editingStaffId, setEditingStaffId] = useState<string | null>(null)
  const [candidateModal, setCandidateModal] = useState(false)
  const [candidateForm, setCandidateForm] = useState<Omit<Candidate, 'id' | 'dateAdded'>>(emptyCandidate)
  const [editingCandidateId, setEditingCandidateId] = useState<string | null>(null)
  const [dragId, setDragId] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState<string | null>(null)
  const [activeSection, setActiveSection] = useState<'roster' | 'hiring'>('roster')

  useEffect(() => {
    async function load() {
      const { data: staffData } = await supabase.from('staff').select()
      if (staffData && staffData.length > 0) {
        setStaff(staffData as StaffMember[])
      } else {
        const seed: StaffMember[] = [
          { id: '1', name: 'Larneke', role: '', department: 'Other', type: 'Full-time', salary: 15000, startDate: '', status: 'Active', notes: '' },
          { id: '2', name: 'Ryan', role: '', department: 'Other', type: 'Full-time', salary: 15000, startDate: '', status: 'Active', notes: '' },
          { id: '3', name: 'Zubayr', role: '', department: 'Other', type: 'Full-time', salary: 15000, startDate: '', status: 'Active', notes: '' },
          { id: '4', name: 'Jordyn', role: '', department: 'Other', type: 'Full-time', salary: 10000, startDate: '', status: 'Active', notes: '' },
          { id: '5', name: 'Kaylee', role: '', department: 'Other', type: 'Full-time', salary: 17000, startDate: '', status: 'Active', notes: '' },
          { id: '6', name: 'Liam', role: '', department: 'Other', type: 'Full-time', salary: 15000, startDate: '', status: 'Active', notes: '' },
          { id: '7', name: 'Aamir', role: '', department: 'Other', type: 'Full-time', salary: 8000, startDate: '', status: 'Active', notes: '' },
          { id: '8', name: 'Morgan', role: '', department: 'Other', type: 'Full-time', salary: 20000, startDate: '', status: 'Active', notes: '' },
          { id: '9', name: 'Rhett', role: '', department: 'Other', type: 'Full-time', salary: 17000, startDate: '', status: 'Active', notes: '' },
          { id: '10', name: 'Tian', role: '', department: 'Other', type: 'Full-time', salary: 10000, startDate: '', status: 'Active', notes: '' },
          { id: '11', name: 'Kerry', role: '', department: 'Other', type: 'Full-time', salary: 10000, startDate: '', status: 'Active', notes: '' },
          { id: '12', name: 'ChiChi', role: '', department: 'Other', type: 'Full-time', salary: 7000, startDate: '', status: 'Active', notes: '' },
          { id: '13', name: 'Thando', role: '', department: 'Other', type: 'Full-time', salary: 5000, startDate: '', status: 'Active', notes: '' },
          { id: '14', name: 'Portia', role: '', department: 'Other', type: 'Full-time', salary: 5000, startDate: '', status: 'Active', notes: '' },
          { id: '15', name: 'Ilan', role: '', department: 'Leadership', type: 'Full-time', salary: 20500, startDate: '', status: 'Active', notes: '' },
          { id: '16', name: 'Kat', role: '', department: 'Leadership', type: 'Full-time', salary: 20500, startDate: '', status: 'Active', notes: '' },
          { id: '17', name: 'Gascoyne', role: '', department: 'Leadership', type: 'Full-time', salary: 20500, startDate: '', status: 'Active', notes: '' },
        ]
        await supabase.from('staff').insert(seed)
        setStaff(seed)
      }
      const { data: candidatesData } = await supabase.from('candidates').select()
      if (candidatesData) setCandidates(candidatesData as Candidate[])
    }
    load()
  }, [])

  function openNewStaff() { setEditingStaffId(null); setStaffForm(emptyStaff); setStaffModal(true) }
  function openEditStaff(s: StaffMember) { setEditingStaffId(s.id); setStaffForm({ name: s.name, role: s.role, department: s.department, type: s.type, salary: s.salary, startDate: s.startDate, status: s.status, notes: s.notes }); setStaffModal(true) }
  async function submitStaff() {
    if (!staffForm.name) return
    if (editingStaffId) {
      const updated = { ...staff.find(s => s.id === editingStaffId)!, ...staffForm }
      setStaff(prev => prev.map(s => s.id === editingStaffId ? updated : s))
      await supabase.from('staff').update(staffForm).eq('id', editingStaffId)
    } else {
      const newMember = { id: Date.now().toString(), ...staffForm } as StaffMember
      setStaff(prev => [...prev, newMember])
      await supabase.from('staff').insert(newMember)
    }
    setStaffModal(false)
  }
  async function deleteStaff(id: string) {
    setStaff(prev => prev.filter(s => s.id !== id))
    await supabase.from('staff').delete().eq('id', id)
    setStaffModal(false)
  }

  function openNewCandidate(stage = 'Identified') { setEditingCandidateId(null); setCandidateForm({ ...emptyCandidate, stage }); setCandidateModal(true) }
  function openEditCandidate(c: Candidate) { setEditingCandidateId(c.id); setCandidateForm({ name: c.name, role: c.role, source: c.source, notes: c.notes, stage: c.stage }); setCandidateModal(true) }
  async function submitCandidate() {
    if (!candidateForm.name) return
    if (editingCandidateId) {
      setCandidates(prev => prev.map(c => c.id === editingCandidateId ? { ...c, ...candidateForm } : c))
      await supabase.from('candidates').update(candidateForm).eq('id', editingCandidateId)
    } else {
      const newC = { id: Date.now().toString(), dateAdded: new Date().toISOString().split('T')[0], ...candidateForm } as Candidate
      setCandidates(prev => [...prev, newC])
      await supabase.from('candidates').insert(newC)
    }
    setCandidateModal(false)
  }
  async function deleteCandidate(id: string) {
    setCandidates(prev => prev.filter(c => c.id !== id))
    await supabase.from('candidates').delete().eq('id', id)
    setCandidateModal(false)
  }

  async function handleCandidateDrop(stage: string) {
    if (!dragId) return
    setCandidates(prev => prev.map(c => c.id === dragId ? { ...c, stage } : c))
    await supabase.from('candidates').update({ stage }).eq('id', dragId)
    setDragId(null); setDragOver(null)
  }

  // Financials
  const activeStaff = staff.filter(s => s.status === 'Active')
  const totalMonthly = activeStaff.reduce((sum, s) => sum + (s.salary || 0), 0)
  const totalAnnual = totalMonthly * 12
  const byDepartment = DEPARTMENTS.map(d => ({ dept: d, members: activeStaff.filter(s => s.department === d), total: activeStaff.filter(s => s.department === d).reduce((sum, s) => sum + s.salary, 0) })).filter(d => d.members.length > 0)

  const statusColor: Record<string, string> = { 'Active': 'var(--green)', 'On Leave': 'var(--amber)', 'Notice Period': 'var(--red)' }

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Staff</div>
          <div className="page-subtitle">{staff.filter(s => s.status === 'Active').length} active · Monthly bill: R{totalMonthly.toLocaleString()}</div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {activeSection === 'roster' && <button className="add-btn" style={{ padding: '10px 20px' }} onClick={openNewStaff}>+ Add Staff Member</button>}
          {activeSection === 'hiring' && <button className="add-btn" style={{ padding: '10px 20px' }} onClick={() => openNewCandidate()}>+ Add Candidate</button>}
        </div>
      </div>

      {/* Section toggle */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', paddingLeft: '40px', background: 'var(--dark)', flexShrink: 0 }}>
        {[{ id: 'roster', label: 'Staff Roster' }, { id: 'hiring', label: `Hiring Funnel${candidates.filter(c => c.stage !== 'Hired' && c.stage !== 'Not Progressing').length > 0 ? ` (${candidates.filter(c => c.stage !== 'Hired' && c.stage !== 'Not Progressing').length})` : ''}` }].map(s => (
          <button key={s.id} onClick={() => setActiveSection(s.id as 'roster' | 'hiring')}
            style={{ padding: '14px 24px', background: 'none', border: 'none', borderBottom: activeSection === s.id ? '2px solid var(--gold)' : '2px solid transparent', color: activeSection === s.id ? 'var(--gold)' : 'var(--mid)', fontFamily: 'inherit', fontSize: '9px', fontWeight: activeSection === s.id ? 700 : 400, letterSpacing: '.2em', textTransform: 'uppercase', cursor: 'pointer', marginBottom: '-1px' }}>
            {s.label}
          </button>
        ))}
      </div>

      <div className="page-body">

        {/* ── STAFF ROSTER ─────────────────────────────────────────────────── */}
        {activeSection === 'roster' && (
          <>
            {/* Summary cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '2px', marginBottom: '24px' }}>
              <div className="stat-card">
                <div className="stat-card-val">{activeStaff.length}</div>
                <div className="stat-card-label">Active Headcount</div>
              </div>
              <div className="stat-card">
                <div className="stat-card-val" style={{ fontSize: '18px' }}>R{totalMonthly.toLocaleString()}</div>
                <div className="stat-card-label">Monthly Salary Bill</div>
              </div>
              <div className="stat-card">
                <div className="stat-card-val" style={{ fontSize: '18px' }}>R{totalAnnual.toLocaleString()}</div>
                <div className="stat-card-label">Annual Salary Bill</div>
              </div>
            </div>

            {staff.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: '64px' }}>
                <div style={{ fontSize: '9px', letterSpacing: '.2em', textTransform: 'uppercase', color: 'var(--mid)', marginBottom: '12px' }}>No staff added yet</div>
                <div style={{ fontSize: '11px', color: 'var(--light)', marginBottom: '20px' }}>Add your team members to track headcount and salary bill.</div>
                <button className="add-btn" style={{ padding: '12px 24px' }} onClick={openNewStaff}>+ Add First Staff Member</button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                {/* Table header */}
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1.5fr 1fr 1.2fr 1fr 1fr', gap: '2px', padding: '10px 16px', background: 'var(--dark2)' }}>
                  {['Name', 'Role', 'Department', 'Type', 'Monthly Salary', 'Status', ''].map(h => (
                    <div key={h} style={{ fontSize: '8px', letterSpacing: '.2em', textTransform: 'uppercase', color: 'var(--mid)' }}>{h}</div>
                  ))}
                </div>
                {staff.map(s => (
                  <div key={s.id} onClick={() => openEditStaff(s)}
                    style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1.5fr 1fr 1.2fr 1fr 1fr', gap: '2px', padding: '13px 16px', background: 'var(--dark2)', border: '1px solid var(--border)', cursor: 'pointer', transition: 'border-color .15s' }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,.12)')}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--off-white)' }}>{s.name}</div>
                    <div style={{ fontSize: '11px', color: 'var(--light)' }}>{s.role}</div>
                    <div style={{ fontSize: '10px', color: 'var(--mid)' }}>{s.department}</div>
                    <div style={{ fontSize: '10px', color: 'var(--mid)' }}>{s.type}</div>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: s.salary ? 'var(--off-white)' : 'var(--mid)' }}>{s.salary ? `R${s.salary.toLocaleString()}` : '—'}</div>
                    <div><span style={{ fontSize: '8px', letterSpacing: '.12em', textTransform: 'uppercase', color: statusColor[s.status], background: 'var(--dark)', padding: '2px 8px', border: '1px solid var(--border)' }}>{s.status}</span></div>
                    <div style={{ fontSize: '9px', color: 'var(--mid)' }}>{s.startDate || '—'}</div>
                  </div>
                ))}
                {/* Department breakdown */}
                {byDepartment.length > 0 && (
                  <div className="card" style={{ marginTop: '16px' }}>
                    <div className="card-title">By Department</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      {byDepartment.map(d => (
                        <div key={d.dept} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'var(--dark)', border: '1px solid var(--border)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <span style={{ fontSize: '10px', letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--off-white)' }}>{d.dept}</span>
                            <span style={{ fontSize: '9px', color: 'var(--mid)' }}>{d.members.length} {d.members.length === 1 ? 'person' : 'people'}</span>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--off-white)' }}>R{d.total.toLocaleString()}/mo</div>
                            <div style={{ fontSize: '9px', color: 'var(--mid)' }}>R{(d.total * 12).toLocaleString()}/yr</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* ── HIRING FUNNEL ─────────────────────────────────────────────────── */}
        {activeSection === 'hiring' && (
          <>
            {candidates.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: '64px' }}>
                <div style={{ fontSize: '9px', letterSpacing: '.2em', textTransform: 'uppercase', color: 'var(--mid)', marginBottom: '12px' }}>No candidates in the pipeline</div>
                <div style={{ fontSize: '11px', color: 'var(--light)', marginBottom: '20px' }}>Add candidates and move them through the hiring stages.</div>
                <button className="add-btn" style={{ padding: '12px 24px' }} onClick={() => openNewCandidate()}>+ Add First Candidate</button>
              </div>
            ) : (
              <div className="pipeline">
                {HIRING_STAGES.map(stage => {
                  const stageCandidates = candidates.filter(c => c.stage === stage)
                  return (
                    <div key={stage} className="pipeline-col"
                      style={{ borderColor: dragOver === stage ? 'var(--gold)' : undefined }}
                      onDragOver={e => { e.preventDefault(); setDragOver(stage) }}
                      onDragLeave={() => setDragOver(null)}
                      onDrop={() => handleCandidateDrop(stage)}>
                      <div className="pipeline-col-header">
                        <span className="pipeline-col-title" style={{ color: hiringStageColors[stage] }}>{stage}</span>
                        <span className="pipeline-col-count">{stageCandidates.length}</span>
                      </div>
                      <div className="pipeline-cards">
                        {stageCandidates.map(c => (
                          <div key={c.id} className="pipeline-card"
                            draggable
                            onDragStart={() => setDragId(c.id)}
                            onDragEnd={() => { setDragId(null); setDragOver(null) }}
                            onClick={() => openEditCandidate(c)}
                            style={{ opacity: dragId === c.id ? 0.4 : 1, cursor: 'grab' }}>
                            <div className="pipeline-card-name">{c.name}</div>
                            <div className="pipeline-card-detail">{c.role}</div>
                            {c.source && <div className="pipeline-card-detail" style={{ marginTop: '3px', fontSize: '8px' }}>via {c.source}</div>}
                            {c.notes && <div style={{ fontSize: '9px', color: 'var(--mid)', marginTop: '8px', lineHeight: 1.5, borderTop: '1px solid var(--border)', paddingTop: '8px' }}>{c.notes}</div>}
                            {c.dateAdded && <div style={{ fontSize: '8px', color: 'var(--mid)', marginTop: '6px' }}>Added {c.dateAdded}</div>}
                          </div>
                        ))}
                      </div>
                      <div className="pipeline-add">
                        <button className="pipeline-add-btn" onClick={() => openNewCandidate(stage)}>+ Add</button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* ── STAFF MODAL ─────────────────────────────────────────────────────── */}
      {staffModal && (
        <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && setStaffModal(false)}>
          <div className="modal-box" style={{ maxWidth: '580px', maxHeight: '90vh', overflowY: 'auto' }}>
            <button className="modal-close" onClick={() => setStaffModal(false)}>×</button>
            <div className="modal-title">{editingStaffId ? 'Edit Staff Member' : 'Add Staff Member'}</div>

            <div className="form-grid-2">
              <div className="form-row">
                <label className="form-label">Full Name</label>
                <input className="form-input" value={staffForm.name} onChange={e => setStaffForm({ ...staffForm, name: e.target.value })} placeholder="Full name" autoFocus />
              </div>
              <div className="form-row">
                <label className="form-label">Role / Title</label>
                <input className="form-input" value={staffForm.role} onChange={e => setStaffForm({ ...staffForm, role: e.target.value })} placeholder="e.g. Paid Media Specialist" />
              </div>
              <div className="form-row">
                <label className="form-label">Department</label>
                <select className="form-select" value={staffForm.department} onChange={e => setStaffForm({ ...staffForm, department: e.target.value })}>
                  {DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
                </select>
              </div>
              <div className="form-row">
                <label className="form-label">Employment Type</label>
                <select className="form-select" value={staffForm.type} onChange={e => setStaffForm({ ...staffForm, type: e.target.value as StaffMember['type'] })}>
                  {EMP_TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div className="form-row">
                <label className="form-label">Monthly Salary (ZAR)</label>
                <input className="form-input" type="number" min="0" value={staffForm.salary || ''} onChange={e => setStaffForm({ ...staffForm, salary: parseFloat(e.target.value) || 0 })} placeholder="25000" />
              </div>
              <div className="form-row">
                <label className="form-label">Start Date</label>
                <input className="form-input" type="date" value={staffForm.startDate} onChange={e => setStaffForm({ ...staffForm, startDate: e.target.value })} />
              </div>
              <div className="form-row" style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">Status</label>
                <div style={{ display: 'flex', gap: '2px' }}>
                  {STAFF_STATUSES.map(s => (
                    <button key={s} onClick={() => setStaffForm({ ...staffForm, status: s })}
                      style={{ flex: 1, padding: '9px', background: staffForm.status === s ? 'var(--gold)' : 'var(--dark)', color: staffForm.status === s ? 'var(--black)' : 'var(--mid)', border: '1px solid var(--border)', fontFamily: 'inherit', fontSize: '9px', fontWeight: staffForm.status === s ? 700 : 400, letterSpacing: '.12em', textTransform: 'uppercase', cursor: 'pointer' }}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <div className="form-row" style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">Notes</label>
                <textarea className="form-textarea" value={staffForm.notes} onChange={e => setStaffForm({ ...staffForm, notes: e.target.value })} placeholder="Any notes about this person, role, or contract..." />
              </div>
            </div>
            <button className="submit-btn" onClick={submitStaff}>{editingStaffId ? 'Update' : 'Add to Roster'}</button>
            {editingStaffId && (
              <button onClick={() => deleteStaff(editingStaffId)} style={{ width: '100%', marginTop: '8px', background: 'none', border: '1px solid rgba(224,90,90,.3)', color: 'var(--red)', fontFamily: 'inherit', fontSize: '9px', letterSpacing: '.2em', textTransform: 'uppercase', padding: '10px', cursor: 'pointer' }}>Remove</button>
            )}
          </div>
        </div>
      )}

      {/* ── CANDIDATE MODAL ──────────────────────────────────────────────────── */}
      {candidateModal && (
        <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && setCandidateModal(false)}>
          <div className="modal-box" style={{ maxWidth: '480px' }}>
            <button className="modal-close" onClick={() => setCandidateModal(false)}>×</button>
            <div className="modal-title">{editingCandidateId ? 'Edit Candidate' : 'Add Candidate'}</div>

            <div className="form-grid-2">
              <div className="form-row">
                <label className="form-label">Name</label>
                <input className="form-input" value={candidateForm.name} onChange={e => setCandidateForm({ ...candidateForm, name: e.target.value })} placeholder="Full name" autoFocus />
              </div>
              <div className="form-row">
                <label className="form-label">Role Applying For</label>
                <input className="form-input" value={candidateForm.role} onChange={e => setCandidateForm({ ...candidateForm, role: e.target.value })} placeholder="e.g. Meta Buyer" />
              </div>
              <div className="form-row">
                <label className="form-label">Source</label>
                <input className="form-input" value={candidateForm.source} onChange={e => setCandidateForm({ ...candidateForm, source: e.target.value })} placeholder="LinkedIn, Referral, Job Board..." />
              </div>
              <div className="form-row">
                <label className="form-label">Stage</label>
                <select className="form-select" value={candidateForm.stage} onChange={e => setCandidateForm({ ...candidateForm, stage: e.target.value })}>
                  {HIRING_STAGES.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div className="form-row">
              <label className="form-label">Notes</label>
              <textarea className="form-textarea" style={{ minHeight: '100px' }} value={candidateForm.notes} onChange={e => setCandidateForm({ ...candidateForm, notes: e.target.value })} placeholder="Impression, strengths, concerns, next steps..." />
            </div>
            <button className="submit-btn" onClick={submitCandidate}>{editingCandidateId ? 'Update' : 'Add to Pipeline'}</button>
            {editingCandidateId && (
              <button onClick={() => deleteCandidate(editingCandidateId)} style={{ width: '100%', marginTop: '8px', background: 'none', border: '1px solid rgba(224,90,90,.3)', color: 'var(--red)', fontFamily: 'inherit', fontSize: '9px', letterSpacing: '.2em', textTransform: 'uppercase', padding: '10px', cursor: 'pointer' }}>Remove</button>
            )}
          </div>
        </div>
      )}
    </>
  )
}
