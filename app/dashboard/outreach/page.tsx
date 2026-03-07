'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

// ── TYPES ─────────────────────────────────────────────────────────────────────
type Segment = 'Ecom' | 'Coaching'

type Prospect = {
  id: string
  name: string
  brand: string
  website: string
  instagram: string
  market: string
  segment: Segment
  email: string
  status: string
  dateContacted: string
  adNotes: string
  emailNotes: string
  competitor: string
  angle: string
  notes: string
}

const STATUSES = ['Identified', 'Researched', 'Email Drafted', 'Sent — Day 1', 'Sent — Day 3', 'Sent — Day 7', 'Replied', 'Call Booked', 'Moved to CRM', 'Dead']

const statusColors: Record<string, string> = {
  'Identified': 'var(--mid)',
  'Researched': 'var(--blue)',
  'Email Drafted': 'var(--blue)',
  'Sent — Day 1': 'var(--amber)',
  'Sent — Day 3': 'var(--amber)',
  'Sent — Day 7': 'var(--amber)',
  'Replied': 'var(--gold)',
  'Call Booked': 'var(--green)',
  'Moved to CRM': 'var(--green)',
  'Dead': 'var(--red)',
}

// ── TEMPLATES ─────────────────────────────────────────────────────────────────
const TEMPLATES = [
  {
    segment: 'Ecom',
    angle: 'Ads Weakness',
    sequence: 'Email 1',
    subject: '[Brand] — quick observation',
    body: `Hi [First name],

Came across [Brand] while looking at [niche] brands running Meta ads in [market].

Your product is strong. Your ads are doing something — but the creative is leaving a lot on the table. [Specific observation — e.g. "You're running static images only, no video or UGC, and your main competitor [Competitor] is running testimonial-led video ads that have been live for 4+ months — which tells us they're working."]

[Attach screenshot of their weak ad OR competitor's stronger ad]

We're Butcherbird — Cape Town-based growth agency. We built three brands from zero to meaningful revenue in under a year (R5M+ from R1.6M in ad spend). We do the creative, the media buying, and the email — all under one roof.

Worth a conversation?

Gascoyne
[Calendly link]`,
  },
  {
    segment: 'Ecom',
    angle: 'No Email Marketing',
    sequence: 'Email 1',
    subject: '[Brand] — you\'re missing a channel',
    body: `Hi [First name],

Signed up to [Brand]'s email list yesterday. No welcome email. No follow-up.

For an ecom brand doing real volume, that's a significant amount of revenue walking out the door. Email typically drives 25–40% of revenue for brands like yours when it's set up properly.

[Attach screenshot of their empty inbox OR competitor's well-designed welcome email]

We're Butcherbird — we've built the email infrastructure for brands across health, wellness and DTC from scratch. Meta ads and email under one roof, backed by our own brands that we scaled ourselves.

Worth a quick conversation?

Gascoyne
[Calendly link]`,
  },
  {
    segment: 'Ecom',
    angle: 'Competitor Gap',
    sequence: 'Email 1',
    subject: '[Competitor] is pulling ahead',
    body: `Hi [First name],

Been looking at the [niche] space in [market] — specifically at what's working on Meta right now.

[Competitor] has been running [specific ad format] for [X months]. Those ads don't run that long unless they're profitable. Meanwhile [Brand]'s ads [specific observation about what's weaker].

[Attach screenshot of competitor's strong ad vs their weaker one]

The gap is closeable — and quickly. We're Butcherbird, a growth agency that does creative, paid media, and email under one roof. We've taken brands in your category from zero to R600K months in under 4 months.

Worth 20 minutes?

Gascoyne
[Calendly link]`,
  },
  {
    segment: 'Coaching',
    angle: 'Paid Acquisition Gap',
    sequence: 'Email 1',
    subject: '[Name] — one thing I noticed',
    body: `Hi [First name],

Found you through [platform]. [One specific observation — e.g. "The content is clearly working — the engagement on your posts is strong. But your paid acquisition isn't matching it."]

Checked your Meta ads — [either "you're not running any" or "the ads you're running aren't converting as hard as they could — here's what I mean"]. Your email capture [observation — "has no incentive" / "I signed up and got nothing" / "isn't visible enough"].

[Attach screenshot — their ad or lack of email capture or competitor doing it better]

Brands with your audience size should be converting 3–5x more from paid. We've done it for a Dubai-based coaching brand. We do the creative, the ads, and the email — all under one roof.

Worth a conversation?

Gascoyne
[Calendly link]`,
  },
  {
    segment: 'Ecom',
    angle: 'All',
    sequence: 'Follow-up Day 3',
    subject: 'Re: [original subject]',
    body: `Hi [First name],

Just bumping this up — wanted to make sure it didn't get buried.

The [specific finding from email 1] is worth addressing regardless of whether we work together. Happy to share what we'd do specifically for [Brand] if that's useful.

Gascoyne`,
  },
  {
    segment: 'Coaching',
    angle: 'All',
    sequence: 'Follow-up Day 3',
    subject: 'Re: [original subject]',
    body: `Hi [First name],

Just bumping this up — wanted to make sure it didn't get buried.

The [specific finding from email 1] is worth addressing regardless of whether we work together. Happy to share what we'd do specifically for [Brand] if that's useful.

Gascoyne`,
  },
  {
    segment: 'Ecom',
    angle: 'All',
    sequence: 'Follow-up Day 7',
    subject: 'Re: [original subject]',
    body: `Hi [First name],

Last one from me on this.

If the timing isn't right, completely understood. If it ever is — hello@butcherbird.global.

Gascoyne`,
  },
  {
    segment: 'Coaching',
    angle: 'All',
    sequence: 'Follow-up Day 7',
    subject: 'Re: [original subject]',
    body: `Hi [First name],

Last one from me on this.

If the timing isn't right, completely understood. If it ever is — hello@butcherbird.global.

Gascoyne`,
  },
]

