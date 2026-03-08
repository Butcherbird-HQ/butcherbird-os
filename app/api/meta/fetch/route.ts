import { NextRequest, NextResponse } from 'next/server'

const META_VERSION = process.env.META_API_VERSION || 'v22.0'
const META_TOKEN = process.env.META_ACCESS_TOKEN

export async function POST(req: NextRequest) {
  const { account_id } = await req.json()
  if (!account_id) return NextResponse.json({ error: 'account_id required' }, { status: 400 })
  if (!META_TOKEN) return NextResponse.json({ error: 'META_ACCESS_TOKEN not set' }, { status: 500 })

  const base = `https://graph.facebook.com/${META_VERSION}/act_${account_id}`
  const token = `access_token=${META_TOKEN}`

  // Fields valid for nested insights on the /ads endpoint
  const insightFields = [
    'spend', 'impressions', 'clicks', 'ctr', 'cpm',
    'actions', 'action_values',
    'purchase_roas'
  ].join(',')

  // Active campaigns and adsets only
  const activeFilter = encodeURIComponent(JSON.stringify([{ field: 'effective_status', operator: 'IN', value: ['ACTIVE'] }]))

  const [campaignsRes, adsetsRes, adsRes, dailyRes, insights30dRes, insights7dRes] = await Promise.all([
    // Active campaigns only
    fetch(`${base}/campaigns?fields=id,name,effective_status,daily_budget,objective,buying_type&filtering=${activeFilter}&limit=200&${token}`),
    // Active adsets only
    fetch(`${base}/adsets?fields=id,name,effective_status,campaign_id,daily_budget&filtering=${activeFilter}&limit=200&${token}`),
    // Active ads only with 30-day aggregated insights
    fetch(`${base}/ads?fields=id,name,effective_status,adset_id,campaign_id,created_time,updated_time,insights.date_preset(last_30d){${insightFields}}&filtering=${activeFilter}&limit=200&${token}`),
    // 14-day daily breakdown — all ads with spend (captures recently paused ads too)
    fetch(`${base}/insights?level=ad&date_preset=last_14d&time_increment=1&fields=ad_id,ad_name,adset_id,campaign_id,spend,impressions,clicks,ctr,cpm,purchase_roas,actions,action_values&limit=500&${token}`),
    // Account-level 30-day totals (true account numbers for metrics strip)
    fetch(`${base}/insights?date_preset=last_30d&fields=spend,impressions,clicks,purchase_roas,actions,action_values&${token}`),
    // Account-level 7-day totals
    fetch(`${base}/insights?date_preset=last_7d&fields=spend,impressions,clicks,purchase_roas,actions,action_values&${token}`)
  ])

  const [campaignsText, adsetsText, adsText, dailyText, insights30dText, insights7dText] = await Promise.all([
    campaignsRes.text(), adsetsRes.text(), adsRes.text(),
    dailyRes.text(), insights30dRes.text(), insights7dRes.text()
  ])

  let campaigns: Record<string, unknown>,
      adsets: Record<string, unknown>,
      ads: Record<string, unknown>,
      daily: Record<string, unknown>,
      insights30d: Record<string, unknown>,
      insights7d: Record<string, unknown>

  try {
    campaigns  = JSON.parse(campaignsText)
    adsets     = JSON.parse(adsetsText)
    ads        = JSON.parse(adsText)
    daily      = JSON.parse(dailyText)
    insights30d = JSON.parse(insights30dText)
    insights7d  = JSON.parse(insights7dText)
  } catch (parseErr) {
    return NextResponse.json({
      error: 'Meta API returned non-JSON',
      campaigns_raw: campaignsText.slice(0, 500),
      adsets_raw: adsetsText.slice(0, 500),
      ads_raw: adsText.slice(0, 500),
      daily_raw: dailyText.slice(0, 500),
      parse_error: String(parseErr)
    }, { status: 500 })
  }

  if (campaigns.error) console.error('campaigns error:', JSON.stringify(campaigns.error))
  if (adsets.error) console.error('adsets error:', JSON.stringify(adsets.error))
  if (ads.error) console.error('ads error:', JSON.stringify(ads.error))
  else console.log('ads count:', (ads.data as unknown[])?.length ?? 0, '| raw sample:', adsText.slice(0, 300))
  if (daily.error) console.error('daily error:', JSON.stringify(daily.error))
  else console.log('daily rows:', (daily.data as unknown[])?.length ?? 0)
  if (insights30d.error) console.error('insights30d error:', JSON.stringify(insights30d.error))
  if (insights7d.error) console.error('insights7d error:', JSON.stringify(insights7d.error))

  // Extract account-level summary rows
  const ins30 = (insights30d.data as Record<string, unknown>[])?.[0] || null
  const ins7  = (insights7d.data  as Record<string, unknown>[])?.[0] || null

  return NextResponse.json({
    campaigns: campaigns.data || [],
    adsets: adsets.data || [],
    ads: ads.data || [],
    daily_breakdown: daily.data || [],
    account_insights_30d: ins30,
    account_insights_7d: ins7,
    fetched_at: new Date().toISOString(),
    date_preset_aggregated: 'last_30d',
    date_preset_daily: 'last_14d',
    _debug: {
      campaigns_count: (campaigns.data as unknown[])?.length ?? 0,
      adsets_count: (adsets.data as unknown[])?.length ?? 0,
      ads_count: (ads.data as unknown[])?.length ?? 0,
      daily_count: (daily.data as unknown[])?.length ?? 0,
      ads_raw: adsText.slice(0, 800),
      campaigns_raw: campaignsText.slice(0, 400),
    }
  })
}
