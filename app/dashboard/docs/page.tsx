'use client'
import { useState } from 'react'

type DocSection = {
  id: string
  label: string
  category: string
}

const sections: DocSection[] = [
  { id: 'pitch-overview', label: 'Pitch — Overview', category: 'Pitch Deck' },
  { id: 'pitch-proof', label: 'Pitch — Proof & Results', category: 'Pitch Deck' },
  { id: 'pitch-offer', label: 'Pitch — The Offer', category: 'Pitch Deck' },
  { id: 'pitch-pricing', label: 'Pitch — Pricing', category: 'Pitch Deck' },
  { id: 'pricing-full', label: 'Pricing Guide', category: 'Pricing' },
  { id: 'msa', label: 'Master Service Agreement', category: 'Legal' },
]

type ContentMap = Record<string, React.ReactNode>

const content: ContentMap = {
  'pitch-overview': (
    <div className="doc-content">
      <h2>Butcherbird Global — Pitch Overview</h2>
      <p className="doc-subtitle">Use this section to open any sales call or as the intro slide in a deck.</p>

      <h3>Who We Are</h3>
      <p>Butcherbird Global is a full-stack performance marketing agency based in Cape Town, South Africa. We handle paid media, email marketing, creative production, and video — all under one roof, all in one room.</p>
      <p>We're not a typical agency. We were born from building our own brands. We've scaled products from zero to meaningful revenue ourselves, which means we know what operators actually need — not just what sounds good in a pitch.</p>

      <h3>The Problem We Solve</h3>
      <ul>
        <li>Brands running ads but leaving money on the table with broken email infrastructure</li>
        <li>Agencies that handle one piece but not the whole funnel — forcing clients to coordinate between 3 vendors</li>
        <li>Creative that doesn't convert because the agency doesn't understand performance</li>
        <li>No attribution clarity — spend is up but nobody can explain why ROAS is dropping</li>
      </ul>

      <h3>What Makes Us Different</h3>
      <div className="doc-pillars">
        <div className="doc-pillar">
          <strong>One Room, One Team</strong>
          <p>Everyone in our Cape Town office. Media buyers, email marketers, designers, video editors — all working together, solving problems in real time.</p>
        </div>
        <div className="doc-pillar">
          <strong>Operators First</strong>
          <p>We built our own brands from scratch. We know what it takes because we've done it. That knowledge is embedded in everything we do.</p>
        </div>
        <div className="doc-pillar">
          <strong>Geo-Arbitrage</strong>
          <p>South African cost base. World-class output. For international clients: same or better quality than a London or New York agency at a fraction of the price.</p>
        </div>
      </div>

      <h3>Who We Work With</h3>
      <ul>
        <li>Ecommerce brands spending $5K+/month on ads, or ready to</li>
        <li>Coaching and info-product businesses with proven offers ready to scale</li>
        <li>Founders who want to hand off their entire digital growth operation</li>
        <li>Brands frustrated with agencies that don't own the full funnel</li>
      </ul>
    </div>
  ),

  'pitch-proof': (
    <div className="doc-content">
      <h2>Proof & Results</h2>
      <p className="doc-subtitle">8 months active. 6 brands scaled. Numbers that speak for themselves.</p>

      <div className="doc-headline-stats">
        <div className="doc-stat">
          <span className="doc-stat-number">R5,050,000</span>
          <span className="doc-stat-label">Revenue Generated</span>
        </div>
        <div className="doc-stat">
          <span className="doc-stat-number">3.10×</span>
          <span className="doc-stat-label">Blended ROAS</span>
        </div>
        <div className="doc-stat">
          <span className="doc-stat-number">30,000+</span>
          <span className="doc-stat-label">Customers Acquired</span>
        </div>
        <div className="doc-stat">
          <span className="doc-stat-number">182+</span>
          <span className="doc-stat-label">Retail Doors Opened</span>
        </div>
      </div>

      <h3>Brand Breakdowns</h3>

      <div className="doc-case">
        <div className="doc-case-header">
          <strong>BUUB Sunscreen</strong>
          <span className="doc-badge internal">Internal Brand</span>
        </div>
        <p>Built from zero — brand, packaging, Shopify, ads, email — all in-house.</p>
        <ul>
          <li>0 → R200–300K/month online revenue</li>
          <li>500+ retail stores nationwide</li>
          <li>3.56× blended ROAS across campaign history</li>
          <li>10,000+ customers</li>
          <li>Best creative: 11.83× ROAS on a single ad</li>
          <li>Klaviyo infrastructure built from scratch — meaningful revenue channel within 6 weeks</li>
        </ul>
        <p className="doc-case-note">The clearest proof of the Butcherbird system working end-to-end.</p>
      </div>

      <div className="doc-case">
        <div className="doc-case-header">
          <strong>Schnozz Strips</strong>
          <span className="doc-badge internal">Internal Brand</span>
        </div>
        <p>Single SKU nasal strip → multi-product health brand.</p>
        <ul>
          <li>0 → R600K months in 4 months</li>
          <li>3.10× blended ROAS</li>
          <li>20,000+ customers</li>
          <li>182+ retail doors: Sportsman's Warehouse + CNA</li>
          <li>Best CPA: R47 from testimonial UGC creative</li>
          <li>Used DTC performance data as the pitch deck to get into retail</li>
        </ul>
        <p className="doc-case-note">Story of following the data without hesitation.</p>
      </div>

      <div className="doc-case">
        <div className="doc-case-header">
          <strong>Lakrids (Scandinavia)</strong>
          <span className="doc-badge client">External Client</span>
        </div>
        <ul>
          <li>120% YOY growth with Butcherbird running paid media + email</li>
        </ul>
      </div>

      <div className="doc-case">
        <div className="doc-case-header">
          <strong>Helpdesk (SA App)</strong>
          <span className="doc-badge client">External Client</span>
        </div>
        <ul>
          <li>0 → 10,000+ app downloads</li>
          <li>Built the entire paid acquisition funnel from scratch</li>
        </ul>
      </div>

      <div className="doc-case">
        <div className="doc-case-header">
          <strong>Superior Fragrances</strong>
          <span className="doc-badge internal">Internal Brand</span>
        </div>
        <ul>
          <li>Few hundred → 4,000+ active sales agents through ads</li>
          <li>Built the entire recruitment and sales agent funnel</li>
        </ul>
      </div>

      <p className="doc-note">Note: Most of this happened in South Africa, where the ecommerce ceiling is significantly lower than international markets. These numbers are exceptional for the environment. International clients with larger budgets and bigger markets can expect more.</p>
    </div>
  ),

  'pitch-offer': (
    <div className="doc-content">
      <h2>The Offer</h2>
      <p className="doc-subtitle">One line: An expert team that becomes your performance marketing and retention backbone — all under one roof.</p>

      <h3>Core Services</h3>
      <ul>
        <li><strong>Paid Media:</strong> Meta + Google — full campaign management, creative testing, scaling</li>
        <li><strong>Email Marketing:</strong> Design, automation flows, weekly newsletters — full build-out from scratch</li>
        <li><strong>Creative:</strong> Static ad creation, concepting, scripting, UGC briefing</li>
        <li><strong>Video Editing:</strong> All clients. Videography: Cape Town-based clients only.</li>
      </ul>

      <h3>What You're Actually Buying</h3>
      <p>Not services. Conversions and retention.</p>
      <ul>
        <li>More revenue from existing ad spend</li>
        <li>Dramatically higher brand awareness</li>
        <li>Technical infrastructure built to scale (tracking, flows, attribution)</li>
        <li>6-month outcomes: brands go from zero to profitably selling online; struggling brands hit 100%+ growth</li>
      </ul>

      <h3>Executive Consulting Layer</h3>
      <p>Clients don't just get a team running their ads. They get direct access to Gascoyne Clarke and the exec team — operators who have built brands from nothing.</p>
      <ul>
        <li>Stress-test ideas, get accountability, tap into deep operator insight</li>
        <li>Available as a standalone session or included in full retainer</li>
        <li>Strong retention driver — clients aren't just buying a service, they're buying a partner</li>
      </ul>

      <h3>What We Fix First</h3>
      <p>In every engagement, we start by fixing the broken infrastructure that's costing the client money:</p>
      <ul>
        <li>Poorly set up conversion tracking</li>
        <li>Weak or missing email flows</li>
        <li>No creative testing framework</li>
        <li>No attribution clarity</li>
      </ul>
      <p>We rebuild the foundation first, then scale. The results come from fixing the system — not just spending more.</p>
    </div>
  ),

  'pitch-pricing': (
    <div className="doc-content">
      <h2>Pricing — For Sales Conversations</h2>
      <p className="doc-subtitle">Use this to anchor conversations. Specific numbers are in the Pricing Guide.</p>

      <h3>How We Structure Engagements</h3>

      <div className="doc-pricing-block">
        <div className="doc-pricing-row">
          <div className="doc-pricing-label">Entry Point</div>
          <div className="doc-pricing-detail">
            <strong>$1,500 — Executive Consulting Session</strong>
            <p>Half-day with Gascoyne + exec team. Full audit, strategy session, and roadmap. Standalone value. Natural door-opener to full retainer.</p>
          </div>
        </div>
        <div className="doc-pricing-row">
          <div className="doc-pricing-label">Core Retainer</div>
          <div className="doc-pricing-detail">
            <strong>Full-stack paid media + email + creative</strong>
            <p>The client's entire digital growth backbone. Pricing scales with scope — see Pricing Guide for tiers.</p>
          </div>
        </div>
        <div className="doc-pricing-row">
          <div className="doc-pricing-label">Performance Fee</div>
          <div className="doc-pricing-detail">
            <strong>10% revenue share above 3-month baseline</strong>
            <p>Applied to revenue above the client's 3-month average before engagement. Aligned incentives — we only earn more when they do.</p>
          </div>
        </div>
      </div>

      <h3>The Geo-Arbitrage Argument</h3>
      <p>A comparable team in London or New York would cost 3–5× more for the same output. South African cost base means we can charge international clients a fraction of what they'd pay locally — and we still operate at a significant margin that funds a world-class team.</p>
      <p>For US/UK clients: same or better quality than what they're used to, at 30–50 cents on the dollar.</p>

      <h3>Talking About Price on a Call</h3>
      <ul>
        <li>Never lead with price — lead with the problem we solve and the proof we have</li>
        <li>Anchor to the consulting session first ($1,500) — low friction, high value</li>
        <li>Retainer conversations happen after they've seen how we think</li>
        <li>If they push on price before you've established value, redirect: "Let's make sure this is a fit first, then we can talk numbers."</li>
      </ul>
    </div>
  ),

  'pricing-full': (
    <div className="doc-content">
      <h2>Pricing Guide</h2>
      <p className="doc-subtitle">Internal reference. Do not share directly — use Pitch — Pricing for client conversations.</p>

      <h3>Executive Consulting</h3>
      <div className="doc-table-wrap">
        <table className="doc-table">
          <thead><tr><th>Service</th><th>Price (USD)</th><th>Notes</th></tr></thead>
          <tbody>
            <tr><td>Half-day session (Gascoyne + exec)</td><td>$1,500</td><td>Standalone or door-opener to retainer</td></tr>
            <tr><td>Monthly advisory retainer</td><td>$500–1,000/mo</td><td>Bolt-on to full service retainer</td></tr>
          </tbody>
        </table>
      </div>

      <h3>Full-Stack Retainer — International Clients</h3>
      <div className="doc-table-wrap">
        <table className="doc-table">
          <thead><tr><th>Tier</th><th>Scope</th><th>Price (USD/mo)</th></tr></thead>
          <tbody>
            <tr><td>Starter</td><td>Paid media (Meta OR Google) + email</td><td>$3,000–4,000</td></tr>
            <tr><td>Core</td><td>Paid media (Meta + Google) + email + creative</td><td>$5,000–7,000</td></tr>
            <tr><td>Full Stack</td><td>Core + video editing + strategy</td><td>$8,000–12,000</td></tr>
          </tbody>
        </table>
      </div>

      <h3>Performance Fee</h3>
      <div className="doc-table-wrap">
        <table className="doc-table">
          <thead><tr><th>Structure</th><th>Detail</th></tr></thead>
          <tbody>
            <tr><td>Baseline</td><td>Client's 3-month average revenue before engagement</td></tr>
            <tr><td>Fee</td><td>10% of revenue above that baseline</td></tr>
            <tr><td>Cap</td><td>Negotiate per client — typically uncapped</td></tr>
          </tbody>
        </table>
      </div>

      <h3>SA Clients — Reference</h3>
      <div className="doc-table-wrap">
        <table className="doc-table">
          <thead><tr><th>Scope</th><th>Price (ZAR/mo)</th></tr></thead>
          <tbody>
            <tr><td>Paid media only</td><td>R15,000–25,000</td></tr>
            <tr><td>Paid media + email</td><td>R25,000–40,000</td></tr>
            <tr><td>Full stack</td><td>R40,000–65,000</td></tr>
          </tbody>
        </table>
      </div>

      <h3>Positioning Notes</h3>
      <ul>
        <li>Target: 3–5 new external international clients at $6–10K/mo</li>
        <li>Current revenue mix: 56% internal brands — target below 40%</li>
        <li>Performance fee is the upside lever — lock in retainer, earn more as they grow</li>
        <li>Never discount the retainer — negotiate on scope instead</li>
      </ul>
    </div>
  ),

  'msa': (
    <div className="doc-content">
      <h2>Master Service Agreement</h2>
      <p className="doc-subtitle">Template MSA — review with a lawyer before use with international clients.</p>

      <div className="doc-note">This is a working draft. Have it reviewed by a South African attorney with international commerce experience before executing with clients.</div>

      <h3>1. Parties</h3>
      <p>This Master Service Agreement ("Agreement") is entered into between <strong>Butcherbird Global (Pty) Ltd</strong>, a company registered in South Africa ("Agency"), and the client identified in the applicable Statement of Work ("Client").</p>

      <h3>2. Services</h3>
      <p>Agency will provide digital marketing services as detailed in one or more Statements of Work ("SOW") executed by both parties. Each SOW forms part of this Agreement. In the event of conflict, the SOW prevails.</p>

      <h3>3. Fees & Payment</h3>
      <ul>
        <li>Retainer fees are invoiced monthly in advance, due within 7 days of invoice date.</li>
        <li>Performance fees (where applicable) are calculated on the prior month's revenue and invoiced on the 1st of each month.</li>
        <li>Late payment incurs interest at 2% per month on outstanding balances.</li>
        <li>All fees are quoted exclusive of VAT. VAT is added where applicable.</li>
        <li>International clients: fees quoted in USD. Payment via bank transfer or agreed payment platform.</li>
      </ul>

      <h3>4. Term & Termination</h3>
      <ul>
        <li>This Agreement commences on the SOW start date and continues until terminated.</li>
        <li>Either party may terminate with 30 days written notice.</li>
        <li>Agency may terminate immediately if Client fails to pay within 14 days of due date.</li>
        <li>Upon termination, Client is liable for all fees accrued to the termination date.</li>
      </ul>

      <h3>5. Intellectual Property</h3>
      <ul>
        <li>Creative assets produced under this Agreement become Client property upon full payment.</li>
        <li>Agency retains the right to use work in portfolio and case studies unless Client requests otherwise in writing.</li>
        <li>Agency retains ownership of proprietary systems, frameworks, and methodologies.</li>
      </ul>

      <h3>6. Confidentiality</h3>
      <p>Both parties agree to keep confidential all non-public information received from the other party. This obligation survives termination for 2 years.</p>

      <h3>7. Ad Spend & Third-Party Platforms</h3>
      <ul>
        <li>Client is responsible for funding all ad spend directly through their own platform accounts.</li>
        <li>Agency is not liable for platform policy changes, account bans, or spend performance outside of its control.</li>
        <li>Agency will provide best-effort management and notify Client immediately of any platform issues.</li>
      </ul>

      <h3>8. Limitation of Liability</h3>
      <p>Agency's total liability under this Agreement shall not exceed the total fees paid in the 3 months preceding the claim. Agency is not liable for indirect, consequential, or lost-profit damages.</p>

      <h3>9. Governing Law</h3>
      <p>This Agreement is governed by the laws of the Republic of South Africa. Disputes shall be resolved in the Western Cape High Court, Cape Town.</p>

      <h3>10. Entire Agreement</h3>
      <p>This Agreement, together with all SOWs, constitutes the entire agreement between the parties and supersedes all prior discussions.</p>

      <div className="doc-signature-block">
        <div className="doc-signature">
          <p><strong>Butcherbird Global (Pty) Ltd</strong></p>
          <p>Signed: ___________________________</p>
          <p>Name: Gascoyne Clarke</p>
          <p>Title: Director</p>
          <p>Date: ___________________________</p>
        </div>
        <div className="doc-signature">
          <p><strong>Client</strong></p>
          <p>Signed: ___________________________</p>
          <p>Name: ___________________________</p>
          <p>Title: ___________________________</p>
          <p>Date: ___________________________</p>
        </div>
      </div>
    </div>
  ),
}

