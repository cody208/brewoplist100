'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase-browser'
import { createClient } from '@supabase/supabase-js'
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

function useAdminGuard() {
  const [ok, setOk] = useState<boolean | null>(null)

  useEffect(() => {
    ;(async () => {
      const { data: { session } } = await sb.auth.getSession()
      if (!session) { setOk(false); return }
      const { data: profs } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .maybeSingle()
      const role = profs?.role
      setOk(role === 'admin' || role === 'manager')
    })()
  }, [])

  return ok
}


type Template = { id: string; name: string; is_active: boolean; created_at: string }

export default function AdminTemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [newName, setNewName] = useState('')
  const [newActive, setNewActive] = useState(true)
  const [saving, setSaving] = useState(false)

  async function load() {
    const { data } = await supabase
      .from('templates')
      .select('id,name,is_active,created_at')
      .order('created_at', { ascending: false })
    setTemplates(data || [])
  }

  useEffect(() => { load() }, [])

  async function createTemplate() {
    if (!newName.trim()) return alert('Enter a template name')
    setSaving(true)
    const { error } = await supabase
      .from('templates')
      .insert({ name: newName.trim(), is_active: newActive })
    setSaving(false)
    if (error) return alert(error.message)
    setNewName('')
    setNewActive(true)
    load()
  }

  async function toggleActive(t: Template) {
    await supabase.from('templates').update({ is_active: !t.is_active }).eq('id', t.id)
    load()
  }

  async function remove(id: string) {
    if (!confirm('Delete this template? This will also delete its sections/items.')) return
    await supabase.from('templates').delete().eq('id', id)
    load()
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Admin · Templates</h1>

      {/* Create new */}
      <div className="card space-y-3">
        <h2 className="section-title">New template</h2>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            className="input flex-1"
            placeholder="Template name (e.g., Brewhouse – End of Day)"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              checked={newActive}
              onChange={(e) => setNewActive(e.target.checked)}
            />
            <span>Active</span>
          </label>
          <button className="btn btn-primary" disabled={saving} onClick={createTemplate}>
            {saving ? 'Saving…' : 'Create'}
          </button>
        </div>
      </div>

      {/* List */}
      <div className="card">
        <h2 className="section-title">Templates</h2>
        {!templates.length && <p className="text-sm text-gray-600">No templates yet.</p>}
        <ul className="divide-y">
          {templates.map((t) => (
            <li key={t.id} className="flex items-center justify-between py-3">
              <div className="space-y-1">
                <div className="font-medium">{t.name}</div>
                <div className="text-xs text-gray-500">{t.id.slice(0, 8)} • {new Date(t.created_at).toLocaleString()}</div>
              </div>
              <div className="flex items-center gap-2">
                <label className="inline-flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={t.is_active} onChange={() => toggleActive(t)} />
                  <span>{t.is_active ? 'Active' : 'Inactive'}</span>
                </label>
                <Link className="btn" href={`/admin/templates/${t.id}`}>Edit</Link>
                <button className="btn" onClick={() => remove(t.id)}>Delete</button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
