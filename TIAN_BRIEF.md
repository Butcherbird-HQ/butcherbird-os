# Butcherbird OS — Full Brief for Tian

**Prepared by:** Gascoyne Clarke / Butcherbird Global
**Purpose:** Complete context for Tian and his Claude — OS architecture, AI Config setup, Meta API, and stress test instructions
**Status:** Phase 1 complete. OS is built, live, and secured. Phase 2 requires your stress test first.

---

# PART 1 — THE OS: FULL CONTEXT

## What This System Is

Butcherbird runs paid social (primarily Meta) for clients. The bottleneck is analysis — reviewing ad account performance, identifying what to kill or scale, and translating that into creative briefs and budget decisions. This currently takes hours of manual work per client per week.

The OS automates the analysis layer using Claude, with a structured human confirmation step before any action is taken.

**Claude proposes. A human confirms. Then the system acts.**

This is not a reporting tool. It is a decision-making tool. The confirmation layer is not a limitation — it is the product. An AI that executes directly against live ad accounts without human review is a liability.

---

## Full System Flow

```
[Operator clicks "Run Analysis" on a client page in the OS]
        ↓
[OS assembles full prompt in real time]
  Layer 1: Core Identity         (static — who Claude is as an analyst)
  Layer 2: Platform Intelligence  (static — Meta knowledge, benchmarks, rules)
  Layer 3: Workflow & Output      (static — exact JSON schema Claude must return)
  Layer 4: Client Context         (runtime — client profile + context document)
  Layer 5: Live Meta Data         (runtime — pulled from Meta Marketing API)
        ↓
[Full prompt sent to Anthropic API → Claude returns a JSON array of action cards]
        ↓
[Cards rendered in the OS on the client's Analyses tab]
        ↓
[Operator reviews each card individually]
  → Confirm → card executes its action
  → Reject  → dismissed, logged, no action taken
        ↓
[Confirmed "brief" cards → task created in Brief stage of Creative Pipeline]
[Confirmed "budget_change" / "cut_ad" cards → logged to Meta Actions tab]
        ↓
[Phase 2b: OS calls Meta API to execute confirmed Meta actions]
```

**Hard rule:** Nothing touches Meta without a human confirmation. No exceptions.

---

## The OS — Pages and What They Do

### Command Centre (`/dashboard`)
The home screen. Shows at a glance:
- Creative pipeline breakdown by stage — how many tasks are in Brief, In Progress, Review, Approved, Queued, Live
- Pending Confirmations — any analyses that have been run but not yet confirmed or rejected
- Recent Analyses — last 8 analysis runs across all clients

### Clients (`/dashboard/clients`)
Master list of all clients. Each client card shows name, status, category, Meta Ad Account ID, Instagram, website, notes, and date of last analysis. Click any client to open their detail page.

### Client Detail (`/dashboard/clients/[id]`)
Everything about one client. Five tabs:

**Overview** — Client details, notes, and the Client Context document. The context document is a freeform text field (Tian uploads or pastes a brand brief, product details, audience notes, anything relevant). This is injected verbatim as Layer 4 into every analysis run for that client.

**Analyses** — Full history of analysis runs. "Run Analysis" button lives here (currently disabled — requires Anthropic API key, which is Phase 2). Role-gated: only Founder or Paid Media roles can trigger analysis.

**Ready to Draft** — All creative tasks at the Queued stage for this client. One card per ad that's ready to be published to Meta. When Phase 2b is live, clicking "Publish" will call the Meta API and auto-move the card to Live in the pipeline.

**Meta Actions** — Budget changes, ad cuts, and restructures that have been confirmed through the OS. Currently empty (Phase 2). Will auto-populate from the `analysis_actions` table once the API is wired. Each entry shows: action type, reasoning, current → proposed state, who confirmed it, and whether it has been executed via Meta API.

**Reporting** — Placeholder. Will show live Meta performance data once the API is connected.

### Creative Pipeline (`/dashboard/creative`)
Kanban board. Three channel tabs: Static Ads, Video Ads, Email Marketing. Each channel has the same stages:

| Stage | Meaning |
|-------|---------|
| **Brief** | AI entry point — purple, visually distinct. Confirmed brief cards land here. Anyone looking at the board can immediately see these are AI-generated and waiting to be picked up. |
| **In Progress** | Being worked on by the creative team |
| **Review** | Ready for internal review |
| **Approved** | Approved — ready to hand off to media buyer |
| **Queued** | Creative done and signed off. Media buyer has upload instructions. Surfaces in client's "Ready to Draft" tab. |
| **Live** | Running in Meta |
| **Archived** | Completed or killed — hidden by default |

