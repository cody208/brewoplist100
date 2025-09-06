'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { supabase as sbBrowser } from '@/lib/supabase-browser'
import { useAdminGuard } from '@/lib/useAdminGuard'

const sbAuth = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type ProfileRow = {
  user_id: string
  full_name: string | null
  role_id: string | null
  roles: { id: string; slug: string | null; name: string | null } | null
}

type Employee = {
  id: string
  code: string
  full_name: string
  department: string | null
  active: boolean
}

export default function AdminUsersPage() {
  const ok = useAdminGuard()
  if (ok === null) return <p>Loading…</p>
  if (ok === false) { if (typeof window !== 'undefined') window.location.href = '/admin/signin'; return null }

  const [profiles, setProfiles] = useState<ProfileRow[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(false)

  // Employees form (PIN)
  const [empForm, setEmpForm] = useState({ code:'', full_name:'', department:'', pin:'' })

  // Admin/Manager create form (email/password)
  const [userForm, setUserForm] = useState({ email:'', password:'', full_name:'', role:'manager' as 'admin'|'manager' })

  async function load() {
    setLoading(true)
    const [{ data: p }, { data: e }] = await Promise.all([
      sbBrowser
        .from('profiles')
        .select('user_id, full_name, role_id, roles:role_id ( id, slug, name )')
        .order('full_name', { ascending: true }),
      sbBrowser
        .from('employees')
        .select('id, code, full_name, department, active')
        .order('full_name', { ascending: true }),
    ])
    setProfiles(p || [])
    setEmployees(e || [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  // --- Employees (PIN) ---
  async function createEmployee() {
    if (!/^\d{4}$/.test(empForm.pin)) return alert('PIN must be 4 digits')
    if (!empForm.code.trim() || !empForm.full_name.trim()) return alert('Fill code and full name')

    const { data, error } = await sbBrowser
      .from('employees')
      .insert({
        code: empForm.code.trim().toUpperCase(),
        full_name: empForm.full_name.trim(),
        department: empForm.department || null,
        pin_hash: 'temp',
      })
      .select('id')
      .single()

    if (error || !data) return alert(error?.message || 'Failed to create employee')

    const { error: err2 } = await sbBrowser.rpc('set_employee_pin', { emp_id: data.id, pin: empForm.pin })
    if (err2) return alert(err2.message)

    setEmpForm({ code:'', full_name:'', department:'', pin:'' })
    load()
  }

  async function resetPin(id: string) {
    const pin = prompt('Enter new 4-digit PIN')
    if (!pin) return
    if (!/^\d{4}$/.test(pin)) return alert('PIN must be 4 digits')
    const { error } = await sbBrowser.rpc('set_employee_pin', { emp_id: id, pin })
    if (error) return alert(error.message)
    alert('PIN updated')
  }

  async function toggleActive(eid: string, active: boolean) {
    const { error } = await sbBrowser.from('employees').update({ active }).eq('id', eid)
    if (error) return alert(error.message)
    load()
  }

  // --- Admin/Manager create (email/password) ---
  async function createAdminManager() {
    if (!userForm.email || !userForm.password) return alert('Email and password required')
    const { data: { session } } = await sbAuth.auth.getSession()
    const token = session?.access_token
    if (!token) return alert('You must be signed in as admin/manager')

    const res = await fetch('/api/admin/create-user', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        email: userForm.email.trim(),
        password: userForm.password,
        full_name: userForm.full_name.trim() || null,
        role: userForm.role, // 'admin' | 'manager'
      }),
    })
    const j = await res.json()
    if (!j.ok) return alert(j.error || 'Failed to create user')

    setUserForm({ email:'', password:'', full_name:'', role:'manager' })
    load()
    alert('User created!')
  }

  // --- Change a user's role (by slug) ---
  async function changeRole(userId: string, roleSlug: 'admin'|'manager'|'employee') {
    const { data: role, error: roleErr } = await sbBrowser
      .from('roles')
      .select('id')
      .eq('slug', roleSlug)
      .maybeSingle()
    if (roleErr || !role?.id) return alert('Role not found')

    const { error } = await sbBrowser
      .from('profiles')
      .update({ role_id: role.id })
      .eq('user_id', userId)

    if (error) return alert(error.message)
    load()
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Admin · Users</h1>

      {/* Create Admin/Manager */}
      <div className="card space-y-3">
        <h2 className="section-title">Create Admin / Manager</h2>
        <div className="grid sm:grid-cols-5 gap-2">
          <input className="input" placeholder="Email" value={userForm.email} onChange={e=>setUserForm(f=>({...f,email:e.target.value}))} />
          <input className="input" placeholder="Password" type="password" value={userForm.password} onChange={e=>setUserForm(f=>({...f,password:e.target.value}))} />
          <input className="input" placeholder="Full name (optional)" value={userForm.full_name} onChange={e=>setUserForm(f=>({...f,full_name:e.target.value}))} />
          <select className="input" value={userForm.role} onChange={e=>setUserForm(f=>({...f,role:e.target.value as 'admin'|'manager'}))}>
            <option value="manager">manager</option>
            <option value="admin">admin</option>
          </select>
          <button className="btn btn-primary" onClick={createAdminManager}>Create User</button>
        </div>
        <p className="text-xs text-gray-500">Creates a Supabase Auth user and links their profile to a role from <code>public.roles</code>.</p>
      </div>

      {/* Admins & Managers list */}
      <div className="card">
        <div className="flex items-center justify-between">
          <h2 className="section-title">Admins & Managers</h2>
          <button className="btn" onClick={load} disabled={loading}>{loading ? 'Refreshing…' : 'Refresh'}</button>
        </div>
        <ul className="space-y-2">
          {profiles.map(p => (
            <li key={p.user_id} className="flex flex-wrap items-center justify-between gap-2 border-b pb-2">
              <div>
                <div className="font-medium">{p.full_name || p.user_id.slice(0,8)}</div>
                <div className="text-xs text-gray-500">{p.user_id}</div>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm">Role</label>
                <select
                  className="input"
                  value={(p.roles?.slug || p.roles?.name?.toLowerCase() || 'employee')}
                  onChange={e => changeRole(p.user_id, e.target.value as any)}
                >
                  <option value="admin">admin</option>
                  <option value="manager">manager</option>
                  <option value="employee">employee</option>
                </select>
              </div>
            </li>
          ))}
          {!profiles.length && <li className="text-sm text-gray-500">No profiles yet.</li>}
        </ul>
      </div>

      {/* Employees (PIN) */}
      <div className="card space-y-3">
        <h2 className="section-title">Employees (PIN)</h2>
        <div className="grid sm:grid-cols-4 gap-2">
          <input className="input" placeholder="Code (e.g. CODY)" value={empForm.code} onChange={e=>setEmpForm(f=>({...f,code:e.target.value}))} />
          <input className="input" placeholder="Full name" value={empForm.full_name} onChange={e=>setEmpForm(f=>({...f,full_name:e.target.value}))} />
          <input className="input" placeholder="Department (optional)" value={empForm.department} onChange={e=>setEmpForm(f=>({...f,department:e.target.value}))} />
          <input className="input" placeholder="PIN (4 digits)" value={empForm.pin} onChange={e=>setEmpForm(f=>({...f,pin:e.target.value}))} />
          <button className="btn btn-primary sm:col-span-4" onClick={createEmployee}>Add Employee</button>
        </div>

        <ul className="divide-y">
          {employees.map(e => (
            <li key={e.id} className="py-2 flex items-center justify-between">
              <div>
                <div className="font-medium">{e.full_name} <span className="text-xs text-gray-500">({e.code})</span></div>
                <div className="text-xs text-gray-500">{e.department || '—'}</div>
              </div>
              <div className="flex items-center gap-2">
                <label className="inline-flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={e.active} onChange={(ev)=>toggleActive(e.id, ev.target.checked)} />
                  <span>{e.active ? 'Active' : 'Inactive'}</span>
                </label>
                <button className="btn" onClick={()=>resetPin(e.id)}>Reset PIN</button>
              </div>
            </li>
          ))}
          {!employees.length && <li className="text-sm text-gray-500 py-2">No employees yet.</li>}
        </ul>
      </div>
    </div>
  )
}
