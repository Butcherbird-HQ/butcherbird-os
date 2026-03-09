import Anthropic from 'npm:@anthropic-ai/sdk'
import { createClient } from 'npm:@supabase/supabase-js'

const anthropic = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY') })

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

// deno-lint-ignore no-explicit-any
function getPurchaseMetrics(ins: Record<string, any>) {
  const spend    = parseFloat(ins?.spend || '0')
  const revenue  = parseFloat(ins?.action_values?.find((a: any) => a.action_type === 'purchase')?.value || '0')
  const purchases = parseFloat(ins?.actions?.find((a: any) => a.action_type === 'purchase')?.value || '0')
  const roas     = spend > 0 && revenue > 0 ? revenue / spend : 0
  const reach    = parseInt(ins?.reach || '0')
  const frequency = parseFloat(ins?.frequency || '0')
  return {
    spend:     Math.round(spend),
    revenue:   Math.round(revenue),
    purchases: Math.round(purchases),
    roas:      Math.round(roas * 100) / 100,
    aov:       purchases > 0 ? Math.round(revenue / purchases) : 0,
    cpp:       purchases > 0 ? Math.round(spend / purchases) : 0,
    reach,
    frequency: Math.round(frequency * 10) / 10,
  }
}

const tools: Anthropic.Tool[] = [
  {
    name: 'campaign_analysis',
    description: 'Call once per active campaign before any action cards for that campaign. Provides a full campaign health assessment: performance metrics, full-funnel structure, budget efficiency, audience targeting analysis, and strategic direction.',
    input_schema: {
      type: 'object' as const,
      properties: {
        campaign_id:   { type: 'string' },
        campaign_name: { type: 'string' },

        // Performance metrics (pull from the campaign-level data provided)
        spend_30d:    { type: 'number' },
        revenue_30d:  { type: 'number' },
        results_30d:  { type: 'number', description: 'Total purchases in 30 days' },
        roas_30d:     { type: 'number' },
        cpp_30d:      { type: 'number', description: 'Cost per purchase ZAR, 30-day' },
        aov_30d:      { type: 'number', description: 'Average order value ZAR, 30-day' },
        reach_30d:    { type: 'number' },
        frequency_30d: { type: 'number' },
        spend_7d:     { type: 'number' },
        roas_7d:      { type: 'number' },

        // Full-funnel coverage assessment
        funnel_coverage: {
          type: 'object',
          description: 'Is this campaign covering the funnel correctly?',
          properties: {
            has_tof:     { type: 'boolean', description: 'Top-of-funnel audience targeting present?' },
            has_mof:     { type: 'boolean', description: 'Middle-of-funnel retargeting present?' },
            has_bof:     { type: 'boolean', description: 'Bottom-of-funnel retargeting present?' },
            assessment:  { type: 'string', description: '1-2 sentences on funnel coverage. What is missing and why it matters.' }
          },
          required: ['has_tof', 'has_mof', 'has_bof', 'assessment']
        },

        // Budget and ad count efficiency
        budget_efficiency: {
          type: 'object',
          properties: {
            active_ad_count:      { type: 'number' },
            avg_spend_per_ad_7d:  { type: 'number', description: 'Average 7-day spend per active ad in ZAR' },
            verdict:              { type: 'string', description: 'Is spend spread too thin across too many ads? Or concentrated correctly? 1-2 sentences with numbers.' }
          },
          required: ['active_ad_count', 'avg_spend_per_ad_7d', 'verdict']
        },

        // Audience targeting insights (based on adset targeting data provided)
        audience_insights: {
          type: 'object',
          properties: {
            who:         { type: 'string', description: 'Who is being targeted — demographics, interests, custom audiences, lookalikes. Be specific.' },
            why:         { type: 'string', description: 'Why this targeting makes sense for the brand and product.' },
            gaps:        { type: 'string', description: 'Targeting gaps or improvements — missing audiences, over-broad targeting, untested segments. Be specific.' }
          },
          required: ['who', 'why', 'gaps']
        },

        // Top/worst performers for ad-level context
        top_performer:   { type: 'string', description: 'ad_name of best performing ad by 7-day ROAS, or "none"' },
        worst_performer: { type: 'string', description: 'ad_name of worst performing ad by 7-day ROAS, or "none"' },

        // Overall narrative
        narrative:          { type: 'string', description: '2-3 sentences. Campaign health, trend direction, key concern or opportunity based on the data.' },
        strategic_direction: { type: 'string', description: '1 sentence. What should happen to this campaign in the next 7 days.' }
      },
      required: [
        'campaign_id', 'campaign_name',
        'spend_30d', 'revenue_30d', 'results_30d', 'roas_30d', 'cpp_30d', 'aov_30d', 'reach_30d', 'frequency_30d', 'spend_7d', 'roas_7d',
        'funnel_coverage', 'budget_efficiency', 'audience_insights',
        'narrative', 'strategic_direction'
      ]
    }
  },
  {
    name: 'account_synthesis',
    description: 'Call exactly once, after all campaign_analysis calls. Provides the account-level verdict: overall structure, product promotion strategy, audience architecture, and what needs to change at the account level.',
    input_schema: {
      type: 'object' as const,
      properties: {
        structure_assessment: {
          type: 'string',
          description: 'Is the account structured correctly? Evaluate campaign objectives, campaign count, CBO vs ABO, ad set organisation. Be specific about what is right and what is wrong.'
        },
        product_promotion_strategy: {
          type: 'string',
          description: 'Are the right products being promoted in the right ways? Any products missing from the funnel, over-promoted, or under-represented?'
        },
        audience_architecture: {
          type: 'string',
          description: 'Across all campaigns: is the audience architecture coherent? Overlaps, gaps, audience exclusions missing, lookalike quality, cold vs warm ratio.'
        },
        overall_narrative: {
          type: 'string',
          description: '3-4 sentences. The single most important thing to fix at the account level and why.'
        }
      },
      required: ['structure_assessment', 'product_promotion_strategy', 'audience_architecture', 'overall_narrative']
    }
  },
  {
    name: 'cut_ad',
    description: 'Recommend pausing an underperforming ad. Only call when ALL thresholds are met: 30-day spend >= R150, running >= 7 days since last edit, 7-day ROAS below breakeven, no upward trend in last 3 days.',
    input_schema: {
      type: 'object' as const,
      properties: {
        campaign_id:          { type: 'string' },
        ad_id:                { type: 'string' },
        ad_name:              { type: 'string' },
        spend_7day:           { type: 'number' },
        spend_total:          { type: 'number' },
        days_running:         { type: 'number' },
        roas_7day:            { type: 'number' },
        roas_breakeven:       { type: 'number' },
        days_below_breakeven: { type: 'number' },
        trend_3day:           { type: 'string', enum: ['declining', 'flat', 'recovering'] },
        reason:               { type: 'string' }
      },
      required: ['campaign_id', 'ad_id', 'ad_name', 'spend_7day', 'spend_total', 'days_running', 'roas_7day', 'roas_breakeven', 'days_below_breakeven', 'trend_3day', 'reason']
    }
  },
  {
    name: 'change_budget',
    description: 'Recommend increasing or decreasing a campaign or ad set budget. Increase: 7-day ROAS >= 1.5× above breakeven, max 2 of 7 days below breakeven, increase <= 30%, projected spend within monthly cap, no confirmed change within last 5 days. Decrease: 5+ of 7 days below breakeven, 7-day spend > R300, not within 5 days of a confirmed increase.',
    input_schema: {
      type: 'object' as const,
      properties: {
        campaign_id:             { type: 'string' },
        target_type:             { type: 'string', enum: ['campaign', 'adset'] },
        target_id:               { type: 'string' },
        target_name:             { type: 'string' },
        current_budget_zar:      { type: 'number' },
        new_budget_zar:          { type: 'number' },
        direction:               { type: 'string', enum: ['increase', 'decrease'] },
        roas_7day:               { type: 'number' },
        roas_breakeven:          { type: 'number' },
        days_below_breakeven:    { type: 'number' },
        spend_7day:              { type: 'number' },
        projected_monthly_spend: { type: 'number' },
        reason:                  { type: 'string' }
      },
      required: ['campaign_id', 'target_type', 'target_id', 'target_name', 'current_budget_zar', 'new_budget_zar', 'direction', 'roas_7day', 'roas_breakeven', 'days_below_breakeven', 'spend_7day', 'projected_monthly_spend', 'reason']
    }
  },
  {
    name: 'create_brief',
    description: 'Commission a new ad creative. Check pipeline first — never duplicate an in-flight brief or recently confirmed create_brief. The angle field must be specific enough to brief a designer without a follow-up question.',
    input_schema: {
      type: 'object' as const,
      properties: {
        campaign_id: { type: 'string', description: 'Campaign this brief is intended for (omit if account-level strategy)' },
        angle:       { type: 'string' },
        format:      { type: 'string', enum: ['static_image', 'video_ugc', 'video_scripted', 'carousel'] },
        hook:        { type: 'string' },
        offer:       { type: 'string' },
        priority:    { type: 'string', enum: ['high', 'medium', 'low'] },
        rationale:   { type: 'string' },
        reference_ad: { type: 'string', description: 'ad_id to iterate on (optional)' }
      },
      required: ['angle', 'format', 'hook', 'offer', 'priority', 'rationale']
    }
  },
  {
    name: 'restructure',
    description: 'Recommend a campaign or ad set structural change. Requires 3+ weeks of structural signal.',
    input_schema: {
      type: 'object' as const,
      properties: {
        campaign_id:            { type: 'string' },
        scope:                  { type: 'string', enum: ['campaign', 'adset'] },
        target_id:              { type: 'string' },
        target_name:            { type: 'string' },
        current_structure:      { type: 'string' },
        recommended_structure:  { type: 'string' },
        weeks_of_signal:        { type: 'number' },
        reason:                 { type: 'string' }
      },
      required: ['scope', 'target_id', 'target_name', 'current_structure', 'recommended_structure', 'weeks_of_signal', 'reason']
    }
  },
  {
    name: 'alert',
    description: 'Observation only — worth watching but not enough evidence to act yet. Unlimited use. Use for: below-threshold signals, post-scaling adjustment periods, budget cap reached, rejected recommendation still showing signal.',
    input_schema: {
      type: 'object' as const,
      properties: {
        campaign_id:   { type: 'string', description: 'Campaign this alert relates to (optional)' },
        observation:   { type: 'string' },
        metric:        { type: 'string' },
        current_value: { type: 'string' },
        threshold:     { type: 'string' },
        data_window:   { type: 'string' },
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
    if (!client_id) return new Response(JSON.stringify({ error: 'client_id required' }), { status: 400, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } })

    // LAYERS 1-3: System prompt from ai_config
    const { data: modules, error: modulesError } = await supabase
      .from('ai_config')
      .select('title, content, sort_order')
      .eq('active', true)
      .order('sort_order')

    if (modulesError || !modules?.length) {
      return new Response(JSON.stringify({ error: 'No AI Config modules found. Load L1, L2, L3 first.' }), { status: 400, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } })
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
      return new Response(JSON.stringify({ error: 'Client not found' }), { status: 404, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } })
    }

    // HISTORICAL CONTEXT: Last 2 analyses
    const { data: previousAnalyses } = await supabase
      .from('analyses')
      .select('created_at, action_summary')
      .eq('client_id', client_id)
      .order('created_at', { ascending: false })
      .limit(2)

    const now = new Date()

    let lastAnalysisLine = 'Last analysis: None — this is the first run.'
    let historicalContext = 'No previous analysis — this is the first run.'

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

    // CONFIRMED/REJECTED ACTIONS: Last 30 days — used to avoid re-suggesting confirmed items
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
          const coolingNote = a.type === 'change_budget' && daysAgo < 5 ? ' — WITHIN 5-DAY COOLING WINDOW' : ''
          const execNote = a.status === 'confirmed'
            ? (a.meta_executed ? ' (executed in Meta)' : ' (confirmed — pending execution)')
            : ''
          return `- [${a.status.toUpperCase()}${execNote}${coolingNote}] ${a.type} | ${a.title} | ${dateStr} (${daysAgo}d ago)\n  Reason: ${a.reasoning}`
        })
        .join('\n')
    }

    // LAYER 5: Live Meta data
    const metaFetchUrl = `${Deno.env.get('APP_URL') ?? 'https://butcherbird-os.vercel.app'}/api/meta/fetch`
    const metaRes = await fetch(metaFetchUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ account_id: client.ad_account_id })
    })
    // deno-lint-ignore no-explicit-any
    const metaData = await metaRes.json() as Record<string, any>

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

    // --- ASSEMBLE CAMPAIGN HIERARCHY ---
    // deno-lint-ignore no-explicit-any
    const campaignsArr: any[] = Array.isArray(metaData.campaigns) ? metaData.campaigns : []
    // deno-lint-ignore no-explicit-any
    const adsetsArr: any[]    = Array.isArray(metaData.adsets)    ? metaData.adsets    : []
    // deno-lint-ignore no-explicit-any
    const adsArr: any[]       = Array.isArray(metaData.ads)       ? metaData.ads       : []
    // deno-lint-ignore no-explicit-any
    const dailyArr: any[]     = Array.isArray(metaData.daily_breakdown) ? metaData.daily_breakdown : []
    // deno-lint-ignore no-explicit-any
    const campIns30: any[]    = Array.isArray(metaData.campaign_insights_30d) ? metaData.campaign_insights_30d : []
    // deno-lint-ignore no-explicit-any
    const campIns7: any[]     = Array.isArray(metaData.campaign_insights_7d)  ? metaData.campaign_insights_7d  : []

    // Maps for lookups
    // deno-lint-ignore no-explicit-any
    const adsetMap = Object.fromEntries(adsetsArr.map((s: any) => [s.id, s]))
    // Campaign-level insights maps (keyed by campaign_id)
    // deno-lint-ignore no-explicit-any
    const campIns30Map = Object.fromEntries(campIns30.map((c: any) => [c.campaign_id, c]))
    // deno-lint-ignore no-explicit-any
    const campIns7Map  = Object.fromEntries(campIns7.map((c: any)  => [c.campaign_id, c]))

    // Get last 7 unique dates for 7-day aggregation from daily breakdown
    const allDates = [...new Set<string>(dailyArr.map((r) => r.date_start as string))].sort().reverse()
    const last7Dates = new Set(allDates.slice(0, 7))

    // Group daily rows by ad_id
    // deno-lint-ignore no-explicit-any
    const dailyByAd: Record<string, any[]> = {}
    for (const row of dailyArr) {
      if (!dailyByAd[row.ad_id]) dailyByAd[row.ad_id] = []
      dailyByAd[row.ad_id].push(row)
    }

    // deno-lint-ignore no-explicit-any
    function getAd7dMetrics(adId: string): { spend: number; revenue: number; purchases: number; roas: number; aov: number; cpp: number } {
      const rows = (dailyByAd[adId] || []).filter((r) => last7Dates.has(r.date_start))
      let spend = 0, revenue = 0, purchases = 0
      for (const r of rows) {
        spend     += parseFloat(r.spend || '0')
        // deno-lint-ignore no-explicit-any
        revenue   += parseFloat(r.action_values?.find((a: any) => a.action_type === 'purchase')?.value || '0')
        // deno-lint-ignore no-explicit-any
        purchases += parseFloat(r.actions?.find((a: any) => a.action_type === 'purchase')?.value || '0')
      }
      const roas = spend > 0 && revenue > 0 ? revenue / spend : 0
      return {
        spend:     Math.round(spend),
        revenue:   Math.round(revenue),
        purchases: Math.round(purchases),
        roas:      Math.round(roas * 100) / 100,
        aov:       purchases > 0 ? Math.round(revenue / purchases) : 0,
        cpp:       purchases > 0 ? Math.round(spend / purchases) : 0,
      }
    }

    // Format targeting object into readable text for Claude
    // deno-lint-ignore no-explicit-any
    function formatTargeting(targeting: Record<string, any> | undefined): string {
      if (!targeting) return 'No targeting data available'
      const parts: string[] = []

      if (targeting.age_min || targeting.age_max) {
        parts.push(`Age: ${targeting.age_min || '?'}–${targeting.age_max || '?'}`)
      }
      if (targeting.genders?.length) {
        const genderMap: Record<number, string> = { 1: 'Male', 2: 'Female' }
        parts.push(`Gender: ${targeting.genders.map((g: number) => genderMap[g] || g).join(', ')}`)
      }
      if (targeting.geo_locations) {
        const geo = targeting.geo_locations
        const locs: string[] = []
        if (geo.countries?.length) locs.push(`Countries: ${geo.countries.join(', ')}`)
        if (geo.cities?.length) locs.push(`Cities: ${geo.cities.map((c: any) => c.name).join(', ')}`)
        if (locs.length) parts.push(locs.join(' | '))
      }
      if (targeting.interests?.length) {
        parts.push(`Interests: ${targeting.interests.map((i: any) => i.name).join(', ')}`)
      }
      if (targeting.custom_audiences?.length) {
        parts.push(`Custom audiences: ${targeting.custom_audiences.map((a: any) => a.name).join(', ')}`)
      }
      if (targeting.lookalike_audiences?.length) {
        parts.push(`Lookalikes: ${targeting.lookalike_audiences.map((a: any) => a.name || a.id).join(', ')}`)
      }
      if (targeting.excluded_custom_audiences?.length) {
        parts.push(`Excluded: ${targeting.excluded_custom_audiences.map((a: any) => a.name).join(', ')}`)
      }
      if (targeting.publisher_platforms?.length) {
        parts.push(`Placements: ${targeting.publisher_platforms.join(', ')}`)
      }

      return parts.length ? parts.join('\n    ') : 'Broad targeting (no specific audiences)'
    }

    // Build campaign groups: campaign → adsets (with targeting) → ads
    // deno-lint-ignore no-explicit-any
    const campaignGroups = campaignsArr.map((camp: any) => {
      // Campaign-level insights from Meta (accurate reach/freq)
      const ci30 = campIns30Map[camp.id] || {}
      const ci7  = campIns7Map[camp.id]  || {}
      const cm30 = getPurchaseMetrics(ci30)
      const cm7  = getPurchaseMetrics(ci7)

      // Ad sets belonging to this campaign
      // deno-lint-ignore no-explicit-any
      const campAdsets = adsetsArr.filter((s: any) => s.campaign_id === camp.id)

      // Ads belonging to this campaign (structured under their ad sets)
      // deno-lint-ignore no-explicit-any
      const campAds = adsArr.filter((a: any) => a.campaign_id === camp.id)

      // deno-lint-ignore no-explicit-any
      const adsWithMetrics = campAds.map((ad: any) => {
        const ins30 = ad.insights?.data?.[0] || {}
        const m30   = getPurchaseMetrics(ins30)
        const m7    = getAd7dMetrics(ad.id)
        // deno-lint-ignore no-explicit-any
        const adset = (adsetMap[ad.adset_id] || {}) as Record<string, any>
        return {
          ad_id:         ad.id,
          ad_name:       ad.name,
          adset_id:      ad.adset_id,
          adset_name:    adset.name || ad.adset_id,
          effective_status: ad.effective_status,
          spend_30d:     m30.spend,
          revenue_30d:   m30.revenue,
          results_30d:   m30.purchases,
          roas_30d:      m30.roas,
          aov_30d:       m30.aov,
          cpp_30d:       m30.cpp,
          reach_30d:     m30.reach,
          frequency_30d: m30.frequency,
          spend_7d:      m7.spend,
          revenue_7d:    m7.revenue,
          results_7d:    m7.purchases,
          roas_7d:       m7.roas,
          aov_7d:        m7.aov,
          cpp_7d:        m7.cpp,
          impressions_30d: parseInt(ins30.impressions || '0'),
          clicks_30d:      parseInt(ins30.clicks || '0'),
          ctr_30d:         Math.round(parseFloat(ins30.ctr || '0') * 100) / 100,
        }
      })

      return {
        campaign_id:   camp.id,
        campaign_name: camp.name,
        objective:     camp.objective,
        daily_budget_zar: Math.round(parseInt(camp.daily_budget || '0') / 100),
        lifetime_budget_zar: camp.lifetime_budget ? Math.round(parseInt(camp.lifetime_budget) / 100) : null,
        // Campaign-level metrics (from Meta campaign insights — reach/freq are accurate here)
        metrics: {
          spend_30d:     cm30.spend,
          revenue_30d:   cm30.revenue,
          results_30d:   cm30.purchases,
          roas_30d:      cm30.roas,
          aov_30d:       cm30.aov,
          cpp_30d:       cm30.cpp,
          reach_30d:     cm30.reach,
          frequency_30d: cm30.frequency,
          spend_7d:      cm7.spend,
          revenue_7d:    cm7.revenue,
          results_7d:    cm7.purchases,
          roas_7d:       cm7.roas,
          aov_7d:        cm7.aov,
          cpp_7d:        cm7.cpp,
          reach_7d:      cm7.reach,
          frequency_7d:  cm7.frequency,
        },
        adsets: campAdsets.map((s: any) => ({
          adset_id:   s.id,
          adset_name: s.name,
          status:     s.effective_status,
          daily_budget_zar: Math.round(parseInt(s.daily_budget || '0') / 100),
          targeting_summary: formatTargeting(s.targeting),
        })),
        ads: adsWithMetrics,
      }
    })

    // ACCOUNT-LEVEL METRICS (from dedicated account insight calls — includes reach/freq)
    // deno-lint-ignore no-explicit-any
    const ins30 = metaData.account_insights_30d as Record<string, any> | null
    // deno-lint-ignore no-explicit-any
    const ins7  = metaData.account_insights_7d  as Record<string, any> | null

    const acct30 = getPurchaseMetrics(ins30 || {})
    const acct7  = getPurchaseMetrics(ins7  || {})

    const accountMetrics = {
      spend_30d:     acct30.spend,
      revenue_30d:   acct30.revenue,
      results_30d:   acct30.purchases,
      roas_30d:      acct30.roas,
      aov_30d:       acct30.aov,
      cpp_30d:       acct30.cpp,
      reach_30d:     acct30.reach,
      frequency_30d: acct30.frequency,
      spend_7d:      acct7.spend,
      revenue_7d:    acct7.revenue,
      results_7d:    acct7.purchases,
      roas_7d:       acct7.roas,
      aov_7d:        acct7.aov,
      cpp_7d:        acct7.cpp,
      reach_7d:      acct7.reach,
      frequency_7d:  acct7.frequency,
    }

    // BUILD USER MESSAGE — campaign text with full hierarchy
    const campaignText = campaignGroups.map((cg) => {
      const adsetsText = cg.adsets.map((s) => {
        return `  [Adset] ${s.adset_name} (${s.adset_id}) | Status: ${s.status} | Budget: R${s.daily_budget_zar}/day
  Targeting:
    ${s.targeting_summary}`
      }).join('\n\n')

      const adsText = cg.ads.map((ad) => {
        const dailyRows = (dailyByAd[ad.ad_id] || [])
          .sort((a, b) => b.date_start.localeCompare(a.date_start))
          .slice(0, 14)
        const dailyText = dailyRows.map((row) => {
          // deno-lint-ignore no-explicit-any
          const rowRoas = parseFloat(row.purchase_roas?.[0]?.value || '0')
          // deno-lint-ignore no-explicit-any
          const rowPurchases = parseFloat(row.actions?.find((a: any) => a.action_type === 'purchase')?.value || '0')
          return `    ${row.date_start}: Spend R${Math.round(parseFloat(row.spend || '0'))} | ROAS ${rowRoas > 0 ? rowRoas.toFixed(2) + '×' : '—'} | Purchases ${rowPurchases || 0} | ${row.impressions || 0} impr`
        }).join('\n')

        return `  [Ad] ${ad.ad_name}
  ID: ${ad.ad_id} | Adset: ${ad.adset_name} | Status: ${ad.effective_status}
  30-Day: Spend R${ad.spend_30d} | Revenue R${ad.revenue_30d} | Results ${ad.results_30d} | ROAS ${ad.roas_30d > 0 ? ad.roas_30d + '×' : '—'} | AOV R${ad.aov_30d || '—'} | CPP R${ad.cpp_30d || '—'} | Reach ${ad.reach_30d.toLocaleString()} | Freq ${ad.frequency_30d} | ${ad.impressions_30d.toLocaleString()} impr | CTR ${ad.ctr_30d}%
  7-Day: Spend R${ad.spend_7d} | Revenue R${ad.revenue_7d} | Results ${ad.results_7d} | ROAS ${ad.roas_7d > 0 ? ad.roas_7d + '×' : '—'} | AOV R${ad.aov_7d || '—'} | CPP R${ad.cpp_7d || '—'}
  Daily breakdown (${dailyRows.length} days, newest first):
${dailyText || '    (no daily data)'}`
      }).join('\n\n')

      return `### Campaign: ${cg.campaign_name}
ID: ${cg.campaign_id} | Objective: ${cg.objective} | Budget: R${cg.daily_budget_zar}/day${cg.lifetime_budget_zar ? ` (lifetime R${cg.lifetime_budget_zar})` : ''}
Campaign 30-Day (from Meta): Spend R${cg.metrics.spend_30d} | Revenue R${cg.metrics.revenue_30d} | Results ${cg.metrics.results_30d} | ROAS ${cg.metrics.roas_30d}× | AOV R${cg.metrics.aov_30d || '—'} | CPP R${cg.metrics.cpp_30d || '—'} | Reach ${cg.metrics.reach_30d.toLocaleString()} | Freq ${cg.metrics.frequency_30d}
Campaign 7-Day (from Meta): Spend R${cg.metrics.spend_7d} | Revenue R${cg.metrics.revenue_7d} | Results ${cg.metrics.results_7d} | ROAS ${cg.metrics.roas_7d > 0 ? cg.metrics.roas_7d + '×' : '—'} | Reach ${cg.metrics.reach_7d.toLocaleString()} | Freq ${cg.metrics.frequency_7d}

Ad Sets (${cg.adsets.length}):
${adsetsText || '  (no active ad sets)'}

Ads (${cg.ads.length} active):
${adsText || '  (no active ads)'}`
    }).join('\n\n---\n\n')

    // ASSEMBLE USER MESSAGE
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