Cards show: title, assigned team member, funnel stage, ad format, due date. Cards generated from a confirmed analysis are tagged "✦ From Analysis."

### AI Config (`/dashboard/ai-config`)
Where the system prompt is built. Modular — each module is a block of text assembled in sort_order sequence into the system prompt Claude receives before every analysis. "Preview Prompt" button shows the full assembled prompt (Layers 1–3 only — Layers 4 and 5 are appended at runtime).

**Currently has no modules loaded.** Tian writes and loads all content.

### Users (`/dashboard/admin`)
Gascoyne only. Add, edit, remove staff accounts.

---

## Database — Tables You Need to Know

### `crm_clients`
| Column | Notes |
|--------|-------|
| `ad_account_id` | Meta ad account ID (format: `act_XXXXXXXX`) |
| `client_context` | Long-form context document — injected verbatim as Layer 4 |
| `notes` | Short freeform notes |

### `creative_tasks`
Tasks in the pipeline. When a `brief` card is confirmed, a row is inserted here using the payload fields directly. Field names must match exactly.

| Column | Values |
|--------|--------|
| `stage` | Brief / In Progress / Review / Approved / Queued / Live / Archived |
| `channel` | `static` / `video` / `email` (lowercase) |
| `funnel_stage` | `TOF` / `MOF` / `BOF` |
| `ad_format` | `Static Image` / `Video` / `Carousel` / `Story` / `Reel` / `UGC` |
| `angle` | The core hook or pain point |
| `script_notes` | Script outline or visual direction |
| `from_analysis_id` | Set when created from a confirmed brief card — links back to the analysis |

### `analyses`
One record per analysis run. `output` column stores the raw Claude JSON response verbatim.

### `analysis_actions`
Individual action cards from an analysis. One row per card.

| Column | Values |
|--------|--------|
| `type` | `brief` / `budget_change` / `cut_ad` / `restructure` |
| `confidence` | `high` / `medium` / `low` |
| `status` | `pending` / `confirmed` / `rejected` / `void` |
| `payload` | JSONB — type-specific structured data |
| `meta_executed` | Whether the Meta API call has been made |

### `ai_config`
Prompt modules. Each row is one block of the system prompt.

| Column | Notes |
|--------|-------|
| `category` | Layer name: `Core Identity` / `Platform Intelligence` / `Workflow & Output` |
| `sort_order` | Assembly order — lower = assembled first |
| `active` | Toggle — inactive modules are excluded from the assembled prompt |

---

# PART 2 — THE AI CONFIG: YOUR TASK

## How to Load Content Into the OS

1. Go to `https://butcherbird-os.vercel.app` — log in with your account
2. Click **AI Config** in the left sidebar
3. Click **+ Add Module** top right
4. Choose the layer, title it, set sort order, paste content
5. Hit **Preview Prompt** to see exactly what Claude will receive
6. You can add multiple modules per layer — all assembled in sort order

---

## What Goes in Each Layer

### Layer 1 — Core Identity
Who Claude is as an analyst. Its reasoning framework, decision-making rules, and methodologies.

**What to put here:**
- First-principles analytical mindset — data-led, no vanity metrics, no generic advice
- Decision framework: when to cut, when to scale, when to test new creative
- Ben Heath's campaign structure and creative testing methodology — load this in full
- Constraints: what Claude should not recommend without sufficient evidence
- Irreversibility rules: higher evidence threshold required for `budget_change` and `cut_ad` than for `brief`

**Format:** Write it as you'd brief another strategist on how to think. First person ("You are a paid media analyst..."). Be specific — generic instructions produce generic output.

**Suggested structure:** One module for mindset/constraints, one for Ben Heath methodology, one for creative testing philosophy. Separate modules are easier to edit independently.

---

### Layer 2 — Platform Intelligence
What Claude knows about Meta specifically.

**What to put here:**
- Meta algorithm: learning phase, CBO, ASC, broad vs interest targeting
- Benchmarks: ROAS thresholds by funnel stage, CPM ranges, CTR norms, frequency caps before fatigue
- Creative fatigue signals and how to interpret them
- What data signals justify cutting vs waiting vs scaling
- Meta data structure (campaigns → ad sets → ads) — so Claude understands the Layer 5 data it receives
- Common structural mistakes: internal auction competition, overlapping audiences, budget distribution errors

