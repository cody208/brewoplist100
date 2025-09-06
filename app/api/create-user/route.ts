import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const ANON = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
const SRV = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!  // server only
)

export async function POST(req: Request) {
  try {
    // Check caller is an authenticated admin/manager
    const auth = req.headers.get('authorization') || ''
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null
    if (!token) return NextResponse.json({ ok:false, error:'Missing auth token' }, { status: 401 })

    // Verify token -> user
    const { data: userData, error: userErr } = await ANON.auth.getUser(token)
    if (userErr || !userData?.user) {
      return NextResponse.json({ ok:false, error:'Invalid session' }, { status: 401 })
    }
    const userId = userData.user.id

    // Check role
    const { data: prof, error: profErr } = await SRV
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .maybeSingle()
    if (profErr || !prof || !['admin','manager'].includes(prof.role || '')) {
      return NextResponse.json({ ok:false, error:'Forbidden' }, { status: 403 })
    }

    // Create the new user
    const { email, password, full_name, role } = await req.json() as {
      email: string, password: string, full_name?: string, role: 'admin'|'manager'
    }
    if (!email || !password || !role) {
      return NextResponse.json({ ok:false, error:'Missing fields' }, { status: 400 })
    }

    const { data: created, error: createErr } = await SRV.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: full_name || null }
    })
    if (createErr || !created.user) {
      return NextResponse.json({ ok:false, error:createErr?.message || 'Failed to create user' }, { status: 400 })
    }

    // Upsert into profiles with role
    const { error: upErr } = await SRV
      .from('profiles')
      .upsert({
        id: created.user.id,
        full_name: full_name || null,
        role
      }, { onConflict: 'id' })
    if (upErr) {
      return NextResponse.json({ ok:false, error: upErr.message }, { status: 400 })
    }

    return NextResponse.json({ ok:true, user_id: created.user.id })
  } catch (e:any) {
    return NextResponse.json({ ok:false, error:e.message }, { status: 500 })
  }
}
