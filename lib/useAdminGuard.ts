'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { supabase as browserSb } from '@/lib/supabase-browser'

const authSb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

/**
 * Allows only users whose profile role is admin/manager.
 * Your schema: profiles(user_id uuid, role_id uuid) -> roles(id uuid, slug text, name text)
 */
export function useAdminGuard() {
  const [ok, setOk] = useState<boolean | null>(null)

  useEffect(() => {
    ;(async () => {
      // 1) must have a Supabase Auth session
      const { data: { session } } = await authSb.auth.getSession()
      if (!session) { setOk(false); return }

      // 2) read profile + role (via FK join syntax)
      const { data: prof, error } = await browserSb
        .from('profiles')
        .select('user_id, roles:role_id ( slug, name )')
        .eq('user_id', session.user.id)
        .maybeSingle()

      if (error || !prof) { setOk(false); return }

      const roleKey =
        prof.roles?.slug ??
        (prof.roles?.name ? prof.roles.name.toLowerCase() : null)

      setOk(roleKey === 'admin' || roleKey === 'manager')
    })()
  }, [])

  return ok
}
