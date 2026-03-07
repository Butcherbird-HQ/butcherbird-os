# Butcherbird AI System — Technical Brief for Tian

**Prepared by:** Gascoyne Clarke / Butcherbird Global
**Purpose:** Architecture brief for stress testing the AI Config, loading your documentation, and preparing for Phase 2 live integration
**Status:** Phase 1 complete — OS built, UI redesigned, security hardened. API connections are next.

---

## 1. What This Is

Butcherbird runs paid social (primarily Meta) for clients. The bottleneck is analysis — reviewing ad account performance, identifying what to kill or scale, and translating that into creative briefs and budget decisions. This currently takes hours of manual work per client.

The goal is to automate the analysis layer using Claude, with a structured human confirmation step before any action is taken. Claude proposes. A human confirms. Then the system acts.

**This is not a reporting tool. It is a decision-making tool.**

---

## 2. Full System Architecture

```
[Operator clicks "Run Analysis" on a client page]
        ↓
[OS assembles full prompt]
  Layer 1: Core Identity        (static — who Claude is as an analyst)
  Layer 2: Platform Intelligence (static — Meta knowledge, benchmarks, rules)
  Layer 3: Workflow & Output    (static — exact JSON schema Claude must return)
  Layer 4: Client Context       (runtime — injected from client profile + context doc)
  Layer 5: Live Meta Data       (runtime — injected from Meta Marketing API)
        ↓
[Prompt sent to Anthropic API → Claude returns structured JSON array]
        ↓
[JSON parsed into action cards — rendered in the OS on the client's Analyses tab]
        ↓
[Human reviews each card individually]
  → Confirm: card is accepted
  → Reject: card is dismissed, logged
        ↓
[Confirmed "brief" cards → new task created in Brief stage of Creative Pipeline]
[Confirmed "budget_change" / "cut_ad" cards → logged to Meta Actions tab]
        ↓
[Phase 2b: OS calls Meta Marketing API to execute confirmed Meta actions]
```

**Hard rule:** Nothing executes in Meta without a human confirmation. This is a hard constraint, not a soft one.

---

## 3. The AI Config — How It Works

The AI Config page in the OS is where the system prompt is built. It is modular — each entry you create is a block of text that gets assembled in `sort_order` sequence into a single system prompt sent to Claude before every analysis.

**The AI Config currently has no modules loaded.** You need to write and load the content for Layers 1, 2, and 3. Layers 4 and 5 are assembled automatically by the OS at runtime — you don't configure those.

### How to load content into the OS

1. Go to `https://butcherbird-os.vercel.app` and log in with your account
2. Navigate to **AI Config** in the left sidebar
3. Click **+ Add Module** in the top right
4. Select the Layer (1, 2, or 3), give it a title, set the sort order, and paste the content
5. The "Preview Prompt" button shows you exactly what Claude will receive (Layers 1–3 assembled)
6. You can add multiple modules per layer — they all get assembled in sort order

---

## 4. What Goes in Each Layer

### Layer 1 — Core Identity
**Who Claude is as an analyst.** Its reasoning framework, decision-making rules, and methodologies.

**What to put here:**
- First-principles analytical mindset (data-led, no vanity metrics, no generic advice)
- Decision framework: when to cut, when to scale, when to test new creative
- Ben Heath's campaign structure and creative testing methodology — load this fully
- Constraints: what it should not recommend without sufficient evidence
- Irreversibility rules: it must set a higher evidence threshold for `budget_change` and `cut_ad` than for `brief`

**Format:** Write it as you would brief another strategist on how to think. First person works ("You are..."). Be specific. Generic instructions produce generic output.

**Module suggestion:** One module for analytical mindset/constraints, one for Ben Heath methodology, one for creative testing philosophy. Separate modules are easier to edit independently.

---

### Layer 2 — Platform Intelligence
**What Claude knows about Meta specifically.**

**What to put here:**
- Meta algorithm behaviour: learning phase, CBO, ASC, broad vs interest
- Benchmark data: acceptable ROAS thresholds by funnel stage, CPM ranges, CTR norms, frequency caps
- Creative fatigue signals and how to interpret them
- What data signals justify cutting vs waiting vs scaling
- Meta API structure (campaigns → ad sets → ads) — so Claude understands the data it's receiving in Layer 5
- Common structural mistakes (internal auction competition, overlapping audiences, etc.)

**Format:** Reference-style. Claude reads this once and uses it to interpret the Layer 5 data. Bullet points, benchmarks, and clear thresholds work better than prose.

---

