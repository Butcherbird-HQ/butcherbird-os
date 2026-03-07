# Butcherbird OS — System Documentation

**Version:** Phase 1 (March 2026)
**Author:** Gascoyne Clarke / Claude Code
**Stack:** Next.js 16, TypeScript, Supabase, Anthropic API (Phase 2), Meta Marketing API (Phase 2)

---

## 1. Purpose

Butcherbird OS is the internal operating system for Butcherbird Global — a Cape Town performance marketing agency. It is not a project management tool. It is not a CRM. It is a media buying automation platform with a human confirmation layer.

The primary loop it is built around:

```
Run Analysis on client
  → Claude reads methodology + client context + live Meta data
  → Outputs structured action cards (briefs, budget changes, ad cuts)
  → Human confirms / edits / rejects each card individually
  → Confirmed briefs flow into Creative Pipeline
  → Confirmed Meta actions execute via Meta API
```

Everything else in the OS exists to support or feed this loop.

---

## 2. Tech Stack

| Layer | Technology | Reason |
|-------|-----------|--------|
| Framework | Next.js 16 (App Router) | Server + client components, API routes, dynamic routing |
| Language | TypeScript | Type safety across the full stack |
| Styling | Pure CSS (no Tailwind) | Full control, no dependency bloat |
| Database | Supabase (Postgres) | Real-time capable, built-in auth, REST API for agents |
| Auth | Supabase Auth | Individual email+password per staff member |
| AI | Anthropic API (Claude Sonnet) | Phase 2 — analysis engine |
| Ads | Meta Marketing API | Phase 2 — data read + action execution |
| Deploy | Vercel CLI (`npx vercel --prod`) | Note: GitHub auto-deploy not currently working (see §9) |

---

