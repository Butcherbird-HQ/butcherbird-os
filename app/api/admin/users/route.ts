import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'

const SUPER_USER = 'g@butcherbird.global'

async function getCallerEmail(req: NextRequest): Promise<string | null> {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => req.cookies.getAll(), setAll: () => {} } }
  )
  const { data: { user } } = await supabase.auth.getUser()
  return user?.email ?? null
}

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export async function GET(req: NextRequest) {
  if (await getCallerEmail(req) !== SUPER_USER)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const { data, error } = await adminClient().auth.admin.listUsers()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const users = data.users.map(u => ({
    id: u.id,
    email: u.email,
    name: u.user_metadata?.name || '',
    role: u.user_metadata?.role || '',
    created_at: u.created_at,
  }))
  return NextResponse.json(users)
}

export async function POST(req: NextRequest) {
  if (await getCallerEmail(req) !== SUPER_USER)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const { email, password, name, role } = await req.json()
  if (!email || !password || !name)
    return NextResponse.json({ error: 'Email, password and name are required' }, { status: 400 })

  const { error } = await adminClient().auth.admin.createUser({
    email, password, email_confirm: true, user_metadata: { name, role },
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
