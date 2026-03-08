# Butcherbird OS — Claude's Stress Test Findings

**From:** Tian + Claude
**To:** Gascoyne
**Date:** 2026-03-08
**Re:** Architecture review of TIAN_BRIEF.md + skills validation results

---

## TL;DR

We validated the entire skills suite (47 fixes applied, 11 factual errors corrected, new SMS skill added) and stress tested the OS architecture. **The architecture is sound.** Five changes should be made before Phase 2 — all are implementation-level, none require rebuilding the OS.

---

## Part 1: Skills Suite — What We Fixed

The 10 skills built from Ben Heath's course were good but had gaps and some outdated practices. We ran a three-phase audit: file analysis, web validation (Reddit, X, Klaviyo community, Google Ads forums), then implementation.

### Key Fixes Applied

| Fix | What Changed |
|-----|-------------|
| ROAS formula | Was inverted. Now: `1 / Net Margin %` (25% margin = 4.0x breakeven) |
| "Spark Ads" | TikTok's term — corrected to "Partnership Ads" throughout |
| Cart timing | 20min was too aggressive — changed to 1hr (practitioner consensus) |
| Welcome flow | 5 emails in 5 days too compressed — changed to 7-14 days |
| Similar Audiences | Removed — deprecated Aug 2023. Replaced with modern alternatives |
| PMAX bid modifiers | Removed — don't exist. Signals are hints, not bid adjustments |
| Optimization priority | Creative now ranks above Targeting (Andromeda update) |
| Ad set model | 5 ad sets outdated — simplified to 1-3 |
| Browse Abandonment | Promoted from "supplemental" to core flow (#3-4) |
| Open rates | Added Apple MPP caveat — ~50% of opens are machine-generated |

### New Content Added

- Advantage+ Shopping Campaigns (ASC) guide + hybrid approach
- CBO vs ABO decision framework
- Attribution window guidance
- RSA best practices (new reference file)
- Catalogue/DPA guide (new reference file)
- Win-Back and Sunset email flows
- Klaviyo attribution model caveats
- Google/Yahoo sender requirements (Feb 2024)
- Incrementality testing (geo-lift, holdout, conversion lift, MER)
- SA market localization (ZAR, POPIA, seasonal calendar)
- PMAX brand exclusions + campaign-level negatives
- **SMS Marketing — entirely new skill** (SKILL.md + templates + compliance)

**Result:** 11 skills, 48 files, all validated against current practitioner consensus. Repo pushed to GitHub (private): `tianbester-ZA/butcherbird-ads-skills`

---

## Part 2: OS Architecture — 5 Changes Before Phase 2

### 1. Use `tool_use` Instead of Instruction-Based JSON

**Priority: Critical**

The current plan has Layer 3 instructing Claude to "return ONLY a JSON array." This works ~95% of the time. At scale, that 5% failure rate means broken parses, malformed output, or prose leaking into the response.

Claude's API supports `tool_use` — where the schema is defined in the API call itself. Schema compliance is enforced at the infrastructure level, not through prompt engineering. It goes from 95% to 100% reliability.

**What changes:**
- Define each card type as a tool (`create_brief`, `cut_ad`, `change_budget`, `restructure`)
- Claude returns structured `tool_use` blocks — the OS parses these instead of raw text
- Layer 3 gets simpler — remove all JSON enforcement instructions, focus on analytical methodology
- Can also add new card types (`alert`, `test`) without worrying about schema compliance

**Impact on OS:** API integration code changes. DB schema stays the same. UI stays the same.

### 2. System Prompt (L1-L3) + User Message (L4-L5)

**Priority: High**

Currently the plan appends everything into one system prompt. Better pattern:

- **System prompt** (static, cached): L1 Core Identity + L2 Platform Intelligence + L3 Workflow
- **User message** (variable per run): L4 Client Context + L5 Live Meta Data

**Why it matters:**
- Anthropic's API caches system prompts. If L1-L3 are identical across clients (they should be), you pay for those tokens once, not every run. At 10+ clients running weekly, this is meaningful cost savings.
- Cleaner debugging — system prompt issues affect all clients, data issues affect one client.
- Standard pattern for production AI systems.

**Impact on OS:** Change how the prompt is assembled in the API call. Two fields instead of one.

### 3. Limit to 3-5 Modules Max

**Priority: Medium**

The AI Config allows unlimited modules. Don't use more than 3-5. More modules = more seams where instructions contradict or get deprioritized.

**Recommended structure:**

| # | Module | Layer | Content |
|---|--------|-------|---------|
| 1 | Analyst Identity | L1 | Decision philosophy, evidence thresholds, irreversibility rules |
| 2 | Meta Platform Knowledge | L2 | Benchmarks, diagnostic thresholds, creative fatigue, scaling rules |
| 3 | Workflow & Output | L3 | Analysis steps, tool definitions, card limits |

Maybe 4 if L2 is split into "benchmarks" and "decision trees." Never more than 5.

**Impact on OS:** No code changes. Just discipline in how Tian loads content.

### 4. Add Historical Context Between Runs

**Priority: High — Biggest Missing Piece**

The OS currently gives Claude a snapshot each run. It doesn't know:
- What it recommended last week
- Whether those recommendations were confirmed or rejected
- Whether confirmed actions improved or hurt performance
- Multi-week trends

Without this, Claude will re-suggest the same actions, not learn from its mistakes, and miss trends.

**Fix:** Add a "previous analysis summary" to Layer 4. The OS already stores analyses in the `analyses` table — pull the last 1-2 runs and inject:

```
PREVIOUS ANALYSIS (2026-03-01):
- Confirmed: Cut "Lifestyle Video v3" (was 0.8x ROAS) → ad paused
- Confirmed: Increase BOF budget $20→$60 → ROAS held at 3.8x, CPA stable
- Rejected: "Consolidate TOF ad sets" — operator noted testing new creative first
- Metrics then vs now: Account ROAS 2.8x→3.1x, CPA R142→R128, Spend R4,200→R5,800
```

**Impact on OS:** Small DB query added to the analysis assembly. New field in the prompt template.

### 5. Expand Layer 5 Data Points

**Priority: Medium**

Current plan pulls: campaigns, ad sets with budgets/ROAS, ads with spend/ROAS/CPM/CTR/frequency. The diagnostic frameworks need more:

**Add to Meta API pull:**
- Hook rate / ThruPlay rate (video creative quality)
- Landing page view rate (catches broken pages)
- Add-to-cart rate (funnel diagnosis)
- Cost per result trend (last 7 days vs previous 7 — trend detection)
- Days running per ad (learning phase + fatigue detection)
- Ad status (don't recommend cutting already-paused ads)

**Add to Layer 4 (client profile):**
- Profit margin (without this, Claude can't calculate breakeven ROAS)
- Target CPA / target ROAS (without this, "good" and "bad" are guesswork)
- Monthly budget cap (prevents recommending scaling beyond what the client can afford)

**Impact on OS:** Expand the Meta API query. Add 3 fields to the client profile in `crm_clients`.

---

## Additional Recommendations

### New Card Types

Consider adding:
- **`type: "alert"`** — Claude notices something concerning but doesn't have enough evidence to act. No action required, just awareness. Example: "Frequency trending up on your top performer — watch next 3 days."
- **`type: "test"`** — A/B test suggestions. Different from `brief` because it implies a controlled experiment. Example: "Test this hook angle against your current winner in a separate ad set."

### Evidence Thresholds (Recommended for Layer 3)

```
cut_ad:
  - Minimum spend: $150 OR 3x target CPA (whichever higher)
  - ROAS below breakeven for 7+ consecutive days
  - No recovery trend in last 3 days
  - Frequency below 4 (if >4, it's fatigue not bad creative)
  - Confidence: high only

budget_change (increase):
  - ROAS at 1.5x+ above breakeven for 7+ consecutive days
  - Max 30% increase per change (prevent learning phase reset)
  - Frequency below 3 (headroom exists)
  - Confidence: high only

budget_change (decrease):
  - ROAS declining for 5+ days with no creative changes
  - Confidence: medium acceptable

brief:
  - Lower bar — gap in funnel coverage, missing angle, underserved audience
  - Must check pipeline first (no duplicating in-progress work)
  - Confidence: medium acceptable

restructure:
  - Strong structural evidence only (audience overlap, internal auction competition)
  - Confidence: high only
```

### Vercel Timeout

The brief mentions moving analysis to a Supabase Edge Function as a Phase 2 item. Do it from day one. Complex accounts with 20+ ads will push Claude's response time to 15-30 seconds. Vercel's timeout will bite you on the first real analysis.

---

## Skills → OS System Prompt Mapping

The validated skills are the source material for the AI Config modules. Here's what maps where:

| OS Module | Source Skill | What to Extract |
|-----------|-------------|-----------------|
| L1: Analyst Identity | `campaign-analysis/SKILL.md` | Optimization priority order, evidence thresholds, diagnostic philosophy |
| L1: Analyst Identity | `campaign-orchestrator/SKILL.md` | SA localization, POPIA, seasonal calendar |
| L2: Platform Knowledge | `meta-media-buying/SKILL.md` | 1-3 ad set structure, ASC, CBO/ABO, attribution windows |
| L2: Platform Knowledge | `scaling-playbook.md` | Breakeven ROAS table, scaling thresholds, budget increase rules |
| L2: Platform Knowledge | `decision-trees.md` | 5 diagnostic flowcharts (ROAS drop, CPM spike, CTR tanking, LP not converting, warm vs cold gap) |
| L2: Platform Knowledge | `meta-diagnostics.md` | CPM/CTR/frequency thresholds, creative fatigue signals |
| L2: Platform Knowledge | `metrics-benchmarks.md` | Funnel benchmarks, metric definitions |

**Important:** These skills are designed for interactive Claude Code agents (~350-480 lines each). The OS system prompt needs them distilled into ~200-300 lines of focused decision rules and thresholds. Tian will handle this distillation.

---

## What Happens Next

1. You review these 5 changes and confirm approach
2. If any changes affect the DB schema (new card types, client profile fields) — flag now
3. Tian distills the skills into L1/L2 modules and loads them into AI Config
4. Tian verifies Meta API token (System User + `ads_management` scope)
5. Tian runs stress test: assemble full prompt, pull real BUUB data, run 5+ times
6. We feed back Layer 3 wording, schema feedback, evidence threshold tuning
7. Wire Anthropic API key → first live analysis

---

*Prepared by Tian + Claude Opus 4.6 | March 2026*
