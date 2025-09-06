'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase-browser'

type Template = { id: string; name: string }
type Run = { id: string; template_id: string; status: string; created_at: string }

export default function Work() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [runs, setRuns] = useState<Run[]>([])

  useEffect(() => {
    (async () => {
      const { data: t } = await supabase
        .from('templates')
        .select('id,name')
        .eq('is_active', true)
        .order('name')
      setTemplates(t || [])

      const { data: r } = await supabase
        .from('runs')
        .select('id,template_id,status,created_at')
        .order('created_at', { ascending: false })
        .limit(20)
      setRuns(r || [])
    })()
  }, [])

  async function startRun(templateId: string) {
    // 1. Ask server who the current employee is (from cookie)
    const r = await fetch('/api/whoami', { cache: 'no-store' })
    const { employee_id } = await r.json()

    // 2. Create run, tagging employee
    const { data, error } = await supabase
      .from('runs')
      .insert({
        template_id: templateId,
        template_version: 1,
        status: 'in_progress',
        started_at: new Date().toISOString(),
        created_by_employee_id: employee_id || null,
      })
      .select('id')
      .single()

    if (!error && data) window.location.href = `/runs/${data.id}`
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Work</h1>

      <div className="card">
        <h2 className="section-title">Start a run</h2>
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
          {templates.map((t) => (
            <button key={t.id} className="btn" onClick={() => startRun(t.id)}>
              {t.name}
            </button>
          ))}
          {!templates.length && (
            <p className="text-sm text-gray-600">No active templates yet.</p>
          )}
        </div>
      </div>

      <div className="card">
        <h2 className="section-title">Recent runs</h2>
        <ul className="space-y-2 text-sm">
          {runs.map((r) => (
            <li
              key={r.id}
              className="flex justify-between border-b pb-2"
            >
              <span>
                {r.id.slice(0, 8)} • {r.status}
              </span>
              <Link className="btn" href={`/runs/${r.id}`}>
                Open
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}



