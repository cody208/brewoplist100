'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { supabase as browserSb } from '@/lib/supabase-browser'

const authSb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export function useAdminGuard() {
  const [ok, setOk] = useState<boolean | null>(null)

  useEffect(() => {
    ;(async () => {
      const { data: { session } } = await authSb.auth.getSession()
      if (!session) { setOk(false); return }

      const { data: prof, error } = await browserSb
        .from('profiles')
        .select('user_id, roles:role_id ( id, name, role, role_name )')
        .eq('user_id', session.user.id)
        .maybeSingle()

      if (error || !prof) { setOk(false); return }

      // 👇 normalize roles to a single object
      const rAny = Array.isArray((prof as any).roles) ? (prof as any).roles[0] : (prof as any).roles
      const roleName = String(rAny?.name ?? rAny?.role ?? rAny?.role_name ?? '')
        .toLowerCase()
        .trim()

      setOk(roleName === 'admin' || roleName === 'manager')
    })()
  }, [])

  return ok
}