## 3. Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                   Vercel (Edge)                      │
│  Next.js App Router                                  │
│  ├── /app/dashboard/*  (client components)           │
│  ├── /app/api/*        (server API routes)           │
│  └── proxy.ts          (auth middleware)             │
└──────────────────────────┬──────────────────────────┘
                           │
          ┌────────────────┼────────────────┐
          ▼                ▼                ▼
    Supabase DB      Anthropic API     Meta Marketing API
    (source of truth) (analysis engine) (data + execution)
```

### Data flow — Phase 2 analysis run:
1. User clicks "Run Analysis" on a client page
2. OS API route collects: assembled AI Config prompt + client-specific context + current creative_tasks for that client (to prevent duplicate suggestions)
3. OS calls Anthropic API with all of the above + Meta data fetched live
4. Claude returns structured JSON: array of action cards with type, content, and payload
5. OS writes cards to `analysis_actions` table immediately (before user sees anything)
6. UI renders cards grouped by type — briefs separate from Meta actions
7. User acts on each card individually (confirm / edit / reject)
8. Confirmed briefs → inserted into `creative_tasks` with `from_analysis_id` set
9. Confirmed Meta actions → API route executes against Meta, writes audit log

---

## 4. Database Schema

### `crm_clients`
Active client records. Source of truth for all client data.

| Column | Type | Notes |
|--------|------|-------|
| id | text | Primary key |
| name | text | Client/brand name |
| type | text | e.g. 'performance' |
| category | text | 'external' or 'internal' |
| status | text | 'Active', 'Paused', 'Churned' |
| ad_account_id | text | Meta ad account ID (act_XXXXXXXX) |
| instagram | text | Instagram handle |
| website | text | Client website URL |
| drive_link | text | Google Drive folder URL |
| notes | text | Free-form client notes |

Note: `baseFee` and `revSharePct` columns exist in the DB but are not displayed in the UI. Billing is handled externally. Preserved for potential future reporting integration.

### `creative_tasks`
All creative work items, from brief through to live.

| Column | Type | Notes |
|--------|------|-------|
| id | text | Primary key |
| channel | text | 'static', 'video', 'email' |
| stage | text | Brief → In Progress → Review → Approved → Live |
| title | text | What needs to be made |
| client_id | text | FK → crm_clients.id |
| brand | text | Fallback if no client linked |
| funnel_stage | text | 'TOF', 'MOF', 'BOF' |
| ad_format | text | Static Image, Video, Carousel, etc. |
| angle | text | The core hook/pain point |
| script_notes | text | Script outline or creative direction |
| notes | text | Additional briefing context |
| links | text | Drive links, reference URLs |
| assigned_to | text | Staff email |
| due_date | text | ISO date string |
| from_analysis_id | text | FK → analyses.id — set if AI-generated |

### `analyses`
Record of every analysis run against a client.

| Column | Type | Notes |
|--------|------|-------|
| id | text | Primary key |
| client_id | text | FK → crm_clients.id |
| created_by | text | User email who triggered the run |
| status | text | 'pending', 'confirmed', 'rejected' |
| output | text | Raw Claude output (JSON) |
| action_summary | text | Human-readable summary |
| created_at | timestamp | When the analysis was run |

### `ai_config`
Modular system prompt builder. Each row is one module of Claude's instructions.

| Column | Type | Notes |
|--------|------|-------|
| id | text | Primary key |
| title | text | Module name |
| category | text | Methodology / Workflow / Output Format / Rules / Client Template / Brand Context / Other |
| content | text | Full module text |
| active | boolean | Whether included in assembled prompt |
| sort_order | integer | Assembly order (lower = first) |
| created_at | timestamp | |

### `analysis_actions` (Phase 2 — to be built)
Individual action cards output by an analysis run.

| Column | Type | Notes |
|--------|------|-------|
| id | text | Primary key |
| analysis_id | text | FK → analyses.id |
| client_id | text | FK → crm_clients.id |
| type | text | 'brief', 'budget_change', 'cut_ad', 'restructure' |
| title | text | Short label for the card |
| reasoning | text | Why Claude is suggesting this |
| payload | jsonb | Structured data specific to the action type |
| status | text | 'pending', 'confirmed', 'edited', 'rejected', 'void' |
| confirmed_by | text | Email of user who actioned it |
| confirmed_at | timestamp | When it was actioned |
| meta_executed | boolean | Whether Meta API call was made |
| meta_result | jsonb | Response from Meta API |

### Other tables
- `calendar_events` — retained in DB, page removed from UI
- `user_notes` — retained in DB, page removed from UI
- `tasks` — retained in DB, page removed from UI
- `staff`, `candidates` — retained in DB, pages removed from UI

---

## 5. Pages

### `/dashboard` — Command Centre
**Purpose:** Single-screen operational snapshot. First thing any user sees on login.

**What it shows:**
- Creative Pipeline breakdown by stage (5 boxes, click any to go to Creative Pipeline)
- Pending Confirmations — analyses with status not yet confirmed or rejected
- Recent Analyses — last 8 analysis runs across all clients

**What it deliberately does not show:**
- MRR or billing data — OS is not a finance tool
- Duplicate stats that appear in the pipeline breakdown (removed the In Progress / Live / Pipeline Cards stat row — these are redundant with the 5-stage visual below)

**Design reasoning:** The operator should be able to land here and know in one glance: what is in the pipeline, and is anything waiting for a decision. Nothing else.

---

### `/dashboard/clients` — Clients
**Purpose:** Master list of all clients. Entry point to per-client operations.

**Layout:** Grid of cards (`auto-fill, minmax(320px, 1fr)`). Deliberately not a table — clients are accounts to be managed, not line items to be scanned.

**Sort options:**
- A–Z — alphabetical, default
- Latest Analysis — clients with most recent analysis at the top, clients with no analysis at the bottom

**Card contents:** Name, status, category, Meta Ad Account ID, Instagram, website, notes preview (2-line clamp), last analysis date, Drive link.

**What is deliberately excluded from cards:** Base fee, rev share, any billing data. The OS is about media buying automation, not contract management.

**Add/Edit modal fields:** Name, category, status, Meta Ad Account ID, Drive link, website, Instagram, notes. No billing fields.

**Design reasoning:** Large cards instead of a list because each client is a substantial relationship. You should be able to find and click a client in one motion, not hunt through a spreadsheet row.

---

### `/dashboard/clients/[id]` — Client Detail
**Purpose:** Everything about one client in one place.

**Tabs:**
1. **Overview** — client details (category, type, Meta account, Instagram, website, notes)
2. **Analyses** — full history of analysis runs for this client. "Run Analysis" button (disabled in Phase 1 — requires Anthropic API + Meta API wired in Phase 2). Role-gated: only 'founder' or 'paid media' roles can trigger an analysis.
3. **Ready to Draft** — creative tasks linked to this client where stage = 'Approved'. These are briefs that have been approved and are waiting to be produced and drafted to Meta.
4. **Reporting** — empty placeholder. Will pull live Meta data once API is connected.

**Role gate on analysis:** Non-media-buying staff should not be triggering AI analysis runs that cost API credits and execute against live ad accounts. Gate is enforced client-side (role check on user metadata from Supabase Auth).

**Design reasoning for tabs:** The client page needs to serve multiple users — Gascoyne checking status, Tian running analysis, creative staff checking what's approved. Tabs prevent information overload and make each user's job clear.

---

### `/dashboard/creative` — Creative Pipeline
**Purpose:** Track all creative work from brief to live. The operational home for the creative team.

**Structure:** Kanban board. Three channel tabs (Static Ads / Video Ads / Email Marketing), five stages per channel.

**Stages:**
- **Brief** — AI input zone. Work enters here either from a confirmed analysis card or by manual addition.
- **In Progress** — actively being produced
- **Review** — waiting for approval
- **Approved** — approved, ready to be drafted to Meta (surfaces in client detail "Ready to Draft" tab)
- **Live** — running on Meta

**Visual treatment of Brief stage:**
The Brief column is visually distinct from all other stages — purple (AI color, `--c-resources`), with an "AI Input" badge and subtitle "Analysis output enters here". Cards in the Brief stage have a purple left border and subtle purple tint. Cards that originated from an analysis (have `from_analysis_id` set) show a "✦ From Analysis" badge.

**Why Brief looks different:** Brief is the boundary between AI suggestion and human execution. It must be immediately obvious to anyone looking at the board that these items came from the AI and have been confirmed but not yet picked up. It is a conceptually different state from being in production.

**Stage movement:** Every card has quick-move buttons to all other stages. These are small, below the card content, not the primary CTA. Primary CTA is clicking the card to open and edit it.

---

### `/dashboard/ai-config` — AI Config
**Purpose:** Manage the modular system prompt that Claude receives on every analysis run.

**How it works:** Each module is a discrete block of instructions — methodology, workflow rules, output format requirements, brand context, etc. All active modules are assembled in sort_order sequence into a single prompt. The "Preview Prompt" button shows exactly what Claude will receive.

**Categories:** Methodology, Workflow, Output Format, Rules, Client Template, Brand Context, Other

**Why modular:** The prompt is large and covers multiple domains. Monolithic prompts are hard to maintain — you can't update the output format rules without potentially breaking the methodology section. Modules can be toggled off without deleting, reordered, and updated independently. Tian (Paid Media Lead) manages these.

**Word count display:** Each module shows word count. The assembled preview shows total word count. This matters because Claude's context window has limits — knowing the total size helps avoid prompt bloat.

---

### `/dashboard/admin` — Users (Super User Only)
**Purpose:** Gascoyne can add, edit, and remove staff accounts.

**Access:** Only visible and accessible to `g@butcherbird.global`. The check occurs both client-side (nav link hidden) and server-side (API routes verify caller email before using the service role key).

**Operations:** List all users, add new user (sets name, role, temporary password), edit user (name, role, reset password), delete user. Cannot delete own account (Gascoyne's account is protected in the UI).

**Why a dedicated admin UI:** Supabase's dashboard requires a login and technical knowledge. Gascoyne needs to onboard 18 staff without involving a developer every time.

---

## 6. Authentication & Security

### Auth model
- Individual Supabase Auth accounts per staff member (email + password)
- Session managed via HTTP-only cookies set by the `/api/auth` route
- `proxy.ts` (Next.js 16 middleware convention — not `middleware.ts`) intercepts all `/dashboard/*` requests and verifies the session cookie
- Unauthenticated requests are redirected to `/login`

### Role system
Roles are stored in Supabase user metadata (`user.user_metadata.role`). Current roles in use:
- `super` / Gascoyne: full access including Users admin and analysis triggers
- `founder`: can trigger analysis runs
- `paid media`: can trigger analysis runs (Tian's role)
- `team`: standard access — can view and edit creative pipeline, no analysis trigger

### Super user pattern
Admin API routes (`/api/admin/users`, `/api/admin/users/[id]`) use Supabase's service role key, which has full database access. This key is **never** sent to the client. The API routes:
1. Verify the caller's email via `createServerClient` (uses the cookie session)
2. Check that email === `g@butcherbird.global`
3. Only then use `createClient` with the service role key to perform the operation

This means even if a staff member somehow got to the admin URL, the API would reject their requests.

### Environment variables (Vercel)
| Variable | Value | Usage |
|----------|-------|-------|
| NEXT_PUBLIC_SUPABASE_URL | Project URL | Client-side Supabase client |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | Anon/publishable key | Client-side Supabase client |
| SUPABASE_SERVICE_ROLE_KEY | Service role key | Server-side admin operations only |
| ANTHROPIC_API_KEY | Anthropic key | Phase 2 — analysis API calls |

---

## 7. The AI Analysis Loop — Full Specification

### What Claude receives (assembled at runtime)
1. **Assembled AI Config prompt** — all active modules in sort_order. Contains methodology, rules, output format requirements, etc. Managed by Tian in the AI Config page.
2. **Per-client context** — (Phase 2, client detail "Context" tab to be built) brand-specific instructions, historical notes, "don't touch" items.
3. **Current pipeline state** — all `creative_tasks` for this client, by stage. **Critical: this prevents Claude from suggesting work already in progress.**
4. **Live Meta data** — fetched at call time from Meta Marketing API. Ad performance data, current budgets, active/inactive status.

### Claude's output format (required JSON schema)
Claude must return a structured JSON array. Free-text responses are not acceptable — the UI renders from this schema directly.

```json
[
  {
    "type": "brief",
    "title": "TOF Static — Pain Point Hook",
    "reasoning": "BOF is underfunded relative to spend. TOF needs a direct pain-point hook to feed the funnel.",
    "payload": {
      "channel": "static",
      "funnel_stage": "TOF",
      "ad_format": "Static Image",
      "angle": "Struggling to sleep? This fixed it for 10,000+ people",
      "script_notes": "Clean product shot. Bold headline. No lifestyle fluff.",
      "client_id": "xxx"
    }
  },
  {
    "type": "budget_change",
    "title": "Increase BOF retargeting budget",
    "reasoning": "BOF campaign has 4.2x ROAS but is capped at $20/day. Headroom exists.",
    "payload": {
      "ad_set_id": "xxx",
      "current_budget": 20,
      "proposed_budget": 60,
      "currency": "USD"
    }
  },
  {
    "type": "cut_ad",
    "title": "Pause Ad ID 120213456789 — 0.4x ROAS at scale",
    "reasoning": "This ad has spent $340 at 0.4x ROAS over 14 days. No recovery trend.",
    "payload": {
      "ad_id": "120213456789",
      "ad_name": "Lifestyle Video v3",
      "current_spend": 340,
      "current_roas": 0.4
    }
  }
]
```

### Card types
| Type | What it does | Reversible? |
|------|-------------|-------------|
| `brief` | Creates a creative_task in Brief stage | Yes — task can be deleted |
| `budget_change` | Adjusts ad set daily/lifetime budget via Meta API | No — executes live |
| `cut_ad` | Pauses an ad via Meta API | Partially — ad can be re-enabled manually |
| `restructure` | Campaign structure changes (Phase 2b) | No |

---

## 8. Human Intervention Model

### Why every card requires individual confirmation
An AI that executes directly against live ad accounts without human review is a liability. A single bad analysis run could pause performing ads, blow budget, or brief creative work in the wrong direction. The card-confirmation model means the AI proposes, humans decide. This is not a limitation — it is the product.

### The identified failure modes and their mitigations

#### Failure 1: Blind re-suggestion
**What happens:** User deletes a brief from the pipeline. Next analysis runs, Claude doesn't know that brief ever existed. It re-suggests the same work.

**Why it happens:** `creative_tasks` and `analysis_actions` are disconnected after the brief is confirmed. The pipeline doesn't report back to the analysis layer.

**Mitigation (must be built into Phase 2):** When building the analysis API route, always include the current `creative_tasks` for that client in the context passed to Claude. Claude then knows what is already in Brief, In Progress, etc. and can explicitly avoid duplicating it.

#### Failure 2: Orphaned analysis records
**What happens:** A brief is confirmed, added to the pipeline, then later deleted by a user. The analysis record still shows `confirmed`. Looking at the analysis history, it appears everything was actioned — but the work was quietly abandoned.

**Why it happens:** Deleting a `creative_task` has no awareness of `from_analysis_id`.

**Mitigation (to be built):**
- When deleting a `creative_task` that has a `from_analysis_id` set, show a confirmation: "This brief was generated from an analysis. Deleting it will mark the analysis action as void. Continue?"
- On confirmation, set the corresponding `analysis_actions` record status to `void`
- The `void` status is distinct from `rejected` — rejected means the user declined at review time, void means the work was later abandoned

#### Failure 3: Edits don't propagate back
**What happens:** User accepts a brief from analysis. Later edits it in the pipeline (changes angle, script notes, ad format). The analysis record shows the original card content. Historical analyses are now inaccurate records of what was actually briefed.

**Why it happens:** After confirmation, the `creative_task` is an independent record. Edits to it don't touch the analysis.

**Mitigation:** This is acceptable as a known limitation for Phase 2. The analysis record is a snapshot of what was suggested, not a live document. A future enhancement would log edits to briefed tasks against the `from_analysis_id` for full audit trail.

#### Failure 4: Meta actions are irreversible
**What happens:** User confirms a budget change or ad pause. The Meta API executes immediately. There is no undo from the OS.

**Why it matters more than briefs:** A mis-confirmed brief wastes some creative effort. A mis-confirmed budget change can burn money. A mis-confirmed ad pause can kill a performing campaign.

**Mitigation (must be built into Phase 2 UI):**
- Meta action cards must be visually distinct from brief cards in the confirmation UI — different colour, different icon
- Meta action cards must show: current state → proposed state (e.g., "$20/day → $60/day")
- Two-step confirmation for Meta actions: first click shows a secondary "This will execute live on Meta — are you sure?" step before the API call fires
- Every Meta action executed through the OS is logged with: timestamp, user who confirmed, what changed, Meta API response. This log is permanent and cannot be deleted.

#### Failure 5: Blind spots from manual Ads Manager use
**What happens:** Tian pauses an ad manually in Meta Ads Manager. Claude pulls live Meta data, sees the ad is paused, but doesn't know why. Claude might suggest reactivating it.

**Why it can't be fully prevented:** You cannot stop users from using Meta Ads Manager directly. The OS cannot know the intent behind external changes.

**Mitigation:** The per-client context tab (to be built on client detail page) should include a "Notes for Claude" field — a running log where Tian can note things like "Ad X paused manually 5 Mar — do not reactivate, creative is outdated." Claude reads this context on every run.

#### Failure 6: Race conditions during analysis
**What happens:** Analysis run takes 30–90 seconds. During that window, a user edits pipeline cards or makes changes in Meta Ads Manager. Claude received a snapshot at call time — its suggestions may already be partly stale by the time the cards appear.

**Why it happens:** Inherent to any system where AI reads state at a point in time and then takes time to respond.

**Mitigation:** Low probability, acceptable risk. The confirmation step is the safeguard — a stale suggestion simply gets rejected. No action is taken on a stale suggestion unless a human confirms it.

#### Failure 7: API timeout on Vercel
**What happens:** Analysis call (Meta data fetch + Claude API) takes 30–90 seconds. Vercel serverless functions timeout at 60 seconds (Pro plan). The function dies mid-analysis. The user gets an error. No cards are written to the DB.

**Why it matters:** Silent failures at the most critical step in the OS.

**Mitigation (must be designed before Phase 2 is built):**
- "Run Analysis" click triggers a background job, not a direct API call
- UI immediately shows "Analysis running..." status and polls the `analyses` table for updates
- The background job writes cards to `analysis_actions` as soon as they are received from Claude
- If the job fails partway through, the partial results are preserved with a `partial` status
- Options for background jobs: Supabase Edge Functions (runs outside Vercel, no timeout), or Vercel's own background functions on Pro plan

---

## 9. Known Issues & Operational Notes

### Vercel auto-deploy not working
GitHub org was renamed from `Butcherbird-Global` to `Butcherbird-HQ`. The Vercel webhook stopped triggering. Current workaround: deploy manually with `npx vercel --prod` from the project directory.

To fix permanently: go to Vercel dashboard → project settings → Git → disconnect and reconnect the GitHub repository.

### Meta access token expiry
(Phase 2 pre-requisite) Meta long-lived tokens expire after ~60 days. The OS must surface a clear "Meta connection expired — please reconnect" error rather than failing silently. Token refresh or a reconnect flow must be built before Phase 2 goes to production.

### Supabase client key format
The project uses the new `sb_publishable_...` key format (not the older `eyJhbGci...` JWT format). Both work with `@supabase/supabase-js`. The ANON key in `.env.local` is the `eyJhbGci...` format — both are valid, only the publishable key matters for the client.

---

## 10. Phase 2 Roadmap

### Phase 2a — AI Analysis (no Meta execution)
1. Build background job infrastructure (Supabase Edge Function or Vercel background function)
2. Wire Anthropic API key into analysis route
3. Build `analysis_actions` table
4. Define and enforce Claude output JSON schema (use tool-use / structured output)
5. Build card confirmation UI on client detail page — Analyses tab
6. Include current pipeline state in every analysis call (prevents re-suggestion)
7. On brief confirmation → insert into `creative_tasks` with `from_analysis_id`
8. Add deletion warning for tasks with `from_analysis_id`
9. Build per-client context tab (brand notes, "don't touch" items, Notes for Claude)

### Phase 2b — Meta execution
1. Verify Tian's Meta App has `ads_management` permission (not just `ads_read`)
2. Build Meta token management (storage, refresh, expiry detection)
3. Build Meta action execution route with full audit logging
4. Build two-step confirmation UI for Meta action cards (visual distinction + secondary confirm)
5. Build execution log view (permanent record of all Meta actions taken through OS)

### Phase 3 — Reporting
6. Build reporting tab on client detail page (live Meta performance data)
7. Consider Google Ads and TikTok Ads API integrations

---

## 11. Design Principles

**Manual confirmation is the product, not a limitation.** The value of this system is not that AI acts autonomously — it is that AI does the analysis work and humans retain control over every action. Remove the confirmation layer and you have a liability.

**No billing data in the OS.** The OS is a media buying platform. Fee tracking, invoicing, and contract management happen elsewhere. Mixing financial admin into a tool used by creative and media staff muddies the purpose of both.

**Brief is the AI boundary.** The Brief stage in the Creative Pipeline is the transition point between AI suggestion and human execution. It must look different. Anyone looking at the board must immediately understand that Brief items are AI-generated and need to be picked up — they are not yet work in progress.

**Claude must know the current state of work.** Every analysis run must include the current pipeline state for that client. An AI that doesn't know what is already in progress will duplicate work, create confusion, and erode trust in the system.

**Meta actions are irreversible. Treat them accordingly.** Two-step confirmation, permanent audit log, visual distinction from brief cards. There is no undo for a budget change or a paused ad.

**The system is only as good as the AI Config.** Claude's analysis quality is entirely dependent on the quality of the methodology and rules loaded into AI Config. Tian's work in maintaining those modules is what gives the analysis its value. Bad modules = bad analysis.

---

*Last updated: March 2026*
