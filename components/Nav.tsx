'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function Nav() {
  const [adminSignedIn, setAdminSignedIn] = useState(false)
  const [employeeId, setEmployeeId] = useState<string | null>(null)

  useEffect(() => {
    ;(async () => {
      // Admin/Manager session?
      const { data: { session } } = await sb.auth.getSession()
      setAdminSignedIn(!!session)

      // Employee PIN cookie?
      const r = await fetch('/api/whoami', { cache: 'no-store' })
      const j = await r.json()
      setEmployeeId(j.employee_id || null)
    })()
  }, [])

  async function adminSignOut() {
    await sb.auth.signOut()
    window.location.reload()
  }
  async function employeeSignOut() {
    await fetch('/api/employee-logout', { method: 'POST' })
    window.location.reload()
  }

  return (
    <header className="bg-white border-b">
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-4">
        <Link href="/" className="font-semibold">BrewOps</Link>
        <nav className="text-sm flex gap-3">
          <Link href="/work" className="hover:underline">Work</Link>
          <Link href="/review" className="hover:underline">Review</Link>
          <Link href="/admin/templates" className="hover:underline">Admin</Link>
          <Link href="/admin/users" className="hover:underline">Users</Link>
          <span className="mx-2 text-gray-300">|</span>
          <Link href="/admin/signin" className="hover:underline">Admin sign in</Link>
          <Link href="/employee/signin" className="hover:underline">Employee sign in</Link>
        </nav>

        <div className="ml-auto flex items-center gap-3 text-xs">
          {adminSignedIn && (
            <>
              <span className="text-green-700">Admin signed in</span>
              <button className="btn" onClick={adminSignOut}>Sign out</button>
            </>
          )}
          {employeeId && (
            <>
              <span className="text-blue-700">Employee: {employeeId.slice(0,8)}</span>
              <button className="btn" onClick={employeeSignOut}>Sign out</button>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