### Layer 3 — Workflow & Output
**How Claude processes the data and formats its response. This layer is critical.**

**The OS parses Claude's response as JSON directly. If Claude returns anything other than a valid JSON array in the exact schema below, the OS cannot process it. Layer 3 must enforce this absolutely.**

**What to put here:**
- Step-by-step analysis workflow (read client context → read pipeline state → read Meta data → identify actions → output cards)
- The instruction that Claude returns ONLY a JSON array — no prose, no explanation, no markdown. Just the array.
- The card schemas below — exact field names, exact value options
- Maximum card limit: 5–7 cards per analysis. If there are more opportunities, prioritise by impact.
- Evidence thresholds for irreversible actions (see below)
- Instruction to reference specific ad IDs, spend figures, and ROAS values in `reasoning` — not generic statements

**Evidence thresholds to define in Layer 3:**
- `cut_ad`: requires minimum spend (e.g. $150+) AND below-threshold ROAS for 7+ days AND no recovery trend
- `budget_change`: requires consistent above-threshold ROAS for 7+ days AND headroom in the ad set
- `brief`: lower bar — if a creative angle is missing or a funnel stage is underserved, recommend it
- `restructure`: requires strong structural evidence, not just suboptimal performance

---

## 5. Required JSON Output Schema

Claude must return a JSON array. Every element is one action card.

```json
[
  {
    "type": "brief",
    "title": "Short descriptive title — will display as the card heading",
    "reasoning": "Why this is being recommended. Must reference specific data: ROAS, spend, funnel gap, etc.",
    "confidence": "high | medium | low",
    "payload": {
      "channel": "static | video | email",
      "funnel_stage": "TOF | MOF | BOF",
      "ad_format": "Static Image | Video | Carousel | Story | Reel | UGC",
      "angle": "The core hook or pain point this ad should lead with",
      "script_notes": "Script outline or visual direction. Specific enough to brief a designer."
    }
  },
  {
    "type": "budget_change",
    "title": "Increase daily budget on [Ad Set Name]",
    "reasoning": "4.2x ROAS over 14 days, above threshold, stable frequency at 1.8",
    "confidence": "high",
    "payload": {
      "ad_set_id": "123456789",
      "ad_set_name": "Broad — Interest Stack",
      "current_budget": 150,
      "proposed_budget": 250,
      "currency": "USD"
    }
  },
  {
    "type": "cut_ad",
    "title": "Pause underperforming ad — [Ad Name]",
    "reasoning": "$340 spent, 0.8x ROAS over 14 days, frequency 4.2 — creative fatigue confirmed, no recovery trend",
    "confidence": "high",
    "payload": {
      "ad_id": "987654321",
      "ad_name": "UGC Video — Hook A",
      "current_spend": 340,
      "current_roas": 0.8,
      "frequency": 4.2
    }
  },
  {
    "type": "restructure",
    "title": "Consolidate overlapping ad sets",
    "reasoning": "Three ad sets targeting overlapping audiences — internal auction competition reducing efficiency",
    "confidence": "medium",
    "payload": {
      "affected_ad_sets": ["ID1", "ID2", "ID3"],
      "recommendation": "Detailed description of the proposed new structure"
    }
  }
]
```

### Field rules — critical

**`type`:** Must be exactly one of: `brief`, `budget_change`, `cut_ad`, `restructure`

**`channel` (brief only):** Must be exactly: `static`, `video`, or `email` (lowercase)

**`funnel_stage` (brief only):** Must be exactly: `TOF`, `MOF`, or `BOF`

**`ad_format` (brief only):** Must be exactly one of: `Static Image`, `Video`, `Carousel`, `Story`, `Reel`, `UGC`

**`confidence`:** Must be exactly: `high`, `medium`, or `low`

**Why this matters:** When a `brief` card is confirmed, the OS inserts a row into the `creative_tasks` table using these field names directly. If the field names or values don't match, the insert fails silently.

### Card type reference

| Type | What it does in the OS | Reversible? |
|------|------------------------|-------------|
| `brief` | Creates a task in the Brief stage of Creative Pipeline | Yes — task can be deleted |
| `budget_change` | Logged to Meta Actions tab — executed via Meta API on confirmation | No |
| `cut_ad` | Logged to Meta Actions tab — pauses ad via Meta API on confirmation | Partial — can be re-enabled manually |
| `restructure` | Logged to Meta Actions tab — requires manual execution (Phase 2b) | No |

---

## 6. The Creative Pipeline — How Work Moves

