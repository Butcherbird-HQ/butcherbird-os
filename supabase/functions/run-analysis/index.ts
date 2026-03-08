import Anthropic from 'npm:@anthropic-ai/sdk'
import { createClient } from 'npm:@supabase/supabase-js'

const anthropic = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY') })

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

const tools: Anthropic.Tool[] = [
  {
    name: 'cut_ad',
    description: 'Recommend pausing an underperforming ad. Only call when ALL evidence thresholds are met: 30-day spend >= R150, running >= 7 days since last edit, 7-day block ROAS below breakeven, no upward trend in last 3 days.',
    input_schema: {
      type: 'object' as const,
      properties: {
        ad_id: { type: 'string' },
        ad_name: { type: 'string' },
        spend_7day: { type: 'number', description: 'ZAR spend on this ad in the last 7 days' },
        spend_total: { type: 'number', description: 'Total ZAR spend in the 30-day period' },
        days_running: { type: 'number', description: 'Days since last edit (from ad metadata)' },
        roas_7day: { type: 'number', description: '7-day block ROAS (total revenue / total spend for last 7 days)' },
        roas_breakeven: { type: 'number' },
        days_below_breakeven: { type: 'number', description: 'How many of the last 7 days were individually below breakeven' },
        trend_3day: { type: 'string', enum: ['declining', 'flat', 'recovering'], description: 'Direction of ROAS in days 1-3 of the 14-day breakdown' },
        reason: { type: 'string', description: 'Specific metric + value + time window + threshold. E.g. "7-day ROAS 1.2x vs 2.22x breakeven. R840 spend, 10 days running. 5 of 7 days below breakeven. No recovery in days 1-3."' }
      },
      required: ['ad_id', 'ad_name', 'spend_7day', 'spend_total', 'days_running', 'roas_7day', 'roas_breakeven', 'days_below_breakeven', 'trend_3day', 'reason']
    }
  },
  {
    name: 'change_budget',
    description: 'Recommend increasing or decreasing a campaign or ad set budget. Increase requires: 7-day ROAS >= 1.5x above breakeven, max 2 of 7 days below breakeven, no fatigue signals, no confirmed change on this target within last 5 days, increase <= 30%, projected spend stays within monthly cap. Decrease requires: 5+ of last 7 days below breakeven, 7-day spend > R300, not within 5 days of a confirmed increase.',
    input_schema: {
      type: 'object' as const,
      properties: {
        target_type: { type: 'string', enum: ['campaign', 'adset'] },
        target_id: { type: 'string' },
        target_name: { type: 'string' },
        current_budget_zar: { type: 'number' },
        new_budget_zar: { type: 'number' },
        direction: { type: 'string', enum: ['increase', 'decrease'] },
        roas_7day: { type: 'number', description: '7-day block ROAS' },
        roas_breakeven: { type: 'number' },
        days_below_breakeven: { type: 'number', description: 'Count of the 7 days individually below breakeven' },
        spend_7day: { type: 'number', description: 'Total 7-day spend on this target' },
        projected_monthly_spend: { type: 'number', description: 'Estimated monthly spend at the new budget level (new_budget_zar * 30)' },
        reason: { type: 'string' }
      },
      required: ['target_type', 'target_id', 'target_name', 'current_budget_zar', 'new_budget_zar', 'direction', 'roas_7day', 'roas_breakeven', 'days_below_breakeven', 'spend_7day', 'projected_monthly_spend', 'reason']
    }
  },
  {
    name: 'create_brief',
    description: 'Commission a new ad creative. Check pipeline first — never duplicate an in-flight brief or recently confirmed create_brief. The angle field must be specific enough to brief a designer without a follow-up question.',
    input_schema: {
      type: 'object' as const,
      properties: {
        angle: { type: 'string', description: 'Specific creative direction — scene, format, tone, what is shown. Must be concrete enough to brief a designer.' },
        format: { type: 'string', enum: ['static_image', 'video_ugc', 'video_scripted', 'carousel'] },
        hook: { type: 'string', description: 'First 3 seconds — what is shown or said' },
        offer: { type: 'string', description: 'Which product or offer to feature' },
        priority: { type: 'string', enum: ['high', 'medium', 'low'] },
        rationale: { type: 'string', description: 'Which metric triggered this brief and why this angle addresses it. Include the data window.' },
        reference_ad: { type: 'string', description: 'ad_id of top performer to iterate on (optional)' }
      },
      required: ['angle', 'format', 'hook', 'offer', 'priority', 'rationale']
    }
  },
  {
    name: 'restructure',
    description: 'Recommend a campaign or ad set structural change. Requires 3+ weeks of structural signal — evidenced in historical context from at least 3 prior analysis runs OR clearly evidenced in 14-day + 30-day data showing the same pattern.',
    input_schema: {
      type: 'object' as const,
      properties: {
        scope: { type: 'string', enum: ['campaign', 'adset'] },
        target_id: { type: 'string' },
        target_name: { type: 'string' },
        current_structure: { type: 'string' },
        recommended_structure: { type: 'string' },
        weeks_of_signal: { type: 'number' },
        reason: { type: 'string' }
      },
      required: ['scope', 'target_id', 'target_name', 'current_structure', 'recommended_structure', 'weeks_of_signal', 'reason']
    }
  },
  {
    name: 'alert',
    description: 'Observation only — something worth watching but not enough evidence to act on yet. Unlimited — does not count toward the 5-card action limit. Use for: below-threshold signals, post-scaling adjustment periods, budget cap reached, rejected recommendation still showing signal, insufficient new data since last run.',
    input_schema: {
      type: 'object' as const,
      properties: {
        observation: { type: 'string', description: '1-2 sentences, specific' },
        metric: { type: 'string' },
        current_value: { type: 'string' },
        threshold: { type: 'string', description: 'Value at which an action card would be triggered' },
        data_window: { type: 'string', description: 'Which time window this observation is based on: 7-day block / 3-day trend / week-over-week / 30-day aggregate' },
        what_to_watch: { type: 'string' }
      },
      required: ['observation', 'metric', 'current_value', 'threshold', 'data_window', 'what_to_watch']
    }
  }
]

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
      }
    })
  }

  try {
    const { client_id, user_email } = await req.json()
    if (!client_id) return new Response(JSON.stringify({ error: 'client_id required' }), { status: 400 })

    // LAYER 1-3: Assemble system prompt from ai_config
    const { data: modules, error: modulesError } = await supabase
      .from('ai_config')
      .select('title, content, sort_order')
      .eq('active', true)
      .order('sort_order')

    if (modulesError || !modules?.length) {
      return new Response(JSON.stringify({ error: 'No AI Config modules found. Load L1, L2, L3 first.' }), { status: 400 })
    }

    const systemPrompt = modules
      .map((m: { title: string; content: string }) => `## ${m.title}\n\n${m.content}`)
      .join('\n\n---\n\n')

    // LAYER 4: Client context
    const { data: client, error: clientError } = await supabase
      .from('crm_clients')
      .select('*')
      .eq('id', client_id)
      .single()

    if (clientError || !client) {
      return new Response(JSON.stringify({ error: 'Client not found' }), { status: 404 })
    }

    // HISTORICAL CONTEXT: Last 2 analyses + last analysis date
    const { data: previousAnalyses } = await supabase
      .from('analyses')
      .select('created_at, action_summary')
      .eq('client_id', client_id)
      .order('created_at', { ascending: false })
      .limit(2)

    const now = new Date()

    let lastAnalysisLine = 'Last analysis: None — this is the first run for this client.'
    let historicalContext = 'No previous analysis — this is the first run for this client.'

    if (previousAnalyses && previousAnalyses.length > 0) {
      const lastRun = new Date(previousAnalyses[0].created_at)
      const daysAgo = Math.floor((now.getTime() - lastRun.getTime()) / (1000 * 60 * 60 * 24))
      const lastRunDate = lastRun.toLocaleDateString('en-ZA', { year: 'numeric', month: '2-digit', day: '2-digit' })
      lastAnalysisLine = `Last analysis: ${lastRunDate} (${daysAgo} day${daysAgo !== 1 ? 's' : ''} ago)`

      historicalContext = previousAnalyses
        .map((a: { created_at: string; action_summary: string }) => {
          const runDate = new Date(a.created_at).toLocaleDateString('en-ZA')
          return `PREVIOUS ANALYSIS (${runDate}):\n${a.action_summary || 'No summary available.'}`
        })
        .join('\n\n')
    }

    // CONFIRMED/REJECTED ACTIONS: Last 30 days with days-ago calculation and cooling window flag
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()
    const { data: recentActions } = await supabase
      .from('analysis_actions')
      .select('type, title, reasoning, status, confirmed_at, meta_executed')
      .eq('client_id', client_id)
      .in('status', ['confirmed', 'rejected'])
      .gte('confirmed_at', thirtyDaysAgo)
      .order('confirmed_at', { ascending: false })

    let confirmedActionsText = 'No confirmed or rejected actions in the last 30 days.'
    if (recentActions && recentActions.length > 0) {
      confirmedActionsText = recentActions
        .map((a: { type: string; title: string; reasoning: string; status: string; confirmed_at: string; meta_executed: boolean }) => {
          const confirmedDate = new Date(a.confirmed_at)
          const daysAgo = Math.floor((now.getTime() - confirmedDate.getTime()) / (1000 * 60 * 60 * 24))
          const dateStr = confirmedDate.toLocaleDateString('en-ZA')
          const withinCooling = a.type === 'change_budget' && daysAgo < 5
          const coolingNote = withinCooling ? ' — WITHIN 5-DAY COOLING WINDOW' : ''
          const executionNote = a.status === 'confirmed' && a.meta_executed
            ? ' (executed in Meta)'
            : a.status === 'confirmed'
            ? ' (confirmed — pending Meta execution)'
            : ''
          return `- [${a.status.toUpperCase()}${executionNote}${coolingNote}] ${a.type} | ${a.title} | ${dateStr} (${daysAgo} day${daysAgo !== 1 ? 's' : ''} ago)\n  Reason: ${a.reasoning}`
        })
        .join('\n')
    }

    // LAYER 5: Live Meta data (all 3 views)
    const metaFetchUrl = `${Deno.env.get('APP_URL') ?? 'https://butcherbird-os.vercel.app'}/api/meta/fetch`
    const metaRes = await fetch(metaFetchUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ account_id: client.ad_account_id })
    })
    const metaData = await metaRes.json()

    // CREATIVE PIPELINE STATE
    const { data: pipeline } = await supabase
      .from('creative_tasks')
      .select('title, stage, funnel_stage, ad_format')
      .eq('client_id', client_id)
      .not('stage', 'eq', 'Archived')

    const pipelineText = pipeline?.length
      ? pipeline.map((t: { title: string; stage: string; funnel_stage: string; ad_format: string }) =>
          `- ${t.title} | ${t.stage} | ${t.funnel_stage} | ${t.ad_format}`
        ).join('\n')
      : 'Pipeline is empty — no briefs or ads currently in production.'

    // ASSEMBLE USER MESSAGE (L4 + L5)
    const userMessage = `## Layer 4: Client Context

Client: ${client.name}
Ad Account ID: ${client.ad_account_id}
Profit Margin: ${client.profit_margin_pct}%
Breakeven ROAS: ${client.breakeven_roas}x
ROAS Target: ${client.roas_target}x
Monthly Budget Cap: R${client.monthly_budget_cap_zar}
${lastAnalysisLine}

Client Context Document:
${client.client_context || 'No client context document uploaded yet.'}

Creative Pipeline (current state):
${pipelineText}

Historical Analysis Context:
${historicalContext}

Confirmed/Rejected Actions (last 30 days — treat confirmed as already in execution, respect 5-day cooling window on budget changes):
${confirmedActionsText}

---

## Layer 5: Live Meta Ad Data

Fetched: ${metaData.fetched_at || new Date().toISOString()}

### View 1: 30-Day Aggregated Performance
Date range: ${metaData.date_preset_aggregated || 'last_30d'}

Campaigns:
${JSON.stringify(metaData.campaigns || [], null, 2)}

Ad Sets:
${JSON.stringify(metaData.adsets || [], null, 2)}

Ads (with 30-day insights):
${JSON.stringify(metaData.ads || [], null, 2)}

### View 2: 14-Day Daily Breakdown
Date range: ${metaData.date_preset_daily || 'last_14d'} (day 1 = most recent, day 14 = oldest)
Use for: 7-day block assessment (days 1-7), week-over-week comparison (days 1-7 vs 8-14), 3-day trend (days 1-3)

${JSON.stringify(metaData.daily_breakdown || [], null, 2)}

### View 3: Ad Metadata
Included in the ads array above — see created_time (creation date), updated_time (last edit date), effective_status, and daily_budget on campaigns/adsets.

---

Run your full 7-step analysis process now. Output structured tool calls only — no prose before or after.`

    // CALL ANTHROPIC
    const response = await anthropic.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 8096,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
      tools,
      tool_choice: { type: 'auto' }
    })

    // PARSE tool_use blocks
    const cards = response.content
      .filter((block) => block.type === 'tool_use')
      .map((block) => {
        if (block.type !== 'tool_use') return null
        return { type: block.name, ...(block.input as Record<string, unknown>) }
      })
      .filter(Boolean)

    // Build action summary for next historical injection
    const actionableCards = cards.filter((c) => c && c.type !== 'alert')
    const actionSummary = actionableCards
      .map((c) => {
        if (!c) return ''
        const card = c as Record<string, unknown>
        if (card.type === 'cut_ad') return `- Proposed cut: ${card.ad_name} — ${card.reason}`
        if (card.type === 'change_budget') return `- Proposed budget ${card.direction}: ${card.target_name} R${card.current_budget_zar}→R${card.new_budget_zar} — ${card.reason}`
        if (card.type === 'create_brief') return `- Proposed brief: ${card.angle} (${card.priority} priority)`
        if (card.type === 'restructure') return `- Proposed restructure: ${card.target_name} — ${card.reason}`
        return ''
      })
      .filter(Boolean)
      .join('\n')

    // STORE in analyses table
    const { data: analysis, error: analysisError } = await supabase
      .from('analyses')
      .insert({
        client_id,
        created_by: user_email || 'system',
        status: 'complete',
        output: cards,
        action_summary: actionSummary || 'No actionable cards produced.',
        historical_context: historicalContext
      })
      .select('id')
      .single()

    if (analysisError || !analysis) {
      return new Response(JSON.stringify({ error: 'Failed to store analysis', detail: analysisError }), { status: 500 })
    }

    // CREATE analysis_actions rows for actionable cards
    const actionableTypes = ['cut_ad', 'change_budget', 'create_brief', 'restructure']
    const actionRows = cards
      .filter((c) => c && actionableTypes.includes(c.type as string))
      .map((c) => {
        if (!c) return null
        const card = c as Record<string, unknown>
        return {
          analysis_id: analysis.id,
          client_id,
          type: card.type as string,
          title: (card.ad_name || card.target_name || card.angle || card.type) as string,
          reasoning: (card.reason || card.rationale || '') as string,
          payload: card,
          status: 'proposed'
        }
      })
      .filter(Boolean)

    if (actionRows.length > 0) {
      await supabase.from('analysis_actions').insert(actionRows)
    }

    return new Response(JSON.stringify({ analysis_id: analysis.id, cards, card_count: cards.length }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    })

  } catch (err) {
    console.error('run-analysis error:', err)
    return new Response(JSON.stringify({ error: 'Internal error', detail: String(err) }), { status: 500 })
  }
})
