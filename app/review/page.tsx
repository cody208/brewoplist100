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

  useEffect(() => {
    ;(async () => {
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
        .limit(25)

      if (error) {
        console.error(error)
        setRuns([])
      } else {
        setRuns((data as any) || [])
      }
      setLoading(false)
    })()
  }, [])

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Review</h1>

      {loading && <p>Loading…</p>}
      {!loading && runs.length === 0 && (
        <p className="text-sm text-gray-600">No runs yet.</p>
      )}

      {runs.map((run) => (
        <RunCard key={run.id} run={run} />
      ))}
    </div>
  )
}

function RunCard({ run }: { run: Run }) {
  // Group responses by section and sort sections/items by their sort_order
  const grouped = useMemo(() => {
    const bySection: Record<string, { section: Section | null; rows: ResponseRow[] }> = {}

    for (const r of run.responses || []) {
      const sect = r.item?.section || null
      const sectKey = sect?.id || 'no-section'
      if (!bySection[sectKey]) bySection[sectKey] = { section: sect, rows: [] }
      bySection[sectKey].rows.push(r)
    }

    const groups = Object.values(bySection)

    // Sort sections by sort_order (nulls last)
    groups.sort((a, b) => {
      const ao = a.section?.sort_order ?? 9999
      const bo = b.section?.sort_order ?? 9999
      return ao - bo
    })

    // Sort each group's items by item.sort_order
    for (const g of groups) {
      g.rows.sort((a, b) => {
        const ao = a.item?.sort_order ?? 9999
        const bo = b.item?.sort_order ?? 9999
        return ao - bo
      })
    }

    return groups
  }, [run.responses])

  return (
    <div className="card space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <div className="font-semibold">Run {run.id.slice(0, 8)}</div>
          <div className="text-xs text-gray-500">
            {new Date(run.created_at).toLocaleString()} • {run.status}
          </div>
        </div>
      </div>

      {grouped.map((g, idx) => (
        <div key={g.section?.id || `sec-${idx}`} className="space-y-2">
          <h3 className="font-medium">
            {g.section?.name || 'General'}
          </h3>
          <ul className="space-y-1">
            {g.rows.map((r) => (
              <li
                key={r.id}
                className="flex items-start justify-between rounded border p-2"
              >
                <div className="pr-3">
                  <div className="text-sm">
                    <span className="font-medium">
                      {r.item?.prompt || 'Item'}
                    </span>
                    :{' '}
                    <ValueText
                      type={r.item?.type || 'text'}
                      value_text={r.value_text}
                      value_number={r.value_number}
                      value_json={r.value_json}
                    />
                  </div>
                  <div className="text-[11px] text-gray-500">
                    {r.item?.type || 'text'} •{' '}
                    {new Date(r.created_at).toLocaleTimeString()}
                  </div>
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
  // Friendly display per type
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
    // some implementations may store select in value_json; handle gracefully
    if (value_json && typeof value_json === 'object') return <span>{JSON.stringify(value_json)}</span>
  }

  // Fallbacks
  if (value_text) return <span>{value_text}</span>
  if (typeof value_number === 'number') return <span>{value_number}</span>
  if (value_json != null) return <span>{JSON.stringify(value_json)}</span>
  return <span className="text-gray-500">—</span>
}