export default function DocsPage() {
  const [activeSection, setActiveSection] = useState('pitch-overview')

  const categories = Array.from(new Set(sections.map(s => s.category)))

  return (
    <div className="page-shell">
      <div className="page-header">
        <div>
          <h1 className="page-title">Docs</h1>
          <p className="page-subtitle">Pitch deck, pricing, legal — everything in one place.</p>
        </div>
      </div>

      <div className="docs-layout">
        <aside className="docs-sidebar">
          {categories.map(cat => (
            <div key={cat} className="docs-sidebar-group">
              <div className="docs-sidebar-category">{cat}</div>
              {sections.filter(s => s.category === cat).map(s => (
                <button
                  key={s.id}
                  className={`docs-sidebar-item${activeSection === s.id ? ' active' : ''}`}
                  onClick={() => setActiveSection(s.id)}
                >
                  {s.label}
                </button>
              ))}
            </div>
          ))}
        </aside>

        <div className="docs-body">
          {content[activeSection]}
        </div>
      </div>

      <style>{`
        .docs-layout {
          display: flex;
          gap: 0;
          height: calc(100vh - 140px);
          border: 1px solid var(--border);
          border-radius: 8px;
          overflow: hidden;
          background: var(--surface);
        }
        .docs-sidebar {
          width: 220px;
          flex-shrink: 0;
          border-right: 1px solid var(--border);
          overflow-y: auto;
          padding: 16px 0;
          background: var(--bg);
        }
        .docs-sidebar-group {
          margin-bottom: 24px;
        }
        .docs-sidebar-category {
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--text-muted);
          padding: 0 16px 8px;
        }
        .docs-sidebar-item {
          display: block;
          width: 100%;
          text-align: left;
          background: none;
          border: none;
          padding: 8px 16px;
          font-size: 13px;
          color: var(--text-secondary);
          cursor: pointer;
          transition: background 0.15s, color 0.15s;
          border-left: 2px solid transparent;
        }
        .docs-sidebar-item:hover {
          background: var(--surface);
          color: var(--text);
        }
        .docs-sidebar-item.active {
          background: var(--surface);
          color: var(--text);
          border-left-color: var(--accent);
          font-weight: 500;
        }
        .docs-body {
          flex: 1;
          overflow-y: auto;
          padding: 40px 48px;
        }
        .doc-content h2 {
          font-size: 22px;
          font-weight: 600;
          margin: 0 0 6px;
          color: var(--text);
        }
        .doc-subtitle {
          color: var(--text-muted);
          font-size: 13px;
          margin: 0 0 32px;
          padding-bottom: 24px;
          border-bottom: 1px solid var(--border);
        }
        .doc-content h3 {
          font-size: 13px;
          font-weight: 600;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          color: var(--text-muted);
          margin: 28px 0 12px;
        }
        .doc-content p {
          font-size: 14px;
          line-height: 1.7;
          color: var(--text-secondary);
          margin: 0 0 12px;
        }
        .doc-content ul {
          margin: 0 0 16px;
          padding-left: 20px;
        }
        .doc-content li {
          font-size: 14px;
          line-height: 1.7;
          color: var(--text-secondary);
          margin-bottom: 4px;
        }
        .doc-content strong {
          color: var(--text);
          font-weight: 500;
        }
        .doc-pillars {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 16px;
          margin: 16px 0;
        }
        .doc-pillar {
          padding: 16px;
          border: 1px solid var(--border);
          border-radius: 6px;
        }
        .doc-pillar strong {
          display: block;
          font-size: 13px;
          margin-bottom: 8px;
        }
        .doc-pillar p {
          font-size: 13px;
          margin: 0;
        }
        .doc-headline-stats {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
          margin: 0 0 32px;
          padding: 24px;
          background: var(--bg);
          border: 1px solid var(--border);
          border-radius: 8px;
        }
        .doc-stat {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .doc-stat-number {
          font-size: 22px;
          font-weight: 600;
          color: var(--text);
        }
        .doc-stat-label {
          font-size: 11px;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .doc-case {
          border: 1px solid var(--border);
          border-radius: 6px;
          padding: 16px 20px;
          margin-bottom: 16px;
        }
        .doc-case-header {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 8px;
        }
        .doc-badge {
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          padding: 2px 8px;
          border-radius: 3px;
        }
        .doc-badge.internal {
          background: rgba(99, 102, 241, 0.12);
          color: #818cf8;
        }
        .doc-badge.client {
          background: rgba(16, 185, 129, 0.12);
          color: #34d399;
        }
        .doc-case-note {
          font-style: italic;
          font-size: 13px;
          margin-top: 8px;
        }
        .doc-note {
          background: rgba(234, 179, 8, 0.08);
          border: 1px solid rgba(234, 179, 8, 0.2);
          border-radius: 6px;
          padding: 12px 16px;
          font-size: 13px;
          color: var(--text-secondary);
          margin: 16px 0;
        }
        .doc-pricing-block {
          border: 1px solid var(--border);
          border-radius: 6px;
          overflow: hidden;
          margin: 16px 0;
        }
        .doc-pricing-row {
          display: grid;
          grid-template-columns: 140px 1fr;
          gap: 0;
          border-bottom: 1px solid var(--border);
        }
        .doc-pricing-row:last-child {
          border-bottom: none;
        }
        .doc-pricing-label {
          padding: 16px;
          font-size: 12px;
          font-weight: 600;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          border-right: 1px solid var(--border);
          display: flex;
          align-items: flex-start;
          background: var(--bg);
        }
        .doc-pricing-detail {
          padding: 16px;
        }
        .doc-pricing-detail strong {
          display: block;
          font-size: 14px;
          margin-bottom: 6px;
        }
        .doc-pricing-detail p {
          margin: 0;
          font-size: 13px;
        }
        .doc-table-wrap {
          margin: 12px 0 24px;
          border: 1px solid var(--border);
          border-radius: 6px;
          overflow: hidden;
        }
        .doc-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 13px;
        }
        .doc-table th {
          background: var(--bg);
          padding: 10px 16px;
          text-align: left;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          color: var(--text-muted);
          border-bottom: 1px solid var(--border);
        }
        .doc-table td {
          padding: 10px 16px;
          color: var(--text-secondary);
          border-bottom: 1px solid var(--border);
        }
        .doc-table tr:last-child td {
          border-bottom: none;
        }
        .doc-signature-block {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 32px;
          margin-top: 40px;
          padding-top: 32px;
          border-top: 1px solid var(--border);
        }
        .doc-signature p {
          margin-bottom: 16px;
        }
      `}</style>
    </div>
  )
}
