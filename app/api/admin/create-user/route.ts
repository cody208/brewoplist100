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

    // Verify caller role via profiles.role_id -> roles.(name|role|role_name)
    const { data: callerProf, error: profErr } = await SRV
      .from('profiles')
      .select('user_id, roles:role_id ( id, name, role, role_name )')
      .eq('user_id', callerId)
      .maybeSingle()
    if (profErr || !callerProf) return NextResponse.json({ ok:false, error:'Forbidden' }, { status: 403 })

    const r = (callerProf.roles || {}) as any
    const callerRole = String(r.name ?? r.role ?? r.role_name ?? '').toLowerCase().trim()
    if (!['admin','manager'].includes(callerRole)) {
      return NextResponse.json({ ok:false, error:'Forbidden' }, { status: 403 })
    }

    // Parse input
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

    // Resolve role_id in code (supports any of the 3 columns)
    const { data: allRoles, error: rolesErr } = await SRV
      .from('roles')
      .select('id, name, role, role_name')
    if (rolesErr || !allRoles) return NextResponse.json({ ok:false, error:'Roles lookup failed' }, { status: 400 })

    const wanted = role.toLowerCase()
    const match = allRoles.find((x:any) =>
      String(x.name ?? x.role ?? x.role_name ?? '').toLowerCase().trim() === wanted
    )
    if (!match?.id) return NextResponse.json({ ok:false, error:'Role not found' }, { status: 400 })

    // Upsert profile
    const { error: upErr } = await SRV
      .from('profiles')
      .upsert({
        user_id: created.user.id,
        full_name: full_name || null,
        role_id: match.id,
      }, { onConflict: 'user_id' })
    if (upErr) return NextResponse.json({ ok:false, error: upErr.message }, { status: 400 })

    return NextResponse.json({ ok:true, user_id: created.user.id })
  } catch (e:any) {
    return NextResponse.json({ ok:false, error: e.message }, { status: 500 })
  }
}
