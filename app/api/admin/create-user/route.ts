// app/api/admin/create-user/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const ANON = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
const SRV = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  try {
    // Caller must be signed-in admin/manager
    const auth = req.headers.get('authorization') || ''
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null
    if (!token) return NextResponse.json({ ok:false, error:'Missing auth token' }, { status: 401 })

    const { data: userData, error: userErr } = await ANON.auth.getUser(token)
    if (userErr || !userData?.user) {
      return NextResponse.json({ ok:false, error:'Invalid session' }, { status: 401 })
    }
    const callerId = userData.user.id

    // Verify caller role (profiles.user_id -> roles.slug)
    const { data: callerProf, error: profErr } = await SRV
      .from('profiles')
      .select('user_id, roles:role_id ( slug )')
      .eq('user_id', callerId)
      .maybeSingle()
    if (profErr || !callerProf) {
      return NextResponse.json({ ok:false, error:'Forbidden' }, { status: 403 })
    }
    const callerRole = callerProf.roles?.slug
    if (!['admin','manager'].includes(callerRole || '')) {
      return NextResponse.json({ ok:false, error:'Forbidden' }, { status: 403 })
    }

    // Parse payload
    const { email, password, full_name, role } = await req.json() as {
      email: string
      password: string
      full_name?: string | null
      role: 'admin'|'manager'
    }
    if (!email || !password || !role) {
      return NextResponse.json({ ok:false, error:'Missing fields' }, { status: 400 })
    }

    // Create Auth user
    const { data: created, error: createErr } = await SRV.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: full_name || null },
    })
    if (createErr || !created?.user) {
      return NextResponse.json({ ok:false, error: createErr?.message || 'Failed to create user' }, { status: 400 })
    }

    // Find role_id by slug
    const { data: roleRow, error: roleErr } = await SRV
      .from('roles')
      .select('id')
      .eq('slug', role)
      .maybeSingle()
    if (roleErr || !roleRow?.id) {
      return NextResponse.json({ ok:false, error:'Role not found' }, { status: 400 })
    }

    // Upsert into profiles with user_id + role_id
    const { error: upErr } = await SRV
      .from('profiles')
      .upsert({
        user_id: created.user.id,
        full_name: full_name || null,
        role_id: roleRow.id,
      }, { onConflict: 'user_id' })
    if (upErr) {
      return NextResponse.json({ ok:false, error: upErr.message }, { status: 400 })
    }

    return NextResponse.json({ ok:true, user_id: created.user.id })
  } catch (e:any) {
    return NextResponse.json({ ok:false, error: e.message }, { status: 500 })
  }
}
