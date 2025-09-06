'use client'

import { useEffect, useState } from 'react'
import { supabase as sb } from '@/lib/supabase-browser'
import { useAdminGuard } from '@/lib/useAdminGuard'

type Template = {
  id: string
  name: string
  is_active: boolean | null
  created_at: string | null
}

export default function AdminTemplatesPage() {
  // ---- guard (redirects to /admin/signin if not admin/manager)
  const ok = useAdminGuard()
  if (ok === null) return <p>Loading…</p>
  if (ok === false) {
    if (typeof window !== 'undefined') window.location.href = '/admin/signin'
    return null
  }

  const [list, setList] = useState<Template[]>([])
  const [loading, setLoading] = useState(false)
  const [newName, setNewName] = useState('')

  async function load() {
    setLoading(true)
    const { data } = await sb
      .from('templates')
      .select('id, name, is_active, created_at')
      .order('created_at', { ascending: false })
    setList(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function createTemplate() {
    const name = newName.trim()
    if (!name) return alert('Enter a name')
    const { error } = await sb.from('templates').insert({ name, is_active: true })
    if (error) return alert(error.message)
    setNewName('')
    load()
  }

  async function renameTemplate(id: string) {
    const current = list.find(t => t.id === id)?.name || ''
    const name = prompt('New template name:', current)
    if (!name) return
    const { error } = await sb.from('templates').update({ name: name.trim() }).eq('id', id)
    if (error) return alert(error.message)
    load()
  }

  async function toggleActive(id: string, next: boolean) {
    const { error } = await sb.from('templates').update({ is_active: next }).eq('id', id)
    if (error) return alert(error.message)
    load()
  }

  async function removeTemplate(id: string) {
    if (!confirm('Delete this template? This will fail if there are runs referencing it.')) return
    const { error } = await sb.from('templates').delete().eq('id', id)
    if (error) return alert(error.message)
    load()
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Admin · Templates</h1>

      <div className="card space-y-3">
        <h2 className="section-title">Create template</h2>
        <div className="grid sm:grid-cols-4 gap-2">
          <input
            className="input sm:col-span-3"
            placeholder="Template name (e.g. Taproom Daily Closeout)"
            value={newName}
            onChange={e => setNewName(e.target.value)}
          />
          <button className="btn btn-primary" onClick={createTemplate}>Add</button>
        </div>
      </div>

      <div className="card">
        <div className="flex items-center justify-between">
          <h2 className="section-title">All templates</h2>
          <button className="btn" onClick={load} disabled={loading}>
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>

        <ul className="divide-y">
          {list.map(t => (
            <li key={t.id} className="py-3 flex flex-wrap items-center gap-3 justify-between">
              <div className="min-w-[240px]">
                <div className="font-medium">{t.name}</div>
                <div className="text-xs text-gray-500">{t.id}</div>
              </div>

              <div className="flex items-center gap-3">
                <label className="inline-flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={!!t.is_active}
                    onChange={e => toggleActive(t.id, e.target.checked)}
                  />
                  <span>{t.is_active ? 'Active' : 'Inactive'}</span>
                </label>

                <button className="btn" onClick={() => renameTemplate(t.id)}>Rename</button>
                <button
                  className="btn"
                  onClick={() => (window.location.href = `/admin/templates/${t.id}`)}
                  title="(Optional) If you later add a per-template editor route"
                >
                  Open
                </button>
                <button className="btn" onClick={() => removeTemplate(t.id)}>Delete</button>
              </div>
            </li>
          ))}
          {!list.length && <li className="py-3 text-sm text-gray-500">No templates yet.</li>}
        </ul>
      </div>
    </div>
  )
}
