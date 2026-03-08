import { NextRequest, NextResponse } from 'next/server'

const META_VERSION = process.env.META_API_VERSION || 'v22.0'
const META_TOKEN = process.env.META_ACCESS_TOKEN

export async function POST(req: NextRequest) {
  const { account_id } = await req.json()
  if (!account_id) return NextResponse.json({ error: 'account_id required' }, { status: 400 })
  if (!META_TOKEN) return NextResponse.json({ error: 'META_ACCESS_TOKEN not set' }, { status: 500 })

  const base = `https://graph.facebook.com/${META_VERSION}/act_${account_id}`
  const token = `access_token=${META_TOKEN}`

  const insightFields = [
    'spend', 'impressions', 'clicks', 'ctr', 'cpm',
    'frequency', 'reach',
    'outbound_clicks', 'landing_page_views',
    'video_thruplay_watched_actions',
    'actions', 'action_values',
    'purchase_roas'
  ].join(',')

  const activeFilter = encodeURIComponent(JSON.stringify([
    { field: 'effective_status', operator: 'IN', value: ['ACTIVE', 'PAUSED'] }
  ]))

  // View 1: 30-day aggregated + View 3: Ad metadata — all in one parallel batch
  const [campaignsRes, adsetsRes, adsRes, dailyRes] = await Promise.all([
    // Campaigns: metadata + buying_type for CBO/ABO detection
    fetch(`${base}/campaigns?fields=id,name,effective_status,daily_budget,objective,buying_type&filtering=${activeFilter}&${token}`),
    // Adsets: metadata + daily_budget for budget change % calculations
    fetch(`${base}/adsets?fields=id,name,effective_status,campaign_id,daily_budget&filtering=${activeFilter}&${token}`),
    // Ads: metadata (created_time, updated_time for days-running) + 30-day aggregated insights
    fetch(`${base}/ads?fields=id,name,effective_status,adset_id,campaign_id,created_time,updated_time,insights.date_preset(last_30d){${insightFields}}&filtering=${activeFilter}&${token}`),
    // View 2: 14-day daily breakdown — one row per ad per day
    fetch(`${base}/insights?level=ad&date_preset=last_14d&time_increment=1&fields=ad_id,ad_name,adset_id,campaign_id,spend,impressions,clicks,ctr,cpm,purchase_roas,actions,action_values&limit=500&${token}`)
  ])

  const [campaigns, adsets, ads, daily] = await Promise.all([
    campaignsRes.json(),
    adsetsRes.json(),
    adsRes.json(),
    dailyRes.json()
  ])

  return NextResponse.json({
    // View 1 + 3: 30-day aggregated performance + metadata
    campaigns: campaigns.data || [],
    adsets: adsets.data || [],
    ads: ads.data || [],
    // View 2: 14-day daily breakdown (one row per ad per day)
    daily_breakdown: daily.data || [],
    fetched_at: new Date().toISOString(),
    date_preset_aggregated: 'last_30d',
    date_preset_daily: 'last_14d'
  })
}