// ── PLAYBOOK SECTIONS ─────────────────────────────────────────────────────────
const PLAYBOOK = [
  {
    title: 'Overview',
    content: `Your job is to find the right brands, do a short but meaningful audit of their marketing, and send a personalised email that proves we've already looked at their business. You are not blasting emails. You are sending a small number of high-quality, specific outreaches every week.

Weekly target: 10–20 outreaches sent. Do not sacrifice quality for volume.

Your goal: Get a reply that leads to a call with Gascoyne. That is the only metric that matters.`,
  },
  {
    title: 'Segment A — Ecom Brands',
    content: `WHO THEY ARE
A product-based brand selling online. Spending money on Meta ads. Has a Shopify or similar store. Making sales but leaving money on the table.

THE SWEET SPOT
- Revenue: $150,000–$2,000,000/month
- Ad spend: $5,000–$100,000/month on Meta
- Team size: 2–20 people

BEST NICHES (in priority order)
1. Health, wellness, supplements
2. Beauty and personal care (DTC)
3. Pet products
4. Home and lifestyle
5. Subscription box products
6. Fitness and sports

BEST MARKETS (in priority order)
1. UAE, Saudi Arabia, Kuwait
2. UK
3. Australia
4. USA
5. South Africa

QUALIFY — must tick ALL:
- Running Meta ads RIGHT NOW (check Meta Ad Library)
- Real branded website (not a dropshipping store)
- Social media presence with real content
- At least 5,000 Instagram followers OR clearly spending real money on ads
- Real customer reviews

DISQUALIFY immediately if:
- Amazon-only brand (no DTC website)
- Pure dropshipping store
- Already with a well-known agency
- Fashion/clothing only (unless premium)
- Revenue appears under $30,000/month`,
  },
  {
    title: 'Segment B — Coaching Brands',
    content: `WHO THEY ARE
A person or small company selling high-ticket coaching, consulting, an online course, a membership, or a digital product. They have an audience. They are making money but their paid acquisition is weak or nonexistent and their email marketing is absent.

THE SWEET SPOT
- Audience: 10,000–500,000 followers on any platform
- Offer price: $500+ per customer
- Already selling — not just building an audience

BEST NICHES
1. Business/entrepreneurship coaches
2. Health and wellness coaches
3. Financial education / wealth building
4. Relationship and life coaching
5. Career and professional development

QUALIFY — must tick ALL:
- Active audience with real engagement
- Clear paid offer (course, coaching program, membership)
- Running ads OR has clearly tried to
- Posts content consistently (at least weekly)

DISQUALIFY immediately if:
- Pure influencer with no product
- Brand new (less than 12 months of content)
- Audience below 5,000
- No clear monetisation beyond brand deals`,
  },
  {
    title: 'Where to Find Them',
    content: `ECOM BRANDS

Meta Ad Library (best method)
1. Go to: facebook.com/ads/library
2. Select country: UAE first, then UK, AU, US
3. Category: All ads
4. Search niche keywords: "sunscreen", "protein powder", "gut health", "dog treats", "skincare", "sleep supplement"
5. Filter: Active ads only
6. Look for: Many ads running (= more spend), long-running ads (= working), poor creative quality (= opportunity)
7. Take screenshots of their weak ads

Instagram/TikTok Search
- Search niche hashtags: #dtcskincare #healthbrand #supplementbrand
- Look for brand accounts with real engagement
- Check their link in bio → website → Meta Ad Library

Google Search
- "Best [niche] brand UAE" / "best [niche] brand UK"
- "[niche] DTC brand" / "[niche] online store"

COACHING BRANDS

Instagram Search
- Search: "business coach", "health coach UAE", "wealth coach UK"
- Look for 10K–500K followers with a clear paid offer

Meta Ad Library
- Search: "coaching program", "online course", "masterclass", "1:1 coaching"

Podcasts
- Search Spotify/Apple Podcasts for niche podcasts
- Hosts with a paid offer are ideal targets`,
  },
  {
    title: 'The Research Process (Mini-Audit)',
    content: `Spend 15–20 minutes on every prospect before writing a word. This is what makes the email land.

1. ADS AUDIT (Meta Ad Library)
- Are they running ads? How many?
- Formats used? (Video, static, carousel)
- Creative quality? (Rate 1–5)
- What is weak? (No video, no UGC, boring copy, no clear offer)
- TAKE A SCREENSHOT of their weakest ad

2. EMAIL AUDIT
- Sign up to their email list using the research Gmail account
- Did you receive a welcome email? How quickly? Was it good?
- Over 24 hours — any follow-up?
- Does the site have an email capture popup? Is it compelling?
- Most common finding: no email capture, or no automated flows
- TAKE A SCREENSHOT of their signup form and inbox (empty = powerful)

3. WEBSITE CHECK (5 minutes as a customer)
- Is it fast and well-designed?
- Strong product page? Good photos, copy, CTA?
- Reviews and social proof?
- Note 1–2 specific weaknesses

4. COMPETITOR RESEARCH
- Find 1–2 competitors doing it better
- Specifically: better creative, stronger email, more ad spend
- Google: "[niche] brand best ads" or browse Meta Ad Library
- Note: who they are and what they're doing better

FILL IN THE RESEARCH LOG in the prospect record before sending anything.`,
  },
  {
    title: 'Finding Their Email',
    content: `You want to reach the FOUNDER or CMO. Not info@. Not customer service.

STEP 1: FIND THE PERSON
- Check Instagram bio and website About page
- Search LinkedIn: brand name → look for Founder, CEO, Head of Marketing, CMO
- For coaching brands: it is almost always the person themselves

STEP 2: FIND THEIR EMAIL (use in this order)
1. Hunter.io — enter their domain, it shows all known emails (25 free searches/month)
2. RocketReach — similar to Hunter
3. LinkedIn — check their profile Contact Info section
4. Their website — About page, Contact page, press/media page
5. Instagram bio

EMAIL FORMAT GUESSING (last resort)
If founder is Sarah Jones at brand.com, try:
- sarah@brand.com
- sarah.jones@brand.com
- sjones@brand.com
Verify using Hunter.io's free email verifier.

If no direct email found:
Use hello@ or contact@ but address it to the founder by first name.`,
  },
  {
    title: 'Email Rules',
    content: `RULES FOR EVERY EMAIL
- Maximum 150 words in the body
- First line must reference something SPECIFIC about their brand
- Include at least ONE specific finding from your research with a screenshot attached
- One clear CTA at the end — low friction
- No agency speak. No "I hope this finds you well." No "synergies." No "full-funnel solutions."
- Write like a smart operator talking to another operator

THE SEQUENCE
- Email 1: Personalised outreach with screenshot
- Email 2 (Day 3 if no reply): Short bump, different angle
- Email 3 (Day 7 if no reply): Final, one sentence
- After 3 emails with no reply: STOP. Mark as Dead. Move on.

PERSONALISATION — every email must have:
1. Specific first line referencing THEIR brand
2. One specific finding (screenshot attached)
3. One relevant Butcherbird proof point matching their situation

10 great emails beats 100 generic ones every time.`,
  },
  {
    title: 'Logging & Reporting',
    content: `LOGGING — after every outreach, immediately:
1. Add the prospect to the Prospects tracker in this dashboard
2. Fill in: name, brand, website, Instagram, market, segment, email, status, date contacted
3. Paste your research notes in the Notes field
4. Update status as it progresses

STATUS MEANINGS
- Identified: Found them, not yet researched
- Researched: Mini-audit done, ready to write
- Email Drafted: Written but not sent
- Sent — Day 1/3/7: Track which email they're on
- Replied: They responded
- Call Booked: Calendar invite confirmed
- Moved to CRM: Active deal, now tracked in CRM
- Dead: 3 emails, no reply

WEEKLY REPORT — send to Gascoyne every Friday:
- Outreaches sent (total, Ecom, Coaching split)
- Replies received
- Calls booked
- 3 notable brands contacted this week (one line each — why they were a fit, what angle you used)
- Any blockers or questions`,
  },
]

