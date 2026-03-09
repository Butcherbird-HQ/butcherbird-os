import { NextRequest, NextResponse } from 'next/server'

const META_VERSION = process.env.META_API_VERSION || 'v22.0'
const META_TOKEN = process.env.META_ACCESS_TOKEN

export async function POST(req: NextRequest) {
  const { account_id } = await req.json()
  if (!account_id) return NextResponse.json({ error: 'account_id required' }, { status: 400 })
  if (!META_TOKEN) return NextResponse.json({ error: 'META_ACCESS_TOKEN not set' }, { status: 500 })

  const base = `https://graph.facebook.com/${META_VERSION}/act_${account_id}`
  const token = `access_token=${META_TOKEN}`

  // Insight fields — includes reach + frequency
  const insightFields = [
    'spend', 'impressions', 'clicks', 'ctr', 'cpm',
    'reach', 'frequency',
    'actions', 'action_values',
    'purchase_roas'
  ].join(',')

  // effective_status = ACTIVE means campaign + adset + ad are all live and delivering
  const activeFilter = encodeURIComponent(JSON.stringify([{ field: 'effective_status', operator: 'IN', value: ['ACTIVE'] }]))

  // Campaign-level insights filter
  const activeCampaignFilter = encodeURIComponent(JSON.stringify([{ field: 'campaign.effective_status', operator: 'IN', value: ['ACTIVE'] }]))

  const [
    campaignsRes, adsetsRes, adsRes,
    dailyRes,
    campaignInsights30dRes, campaignInsights7dRes,
    insights30dRes, insights7dRes
  ] = await Promise.all([
    // Active campaigns — metadata only
    fetch(`${base}/campaigns?fields=id,name,effective_status,daily_budget,lifetime_budget,objective,buying_type&filtering=${activeFilter}&limit=200&${token}`),

    // Active adsets — includes targeting field (where audiences live)
    fetch(`${base}/adsets?fields=id,name,effective_status,campaign_id,daily_budget,lifetime_budget,targeting&filtering=${activeFilter}&limit=200&${token}`),

    // Active ads with 30d nested insights (reach + freq included)
    // effective_status included so Claude knows what is live vs recently paused
    fetch(`${base}/ads?fields=id,name,effective_status,adset_id,campaign_id,created_time,updated_time,insights.date_preset(last_30d){${insightFields}}&filtering=${activeFilter}&limit=200&${token}`),

    // 14-day daily breakdown — all ads with spend (includes recently paused for accurate trend data)
    fetch(`${base}/insights?level=ad&date_preset=last_14d&time_increment=1&fields=ad_id,ad_name,adset_id,campaign_id,spend,impressions,clicks,ctr,cpm,reach,purchase_roas,actions,action_values&limit=500&${token}`),

    // Campaign-level 30d insights — reach + frequency accurate at campaign level from Meta directly
    fetch(`${base}/insights?level=campaign&date_preset=last_30d&fields=campaign_id,campaign_name,${insightFields}&filtering=${activeCampaignFilter}&limit=200&${token}`),

    // Campaign-level 7d insights
    fetch(`${base}/insights?level=campaign&date_preset=last_7d&fields=campaign_id,campaign_name,${insightFields}&filtering=${activeCampaignFilter}&limit=200&${token}`),

    // Account-level 30d totals
    fetch(`${base}/insights?date_preset=last_30d&fields=${insightFields}&${token}`),

    // Account-level 7d totals
    fetch(`${base}/insights?date_preset=last_7d&fields=${insightFields}&${token}`)
  ])

  const [
    campaignsText, adsetsText, adsText,
    dailyText,
    campaignInsights30dText, campaignInsights7dText,
    insights30dText, insights7dText
  ] = await Promise.all([
    campaignsRes.text(), adsetsRes.text(), adsRes.text(),
    dailyRes.text(),
    campaignInsights30dRes.text(), campaignInsights7dRes.text(),
    insights30dRes.text(), insights7dRes.text()
  ])

  let campaigns: Record<string, unknown>,
      adsets: Record<string, unknown>,
      ads: Record<string, unknown>,
      daily: Record<string, unknown>,
      campaignInsights30d: Record<string, unknown>,
      campaignInsights7d: Record<string, unknown>,
      insights30d: Record<string, unknown>,
      insights7d: Record<string, unknown>

  try {
    campaigns           = JSON.parse(campaignsText)
    adsets              = JSON.parse(adsetsText)
    ads                 = JSON.parse(adsText)
    daily               = JSON.parse(dailyText)
    campaignInsights30d = JSON.parse(campaignInsights30dText)
    campaignInsights7d  = JSON.parse(campaignInsights7dText)
    insights30d         = JSON.parse(insights30dText)
    insights7d          = JSON.parse(insights7dText)
  } catch (parseErr) {
    return NextResponse.json({
      error: 'Meta API returned non-JSON',
      campaigns_raw: campaignsText.slice(0, 500),
      adsets_raw: adsetsText.slice(0, 500),
      ads_raw: adsText.slice(0, 500),
      parse_error: String(parseErr)
    }, { status: 500 })
  }

  if (campaigns.error)           console.error('campaigns error:', JSON.stringify(campaigns.error))
  if (adsets.error)              console.error('adsets error:', JSON.stringify(adsets.error))
  if (ads.error)                 console.error('ads error:', JSON.stringify(ads.error))
  if (daily.error)               console.error('daily error:', JSON.stringify(daily.error))
  if (campaignInsights30d.error) console.error('campaignInsights30d error:', JSON.stringify(campaignInsights30d.error))
  if (campaignInsights7d.error)  console.error('campaignInsights7d error:', JSON.stringify(campaignInsights7d.error))
  if (insights30d.error)         console.error('insights30d error:', JSON.stringify(insights30d.error))
  if (insights7d.error)          console.error('insights7d error:', JSON.stringify(insights7d.error))

  console.log('campaigns:', (campaigns.data as unknown[])?.length ?? 0)
  console.log('adsets:', (adsets.data as unknown[])?.length ?? 0)
  console.log('ads (active):', (ads.data as unknown[])?.length ?? 0)
  console.log('daily rows:', (daily.data as unknown[])?.length ?? 0)
  console.log('campaign 30d insight rows:', (campaignInsights30d.data as unknown[])?.length ?? 0)

  const ins30 = (insights30d.data as Record<string, unknown>[])?.[0] || null
  const ins7  = (insights7d.data  as Record<string, unknown>[])?.[0] || null

  return NextResponse.json({
    // Hierarchy: campaign → adsets (with targeting) → ads (active, with effective_status)
    campaigns: campaigns.data || [],
    adsets: adsets.data || [],                              // includes targeting field
    ads: ads.data || [],                                    // active only + 30d nested insights (reach/freq included)
    daily_breakdown: daily.data || [],                      // 14-day daily per ad (all ads with spend, for trend analysis)
    campaign_insights_30d: campaignInsights30d.data || [],  // campaign-level 30d reach/freq/metrics from Meta
    campaign_insights_7d: campaignInsights7d.data || [],    // campaign-level 7d
    account_insights_30d: ins30,
    account_insights_7d: ins7,
    fetched_at: new Date().toISOString(),
    _debug: {
      campaigns_count: (campaigns.data as unknown[])?.length ?? 0,
      adsets_count: (adsets.data as unknown[])?.length ?? 0,
      ads_count: (ads.data as unknown[])?.length ?? 0,
      daily_count: (daily.data as unknown[])?.length ?? 0,
      campaign_insights_30d_count: (campaignInsights30d.data as unknown[])?.length ?? 0,
      campaign_insights_7d_count: (campaignInsights7d.data as unknown[])?.length ?? 0,
    }
  })
}