**Format:** Reference-style. Bullet points, benchmarks, and clear thresholds work better than prose.

---

### Layer 3 — Workflow & Output
How Claude processes the data and formats its response.

**This is the most critical layer.** The OS parses Claude's response as JSON directly. If Claude returns anything other than a valid JSON array in the exact schema below, the OS cannot process it. Layer 3 must enforce this absolutely — the instruction to return ONLY a JSON array, nothing else, must be unambiguous.

**What to put here:**
- Step-by-step analysis workflow: read client context → check current pipeline state → read Meta data → identify highest-impact actions → output cards
- Hard instruction: return ONLY a JSON array. No prose before or after. No markdown code blocks. No explanations. Just the raw array.
- The full card schemas below with exact field names and exact value options
- Card limit: maximum 5–7 cards per analysis. If there are more opportunities, prioritise by impact.
- Evidence thresholds (define these clearly):
  - `cut_ad`: minimum spend threshold (e.g. $150+) AND below-threshold ROAS for 7+ days AND no recovery trend
  - `budget_change`: consistent above-threshold ROAS for 7+ days AND headroom confirmed in the ad set
  - `brief`: lower bar — underserved funnel stage, missing creative angle, or clear gap
  - `restructure`: strong structural evidence only, not just suboptimal performance
- Instruction to always check the current pipeline state (Layer 4) before suggesting any brief — do not re-suggest work already in progress
- Instruction to reference specific data in `reasoning`: ad IDs, spend figures, ROAS values, time periods — not generic statements

---

## Required JSON Output Schema

Claude must return a JSON array. Every element is one action card.

```json
[
  {
    "type": "brief",
    "title": "TOF Static — Pain Point Hook",
    "reasoning": "BOF is converting at 4.1x but TOF has only one active creative. Funnel is underfed at the top — a direct pain-point hook is the highest-impact gap.",
    "confidence": "high",
    "payload": {
      "channel": "static",
      "funnel_stage": "TOF",
      "ad_format": "Static Image",
      "angle": "Your skin is absorbing chemicals every time you put on sunscreen. Ours doesn't.",
      "script_notes": "Clean product shot on white. Bold headline. No lifestyle imagery. Direct and factual."
    }
  },
  {
    "type": "budget_change",
    "title": "Increase daily budget — BOF Retargeting",
    "reasoning": "BOF retargeting ad set has run at 4.2x ROAS for 14 days with frequency at 1.6 — well below fatigue threshold. Currently capped at $20/day. Clear headroom to scale.",
    "confidence": "high",
    "payload": {
      "ad_set_id": "123456789",
      "ad_set_name": "BOF — Retargeting — 30 Day",
      "current_budget": 20,
      "proposed_budget": 60,
      "currency": "USD"
    }
  },
  {
    "type": "cut_ad",
    "title": "Pause — Lifestyle Video v3",
    "reasoning": "$340 spent over 14 days at 0.8x ROAS. Frequency at 4.2 — creative fatigue confirmed. No ROAS recovery in last 7 days. No further data will change this outcome.",
    "confidence": "high",
    "payload": {
      "ad_id": "987654321",
      "ad_name": "Lifestyle Video v3",
      "current_spend": 340,
      "current_roas": 0.8,
      "frequency": 4.2
    }
  },
  {
    "type": "restructure",
    "title": "Consolidate overlapping TOF ad sets",
    "reasoning": "Three TOF ad sets share significant audience overlap — internal auction competition is inflating CPMs. Consolidating to one broad TOF ad set would reduce friction.",
    "confidence": "medium",
    "payload": {
      "affected_ad_sets": ["ID1", "ID2", "ID3"],
      "recommendation": "Merge into a single broad TOF campaign with CBO. Retain the top-performing creative from each."
    }
  }
]
```

### Field rules — must be exact

| Field | Rule |
|-------|------|
| `type` | Exactly one of: `brief`, `budget_change`, `cut_ad`, `restructure` |
| `channel` | Exactly: `static`, `video`, or `email` — lowercase |
| `funnel_stage` | Exactly: `TOF`, `MOF`, or `BOF` |
| `ad_format` | Exactly one of: `Static Image`, `Video`, `Carousel`, `Story`, `Reel`, `UGC` |
| `confidence` | Exactly: `high`, `medium`, or `low` |