// ── HELPERS ───────────────────────────────────────────────────────────────────
const segmentColor = (s: string) => s === 'Ecom' ? 'var(--blue)' : 'var(--gold)'

const blankProspect: Prospect = {
  id: '', name: '', brand: '', website: '', instagram: '', market: '',
  segment: 'Ecom', email: '', status: 'Identified', dateContacted: '',
  adNotes: '', emailNotes: '', competitor: '', angle: '', notes: ''
}

export default function OutreachPage() {
  const [activeTab, setActiveTab] = useState<'prospects' | 'templates' | 'playbook'>('prospects')
  const [prospects, setProspects] = useState<Prospect[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [selected, setSelected] = useState<Prospect | null>(null)
  const [form, setForm] = useState<Partial<Prospect>>({})
  const [statusFilter, setStatusFilter] = useState('All')
  const [segmentFilter, setSegmentFilter] = useState('All')
  const [templateSegment, setTemplateSegment] = useState<'All' | 'Ecom' | 'Coaching'>('All')
  const [copiedTemplate, setCopiedTemplate] = useState<string | null>(null)
  const [playbookSection, setPlaybookSection] = useState(0)
  const [importModal, setImportModal] = useState(false)
  const [importJson, setImportJson] = useState('')
  const [importResult, setImportResult] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('prospects').select()
      if (data) setProspects(data as Prospect[])
      setLoading(false)
    }
    load()
  }, [])

  function openNew() {
    setSelected(null)
    setForm({ status: 'Identified', segment: 'Ecom', dateContacted: new Date().toISOString().split('T')[0] })
    setModal(true)
  }

  function openEdit(p: Prospect) { setSelected(p); setForm({ ...p }); setModal(true) }

  async function submit() {
    if (!form.brand) return
    const p = selected
      ? { ...selected, ...form } as Prospect
      : { ...blankProspect, id: Date.now().toString(), ...form } as Prospect
    setProspects(prev => selected ? prev.map(x => x.id === p.id ? p : x) : [...prev, p])
    await supabase.from('prospects').upsert(p)
    setModal(false)
  }

  async function deleteProspect(id: string) {
    setProspects(prev => prev.filter(p => p.id !== id))
    await supabase.from('prospects').delete().eq('id', id)
    setModal(false)
  }

  async function importLeads() {
    setImportResult(null)
    try {
      const parsed = JSON.parse(importJson)
      const incoming: Prospect[] = Array.isArray(parsed) ? parsed : [parsed]
      const normalised = incoming.map((p, i) => ({ ...blankProspect, ...p, id: p.id || `import-${Date.now()}-${i}` }))
      const existingIds = new Set(prospects.map(p => p.id))
      const newOnly = normalised.filter(p => !existingIds.has(p.id))
      if (newOnly.length > 0) {
        setProspects(prev => [...prev, ...newOnly])
        await supabase.from('prospects').upsert(newOnly)
      }
      setImportResult(`Imported ${newOnly.length} new prospect${newOnly.length !== 1 ? 's' : ''}. ${normalised.length - newOnly.length} duplicate${normalised.length - newOnly.length !== 1 ? 's' : ''} skipped.`)
      setImportJson('')
    } catch {
      setImportResult('Invalid JSON. Paste the raw array output from the agent.')
    }
  }

  function exportLeads() {
    const json = JSON.stringify(prospects, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `butcherbird-prospects-${new Date().toISOString().split('T')[0]}.json`; a.click()
    URL.revokeObjectURL(url)
  }

  async function copyTemplate(text: string, id: string) {
    await navigator.clipboard.writeText(text)
    setCopiedTemplate(id)
    setTimeout(() => setCopiedTemplate(null), 2000)
  }

  const filtered = prospects.filter(p => {
    const statusMatch = statusFilter === 'All' || p.status === statusFilter
    const segmentMatch = segmentFilter === 'All' || p.segment === segmentFilter
    return statusMatch && segmentMatch
  })

  const visibleTemplates = TEMPLATES.filter(t => templateSegment === 'All' || t.segment === templateSegment)

  const stats = {
    total: prospects.length,
    sent: prospects.filter(p => p.status.startsWith('Sent')).length,
    replied: prospects.filter(p => p.status === 'Replied' || p.status === 'Call Booked').length,
    calls: prospects.filter(p => p.status === 'Call Booked').length,
  }

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Outreach</div>
          <div className="page-subtitle">{stats.total} prospects · {stats.sent} contacted · {stats.replied} replied · {stats.calls} calls booked</div>
        </div>
        {activeTab === 'prospects' && (
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={exportLeads} style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--mid)', fontFamily: 'inherit', fontSize: '9px', letterSpacing: '.15em', textTransform: 'uppercase', padding: '10px 16px', cursor: 'pointer' }}>Export JSON</button>
            <button onClick={() => { setImportModal(true); setImportResult(null) }} style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--mid)', fontFamily: 'inherit', fontSize: '9px', letterSpacing: '.15em', textTransform: 'uppercase', padding: '10px 16px', cursor: 'pointer' }}>Import Leads</button>
            <button className="add-btn" style={{ padding: '10px 20px' }} onClick={openNew}>+ Add Prospect</button>
          </div>
        )}
      </div>

      {/* Tab nav */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', paddingLeft: '40px', background: 'var(--dark)', flexShrink: 0 }}>
        {[{ id: 'prospects', label: 'Prospects' }, { id: 'templates', label: 'Email Templates' }, { id: 'playbook', label: 'VA Playbook' }].map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id as typeof activeTab)}
            style={{ padding: '14px 24px', background: 'none', border: 'none', borderBottom: activeTab === t.id ? '2px solid var(--gold)' : '2px solid transparent', color: activeTab === t.id ? 'var(--gold)' : 'var(--mid)', fontFamily: 'inherit', fontSize: '9px', fontWeight: activeTab === t.id ? 700 : 400, letterSpacing: '.2em', textTransform: 'uppercase', cursor: 'pointer', marginBottom: '-1px' }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── PROSPECTS ──────────────────────────────────────────────────────────── */}
      {activeTab === 'prospects' && (
        <div className="page-body">
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: '4px' }}>
              {['All', 'Ecom', 'Coaching'].map(s => (
                <button key={s} onClick={() => setSegmentFilter(s)}
                  style={{ background: segmentFilter === s ? 'var(--gold)' : 'var(--dark2)', color: segmentFilter === s ? 'var(--black)' : 'var(--mid)', border: '1px solid var(--border)', fontFamily: 'inherit', fontSize: '8px', letterSpacing: '.15em', textTransform: 'uppercase', padding: '6px 12px', cursor: 'pointer', fontWeight: segmentFilter === s ? 700 : 400 }}>
                  {s}
                </button>
              ))}
            </div>
            <div style={{ width: '1px', height: '20px', background: 'var(--border)' }} />
            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
              {['All', ...STATUSES].map(s => (
                <button key={s} onClick={() => setStatusFilter(s)}
                  style={{ background: statusFilter === s ? 'var(--dark)' : 'transparent', color: statusFilter === s ? 'var(--off-white)' : 'var(--mid)', border: statusFilter === s ? '1px solid rgba(255,255,255,.15)' : '1px solid transparent', fontFamily: 'inherit', fontSize: '8px', letterSpacing: '.12em', textTransform: 'uppercase', padding: '6px 10px', cursor: 'pointer' }}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '64px', color: 'var(--mid)', fontSize: '11px', letterSpacing: '.1em' }}>Loading...</div>
          ) : filtered.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '64px' }}>
              <div style={{ fontSize: '9px', letterSpacing: '.2em', textTransform: 'uppercase', color: 'var(--mid)', marginBottom: '12px' }}>No prospects yet</div>
              <div style={{ fontSize: '11px', color: 'var(--light)', marginBottom: '20px' }}>Add prospects as the VA identifies and researches them, or import from an agent session.</div>
              <button className="add-btn" style={{ padding: '12px 24px' }} onClick={openNew}>+ Add First Prospect</button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1fr 1fr 1fr 1.5fr 1fr', gap: '2px', padding: '10px 16px', background: 'var(--dark2)' }}>
                {['Brand', 'Contact', 'Segment', 'Market', 'Email', 'Status', 'Contacted'].map(h => (
                  <div key={h} style={{ fontSize: '8px', letterSpacing: '.2em', textTransform: 'uppercase', color: 'var(--mid)' }}>{h}</div>
                ))}
              </div>
              {filtered.map(p => (
                <div key={p.id} onClick={() => openEdit(p)}
                  style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1fr 1fr 1fr 1.5fr 1fr', gap: '2px', padding: '12px 16px', background: 'var(--dark2)', border: '1px solid var(--border)', cursor: 'pointer', transition: 'border-color .15s', alignItems: 'center' }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,.12)')}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--off-white)' }}>{p.brand}</div>
                  <div style={{ fontSize: '11px', color: 'var(--light)' }}>{p.name || '—'}</div>
                  <div><span style={{ fontSize: '8px', letterSpacing: '.08em', textTransform: 'uppercase', color: segmentColor(p.segment), background: 'var(--dark)', padding: '2px 6px', border: '1px solid var(--border)' }}>{p.segment}</span></div>
                  <div style={{ fontSize: '10px', color: 'var(--mid)' }}>{p.market}</div>
                  <div style={{ fontSize: '10px', color: 'var(--mid)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.email || '—'}</div>
                  <div><span style={{ fontSize: '8px', letterSpacing: '.1em', textTransform: 'uppercase', color: statusColors[p.status] || 'var(--mid)', background: 'var(--dark)', padding: '2px 8px', border: '1px solid var(--border)' }}>{p.status}</span></div>
                  <div style={{ fontSize: '10px', color: 'var(--mid)' }}>{p.dateContacted || '—'}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── TEMPLATES ──────────────────────────────────────────────────────────── */}
      {activeTab === 'templates' && (
        <div className="page-body">
          <div style={{ display: 'flex', gap: '4px', marginBottom: '24px' }}>
            {(['All', 'Ecom', 'Coaching'] as const).map(s => (
              <button key={s} onClick={() => setTemplateSegment(s)}
                style={{ background: templateSegment === s ? 'var(--gold)' : 'var(--dark2)', color: templateSegment === s ? 'var(--black)' : 'var(--mid)', border: '1px solid var(--border)', fontFamily: 'inherit', fontSize: '8px', letterSpacing: '.15em', textTransform: 'uppercase', padding: '8px 16px', cursor: 'pointer', fontWeight: templateSegment === s ? 700 : 400 }}>
                {s}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {visibleTemplates.map((t, i) => {
              const id = `${t.segment}-${t.angle}-${t.sequence}`
              const isCopied = copiedTemplate === id
              return (
                <div key={i} style={{ background: 'var(--dark2)', border: '1px solid var(--border)', padding: '20px 24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '8px', letterSpacing: '.15em', textTransform: 'uppercase', color: segmentColor(t.segment), background: 'var(--dark)', padding: '3px 8px', border: '1px solid var(--border)' }}>{t.segment}</span>
                      <span style={{ fontSize: '8px', letterSpacing: '.15em', textTransform: 'uppercase', color: 'var(--gold)', background: 'var(--dark)', padding: '3px 8px', border: '1px solid var(--border)' }}>{t.sequence}</span>
                      <span style={{ fontSize: '9px', color: 'var(--light)', fontWeight: 700 }}>{t.angle}</span>
                    </div>
                    <button onClick={() => copyTemplate(`Subject: ${t.subject}\n\n${t.body}`, id)}
                      style={{ background: isCopied ? 'var(--green)' : 'var(--dark)', border: '1px solid var(--border)', color: isCopied ? 'var(--black)' : 'var(--mid)', fontFamily: 'inherit', fontSize: '8px', letterSpacing: '.15em', textTransform: 'uppercase', padding: '6px 14px', cursor: 'pointer', flexShrink: 0 }}>
                      {isCopied ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                  <div style={{ fontSize: '9px', color: 'var(--gold)', marginBottom: '10px', letterSpacing: '.05em' }}>Subject: {t.subject}</div>
                  <pre style={{ fontSize: '11px', color: 'var(--light)', lineHeight: 1.8, whiteSpace: 'pre-wrap', fontFamily: 'inherit', margin: 0 }}>{t.body}</pre>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── PLAYBOOK ───────────────────────────────────────────────────────────── */}
      {activeTab === 'playbook' && (
        <div className="page-body" style={{ display: 'flex', gap: '24px', alignItems: 'flex-start' }}>
          <div style={{ width: '200px', flexShrink: 0, position: 'sticky', top: '24px' }}>
            <div style={{ fontSize: '8px', letterSpacing: '.2em', textTransform: 'uppercase', color: 'var(--mid)', marginBottom: '10px' }}>Sections</div>
            {PLAYBOOK.map((s, i) => (
              <button key={i} onClick={() => setPlaybookSection(i)}
                style={{ display: 'block', width: '100%', textAlign: 'left', background: playbookSection === i ? 'var(--dark2)' : 'none', border: playbookSection === i ? '1px solid var(--border)' : '1px solid transparent', color: playbookSection === i ? 'var(--off-white)' : 'var(--mid)', fontFamily: 'inherit', fontSize: '10px', padding: '9px 12px', cursor: 'pointer', marginBottom: '2px', letterSpacing: '.02em' }}>
                {s.title}
              </button>
            ))}
          </div>
          <div style={{ flex: 1, background: 'var(--dark2)', border: '1px solid var(--border)', padding: '28px 32px' }}>
            <div style={{ fontSize: '8px', letterSpacing: '.2em', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: '10px' }}>VA Playbook</div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--off-white)', marginBottom: '20px', letterSpacing: '.02em' }}>{PLAYBOOK[playbookSection].title}</div>
            <pre style={{ fontSize: '11px', color: 'var(--light)', lineHeight: 2, whiteSpace: 'pre-wrap', fontFamily: 'inherit', margin: 0 }}>{PLAYBOOK[playbookSection].content}</pre>
          </div>
        </div>
      )}

      {/* ── IMPORT MODAL ───────────────────────────────────────────────────────── */}
      {importModal && (
        <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && setImportModal(false)}>
          <div className="modal-box" style={{ maxWidth: '600px' }}>
            <button className="modal-close" onClick={() => setImportModal(false)}>×</button>
            <div className="modal-title">Import Leads</div>
            <div style={{ fontSize: '11px', color: 'var(--light)', marginBottom: '16px', lineHeight: 1.6 }}>
              Paste the JSON output from Claude cowork or any agent session. Must be an array matching the Prospect schema. Duplicate IDs are automatically skipped.
            </div>
            <div style={{ fontSize: '8px', letterSpacing: '.2em', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: '8px' }}>Expected format</div>
            <pre style={{ fontSize: '10px', color: 'var(--mid)', background: 'var(--dark)', border: '1px solid var(--border)', padding: '12px', marginBottom: '16px', overflowX: 'auto', lineHeight: 1.6 }}>{`[
  {
    "id": "brandname-20260306",
    "brand": "Brand Name",
    "name": "Founder Name",
    "website": "brand.com",
    "instagram": "@handle",
    "email": "founder@brand.com",
    "market": "UAE",
    "segment": "Ecom",
    "status": "Researched",
    "dateContacted": "",
    "adNotes": "What you found in Meta Ad Library",
    "emailNotes": "What you found about their email setup",
    "competitor": "CompetitorName — what they do better",
    "angle": "No email marketing",
    "notes": "Priority reasoning and context"
  }
]`}</pre>
            <textarea
              style={{ width: '100%', height: '180px', background: 'var(--dark)', border: '1px solid var(--border)', color: 'var(--off-white)', fontFamily: 'monospace', fontSize: '11px', padding: '12px', resize: 'vertical', marginBottom: '12px', boxSizing: 'border-box' }}
              placeholder="Paste JSON array here..."
              value={importJson}
              onChange={e => setImportJson(e.target.value)}
            />
            {importResult && (
              <div style={{ fontSize: '11px', color: importResult.startsWith('Invalid') ? 'var(--red)' : 'var(--green)', marginBottom: '12px', padding: '10px 14px', background: 'var(--dark)', border: `1px solid ${importResult.startsWith('Invalid') ? 'rgba(224,90,90,.3)' : 'rgba(52,211,153,.3)'}` }}>
                {importResult}
              </div>
            )}
            <button className="submit-btn" onClick={importLeads}>Import</button>
          </div>
        </div>
      )}

      {/* ── PROSPECT MODAL ─────────────────────────────────────────────────────── */}
      {modal && (
        <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div className="modal-box" style={{ maxWidth: '640px', maxHeight: '90vh', overflowY: 'auto' }}>
            <button className="modal-close" onClick={() => setModal(false)}>×</button>
            <div className="modal-title">{selected ? 'Edit Prospect' : 'Add Prospect'}</div>

            <div style={{ fontSize: '8px', letterSpacing: '.2em', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: '14px' }}>Brand Info</div>
            <div className="form-grid-2">
              <div className="form-row">
                <label className="form-label">Brand / Company</label>
                <input className="form-input" value={form.brand || ''} onChange={e => setForm({ ...form, brand: e.target.value })} placeholder="Brand name" autoFocus />
              </div>
              <div className="form-row">
                <label className="form-label">Contact Name</label>
                <input className="form-input" value={form.name || ''} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Founder / CMO name" />
              </div>
              <div className="form-row">
                <label className="form-label">Website</label>
                <input className="form-input" value={form.website || ''} onChange={e => setForm({ ...form, website: e.target.value })} placeholder="brand.com" />
              </div>
              <div className="form-row">
                <label className="form-label">Instagram</label>
                <input className="form-input" value={form.instagram || ''} onChange={e => setForm({ ...form, instagram: e.target.value })} placeholder="@handle" />
              </div>
              <div className="form-row">
                <label className="form-label">Email</label>
                <input className="form-input" value={form.email || ''} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="founder@brand.com" />
              </div>
              <div className="form-row">
                <label className="form-label">Market</label>
                <input className="form-input" value={form.market || ''} onChange={e => setForm({ ...form, market: e.target.value })} placeholder="UAE, UK, AU, US..." />
              </div>
            </div>

            <div style={{ fontSize: '8px', letterSpacing: '.2em', textTransform: 'uppercase', color: 'var(--gold)', margin: '16px 0 14px' }}>Classification</div>
            <div className="form-grid-2">
              <div className="form-row">
                <label className="form-label">Segment</label>
                <div style={{ display: 'flex', gap: '2px' }}>
                  {(['Ecom', 'Coaching'] as Segment[]).map(s => (
                    <button key={s} onClick={() => setForm({ ...form, segment: s })}
                      style={{ flex: 1, padding: '9px', background: form.segment === s ? 'var(--gold)' : 'var(--dark)', color: form.segment === s ? 'var(--black)' : 'var(--mid)', border: '1px solid var(--border)', fontFamily: 'inherit', fontSize: '9px', fontWeight: form.segment === s ? 700 : 400, letterSpacing: '.12em', textTransform: 'uppercase', cursor: 'pointer' }}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <div className="form-row">
                <label className="form-label">Date Contacted</label>
                <input className="form-input" type="date" value={form.dateContacted || ''} onChange={e => setForm({ ...form, dateContacted: e.target.value })} />
              </div>
              <div className="form-row" style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">Status</label>
                <select className="form-select" value={form.status || 'Identified'} onChange={e => setForm({ ...form, status: e.target.value })}>
                  {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>

            <div style={{ fontSize: '8px', letterSpacing: '.2em', textTransform: 'uppercase', color: 'var(--gold)', margin: '16px 0 14px' }}>Research Notes</div>
            <div className="form-row">
              <label className="form-label">Ads — what you found (quality, weaknesses, screenshots taken)</label>
              <textarea className="form-textarea" value={form.adNotes || ''} onChange={e => setForm({ ...form, adNotes: e.target.value })} placeholder="e.g. Running 3 static ads, no video, no UGC. Ads have been live 6 months — conservative creative. Screenshot saved." />
            </div>
            <div className="form-row">
              <label className="form-label">Email — what you found (signed up, welcome email, flows)</label>
              <textarea className="form-textarea" value={form.emailNotes || ''} onChange={e => setForm({ ...form, emailNotes: e.target.value })} placeholder="e.g. Signed up. No welcome email received. No popup on site. Zero email infrastructure." />
            </div>
            <div className="form-row">
              <label className="form-label">Competitor — who is doing it better and how</label>
              <input className="form-input" value={form.competitor || ''} onChange={e => setForm({ ...form, competitor: e.target.value })} placeholder="e.g. BrandX — running UGC testimonial videos for 3+ months" />
            </div>
            <div className="form-row">
              <label className="form-label">Outreach Angle — the specific hook used in the email</label>
              <input className="form-input" value={form.angle || ''} onChange={e => setForm({ ...form, angle: e.target.value })} placeholder="e.g. No email marketing — signed up, got nothing" />
            </div>
            <div className="form-row">
              <label className="form-label">Additional Notes</label>
              <textarea className="form-textarea" value={form.notes || ''} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Any other context, flags, or next steps..." />
            </div>

            <button className="submit-btn" onClick={submit}>{selected ? 'Update' : 'Add Prospect'}</button>
            {selected && (
              <button onClick={() => deleteProspect(selected.id)} style={{ width: '100%', marginTop: '8px', background: 'none', border: '1px solid rgba(224,90,90,.3)', color: 'var(--red)', fontFamily: 'inherit', fontSize: '9px', letterSpacing: '.2em', textTransform: 'uppercase', padding: '10px', cursor: 'pointer' }}>Remove</button>
            )}
          </div>
        </div>
      )}
    </>
  )
}
