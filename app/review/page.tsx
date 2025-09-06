'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase-browser'

type Section = { id: string; name: string; sort_order: number }
type Item = {
  id: string
  prompt: string
  type: string
  sort_order: number
  section: Section | null
}
type ResponseRow = {
  id: string
  value_text: string | null
  value_number: number | null
  value_json: any | null
  created_at: string
  item: Item | null
}
type Run = {
  id: string
  status: string
  created_at: string
  responses: ResponseRow[]
}

export default function ReviewPage() {
  const [runs, setRuns] = useState<Run[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  async function load() {
    setLoading(true)
    const { data, error } = await supabase
      .from('runs')
      .select(`
        id,
        status,
        created_at,
        responses (
          id,
          value_text,
          value_number,
          value_json,
          created_at,
          item:items (
            id,
            prompt,
            type,
            sort_order,
            section:sections (
              id,
              name,
              sort_order
            )
          )
        )
      `)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      console.error(error)
      setRuns([])
    } else {
      setRuns((data as any) || [])
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function toggle(id: string) {
    setExpanded((e) => ({ ...e, [id]: !e[id] }))
  }

  async function approve(id: string) {
    await supabase.from('runs').update({ status: 'approved' }).eq('id', id)
    load()
  }
  async function reopen(id: string) {
    await supabase.from('runs').update({ status: 'in_progress' }).eq('id', id)
    load()
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Review</h1>

      {loading && <p>Loading…</p>}
      {!loading && runs.length === 0 && (
        <p className="text-sm text-gray-600">No runs yet.</p>
      )}

      {runs.map((run) => (
        <RunRow
          key={run.id}
          run={run}
          expanded={!!expanded[run.id]}
          onToggle={() => toggle(run.id)}
          onApprove={() => approve(run.id)}
          onReopen={() => reopen(run.id)}
        />
      ))}
    </div>
  )
}

function RunRow({
  run,
  expanded,
  onToggle,
  onApprove,
  onReopen,
}: {
  run: Run
  expanded: boolean
  onToggle: () => void
  onApprove: () => void
  onReopen: () => void
}) {
  // Group responses by section and sort sections/items by sort_order
  const grouped = useMemo(() => {
    const bySection: Record<string, { section: Section | null; rows: ResponseRow[] }> = {}
    for (const r of run.responses || []) {
      const sect = r.item?.section || null
      const key = sect?.id || 'no-section'
      if (!bySection[key]) bySection[key] = { section: sect, rows: [] }
      bySection[key].rows.push(r)
    }
    const groups = Object.values(bySection)

    groups.sort((a, b) => (a.section?.sort_order ?? 9999) - (b.section?.sort_order ?? 9999))
    for (const g of groups) {
      g.rows.sort((a, b) => (a.item?.sort_order ?? 9999) - (b.item?.sort_order ?? 9999))
    }
    return groups
  }, [run.responses])

  const count = run.responses?.length || 0
  const statusColor =
    run.status === 'approved'
      ? 'text-green-700'
      : run.status === 'submitted'
      ? 'text-blue-700'
      : 'text-gray-700'

  return (
    <div className="card space-y-3">
      {/* Header Row (compact) */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-0.5">
          <div className="font-semibold">Run {run.id.slice(0, 8)}</div>
          <div className="text-xs text-gray-500">
            {new Date(run.created_at).toLocaleString()} •{' '}
            <span className={statusColor}>{run.status}</span> • {count} responses
          </div>
        </div>
        <div className="flex items-center gap-2">
          {run.status !== 'approved' ? (
            <button className="btn btn-primary" onClick={onApprove}>Approve</button>
          ) : (
            <button className="btn" onClick={onReopen}>Reopen</button>
          )}
          <button className="btn" onClick={onToggle}>
            {expanded ? 'Collapse' : 'Expand'}
          </button>
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="space-y-4">
          {grouped.map((g, idx) => (
            <div key={g.section?.id || `sec-${idx}`} className="space-y-2">
              <h3 className="font-medium">{g.section?.name || 'General'}</h3>
              <ul className="space-y-1">
                {g.rows.map((r) => (
                  <li key={r.id} className="rounded border p-2">
                    <div className="text-sm">
                      <span className="font-medium">{r.item?.prompt || 'Item'}</span>
                      {': '}
                      <ValueText
                        type={r.item?.type || 'text'}
                        value_text={r.value_text}
                        value_number={r.value_number}
                        value_json={r.value_json}
                      />
                    </div>
                    <div className="text-[11px] text-gray-500">
                      {r.item?.type || 'text'} • {new Date(r.created_at).toLocaleTimeString()}
                    </div>
                  </li>
                ))}
                {g.rows.length === 0 && (
                  <li className="text-sm text-gray-500">No responses in this section.</li>
                )}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function ValueText({
  type,
  value_text,
  value_number,
  value_json,
}: {
  type: string
  value_text: string | null
  value_number: number | null
  value_json: any
}) {
  if (type === 'yesno') {
    if (value_text === 'Yes' || value_text === 'No') return <span>{value_text}</span>
  }
  if (type === 'number') {
    if (typeof value_number === 'number') return <span>{value_number}</span>
  }
  if (type === 'checkbox') {
    const checked = !!value_json?.checked
    return <span>{checked ? 'Checked' : 'Unchecked'}</span>
  }
  if (type === 'select') {
    if (typeof value_text === 'string' && value_text) return <span>{value_text}</span>
    if (value_json && typeof value_json === 'object') return <span>{JSON.stringify(value_json)}</span>
  }
  if (value_text) return <span>{value_text}</span>
  if (typeof value_number === 'number') return <span>{value_number}</span>
  if (value_json != null) return <span>{JSON.stringify(value_json)}</span>
  return <span className="text-gray-500">—</span>
}