**Why this matters:** When a `brief` card is confirmed, the OS inserts a row into `creative_tasks` using these payload field names directly. Wrong field name or wrong value = silent insert failure.

### Card type reference

| Type | What happens in the OS | Reversible? |
|------|------------------------|-------------|
| `brief` | Creates a task in Brief stage of Creative Pipeline | Yes |
| `budget_change` | Logged to Meta Actions — executed via Meta API on confirm | No |
| `cut_ad` | Logged to Meta Actions — pauses ad via Meta API on confirm | Partial |
| `restructure` | Logged to Meta Actions — manual execution (Phase 2b) | No |

---

# PART 3 — THE META API

## Critical: Verify Your Token Before Phase 2

The OS needs your existing Meta API credentials — there is no need to set up a new Meta App. Your current connection can be plugged directly into the OS. But before we do that, you need to verify two things.

### What to check

**1. Token type**

There are two types of Meta access tokens:

- **User Access Token** — tied to your personal Facebook account. Expires after 60 days. Not suitable for a persistent production system.
- **System User Token** — tied to a Business Manager System User. Does not expire. This is what the OS needs.

How to check:
1. Go to [developers.facebook.com/tools/debug/accesstoken](https://developers.facebook.com/tools/debug/accesstoken)
2. Paste your current access token
3. Look at **Type** — if it says "User" it will expire. If it says "System User" you're good.

If it's a User token: you need to create a System User in Meta Business Manager → System Users → Add System User, then generate a token from that System User. This takes about 10 minutes.

**2. Permission scope**

The token needs different scopes for different phases:

| Phase | Required scope |
|-------|---------------|
| Phase 2a (read data for analysis) | `ads_read` |
| Phase 2b (execute budget changes, pause ads) | `ads_management` |

In the same token debugger, look at **Scopes**. You need `ads_management` for the full system. If you only have `ads_read`, the scope needs to be updated when generating the System User token.

**3. Ad account access**

The token must have access to each client's specific ad account. In Meta Business Manager → System Users → your system user → Assign Assets → Ad Accounts — make sure all active client ad accounts are listed.

### What we need from you

Once verified (or once you've set up the System User token):
- The access token
- The Meta App ID
- The Meta App Secret

These go into Vercel as environment variables. The OS handles everything from there.

### How your Claude uses the Meta API during the stress test

Your Claude currently has Meta API access connected. For the stress test, you can use this to pull **real** Layer 5 data from BUUB or Schnozz — actual campaign performance, ad set budgets, ad-level ROAS, CPM, CTR, frequency. This makes the stress test significantly more valuable than using dummy data.

When the OS goes live in Phase 2, it will pull this same data automatically at analysis time using the credentials above. The only difference is that your Claude does it manually for the stress test; the OS will do it automatically in production.

---

# PART 4 — THE STRESS TEST

## What We're Testing

The core question: given the 5-layer prompt structure, does Claude produce reliable, structured, actionable output — or does it deviate from the JSON schema, hallucinate signals, or make irreversible recommendations without sufficient evidence?

## How to Run It

Assemble the following in a single prompt to your Claude:

```
[Your Layer 1 content — Core Identity]

---

[Your Layer 2 content — Platform Intelligence]

---

[Your Layer 3 content — Workflow & Output / JSON schema instructions]

---

LAYER 4 — CLIENT CONTEXT

Client: BUUB Sunscreen (or Schnozz Strips)
Ad Account ID: act_XXXXXXXX
Status: Active

Current pipeline state:
- Brief: 2 tasks (do not re-suggest these)
- In Progress: 3 tasks
- Review: 1 task
- Approved: 0 tasks
- Queued: 0 tasks
- Live: 4 tasks

Context document:
[Paste the client context document from the OS — or your own brand notes]

---

LAYER 5 — LIVE META DATA

[Use your Claude's Meta API connection to pull real data from the ad account,
or paste real historical data. Include: active campaigns, ad sets with budgets
and ROAS, individual ads with spend/ROAS/CPM/CTR/frequency]
```

Run this 5+ times on the same account. Consistency matters as much as quality.

## What to Test

1. **Schema compliance** — Does Claude return a valid JSON array with no prose, using exact field names and value options? Does it stay consistent across runs?

2. **Evidence thresholds** — Does it recommend cutting ads with appropriate evidence (spend amount, ROAS level, time period, no recovery trend)? Too aggressive? Too conservative?

3. **Brief quality** — Is `angle` specific enough to brief a designer with? Is `script_notes` actionable? Or is it generic?

4. **Card count control** — Does Layer 3 hold it to 5–7 cards? What happens with a complex account that has 20+ issues?

5. **Methodology application** — Is Claude applying the Ben Heath framework specifically, or defaulting to generic paid media advice? The answer should be different for an account where Ben Heath's approach diverges from conventional wisdom.

6. **Sparse data handling** — Test with a newer account (small spend, few ads). Does it flag low confidence and hold back, or hallucinate signals?

7. **Pipeline awareness** — Include active pipeline tasks in Layer 4. Does Claude avoid re-suggesting work already in progress?

---

## What We Need Back From You

1. **Layer 3 wording** — What instruction wording reliably enforces JSON-only output and schema compliance? What broke it?

2. **Schema changes** — Do any field names, value options, or required fields need to change? Note: if field names in `brief` payload change, the DB columns change too — flag anything before we agree.

3. **Evidence threshold tuning** — What rules in Layer 3 produce the right level of caution for irreversible actions?

4. **Layer 1 and Layer 2 content** — Once the structure is validated, load the actual content into AI Config via the OS. You can do this yourself (login → AI Config → Add Module).

5. **Brief quality verdict** — Is the `brief` payload sufficient to hand to the creative team, or do we need additional fields?

6. **Token verification** — Confirm your token type and scope (see Part 3), and whether you need to generate a System User token.

---

# PART 5 — KNOWN FAILURE MODES

1. **Blind re-suggestion** — Claude suggests work already in the pipeline. Mitigation: Layer 4 always includes current pipeline state. Layer 3 must explicitly instruct Claude to check this before suggesting any brief.

2. **Orphaned analysis records** — Brief confirmed, task created, task later deleted. Analysis shows confirmed but work was abandoned. Mitigation: Phase 2 — deleting a task with `from_analysis_id` will prompt the user and mark the action as `void` (distinct from `rejected`).

3. **Irreversible Meta actions** — Budget changes and ad pauses cannot be undone from the OS. Mitigation: Phase 2b will have a two-step confirmation UI for Meta action cards, plus a permanent execution audit log.

4. **Meta Ads Manager blind spots** — You pause an ad manually in Ads Manager. Claude sees it paused but doesn't know why — may suggest reactivating. Mitigation: the `client_context` field on each client is where you log "Ad X paused manually 5 Mar — do not reactivate." Claude reads this every run.

5. **Vercel timeout** — Complex accounts may push the analysis call over Vercel's timeout limit. Mitigation: Phase 2 moves analysis to a Supabase Edge Function (background job). The UI polls for results rather than waiting on the direct API call.

6. **Race conditions** — Pipeline changes made during an analysis run mean Claude's snapshot may be slightly stale. Mitigation: acceptable risk. The confirmation step is the safeguard — stale suggestions get rejected.

---

# PART 6 — WHAT HAPPENS AFTER

1. You feed back Layer 3 wording, schema feedback, evidence threshold tuning
2. We revise schema and layer definitions accordingly
3. You load Layer 1 and Layer 2 content into AI Config in the OS
4. You confirm Meta token type and scope — we add credentials to Vercel env vars
5. We wire the Anthropic API key → "Run Analysis" goes live
6. We wire the Meta API → Layer 5 data injection goes live
7. First live analysis: BUUB Sunscreen or Schnozz Strips
8. Review the cards, confirm/reject, observe what hits the pipeline and Meta Actions
9. Iterate until output quality is consistent

---

# PART 7 — TECH STACK REFERENCE

| Layer | Technology | Notes |
|-------|-----------|-------|
| Framework | Next.js 16 (App Router) | TypeScript throughout |
| Styling | Pure CSS | No Tailwind, no component libraries |
| Database | Supabase (Postgres + Auth) | |
| Auth | Supabase Auth | Cookie-based sessions, server-side middleware protects all `/dashboard/*` routes |
| AI | Anthropic API — Claude Sonnet 4.6 | Phase 2 — not yet connected |
| Ads | Meta Marketing API | Phase 2 — not yet connected |
| Deploy | Vercel | Auto-deploys on git push to main |
| URL | https://butcherbird-os.vercel.app | |

---

*Last updated: March 2026 — Phase 1 complete. UI redesigned, codebase audited, security hardened. Ready for Phase 2 once stress test is complete.*