Recently Confirmed/Rejected Actions (last 30 days):
Use this to avoid re-suggesting confirmed items and to respect cooling windows.
${confirmedActionsText}

---

## Layer 5: Live Meta Ad Data

Fetched: ${metaData.fetched_at || new Date().toISOString()}

### Account-Level Summary
30-Day: Spend R${accountMetrics.spend_30d} | Revenue R${accountMetrics.revenue_30d} | Results ${accountMetrics.results_30d} | ROAS ${accountMetrics.roas_30d > 0 ? accountMetrics.roas_30d + '×' : '—'} | AOV R${accountMetrics.aov_30d || '—'} | CPP R${accountMetrics.cpp_30d || '—'} | Reach ${accountMetrics.reach_30d.toLocaleString()} | Freq ${accountMetrics.frequency_30d}
7-Day: Spend R${accountMetrics.spend_7d} | Revenue R${accountMetrics.revenue_7d} | Results ${accountMetrics.results_7d} | ROAS ${accountMetrics.roas_7d > 0 ? accountMetrics.roas_7d + '×' : '—'} | Reach ${accountMetrics.reach_7d.toLocaleString()} | Freq ${accountMetrics.frequency_7d}

Active campaigns: ${campaignsArr.length} | Active ad sets: ${adsetsArr.length} | Active ads: ${adsArr.length}