| Stage | What it means |
|-------|---------------|
| **Brief** | AI entry point. Confirmed brief cards land here. Also accepts manually added briefs. Purple — visually distinct. |
| **In Progress** | Being worked on by the creative team |
| **Review** | Ready for internal review |
| **Approved** | Approved and ready to hand off to media buyer |
| **Queued** | Creative done and signed off — media buyer has upload instructions. Surfaces in "Ready to Draft" on the client detail page. |
| **Live** | Running in Meta |
| **Archived** | Completed or killed — hidden by default |

**"Ready to Draft" tab** (on each client's detail page) shows all creative tasks at the **Queued** stage for that client. This is where the media buyer publishes ads to Meta — one card per ad. When Phase 2b is live, clicking "Publish" will trigger the Meta API and move the card to Live automatically.

---

## 7. Human Confirmation Flow

1. Analysis runs → cards appear on the client's **Analyses** tab
2. Each card shows: type, title, reasoning, confidence, and payload detail
3. Operator confirms or rejects each card individually
4. Confirmed `brief` cards → create a task in the Creative Pipeline at Brief stage, tagged with `from_analysis_id`
5. Confirmed `budget_change` / `cut_ad` cards → logged to the client's **Meta Actions** tab, queued for Phase 2b execution
6. Rejected cards → logged with `rejected` status, no further action

---

## 8. Database Schema — Relevant Tables

### `crm_clients`
| Column | Type | Notes |
|--------|------|-------|
| id | text | Primary key |
| name | text | |
| status | text | Active / Paused / Churned |
| ad_account_id | text | Meta ad account (act_XXXXXXXX) |
| client_context | text | Long-form context doc — injected verbatim as Layer 4 |
| notes | text | Short freeform notes |

### `creative_tasks`
| Column | Type | Notes |
|--------|------|-------|
| id | text | Primary key |
| client_id | text | FK → crm_clients |
| title | text | What needs to be made |
| stage | text | Brief / In Progress / Review / Approved / Queued / Live / Archived |
| channel | text | static / video / email — maps from brief payload |
| funnel_stage | text | TOF / MOF / BOF — maps from brief payload |
| ad_format | text | Maps from brief payload |
| angle | text | Maps from brief payload |
| script_notes | text | Maps from brief payload |
| assigned_to | text | Staff email |
| from_analysis_id | text | Set when created from a confirmed brief card |

### `analyses`
| Column | Type | Notes |
|--------|------|-------|
| id | text | Primary key |
| client_id | text | |
| status | text | pending / confirmed / rejected |
| output | text | Raw Claude JSON response stored verbatim |
| created_at | timestamp | |

### `analysis_actions` (Phase 2 — table exists, wiring pending)
| Column | Type | Notes |
|--------|------|-------|
| id | text | |
| analysis_id | text | FK → analyses |
| client_id | text | |
| type | text | brief / budget_change / cut_ad / restructure |
| title | text | |
| reasoning | text | |
| confidence | text | high / medium / low |
| payload | jsonb | Type-specific structured data |
| status | text | pending / confirmed / rejected / void |
| confirmed_by | text | Email of confirming user |
| meta_executed | boolean | Whether Meta API call was made |

### `ai_config`
| Column | Type | Notes |
|--------|------|-------|
| id | text | |
| title | text | Module name |
| category | text | Layer name (Core Identity / Platform Intelligence / Workflow & Output) |
| content | text | Full module text |
| active | boolean | Whether included in assembled prompt |
| sort_order | integer | Assembly order — lower number = assembled first |

---

## 9. Stress Test — What We Need From You

**The core question:** Given the 5-layer prompt structure, does Claude produce reliable, structured, actionable output — or does it deviate from the schema, hallucinate signals, or make irreversible recommendations with insufficient evidence?

### How to run the stress test

Use your own Claude (API or claude.ai) and manually simulate what the OS will send. Assemble the following:

**Test prompt structure:**
```
[Your Layer 1 content — Core Identity]

---

[Your Layer 2 content — Platform Intelligence]

---

[Your Layer 3 content — Workflow & Output / JSON schema instructions]

---

LAYER 4 — CLIENT CONTEXT
Client: [use BUUB Sunscreen or Schnozz Strips]
Ad Account: [real or dummy account ID]
Current pipeline state:
- Brief: 2 tasks
- In Progress: 3 tasks
- Review: 1 task
- Approved: 0 tasks
- Queued: 0 tasks
- Live: 4 tasks
Context document: [paste the client's brand brief / context]

---

LAYER 5 — LIVE META DATA
[Paste real or realistic dummy Meta performance data — campaigns, ad sets, ads with spend/ROAS/CPM/CTR/frequency]
```

Feed this to Claude and observe:

**What to test:**

1. **Schema compliance** — Does Claude return a valid JSON array with no prose, using the exact field names and value options specified? Run it 5+ times. Does it stay consistent?

2. **Evidence thresholds for irreversible actions** — Does it recommend cutting ads with appropriate evidence (spend, ROAS, time period)? Is it too aggressive or too conservative?

3. **Brief quality** — Is the `angle` field specific enough to brief a designer? Is `script_notes` actionable? Or is it generic?

4. **Card count control** — Does Layer 3 successfully limit output to 5–7 cards? What happens on a complex account with many issues?

5. **Methodology application (Layer 1)** — Is Claude actually applying the Ben Heath framework, or defaulting to generic advice? Test by including an account where the correct Ben Heath action differs from the generic action.

6. **Sparse data handling** — What happens with a new account (few ads, small spend)? Does it flag low confidence appropriately or hallucinate?

7. **Pipeline awareness** — If you include briefs already in the pipeline in Layer 4, does Claude avoid re-suggesting the same work?

---

## 10. What We Need Back From You

After running the stress test:

1. **Layer 3 feedback** — What changes to the Workflow & Output instructions are needed to get consistent schema compliance? What specific wording works?

2. **Schema changes** — Do any field names, value options, or required fields need to change? Remember: `channel`, `funnel_stage`, `ad_format`, `angle`, `script_notes` must map to DB columns — if they change, the DB schema changes too.

3. **Evidence threshold tuning** — What rules in Layer 3 produce the right level of caution on irreversible actions?

4. **Your Layer 1 and Layer 2 content** — We need the actual text you'll load into the OS. Once the stress test validates the structure, load them directly into AI Config via the OS interface.

5. **Brief quality verdict** — Is the `brief` payload sufficient to brief your creative team, or do we need additional fields?

---

## 11. Known Failure Modes and Mitigations

1. **Blind re-suggestion** — Claude suggests work already in progress. Mitigation: current pipeline state is injected in Layer 4. Layer 3 must explicitly instruct Claude to check this before suggesting any brief.

2. **Orphaned analysis records** — Brief confirmed, task created, task later deleted. Analysis shows confirmed but work was abandoned. Mitigation: built into Phase 2 — deleting a task with `from_analysis_id` will prompt user and set status to `void` (distinct from `rejected`).

3. **Irreversible Meta actions** — Budget changes and ad pauses cannot be undone from the OS. Mitigation: two-step confirmation UI for Meta action cards (to be built in Phase 2b), permanent execution audit log.

4. **Meta Ads Manager blind spots** — Tian pauses an ad manually in Ads Manager. Claude sees it paused but doesn't know why. May suggest reactivating it. Mitigation: the `client_context` field on each client profile (accessible via the client detail page) is the place to log "Ad X paused manually — do not reactivate." Claude reads this every run.

5. **Vercel timeout on long analyses** — Complex accounts with many ads may exceed Vercel's function timeout. Mitigation: Phase 2 will move analysis to a background job (Supabase Edge Function), with the UI polling for results rather than waiting on the API call.

6. **Race conditions** — Analysis runs while pipeline changes are being made. Claude's snapshot may be slightly stale. Mitigation: the confirmation step is the safeguard. A stale suggestion gets rejected. No action executes unless a human confirms it.

---

## 12. What Happens After the Stress Test

1. You feed back gaps — Layer 3 schema, evidence thresholds, brief quality
2. We revise schema and Layer definitions accordingly
3. You load your Layer 1 and Layer 2 content into AI Config in the OS
4. We connect the Anthropic API key → "Run Analysis" goes live
5. We connect the Meta Marketing API key → Layer 5 data injection goes live
6. First live analysis: BUUB Sunscreen or Schnozz Strips (both have active Meta accounts)
7. We review the cards, confirm/reject, observe what hits the pipeline and Meta Actions
8. Iterate until output quality is consistent

---

## 13. Tech Stack Reference

- **Frontend/Backend:** Next.js 16, TypeScript — deployed on Vercel (auto-deploys on push to main)
- **Database:** Supabase (Postgres + Auth)
- **Auth:** Supabase Auth — cookie-based sessions, individual accounts per staff member, server-side middleware protecting all `/dashboard/*` routes
- **AI:** Anthropic API (Claude Sonnet 4.6) — Phase 2
- **Meta:** Meta Marketing API — Phase 2
- **Styling:** Pure CSS, dark/light theme

---

*Last updated: March 2026 — reflects OS state after Phase 1 completion, UI redesign, and security hardening.*
