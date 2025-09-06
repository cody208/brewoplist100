'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { supabase as browserSb } from '@/lib/supabase-browser'

// ---- guard code ----
const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

function useAdminGuard() {
  const [ok, setOk] = useState<boolean | null>(null)

  useEffect(() => {
    ;(async () => {
      const { data: { session } } = await sb.auth.getSession()
      if (!session) { setOk(false); return }

      const { data: prof } = await browserSb
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .maybeSingle()

      const role = prof?.role
      setOk(role === 'admin' || role === 'manager')
    })()
  }, [])

  return ok
}

// ---- types ----
type Profile = { id: string; full_name: string | null; role: 'admin'|'manager'|'employee' | null }
type Employee = { id: string; code: string; full_name: string; department: string | null; active: boolean }

export default function AdminUsersPage(){
  const ok = useAdminGuard()
  if (ok === null) return <p>Loading…</p>
  if (ok === false) {
    if (typeof window !== 'undefined') window.location.href = '/admin/signin'
    return null
  }

  const [profiles, setProfiles] = useState<Profile[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [form, setForm] = useState({ code:'', full_name:'', department:'', pin:'' })
  const [loading, setLoading] = useState(false)

  async function load(){
    setLoading(true)
    const [{ data: p }, { data: e }] = await Promise.all([
      browserSb.from('profiles').select('id,full_name,role').order('role'),
      browserSb.from('employees').select('id,code,full_name,department,active').order('full_name'),
    ])
    setProfiles(p || [])
    setEmployees(e || [])
    setLoading(false)
  }
  useEffect(()=>{ load() },[])

  async function createEmployee(){
    if (!/^\d{4}$/.test(form.pin)) return alert('PIN must be 4 digits')
    if (!form.code.trim() || !form.full_name.trim()) return alert('Fill code and full name')

    const { data, error } = await browserSb
      .from('employees')
      .insert({
        code: form.code.trim().toUpperCase(),
        full_name: form.full_name.trim(),
        department: form.department || null,
        pin_hash: 'temp'
      })
      .select('id')
      .single()

    if (error || !data) return alert(error?.message || 'Failed to create employee')

    const { error: err2 } = await browserSb.rpc('set_employee_pin', { emp_id: data.id, pin: form.pin })
    if (err2) return alert(err2.message)

    setForm({ code:'', full_name:'', department:'', pin:'' })
    load()
  }

  async function resetPin(id:string){
    const pin = prompt('Enter new 4-digit PIN')
    if (!pin) return
    if (!/^\d{4}$/.test(pin)) return alert('PIN must be 4 digits')
    const { error } = await browserSb.rpc('set_employee_pin', { emp_id: id, pin })
    if (error) return alert(error.message)
    alert('PIN updated')
  }

  async function toggleActive(eid:string, active:boolean){
    await browserSb.from('employees').update({ active }).eq('id', eid)
    load()
  }

  async function changeRole(id: string, role: 'admin'|'manager'|'employee'){
    const { error } = await browserSb.from('profiles').update({ role }).eq('id', id)
    if (error) return alert(error.message)
    load()
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Admin · Users</h1>

      <div className="card">
        <div className="flex items-center justify-between">
          <h2 className="section-title">Admins & Managers (Supabase Auth)</h2>
          <button className="btn" onClick={load} disabled={loading}>
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
        <ul className="space-y-2">
          {profiles.map(p=>(
            <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 border-b pb-2">
              <div>
                <div className="font-medium">{p.full_name || p.id.slice(0,8)}</div>
                <div className="text-xs text-gray-500">{p.id}</div>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm">Role</label>
                <select
                  className="input"
                  value={p.role || 'employee'}
                  onChange={e => changeRole(p.id, e.target.value as any)}
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
        <p className="text-xs text-gray-500 mt-2">
          Create Admin/Manager accounts via Supabase Auth (email/password), then set their role here.
        </p>
      </div>

      <div className="card space-y-3">
        <h2 className="section-title">Employees (PIN)</h2>
        <div className="grid sm:grid-cols-4 gap-2">
          <input className="input" placeholder="Code (e.g. CODY)" value={form.code} onChange={e=>setForm(f=>({...f,code:e.target.value}))} />
          <input className="input" placeholder="Full name" value={form.full_name} onChange={e=>setForm(f=>({...f,full_name:e.target.value}))} />
          <input className="input" placeholder="Department (optional)" value={form.department} onChange={e=>setForm(f=>({...f,department:e.target.value}))} />
          <input className="input" placeholder="PIN (4 digits)" value={form.pin} onChange={e=>setForm(f=>({...f,pin:e.target.value}))} />
          <button className="btn btn-primary sm:col-span-4" onClick={createEmployee}>Add Employee</button>
        </div>

        <ul className="divide-y">
          {employees.map(e=>(
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