---

## Campaign-Level Data (Campaign → Ad Sets → Ads)

${campaignText || 'No active campaigns found.'}

---

Run your full analysis now. For each active campaign:
1. Call campaign_analysis exactly once — populate all fields including funnel_coverage, budget_efficiency, and audience_insights from the targeting data provided
2. Then produce action cards (cut_ad, change_budget, create_brief, restructure, alert) for that campaign
3. Always include campaign_id on all cards for that campaign
4. create_brief may omit campaign_id if it is account-level strategy
5. After all campaigns, call account_synthesis exactly once

Output structured tool calls only — no prose before or after.`

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
    // deno-lint-ignore no-explicit-any
    const allCards: Record<string, any>[] = response.content
      .filter((block) => block.type === 'tool_use')
      .map((block) => {
        if (block.type !== 'tool_use') return null
        return { type: block.name, ...(block.input as Record<string, unknown>) }
      })
      .filter(Boolean) as Record<string, any>[]

    // Extract account_synthesis (exactly one)
    const accountSynthesis = allCards.find((c) => c.type === 'account_synthesis') || null

    // Extract campaign_analysis cards (keyed by campaign_id for UI lookup)
    const campaignAnalysisCards = allCards.filter((c) => c.type === 'campaign_analysis')

    // Action cards (everything except campaign_analysis and account_synthesis)
    const actionCards = allCards.filter((c) => c.type !== 'campaign_analysis' && c.type !== 'account_synthesis')

    // Build structured output — what the UI loads from DB
    const structuredOutput = {
      account_metrics: accountMetrics,
      account_synthesis: accountSynthesis,
      account_cards: actionCards.filter((c) => !c.campaign_id),
      campaigns: campaignGroups.map((cg) => {
        const analysis = campaignAnalysisCards.find((c) => c.campaign_id === cg.campaign_id) || null
        const cards = actionCards.filter((c) => c.campaign_id === cg.campaign_id)
        return {
          ...cg,
          campaign_analysis: analysis,
          campaign_cards: cards,
        }
      })
    }

    // Generate narrative for action_summary
    const cutCount    = actionCards.filter((c) => c.type === 'cut_ad').length
    const briefCount  = actionCards.filter((c) => c.type === 'create_brief').length
    const budgetCount = actionCards.filter((c) => c.type === 'change_budget').length
    const alertCount  = actionCards.filter((c) => c.type === 'alert').length
    const bep         = client.breakeven_roas || 2
    const activeRoas  = acct7.roas > 0 ? acct7.roas : acct30.roas
    const roasWindow  = acct7.roas > 0 ? '7-day' : '30-day'
    const roasStatus  = activeRoas >= bep ? 'above breakeven' : 'below breakeven'

    const narrative = [
      `Account ROAS ${activeRoas > 0 ? activeRoas + '×' : 'unavailable'} (${roasWindow}) vs ${bep}× breakeven — ${roasStatus}.`,
      acct30.aov > 0 ? `AOV R${acct30.aov} · CPP R${acct30.cpp} (30-day).` : '',
      cutCount    > 0 ? `${cutCount} ad${cutCount > 1 ? 's' : ''} flagged to cut.` : '',
      briefCount  > 0 ? `${briefCount} brief${briefCount > 1 ? 's' : ''} commissioned.` : '',
      budgetCount > 0 ? `${budgetCount} budget adjustment${budgetCount > 1 ? 's' : ''} proposed.` : '',
      alertCount  > 0 ? `${alertCount} alert${alertCount > 1 ? 's' : ''} watching.` : '',
    ].filter(Boolean).join(' ')

    const actionableCards = actionCards.filter((c) => c.type !== 'alert')
    const actionSummary = actionableCards
      .map((c) => {
        if (c.type === 'cut_ad')        return `- Cut: ${c.ad_name} — ${c.reason}`
        if (c.type === 'change_budget') return `- Budget ${c.direction}: ${c.target_name} R${c.current_budget_zar}→R${c.new_budget_zar} — ${c.reason}`
        if (c.type === 'create_brief')  return `- Brief: ${c.angle} (${c.priority})`
        if (c.type === 'restructure')   return `- Restructure: ${c.target_name} — ${c.reason}`
        return ''
      })
      .filter(Boolean)
      .join('\n')

    // STORE in analyses table
    const { data: analysis, error: analysisError } = await supabase
      .from('analyses')
      .insert({
        client_id,
        created_by:       user_email || 'system',
        status:           'complete',
        output:           structuredOutput,
        action_summary:   actionSummary || 'No actionable cards produced.',
        historical_context: historicalContext
      })
      .select('id')
      .single()

    if (analysisError || !analysis) {
      return new Response(JSON.stringify({ error: 'Failed to store analysis', detail: analysisError }), { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } })
    }

    // CREATE analysis_actions rows for all actionable cards
    const actionableTypes = ['cut_ad', 'change_budget', 'create_brief', 'restructure']
    const actionRows = actionCards
      .filter((c) => actionableTypes.includes(c.type))
      .map((c) => ({
        analysis_id: analysis.id,
        client_id,
        type:        c.type,
        title:       (c.ad_name || c.target_name || c.angle || c.type) as string,
        reasoning:   (c.reason || c.rationale || '') as string,
        payload:     c,
        status:      'proposed'
      }))

    if (actionRows.length > 0) {
      await supabase.from('analysis_actions').insert(actionRows)
    }

    return new Response(JSON.stringify({
      analysis_id:    analysis.id,
      structured_output: structuredOutput,
      narrative,
      // Legacy fields kept so existing UI doesn't fully break before redesign
      cards:          allCards,
      card_count:     allCards.length,
      metrics:        accountMetrics,
      campaign_groups: campaignGroups
    }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    })

  } catch (err) {
    console.error('run-analysis error:', err)
    return new Response(JSON.stringify({ error: 'Internal error', detail: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    })
  }
})
